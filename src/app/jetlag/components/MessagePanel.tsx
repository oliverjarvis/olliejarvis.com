"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Users } from "lucide-react";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";
import { Composer } from "./Composer";

type Props = {
  threadId: Id<"threads">;
  myUserId: Id<"users">;
  myName: string;
};

/**
 * Right pane for a selected thread: header (title), the scrolling message list,
 * the typing indicator, and the composer. `key={threadId}` on this component
 * (set by the parent) resets composer state when the thread changes.
 */
export function MessagePanel({ threadId, myUserId, myName }: Props) {
  const thread = useQuery(api.threads.get, { threadId });

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <h1 className="truncate text-sm font-semibold">
          {thread === undefined
            ? "Loading…"
            : (thread?.title ?? "Unknown chat")}
        </h1>
        {thread?.kind === "team" && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Users className="h-2.5 w-2.5" />
            team
          </span>
        )}
      </header>

      <MessageList threadId={threadId} myUserId={myUserId} />

      <TypingIndicator threadId={threadId} myUserId={myUserId} />

      <Composer threadId={threadId} userId={myUserId} name={myName} />
    </section>
  );
}
