"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { MessageSquare } from "lucide-react";
import { useIdentity } from "../IdentityProvider";
import { ThreadSidebar } from "./ThreadSidebar";
import { MessagePanel } from "./MessagePanel";

/**
 * Two-pane chat view. Owns the "selected thread" state, seeded from the
 * `?thread=` URL param so deep links work, and falling back to the first
 * thread once the list loads. Reads `useSearchParams()`, so it MUST be rendered
 * inside a <Suspense> boundary (see page.tsx).
 */
export function ChatView() {
  const { userId, name } = useIdentity();
  const router = useRouter();
  const searchParams = useSearchParams();

  const threads = useQuery(api.threads.list);

  // Seed selection from the URL param (if present) on first render.
  const paramThread = searchParams.get("thread");
  const [selectedId, setSelectedId] = useState<Id<"threads"> | null>(
    paramThread ? (paramThread as Id<"threads">) : null,
  );

  // Once threads load, default to the first one if nothing is selected yet
  // (and no valid deep link was provided).
  useEffect(() => {
    if (!threads) return;
    if (selectedId && threads.some((t) => t._id === selectedId)) return;
    if (threads.length > 0) {
      setSelectedId(threads[0]._id);
    } else {
      setSelectedId(null);
    }
  }, [threads, selectedId]);

  function handleSelect(threadId: Id<"threads">) {
    setSelectedId(threadId);
    // Keep the URL in sync so the selection is shareable / refresh-safe.
    const params = new URLSearchParams(searchParams.toString());
    params.set("thread", threadId);
    router.replace(`/jetlag?${params.toString()}`, { scroll: false });
  }

  const hasThreads = threads === undefined || threads.length > 0;

  return (
    <div className="flex h-full min-h-0">
      <ThreadSidebar selectedThreadId={selectedId} onSelect={handleSelect} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!hasThreads ? (
          <EmptyState
            title="No chats yet"
            subtitle="Create your first chat from the sidebar to start talking."
          />
        ) : selectedId ? (
          <MessagePanel
            key={selectedId}
            threadId={selectedId}
            myUserId={userId}
            myName={name}
          />
        ) : (
          <EmptyState
            title="Pick a chat"
            subtitle="Select a conversation from the left to view its messages."
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <MessageSquare className="h-8 w-8 text-neutral-300 dark:text-neutral-700" />
      <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
        {title}
      </h2>
      <p className="max-w-xs text-sm text-neutral-400">{subtitle}</p>
    </div>
  );
}
