import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Look up a single user by their stable client-generated id.
export const getByClientId = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    // Unique by index, so .unique() returns the doc or null.
    return await ctx.db
      .query("users")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
  },
});

// Idempotently create a user, or update the display name if one already exists.
export const createOrUpdate = mutation({
  args: { clientId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    // Check for an existing user with this clientId.
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      // Keep the name in sync and reuse the existing id.
      await ctx.db.patch(existing._id, { name: args.name });
      return existing._id;
    }

    // No match — insert a fresh user and return the new id.
    return await ctx.db.insert("users", {
      clientId: args.clientId,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});

// List all users ordered by creation time (oldest first).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    // Sort ascending by createdAt for a stable, deterministic order.
    return users.sort((a, b) => a.createdAt - b.createdAt);
  },
});
