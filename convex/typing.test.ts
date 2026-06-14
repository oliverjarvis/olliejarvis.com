/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Load convex function modules (NOT *.test.ts) for the in-memory backend.
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

// Seed a thread + two users, returning their ids.
async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const threadId = await ctx.db.insert("threads", {
      title: "General",
      kind: "general" as const,
      createdAt: now,
      lastMessageAt: now,
    });
    const userA = await ctx.db.insert("users", {
      clientId: "client-a",
      name: "Alice",
      createdAt: now,
    });
    const userB = await ctx.db.insert("users", {
      clientId: "client-b",
      name: "Bob",
      createdAt: now,
    });
    return { threadId, userA, userB };
  });
}

describe("typing", () => {
  test("heartbeat creates a row", async () => {
    const t = convexTest(schema, modules);
    const { threadId, userA } = await seed(t);

    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userA,
      name: "Alice",
    });

    const rows = await t.query(api.typing.list, { threadId });
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userA);
    expect(rows[0].name).toBe("Alice");
    expect(rows[0].threadId).toBe(threadId);
  });

  test("heartbeat is an upsert and refreshes updatedAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const t = convexTest(schema, modules);
    const { threadId, userA } = await seed(t);

    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userA,
      name: "Alice",
    });

    const firstRows = await t.query(api.typing.list, { threadId });
    expect(firstRows).toHaveLength(1);
    const firstUpdatedAt = firstRows[0].updatedAt;

    // Advance time, then heartbeat again for the same (thread, user).
    vi.advanceTimersByTime(5000);

    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userA,
      name: "Alice",
    });

    const secondRows = await t.query(api.typing.list, { threadId });
    // Still exactly one row — no duplicates created.
    expect(secondRows).toHaveLength(1);
    expect(secondRows[0]._id).toBe(firstRows[0]._id);
    expect(secondRows[0].updatedAt).toBeGreaterThan(firstUpdatedAt);
    expect(secondRows[0].updatedAt).toBe(firstUpdatedAt + 5000);

    vi.useRealTimers();
  });

  test("heartbeat updates the name if it changed", async () => {
    const t = convexTest(schema, modules);
    const { threadId, userA } = await seed(t);

    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userA,
      name: "Alice",
    });

    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userA,
      name: "Alice Renamed",
    });

    const rows = await t.query(api.typing.list, { threadId });
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userA);
    expect(rows[0].name).toBe("Alice Renamed");
  });

  test("two different users heartbeating the same thread yields two rows", async () => {
    const t = convexTest(schema, modules);
    const { threadId, userA, userB } = await seed(t);

    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userA,
      name: "Alice",
    });
    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userB,
      name: "Bob",
    });

    const rows = await t.query(api.typing.list, { threadId });
    expect(rows).toHaveLength(2);
    const userIds = rows.map((r) => r.userId).sort();
    expect(userIds).toEqual([userA, userB].sort());
  });

  test("clear removes the row for that user only", async () => {
    const t = convexTest(schema, modules);
    const { threadId, userA, userB } = await seed(t);

    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userA,
      name: "Alice",
    });
    await t.mutation(api.typing.heartbeat, {
      threadId,
      userId: userB,
      name: "Bob",
    });

    await t.mutation(api.typing.clear, { threadId, userId: userA });

    const rows = await t.query(api.typing.list, { threadId });
    expect(rows).toHaveLength(1);
    expect(rows.map((r) => r.userId)).not.toContain(userA);
    expect(rows[0].userId).toBe(userB);
  });

  test("clear is a no-op when no row exists", async () => {
    const t = convexTest(schema, modules);
    const { threadId, userA } = await seed(t);

    // Should not throw even though there's nothing to delete.
    await t.mutation(api.typing.clear, { threadId, userId: userA });

    const rows = await t.query(api.typing.list, { threadId });
    expect(rows).toHaveLength(0);
  });
});
