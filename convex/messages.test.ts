/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

// Load convex function modules (NOT *.test.ts) for the in-memory backend.
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

type TestCtx = ReturnType<typeof convexTest>;

// Seed a user directly into the DB and return its id + name.
async function seedUser(
  t: TestCtx,
  name = "Alice",
): Promise<{ userId: Id<"users">; name: string }> {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      clientId: "client-1",
      name,
      createdAt: Date.now(),
    }),
  );
  return { userId, name };
}

// Seed a thread via the public threads.create mutation.
async function seedThread(t: TestCtx): Promise<Id<"threads">> {
  return await t.mutation(api.threads.create, { title: "Trip planning" });
}

describe("convex/messages", () => {
  describe("send", () => {
    test("creates a text message with denormalized authorName and null url", async () => {
      const t = convexTest(schema, modules);
      const { userId, name } = await seedUser(t, "Bob");
      const threadId = await seedThread(t);

      const messageId = await t.mutation(api.messages.send, {
        threadId,
        userId,
        body: "hello world",
      });
      expect(messageId).toBeTruthy();

      const messages = await t.query(api.messages.list, { threadId });
      expect(messages).toHaveLength(1);

      const [message] = messages;
      expect(message.kind).toBe("text");
      expect(message.body).toBe("hello world");
      expect(message.authorName).toBe(name);
      expect(message.authorName).toBe("Bob");
      expect(message.url).toBeNull();
    });

    test("bumps the thread's lastMessageAt forward in time", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

      const t = convexTest(schema, modules);
      const { userId } = await seedUser(t);
      const threadId = await seedThread(t);

      const before = await t.run(async (ctx) => ctx.db.get(threadId));
      expect(before).not.toBeNull();
      const beforeLastMessageAt = before!.lastMessageAt;

      // Advance time so the send happens strictly later than thread creation.
      vi.advanceTimersByTime(60_000);

      await t.mutation(api.messages.send, {
        threadId,
        userId,
        body: "later message",
      });

      const after = await t.run(async (ctx) => ctx.db.get(threadId));
      expect(after).not.toBeNull();
      const afterLastMessageAt = after!.lastMessageAt;

      expect(afterLastMessageAt).toBeGreaterThan(beforeLastMessageAt);
      expect(afterLastMessageAt - beforeLastMessageAt).toBe(60_000);

      vi.useRealTimers();
    });
  });

  describe("generateUploadUrl", () => {
    test("returns a non-empty string", async () => {
      const t = convexTest(schema, modules);

      const url = await t.mutation(api.messages.generateUploadUrl, {});
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    });
  });

  describe("sendMedia", () => {
    test("creates an image message with caption body and a resolved url, bumping lastMessageAt", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

      const t = convexTest(schema, modules);
      const { userId, name } = await seedUser(t, "Carol");
      const threadId = await seedThread(t);

      const before = await t.run(async (ctx) => ctx.db.get(threadId));
      const beforeLastMessageAt = before!.lastMessageAt;

      // Store a blob to obtain a real storageId.
      const storageId = await t.run(
        async (ctx) =>
          await ctx.storage.store(
            new Blob(["data"], { type: "image/png" }),
          ),
      );

      vi.advanceTimersByTime(5_000);

      const messageId = await t.mutation(api.messages.sendMedia, {
        threadId,
        userId,
        storageId,
        kind: "image",
        caption: "a nice picture",
      });
      expect(messageId).toBeTruthy();

      const messages = await t.query(api.messages.list, { threadId });
      expect(messages).toHaveLength(1);

      const [message] = messages;
      expect(message.kind).toBe("image");
      expect(message.body).toBe("a nice picture");
      expect(message.authorName).toBe(name);
      expect(message.url).not.toBeNull();
      expect(typeof message.url).toBe("string");

      const after = await t.run(async (ctx) => ctx.db.get(threadId));
      expect(after!.lastMessageAt).toBeGreaterThan(beforeLastMessageAt);

      vi.useRealTimers();
    });
  });

  describe("list", () => {
    test("returns messages in createdAt ascending order", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

      const t = convexTest(schema, modules);
      const { userId } = await seedUser(t);
      const threadId = await seedThread(t);

      await t.mutation(api.messages.send, {
        threadId,
        userId,
        body: "first",
      });

      // Advance time so the second message has a strictly later createdAt.
      vi.advanceTimersByTime(1_000);

      await t.mutation(api.messages.send, {
        threadId,
        userId,
        body: "second",
      });

      const messages = await t.query(api.messages.list, { threadId });
      expect(messages).toHaveLength(2);
      expect(messages.map((m) => m.body)).toEqual(["first", "second"]);
      expect(messages[0].createdAt).toBeLessThan(messages[1].createdAt);

      vi.useRealTimers();
    });
  });
});
