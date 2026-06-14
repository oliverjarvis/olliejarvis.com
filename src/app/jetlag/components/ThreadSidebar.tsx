"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Plus, Users, X } from "lucide-react";
import { relativeTime } from "./relativeTime";

type Props = {
  selectedThreadId: Id<"threads"> | null;
  onSelect: (threadId: Id<"threads">) => void;
};

/**
 * Left pane: lists every thread (most-recent first) and lets the user create a
 * new chat. The selected thread is highlighted; "team" threads get a badge.
 */
export function ThreadSidebar({ selectedThreadId, onSelect }: Props) {
  const threads = useQuery(api.threads.list);
  const createThread = useMutation(api.threads.create);

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // Re-render once a minute so relative times stay roughly fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const newId = await createThread({ title: trimmed });
      onSelect(newId);
      setTitle("");
      setComposing(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Chats</h2>
        <button
          type="button"
          onClick={() => setComposing((c) => !c)}
          className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </button>
      </div>

      {composing && (
        <form
          onSubmit={handleCreate}
          className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chat title"
            maxLength={80}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
          />
          <button
            type="submit"
            disabled={!title.trim() || creating}
            className="rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white transition disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {creating ? "…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setComposing(false);
              setTitle("");
            }}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {threads === undefined ? (
          <div className="p-4 text-sm text-neutral-400">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-sm text-neutral-500">
            No chats yet. Create your first one above.
          </div>
        ) : (
          <ul>
            {threads.map((thread) => {
              const active = thread._id === selectedThreadId;
              return (
                <li key={thread._id}>
                  <button
                    type="button"
                    onClick={() => onSelect(thread._id)}
                    className={`flex w-full items-center gap-2 border-b border-neutral-100 px-3 py-2.5 text-left transition dark:border-neutral-900 ${
                      active
                        ? "bg-neutral-100 dark:bg-neutral-800"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {thread.title}
                        </span>
                        {thread.kind === "team" && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <Users className="h-2.5 w-2.5" />
                            team
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {relativeTime(thread.lastMessageAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
