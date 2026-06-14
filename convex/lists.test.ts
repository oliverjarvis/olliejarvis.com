/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Load convex function modules (NOT *.test.ts) for the in-memory backend.
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

describe("lists", () => {
  describe("create + addItems + get + list", () => {
    test("get returns items in order; addItems appends continuing the order sequence; list shows itemCount", async () => {
      const t = convexTest(schema, modules);

      const listId = await t.mutation(api.lists.create, { name: "Challenges" });
      expect(listId).toBeDefined();

      // First batch of items (alpha carries a description).
      const firstCount = await t.mutation(api.lists.addItems, {
        listId,
        items: [{ text: "alpha", description: "first letter" }, { text: "beta" }],
      });
      expect(firstCount).toBe(2);

      // Second batch should APPEND, continuing the order sequence.
      const secondCount = await t.mutation(api.lists.addItems, {
        listId,
        items: [{ text: "gamma" }, { text: "delta" }],
      });
      expect(secondCount).toBe(2);

      const { list, items } = await t.query(api.lists.get, { listId });

      expect(list).not.toBeNull();
      expect(list?.name).toBe("Challenges");

      // Items returned in order, with a continuous 0,1,2,3 order sequence.
      expect(items.map((i) => i.text)).toEqual([
        "alpha",
        "beta",
        "gamma",
        "delta",
      ]);
      expect(items.map((i) => i.order)).toEqual([0, 1, 2, 3]);

      // Descriptions round-trip; items without one have undefined.
      expect(items[0].description).toBe("first letter");
      expect(items[1].description).toBeUndefined();

      // list() reports the correct itemCount.
      const all = await t.query(api.lists.list, {});
      const found = all.find((l) => l._id === listId);
      expect(found).toBeDefined();
      expect(found?.itemCount).toBe(4);
    });

    test("list() returns lists oldest first by createdAt", async () => {
      const t = convexTest(schema, modules);

      // Seed lists with explicit, distinct createdAt timestamps (out of order).
      const newerId = await t.run(async (ctx) =>
        ctx.db.insert("lists", { name: "Newer", createdAt: 2000 }),
      );
      const olderId = await t.run(async (ctx) =>
        ctx.db.insert("lists", { name: "Older", createdAt: 1000 }),
      );

      const all = await t.query(api.lists.list, {});
      const ids = all.map((l) => l._id);
      expect(ids.indexOf(olderId)).toBeLessThan(ids.indexOf(newerId));
    });
  });

  describe("get ordering", () => {
    test("items are ordered by `order` ascending regardless of insert order", async () => {
      const t = convexTest(schema, modules);

      const listId = await t.mutation(api.lists.create, { name: "Ordered" });

      // Insert items directly with out-of-order `order` values.
      await t.run(async (ctx) => {
        await ctx.db.insert("listItems", { listId, text: "third", order: 2 });
        await ctx.db.insert("listItems", { listId, text: "first", order: 0 });
        await ctx.db.insert("listItems", { listId, text: "second", order: 1 });
      });

      const { items } = await t.query(api.lists.get, { listId });
      expect(items.map((i) => i.order)).toEqual([0, 1, 2]);
      expect(items.map((i) => i.text)).toEqual(["first", "second", "third"]);
    });
  });

  describe("remove", () => {
    test("deletes the list and all of its items", async () => {
      const t = convexTest(schema, modules);

      const listId = await t.mutation(api.lists.create, { name: "Doomed" });
      await t.mutation(api.lists.addItems, {
        listId,
        items: [{ text: "one" }, { text: "two" }],
      });

      const result = await t.mutation(api.lists.remove, { listId });
      expect(result).toBeNull();

      // get() now returns a null list and no items.
      const { list, items } = await t.query(api.lists.get, { listId });
      expect(list).toBeNull();
      expect(items).toEqual([]);

      // list() no longer includes the removed list.
      const all = await t.query(api.lists.list, {});
      expect(all.find((l) => l._id === listId)).toBeUndefined();

      // No orphaned listItems remain in the DB.
      const remaining = await t.run(async (ctx) =>
        ctx.db
          .query("listItems")
          .withIndex("by_list", (q) => q.eq("listId", listId))
          .collect(),
      );
      expect(remaining).toEqual([]);
    });
  });

  describe("rollDice", () => {
    test("rejects with 'List is empty' when the list has no items", async () => {
      const t = convexTest(schema, modules);

      const { listId, threadId, userId } = await t.run(async (ctx) => {
        const listId = await ctx.db.insert("lists", {
          name: "Empty",
          createdAt: Date.now(),
        });
        const threadId = await ctx.db.insert("threads", {
          title: "Chat",
          kind: "general",
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
        });
        const userId = await ctx.db.insert("users", {
          clientId: "c1",
          name: "Al",
          createdAt: Date.now(),
        });
        return { listId, threadId, userId };
      });

      await expect(
        t.mutation(api.lists.rollDice, {
          threadId,
          userId,
          listId,
          sides: 6,
        }),
      ).rejects.toThrow("List is empty");
    });

    test("maps deterministically (random=0 => value=1, index=0) and posts a system message", async () => {
      const t = convexTest(schema, modules);

      const { listId, threadId, userId } = await t.run(async (ctx) => {
        const listId = await ctx.db.insert("lists", {
          name: "Picks",
          createdAt: Date.now(),
        });
        await ctx.db.insert("listItems", {
          listId,
          text: "first-item",
          description: "do a thing",
          order: 0,
        });
        await ctx.db.insert("listItems", {
          listId,
          text: "second-item",
          order: 1,
        });
        await ctx.db.insert("listItems", {
          listId,
          text: "third-item",
          order: 2,
        });
        const threadId = await ctx.db.insert("threads", {
          title: "Chat",
          kind: "general",
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
        });
        const userId = await ctx.db.insert("users", {
          clientId: "c1",
          name: "Roller",
          createdAt: Date.now(),
        });
        return { listId, threadId, userId };
      });

      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
      try {
        const result = await t.mutation(api.lists.rollDice, {
          threadId,
          userId,
          listId,
          sides: 6,
        });

        // random=0 => value = floor(0*6)+1 = 1, index = (1-1)%3 = 0 => first item.
        expect(result.value).toBe(1);
        expect(result.itemText).toBe("first-item");
        expect(result.itemDescription).toBe("do a thing");
      } finally {
        randomSpy.mockRestore();
      }

      // A system message carrying dice metadata was posted to the thread.
      const messages = await t.query(api.messages.list, { threadId });
      const systemMsg = messages.find(
        (m) => m.kind === "system" && m.dice !== undefined,
      );
      expect(systemMsg).toBeDefined();
      expect(systemMsg?.dice?.itemText).toBe("first-item");
      expect(systemMsg?.dice?.itemDescription).toBe("do a thing");
      expect(systemMsg?.dice?.value).toBe(1);
      expect(systemMsg?.dice?.sides).toBe(6);
      expect(systemMsg?.dice?.listName).toBe("Picks");
      expect(systemMsg?.userId).toBeUndefined();
    });

    test("returned value stays within [1, sides]; random=0.999 => value === sides", async () => {
      const t = convexTest(schema, modules);

      const { listId, threadId, userId } = await t.run(async (ctx) => {
        const listId = await ctx.db.insert("lists", {
          name: "Bounded",
          createdAt: Date.now(),
        });
        for (let i = 0; i < 4; i++) {
          await ctx.db.insert("listItems", {
            listId,
            text: `item-${i}`,
            order: i,
          });
        }
        const threadId = await ctx.db.insert("threads", {
          title: "Chat",
          kind: "general",
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
        });
        const userId = await ctx.db.insert("users", {
          clientId: "c1",
          name: "Roller",
          createdAt: Date.now(),
        });
        return { listId, threadId, userId };
      });

      const sides = 20;
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.999);
      try {
        const result = await t.mutation(api.lists.rollDice, {
          threadId,
          userId,
          listId,
          sides,
        });
        // floor(0.999*20)+1 = 19+1 = 20 = sides (the upper bound).
        expect(result.value).toBe(sides);
        expect(result.value).toBeGreaterThanOrEqual(1);
        expect(result.value).toBeLessThanOrEqual(sides);
      } finally {
        randomSpy.mockRestore();
      }
    });
  });
});
