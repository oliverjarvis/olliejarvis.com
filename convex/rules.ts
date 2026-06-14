import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Game rules: a simple editable, ordered collection of { title, body } entries.

// List all rules in display order (by `order`, then creation time as a tiebreak).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rules = await ctx.db.query("rules").collect();
    rules.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
    return rules;
  },
});

// Create a rule, appended to the end of the current ordering.
export const create = mutation({
  args: { title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("rules").collect();
    const now = Date.now();
    return await ctx.db.insert("rules", {
      title: args.title,
      body: args.body,
      order: existing.length,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Edit a rule's title and body.
export const update = mutation({
  args: { ruleId: v.id("rules"), title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ruleId, {
      title: args.title,
      body: args.body,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Delete a rule.
export const remove = mutation({
  args: { ruleId: v.id("rules") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.ruleId);
    return null;
  },
});
