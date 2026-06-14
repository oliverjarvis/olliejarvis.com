"use client";

import {
  createContext,
  FormEvent,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

const CLIENT_ID_KEY = "jetlag_client_id";

export type Identity = {
  clientId: string;
  userId: Id<"users">;
  name: string;
};

const IdentityContext = createContext<Identity | null>(null);

/**
 * Returns the current user's identity. Guaranteed to be present because
 * <IdentityProvider> only renders its children once a user is registered.
 */
export function useIdentity(): Identity {
  const ctx = useContext(IdentityContext);
  if (!ctx) {
    throw new Error("useIdentity must be used within a registered IdentityProvider");
  }
  return ctx;
}

/**
 * Gives every visitor a stable anonymous identity:
 *  - generates + persists a uuid clientId in localStorage on first visit
 *  - looks the user up in Convex by that clientId
 *  - if none exists, asks for a display name and creates the user
 * Children only render once a name is set.
 */
export function IdentityProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    setClientId(id);
  }, []);

  const user = useQuery(
    api.users.getByClientId,
    clientId ? { clientId } : "skip",
  );
  const createOrUpdate = useMutation(api.users.createOrUpdate);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || !clientId) return;
    setSubmitting(true);
    try {
      await createOrUpdate({ clientId, name: trimmed });
    } finally {
      setSubmitting(false);
    }
  }

  // Still resolving clientId or the user query.
  if (!clientId || user === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  // No user yet — ask for a name.
  if (user === null) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Welcome to Jetlag</h1>
            <p className="text-sm text-neutral-500">
              Pick a display name so others know who you are in the chats.
            </p>
          </div>
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
          />
          <button
            type="submit"
            disabled={submitting || !nameInput.trim()}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <IdentityContext.Provider
      value={{ clientId, userId: user._id, name: user.name }}
    >
      {children}
    </IdentityContext.Provider>
  );
}
