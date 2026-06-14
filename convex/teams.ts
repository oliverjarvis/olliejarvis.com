import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// A team enriched with its member list (userId + display name).
type TeamWithMembers = Doc<"teams"> & {
  members: Array<{ userId: Id<"users">; name: string }>;
};

// List every team, newest first, with its members resolved from teamMembers.
export const list = query({
  args: {},
  handler: async (ctx): Promise<TeamWithMembers[]> => {
    // Fetch all teams and sort by createdAt DESC (no dedicated index needed).
    const teams = await ctx.db.query("teams").collect();
    teams.sort((a, b) => b.createdAt - a.createdAt);

    // Resolve members for each team via the by_team index.
    const result: TeamWithMembers[] = [];
    for (const team of teams) {
      const memberDocs = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      result.push({
        ...team,
        members: memberDocs.map((m) => ({ userId: m.userId, name: m.name })),
      });
    }
    return result;
  },
});

// Shape returned for each freshly created team.
type GeneratedTeam = {
  teamId: Id<"teams">;
  name: string;
  threadId: Id<"threads">;
  members: Array<{ userId: Id<"users">; name: string }>;
};

// Randomly assign participants into teams of the requested sizes, creating a
// dedicated chat thread for each team.
export const generate = mutation({
  args: {
    sizes: v.array(v.number()),
    participantIds: v.optional(v.array(v.id("users"))),
    namePrefix: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GeneratedTeam[]> => {
    // 1. Resolve the pool of participants.
    let participants: Doc<"users">[];
    if (args.participantIds) {
      const fetched = await Promise.all(
        args.participantIds.map((id) => ctx.db.get(id))
      );
      // Drop any ids that no longer resolve to a user.
      participants = fetched.filter((u): u is Doc<"users"> => u !== null);
    } else {
      participants = await ctx.db.query("users").collect();
    }

    // 2. Nothing to assign -> caller error.
    if (participants.length === 0) {
      throw new Error("No participants to assign");
    }

    // 3. Shuffle in place (Fisher-Yates) for random assignment.
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }

    // 4. Defaults.
    const prefix = args.namePrefix || "Team";
    const now = Date.now();

    // 5. Build groups by slicing the requested sizes off the front of the pool.
    let cursor = 0;
    const groups: Doc<"users">[][] = [];
    for (const size of args.sizes) {
      // Take up to `size` remaining participants (group may be smaller).
      const group = participants.slice(cursor, cursor + size);
      cursor += group.length;
      groups.push(group);
    }

    // Distribute any leftover participants round-robin across existing groups
    // so that everyone is placed somewhere.
    if (cursor < participants.length && groups.length > 0) {
      const leftovers = participants.slice(cursor);
      for (let i = 0; i < leftovers.length; i++) {
        groups[i % groups.length].push(leftovers[i]);
      }
    }

    // 6. Materialize each non-empty group into a thread + team + members.
    const results: GeneratedTeam[] = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.length === 0) continue; // skip empty groups entirely

      const name = `${prefix} ${i + 1}`;

      // Create the team's chat thread first.
      const threadId = await ctx.db.insert("threads", {
        title: name,
        kind: "team",
        createdAt: now,
        lastMessageAt: now,
      });

      // Create the team and link it back to its thread.
      const teamId = await ctx.db.insert("teams", {
        name,
        threadId,
        createdAt: now,
      });
      await ctx.db.patch(threadId, { teamId });

      // Record each member of the team.
      const members: Array<{ userId: Id<"users">; name: string }> = [];
      for (const member of group) {
        await ctx.db.insert("teamMembers", {
          teamId,
          userId: member._id,
          name: member.name,
        });
        members.push({ userId: member._id, name: member.name });
      }

      // Announce the team formation in its thread.
      await ctx.db.insert("messages", {
        threadId,
        authorName: "System",
        kind: "system",
        body: `Team formed: ${members.map((m) => m.name).join(", ")}`,
        createdAt: now,
      });

      results.push({ teamId, name, threadId, members });
    }

    // 7. Return the created teams.
    return results;
  },
});
