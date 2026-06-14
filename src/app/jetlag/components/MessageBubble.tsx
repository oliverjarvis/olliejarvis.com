"use client";

import { Doc } from "@convex/_generated/dataModel";

// The message query augments each message doc with a resolved media `url`.
export type MessageWithUrl = Doc<"messages"> & { url: string | null };

type Props = {
  message: MessageWithUrl;
  mine: boolean;
};

/**
 * Renders a single message. Branches on `kind`:
 *  - text:   a chat bubble aligned right (mine) or left (others)
 *  - image:  an <img> with optional caption
 *  - video:  a <video controls> with optional caption
 *  - system: a centered muted line; dice rolls get a subtle highlight + 🎲
 */
export function MessageBubble({ message, mine }: Props) {
  if (message.kind === "system") {
    const isDice = !!message.dice;
    return (
      <div className="flex justify-center px-2 py-1">
        <div
          className={
            isDice
              ? "inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200"
              : "rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          }
        >
          {isDice && <span aria-hidden>🎲</span>}
          <span>{message.body}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex px-2 py-1 ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
        {!mine && (
          <div className="mb-0.5 px-1 text-xs font-medium text-neutral-500">
            {message.authorName}
          </div>
        )}

        {message.kind === "text" && (
          <div
            className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
              mine
                ? "rounded-br-sm bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "rounded-bl-sm bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
            }`}
          >
            {message.body}
          </div>
        )}

        {message.kind === "image" && message.url && (
          <div
            className={`overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 ${
              mine ? "rounded-br-sm" : "rounded-bl-sm"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.url}
              alt={message.body ?? "image"}
              className="block max-h-80 w-auto max-w-full object-contain"
            />
            {message.body && (
              <div className="px-3 py-1.5 text-xs text-neutral-500">
                {message.body}
              </div>
            )}
          </div>
        )}

        {message.kind === "video" && message.url && (
          <div
            className={`overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 ${
              mine ? "rounded-br-sm" : "rounded-bl-sm"
            }`}
          >
            <video
              controls
              src={message.url}
              className="block max-h-80 w-auto max-w-full"
            />
            {message.body && (
              <div className="px-3 py-1.5 text-xs text-neutral-500">
                {message.body}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
