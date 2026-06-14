import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Jetlag: real-time multi-thread chat, importable lists with dice rolls,
// random team generation. No auth — users are identified by a client-generated
// uuid stored in localStorage.
export default defineSchema({
  // A person using the app. Identified by `clientId` (uuid in localStorage).
  users: defineTable({
    clientId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_clientId", ["clientId"]),

  // A conversation thread.
  threads: defineTable({
    title: v.string(),
    // "general" = manually created chat, "team" = auto-created for a team.
    kind: v.union(v.literal("general"), v.literal("team")),
    teamId: v.optional(v.id("teams")),
    createdAt: v.number(),
    lastMessageAt: v.number(),
  }).index("by_lastMessage", ["lastMessageAt"]),

  // A message in a thread. `kind` distinguishes text / media / system (dice).
  messages: defineTable({
    threadId: v.id("threads"),
    userId: v.optional(v.id("users")), // null for system messages
    authorName: v.string(),
    kind: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("system"),
    ),
    body: v.optional(v.string()), // text content or media caption
    storageId: v.optional(v.id("_storage")), // for image/video
    // present on dice-roll system messages
    dice: v.optional(
      v.object({
        sides: v.number(),
        value: v.number(),
        listId: v.id("lists"),
        listName: v.string(),
        itemText: v.string(),
      }),
    ),
    createdAt: v.number(),
  }).index("by_thread", ["threadId", "createdAt"]),

  // Typing indicator heartbeats. One row per (thread,user); refreshed while typing.
  typing: defineTable({
    threadId: v.id("threads"),
    userId: v.id("users"),
    name: v.string(),
    updatedAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_thread_user", ["threadId", "userId"]),

  // A named list of items (importable from Excel).
  lists: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }),

  // An item within a list. `order` is the 0-based position (used by dice mapping).
  listItems: defineTable({
    listId: v.id("lists"),
    text: v.string(),
    order: v.number(),
    // extra spreadsheet columns keyed by header, preserved as strings
    extra: v.optional(v.record(v.string(), v.string())),
  }).index("by_list", ["listId", "order"]),

  // A generated team. Each team gets its own chat thread.
  teams: defineTable({
    name: v.string(),
    threadId: v.id("threads"),
    createdAt: v.number(),
  }),

  // Membership of a user in a team.
  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    name: v.string(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"]),
});
