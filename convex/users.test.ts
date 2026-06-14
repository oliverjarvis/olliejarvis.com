/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Load convex function modules (NOT *.test.ts) for the in-memory backend.
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

describe("convex/users", () => {
  test("createOrUpdate inserts a new user; getByClientId returns it with the correct name", async () => {
    const t = convexTest(schema, modules);

    const id = await t.mutation(api.users.createOrUpdate, {
      clientId: "client-1",
      name: "Alice",
    });
    expect(id).toBeTruthy();

    const user = await t.query(api.users.getByClientId, { clientId: "client-1" });
    expect(user).not.toBeNull();
    expect(user!._id).toBe(id);
    expect(user!.clientId).toBe("client-1");
    expect(user!.name).toBe("Alice");
  });

  test("getByClientId returns null for an unknown clientId", async () => {
    const t = convexTest(schema, modules);

    // Seed an unrelated user so the table isn't empty.
    await t.mutation(api.users.createOrUpdate, {
      clientId: "client-known",
      name: "Known",
    });

    const user = await t.query(api.users.getByClientId, {
      clientId: "client-does-not-exist",
    });
    expect(user).toBeNull();
  });

  test("createOrUpdate is idempotent by clientId: updates the name and creates no duplicate", async () => {
    const t = convexTest(schema, modules);

    const firstId = await t.mutation(api.users.createOrUpdate, {
      clientId: "client-1",
      name: "Original",
    });
    const secondId = await t.mutation(api.users.createOrUpdate, {
      clientId: "client-1",
      name: "Updated",
    });

    // Same id reused — no new row inserted.
    expect(secondId).toBe(firstId);

    const all = await t.query(api.users.list, {});
    expect(all).toHaveLength(1);
    expect(all[0]._id).toBe(firstId);
    // Name reflects the latest call.
    expect(all[0].name).toBe("Updated");

    const fetched = await t.query(api.users.getByClientId, {
      clientId: "client-1",
    });
    expect(fetched!.name).toBe("Updated");
  });

  test("createOrUpdate with two different clientIds creates two users; list() returns both sorted by createdAt asc", async () => {
    const t = convexTest(schema, modules);

    // Control createdAt so ordering is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const idA = await t.mutation(api.users.createOrUpdate, {
      clientId: "client-a",
      name: "Ada",
    });

    vi.setSystemTime(new Date("2026-01-01T00:00:01Z"));
    const idB = await t.mutation(api.users.createOrUpdate, {
      clientId: "client-b",
      name: "Bob",
    });
    vi.useRealTimers();

    expect(idA).not.toBe(idB);

    const all = await t.query(api.users.list, {});
    expect(all).toHaveLength(2);
    // Sorted ascending by createdAt: Ada (earlier) then Bob (later).
    expect(all.map((u) => u._id)).toEqual([idA, idB]);
    expect(all.map((u) => u.name)).toEqual(["Ada", "Bob"]);
    expect(all[0].createdAt).toBeLessThan(all[1].createdAt);
  });
});
