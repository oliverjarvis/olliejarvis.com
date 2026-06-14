"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Dices, Paperclip, Send } from "lucide-react";
import { DiceRoller } from "./DiceRoller";

type Props = {
  threadId: Id<"threads">;
  userId: Id<"users">;
  name: string;
};

// At most one typing heartbeat per this interval.
const HEARTBEAT_THROTTLE_MS = 1500;
// Clear the typing indicator after this much idle time.
const IDLE_CLEAR_MS = 3000;

/**
 * The message composer: text input + send, attach media, and a dice control.
 *
 * Typing presence: on each keystroke we send a throttled heartbeat (≤1/1.5s)
 * and (re)arm a 3s idle timer that clears the indicator. Timers are cleaned up
 * on unmount and whenever the thread changes.
 */
export function Composer({ threadId, userId, name }: Props) {
  const send = useMutation(api.messages.send);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const sendMedia = useMutation(api.messages.sendMedia);
  const heartbeat = useMutation(api.typing.heartbeat);
  const clearTyping = useMutation(api.typing.clear);

  const [body, setBody] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showDice, setShowDice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastHeartbeatRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending idle timer + remove our typing row when the thread changes
  // or the component unmounts.
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      lastHeartbeatRef.current = 0;
      void clearTyping({ threadId, userId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, userId]);

  function signalTyping() {
    const now = Date.now();
    // Throttle heartbeats to at most one per HEARTBEAT_THROTTLE_MS.
    if (now - lastHeartbeatRef.current >= HEARTBEAT_THROTTLE_MS) {
      lastHeartbeatRef.current = now;
      void heartbeat({ threadId, userId, name });
    }
    // (Re)arm the idle timer that clears our indicator.
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      lastHeartbeatRef.current = 0;
      void clearTyping({ threadId, userId });
    }, IDLE_CLEAR_MS);
  }

  function handleChange(value: string) {
    setBody(value);
    if (value.length > 0) signalTyping();
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBody("");
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    lastHeartbeatRef.current = 0;
    await send({ threadId, userId, body: trimmed });
    await clearTyping({ threadId, userId });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      const kind = file.type.startsWith("video") ? "video" : "image";
      await sendMedia({ threadId, userId, storageId, kind });
    } finally {
      setUploading(false);
      // Reset so picking the same file again still fires onChange.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
      {showDice && (
        <div className="mb-2">
          <DiceRoller
            threadId={threadId}
            userId={userId}
            onRolled={() => setShowDice(false)}
          />
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFile}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-md p-2 text-neutral-500 transition hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800"
          aria-label="Attach media"
          title="Attach image or video"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowDice((s) => !s)}
          className={`shrink-0 rounded-md p-2 transition ${
            showDice
              ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
              : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
          aria-label="Roll dice"
          title="Roll dice against a list"
        >
          <Dices className="h-5 w-5" />
        </button>

        <input
          value={body}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={uploading ? "Uploading…" : "Type a message…"}
          disabled={uploading}
          className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-neutral-500 disabled:opacity-60 dark:border-neutral-700"
        />

        <button
          type="submit"
          disabled={!body.trim() || uploading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
}
