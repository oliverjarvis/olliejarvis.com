/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

// Load convex function modules (NOT *.test.ts) for the in-memory backend.
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

type T = ReturnType<typeof convexTest>;

// Seed N users with distinct clientId/name. Returns the inserted user ids.
async function seedUsers(t: T, n: number): Promise<Id<"users">[]> {
  return await t.run(async (ctx) => {
    const ids: Id<"users">[] = [];
    for (let i = 0; i < n; i++) {
      const id = await ctx.db.insert("users", {
        clientId: `client-${i}`,
        name: `User ${i}`,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  });
}

describe("teams.generate", () => {
  test("places every user exactly once across the requested teams", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedUsers(t, 5);

    const results = await t.mutation(api.teams.generate, { sizes: [2, 3] });

    // Two teams requested -> two teams returned.
    expect(results).toHaveLength(2);

    // Total membership equals the number of seeded users.
    const total = results.reduce((sum, r) => sum + r.members.length, 0);
    expect(total).toBe(5);

    // The union of member ids equals the seeded ids exactly (no dupes, no gaps).
    const allMemberIds = results.flatMap((r) =>
      r.members.map((m) => m.userId),
    );
    expect(new Set(allMemberIds).size).toBe(5);
    expect(new Set(allMemberIds)).toEqual(new Set(seeded));

    // Default name prefix.
    for (const r of results) {
      expect(r.name.startsWith("Team")).toBe(true);
    }
  });

  test("creates a real team-kind thread linked back to each team", async () => {
    const t = convexTest(schema, modules);
    await seedUsers(t, 5);

    const results = await t.mutation(api.teams.generate, { sizes: [2, 3] });

    for (const r of results) {
      const thread = await t.run((ctx) => ctx.db.get(r.threadId));
      expect(thread).not.toBeNull();
      expect(thread!.kind).toBe("team");
      // Thread points back to the team that owns it.
      expect(thread!.teamId).toBe(r.teamId);
    }
  });

  test("records teamMembers and a 'Team formed' system message", async () => {
    const t = convexTest(schema, modules);
    await seedUsers(t, 5);

    const results = await t.mutation(api.teams.generate, { sizes: [2, 3] });

    // list() reflects the right member counts per team.
    const listed = await t.query(api.teams.list, {});
    expect(listed).toHaveLength(2);

    const countsById = new Map(
      results.map((r) => [r.teamId, r.members.length]),
    );
    for (const team of listed) {
      expect(team.members.length).toBe(countsById.get(team._id));
    }
    // The combined member counts should be 2 + 3 = 5.
    expect(listed.reduce((s, team) => s + team.members.length, 0)).toBe(5);

    // Each team thread carries a system "Team formed" message.
    for (const r of results) {
      const messages = await t.query(api.messages.list, {
        threadId: r.threadId,
      });
      const systemMsg = messages.find((m) => m.kind === "system");
      expect(systemMsg).toBeDefined();
      expect(systemMsg!.body).toContain("Team formed");
    }
  });

  test("round-robins leftover participants so everyone is placed", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedUsers(t, 6);

    // sizes sum to 5 but there are 6 users -> one leftover.
    const results = await t.mutation(api.teams.generate, { sizes: [2, 3] });

    // Still only two teams (the sizes array length).
    expect(results).toHaveLength(2);

    const allMemberIds = results.flatMap((r) =>
      r.members.map((m) => m.userId),
    );
    // Total membership now covers all 6 users.
    expect(allMemberIds).toHaveLength(6);
    expect(new Set(allMemberIds).size).toBe(6);
    expect(new Set(allMemberIds)).toEqual(new Set(seeded));
  });

  test("rejects when there are no participants", async () => {
    const t = convexTest(schema, modules);
    // No users seeded.
    await expect(
      t.mutation(api.teams.generate, { sizes: [2] }),
    ).rejects.toThrow("No participants");
  });

  test("honors a participantIds subset and excludes the rest", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedUsers(t, 4);
    const chosen = [seeded[0], seeded[1]];
    const excluded = [seeded[2], seeded[3]];

    const results = await t.mutation(api.teams.generate, {
      sizes: [2],
      participantIds: chosen,
    });

    expect(results).toHaveLength(1);

    const placedIds = new Set(
      results.flatMap((r) => r.members.map((m) => m.userId)),
    );
    // Exactly the two chosen users are placed.
    expect(placedIds).toEqual(new Set(chosen));
    // The excluded users are not members of any returned team.
    for (const id of excluded) {
      expect(placedIds.has(id)).toBe(false);
    }
  });

  test("honors a custom namePrefix", async () => {
    const t = convexTest(schema, modules);
    await seedUsers(t, 2);

    const results = await t.mutation(api.teams.generate, {
      sizes: [2],
      namePrefix: "Squad",
    });

    expect(results).toHaveLength(1);
    expect(results[0].name.startsWith("Squad")).toBe(true);
  });
});

describe("teams.list", () => {
  test("returns teams newest first", async () => {
    const t = convexTest(schema, modules);

    // Two teams created at distinct times so createdAt ordering is unambiguous.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    await t.run(async (ctx) => {
      const t1Thread = await ctx.db.insert("threads", {
        title: "Older",
        kind: "team",
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      });
      await ctx.db.insert("teams", {
        name: "Older",
        threadId: t1Thread,
        createdAt: Date.now(),
      });
    });

    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    await t.run(async (ctx) => {
      const t2Thread = await ctx.db.insert("threads", {
        title: "Newer",
        kind: "team",
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      });
      await ctx.db.insert("teams", {
        name: "Newer",
        threadId: t2Thread,
        createdAt: Date.now(),
      });
    });
    vi.useRealTimers();

    const listed = await t.query(api.teams.list, {});
    expect(listed.map((team) => team.name)).toEqual(["Newer", "Older"]);
  });
});
