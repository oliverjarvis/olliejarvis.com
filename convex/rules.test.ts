/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Load convex function modules (NOT *.test.ts) for the in-memory backend.
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

describe("rules", () => {
  test("create + list returns rules in creation order", async () => {
    const t = convexTest(schema, modules);

    const r1 = await t.mutation(api.rules.create, {
      title: "No phones",
      body: "Keep your phone in your pocket.",
    });
    const r2 = await t.mutation(api.rules.create, {
      title: "Stay in zone",
      body: "Remain inside the play area.",
    });

    const rules = await t.query(api.rules.list, {});
    expect(rules.map((r) => r._id)).toEqual([r1, r2]);
    expect(rules.map((r) => r.title)).toEqual(["No phones", "Stay in zone"]);
    expect(rules.map((r) => r.order)).toEqual([0, 1]);
    expect(rules[0].body).toBe("Keep your phone in your pocket.");
  });

  test("update edits the title and body and bumps updatedAt", async () => {
    const t = convexTest(schema, modules);

    const id = await t.mutation(api.rules.create, {
      title: "Old",
      body: "old body",
    });
    const before = (await t.query(api.rules.list, {}))[0];

    const result = await t.mutation(api.rules.update, {
      ruleId: id,
      title: "New",
      body: "new body",
    });
    expect(result).toBeNull();

    const after = (await t.query(api.rules.list, {}))[0];
    expect(after.title).toBe("New");
    expect(after.body).toBe("new body");
    expect(after.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
  });

  test("remove deletes only the targeted rule", async () => {
    const t = convexTest(schema, modules);

    const keep = await t.mutation(api.rules.create, {
      title: "Keep",
      body: "keep me",
    });
    const drop = await t.mutation(api.rules.create, {
      title: "Drop",
      body: "drop me",
    });

    const result = await t.mutation(api.rules.remove, { ruleId: drop });
    expect(result).toBeNull();

    const rules = await t.query(api.rules.list, {});
    expect(rules.map((r) => r._id)).toEqual([keep]);
  });
});
