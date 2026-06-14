import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Lists are named collections of items (often imported from a spreadsheet).
// Each list can back a "dice roll" that picks one item at random and posts a
// system message into a chat thread.

// List every list along with how many items it contains, oldest first.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const lists = await ctx.db.query("lists").collect();
    // Sort by createdAt ascending (oldest first).
    lists.sort((a, b) => a.createdAt - b.createdAt);

    // Attach an itemCount to each list.
    const withCounts = await Promise.all(
      lists.map(async (l) => {
        const items = await ctx.db
          .query("listItems")
          .withIndex("by_list", (q) => q.eq("listId", l._id))
          .collect();
        return { ...l, itemCount: items.length };
      }),
    );

    return withCounts;
  },
});

// Fetch a single list with its items ordered by `order` ascending.
export const get = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .order("asc")
      .collect();
    return { list, items };
  },
});

// Create a new empty list.
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("lists", {
      name: args.name,
      createdAt: Date.now(),
    });
  },
});

// Append items to a list, continuing the `order` sequence after existing items.
export const addItems = mutation({
  args: {
    listId: v.id("lists"),
    items: v.array(
      v.object({
        text: v.string(),
        description: v.optional(v.string()),
        extra: v.optional(v.record(v.string(), v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Find the current items to determine where the order sequence resumes.
    const existing = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const maxOrder = existing.length
      ? Math.max(...existing.map((i) => i.order)) + 1
      : 0;

    // Insert each new item with a sequential order.
    for (let index = 0; index < args.items.length; index++) {
      const item = args.items[index];
      await ctx.db.insert("listItems", {
        listId: args.listId,
        text: item.text,
        description: item.description,
        order: maxOrder + index,
        extra: item.extra,
      });
    }

    return args.items.length;
  },
});

// Delete a list and all of its items.
export const remove = mutation({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.listId);
    return null;
  },
});

// Roll a die against a list: pick an item, post a system message into a thread,
// and bump the thread's lastMessageAt.
export const rollDice = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    listId: v.id("lists"),
    sides: v.number(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .order("asc")
      .collect();

    if (items.length === 0) {
      throw new Error("List is empty");
    }

    // Roll a value in [1, sides] and map it onto the available items.
    const value = Math.floor(Math.random() * args.sides) + 1;
    const index = (value - 1) % items.length;
    const chosen = items[index];

    // Resolve the roller's display name (fallback if user is missing).
    const user = await ctx.db.get(args.userId);
    const rollerName = user?.name ?? "Someone";

    const now = Date.now();
    const listName = list?.name ?? "";
    const description = chosen.description;

    // Post the result as a system message, carrying the dice metadata. The body
    // includes the title and (when present) the description so it reads well
    // anywhere the structured `dice` fields aren't used.
    const descSuffix = description ? ` — ${description}` : "";
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      userId: undefined, // system messages have no user
      authorName: rollerName,
      kind: "system",
      body: `🎲 ${rollerName} rolled ${value} on a d${args.sides} → "${chosen.text}"${descSuffix} (from ${listName})`,
      dice: {
        sides: args.sides,
        value,
        listId: args.listId,
        listName,
        itemText: chosen.text,
        itemDescription: description,
      },
      createdAt: now,
    });

    // Bump the thread so it sorts to the top of recent conversations.
    await ctx.db.patch(args.threadId, { lastMessageAt: now });

    return { value, itemText: chosen.text, itemDescription: description };
  },
});
