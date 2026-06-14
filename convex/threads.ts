import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all threads, most recently active first.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("threads")
      .withIndex("by_lastMessage")
      .order("desc")
      .collect();
  },
});

// Fetch a single thread by id, or null if it doesn't exist.
export const get = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

// Create a new general thread and return its id.
export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("threads", {
      title: args.title,
      kind: "general",
      createdAt: now,
      lastMessageAt: now,
    });
  },
});
