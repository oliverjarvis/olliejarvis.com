"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

type Props = {
  threadId: Id<"threads">;
  myUserId: Id<"users">;
};

// A typing row is considered stale once it hasn't been refreshed for this long.
const STALE_MS = 5000;

/**
 * Shows "<name> is typing…" / "<a>, <b> are typing…" for everyone in the thread
 * except the current user, ignoring stale heartbeats. A 1s tick re-evaluates
 * staleness so indicators disappear even without a new query result.
 */
export function TypingIndicator({ threadId, myUserId }: Props) {
  const rows = useQuery(api.typing.list, { threadId });

  // Tick once a second so staleness is re-evaluated on the client.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!rows) return <div className="h-5" />;

  const names = rows
    .filter((row) => row.userId !== myUserId && now - row.updatedAt <= STALE_MS)
    .map((row) => row.name);

  if (names.length === 0) return <div className="h-5" />;

  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : `${names.join(", ")} are typing…`;

  return (
    <div className="h-5 px-2 text-xs italic text-neutral-400">{label}</div>
  );
}
