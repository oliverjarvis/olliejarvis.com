import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Upsert a typing heartbeat for a user in a thread.
// Keeps the row fresh so clients can detect who is currently typing.
export const heartbeat = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Look for an existing typing row for this (thread, user) pair.
    const existing = await ctx.db
      .query("typing")
      .withIndex("by_thread_user", (q) =>
        q.eq("threadId", args.threadId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      // Refresh the timestamp (and name in case it changed).
      await ctx.db.patch(existing._id, { name: args.name, updatedAt: now });
    } else {
      // No row yet — create one.
      await ctx.db.insert("typing", {
        threadId: args.threadId,
        userId: args.userId,
        name: args.name,
        updatedAt: now,
      });
    }

    return null;
  },
});

// Remove a user's typing indicator from a thread (e.g. on blur / send).
export const clear = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typing")
      .withIndex("by_thread_user", (q) =>
        q.eq("threadId", args.threadId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

// List all typing rows for a thread.
// The client is responsible for filtering out stale rows and excluding itself.
export const list = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("typing")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();
  },
});
