"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";

type Team = {
  _id: Id<"teams">;
  name: string;
  threadId: Id<"threads">;
  members: Array<{ userId: Id<"users">; name: string }>;
};

export function TeamList({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        No teams yet. Pick participants and generate some.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {teams.map((team) => (
        <li
          key={team._id}
          className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-neutral-500" />
                <h3 className="truncate text-sm font-semibold">{team.name}</h3>
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                {team.members.length > 0
                  ? team.members.map((m) => m.name).join(", ")
                  : "No members"}
              </p>
            </div>
            <Link
              href={`/jetlag?thread=${team.threadId}`}
              className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
            >
              Open chat
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
