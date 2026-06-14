"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Dices } from "lucide-react";

type Props = {
  threadId: Id<"threads">;
  userId: Id<"users">;
  onRolled: () => void;
};

/**
 * Inline dice control. Lets the user pick a non-empty list and a number of
 * sides, then rolls. The resulting system message arrives via the reactive
 * messages query, so we just close the panel on success.
 */
export function DiceRoller({ threadId, userId, onRolled }: Props) {
  const lists = useQuery(api.lists.list);
  const rollDice = useMutation(api.lists.rollDice);

  const nonEmpty = (lists ?? []).filter((l) => l.itemCount > 0);

  const [listId, setListId] = useState<Id<"lists"> | "">("");
  const [sides, setSides] = useState(20);
  const [rolling, setRolling] = useState(false);

  // Default to the first non-empty list once lists load / change.
  useEffect(() => {
    if (!listId && nonEmpty.length > 0) {
      setListId(nonEmpty[0]._id);
    }
  }, [nonEmpty, listId]);

  const disabled = nonEmpty.length === 0;

  async function handleRoll() {
    if (disabled || !listId || rolling) return;
    setRolling(true);
    try {
      await rollDice({
        threadId,
        userId,
        listId: listId as Id<"lists">,
        sides: Math.max(1, Math.floor(sides) || 1),
      });
      onRolled();
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900">
      {disabled ? (
        <p className="px-1 py-1.5 text-xs text-neutral-500">
          No non-empty lists yet. Add items to a list to roll dice against it.
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
            List
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value as Id<"lists">)}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            >
              {nonEmpty.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name} ({l.itemCount})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
            Sides
            <input
              type="number"
              min={1}
              value={sides}
              onChange={(e) => setSides(Number(e.target.value))}
              className="w-20 rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </label>

          <button
            type="button"
            onClick={handleRoll}
            disabled={rolling || !listId}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            <Dices className="h-4 w-4" />
            {rolling ? "Rolling…" : "Roll"}
          </button>
        </>
      )}
    </div>
  );
}
