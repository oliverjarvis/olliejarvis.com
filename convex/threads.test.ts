/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Load convex function modules (NOT *.test.ts) for the in-memory backend.
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

describe("threads", () => {
  describe("create + get", () => {
    test("create returns an id and get returns a general thread with the title", async () => {
      const t = convexTest(schema, modules);

      const id = await t.mutation(api.threads.create, { title: "Hello" });
      expect(id).toBeTruthy();

      const thread = await t.query(api.threads.get, { threadId: id });
      expect(thread).not.toBeNull();
      expect(thread!._id).toBe(id);
      expect(thread!.title).toBe("Hello");
      expect(thread!.kind).toBe("general");
      // createdAt and lastMessageAt are set to the same "now".
      expect(thread!.createdAt).toBe(thread!.lastMessageAt);
    });
  });

  describe("get", () => {
    test("returns null for a valid id whose thread has been deleted", async () => {
      const t = convexTest(schema, modules);

      const id = await t.mutation(api.threads.create, { title: "Doomed" });
      // Delete the thread directly, leaving us with a valid-but-absent id.
      await t.run(async (ctx) => {
        await ctx.db.delete(id);
      });

      const thread = await t.query(api.threads.get, { threadId: id });
      expect(thread).toBeNull();
    });
  });

  describe("list", () => {
    test("orders threads by lastMessageAt DESC", async () => {
      vi.useFakeTimers();
      try {
        const t = convexTest(schema, modules);

        // Thread A created at the earlier time.
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
        const idA = await t.mutation(api.threads.create, { title: "A" });

        // Thread B created later.
        vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
        const idB = await t.mutation(api.threads.create, { title: "B" });

        const threads = await t.query(api.threads.list, {});
        expect(threads).toHaveLength(2);
        // Most recently active first.
        expect(threads[0]._id).toBe(idB);
        expect(threads[1]._id).toBe(idA);
        expect(threads[0].lastMessageAt).toBeGreaterThan(
          threads[1].lastMessageAt,
        );
      } finally {
        vi.useRealTimers();
      }
    });

    test("returns an empty array when no threads exist", async () => {
      const t = convexTest(schema, modules);
      const threads = await t.query(api.threads.list, {});
      expect(threads).toEqual([]);
    });
  });
});
