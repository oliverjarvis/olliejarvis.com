import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// List all messages for a thread ordered by createdAt ascending.
// Resolves media URLs from storage when a storageId is present.
export const list = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    // Resolve each message's media URL in parallel.
    return await Promise.all(
      messages.map(async (message) => {
        const url = message.storageId
          ? await ctx.storage.getUrl(message.storageId)
          : null;
        return { ...message, url };
      }),
    );
  },
});

// Send a plain text message to a thread and bump the thread's lastMessageAt.
export const send = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const now = Date.now();

    // Resolve the author's display name, falling back to "Someone".
    const user = await ctx.db.get(args.userId);
    const authorName = user?.name ?? "Someone";

    const messageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      userId: args.userId,
      authorName,
      kind: "text",
      body: args.body,
      createdAt: now,
    });

    // Keep the thread ordering fresh for the by_lastMessage index.
    await ctx.db.patch(args.threadId, { lastMessageAt: now });

    return messageId;
  },
});

// Generate a short-lived upload URL the client can POST a file to.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Send an image or video message referencing an already-uploaded storage object.
export const sendMedia = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("image"), v.literal("video")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const now = Date.now();

    // Resolve the author's display name, falling back to "Someone".
    const user = await ctx.db.get(args.userId);
    const authorName = user?.name ?? "Someone";

    const messageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      userId: args.userId,
      authorName,
      kind: args.kind,
      storageId: args.storageId,
      body: args.caption,
      createdAt: now,
    });

    // Keep the thread ordering fresh for the by_lastMessage index.
    await ctx.db.patch(args.threadId, { lastMessageAt: now });

    return messageId;
  },
});
