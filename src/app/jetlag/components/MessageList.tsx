"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { MessageBubble, MessageWithUrl } from "./MessageBubble";

type Props = {
  threadId: Id<"threads">;
  myUserId: Id<"users">;
};

/**
 * The scrolling list of messages for a thread. Auto-scrolls to the newest
 * message whenever the message count changes (new message arrives or thread
 * switches). This is the only internally-scrolling region of the view.
 */
export function MessageList({ threadId, myUserId }: Props) {
  const messages = useQuery(api.messages.list, { threadId }) as
    | MessageWithUrl[]
    | undefined;

  const bottomRef = useRef<HTMLDivElement>(null);
  const count = messages?.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [count, threadId]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto py-3">
      {messages === undefined ? (
        <div className="p-4 text-sm text-neutral-400">Loading messages…</div>
      ) : messages.length === 0 ? (
        <div className="flex h-full items-center justify-center p-4 text-sm text-neutral-400">
          No messages yet. Say hello!
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            mine={message.userId === myUserId}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
