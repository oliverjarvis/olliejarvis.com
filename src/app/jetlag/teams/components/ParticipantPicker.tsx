"use client";

import { Users } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";

type User = { _id: Id<"users">; name: string };

export function ParticipantPicker({
  users,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  users: User[];
  selected: Set<Id<"users">>;
  onToggle: (id: Id<"users">) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const allSelected = users.length > 0 && selected.size === users.length;

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-neutral-500" />
          <h2 className="text-sm font-semibold">Participants</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {selected.size} selected
          </span>
        </div>
        <button
          type="button"
          onClick={allSelected ? onClearAll : onSelectAll}
          className="text-xs font-medium text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {users.map((u) => {
          const checked = selected.has(u._id);
          return (
            <li key={u._id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(u._id)}
                  className="h-4 w-4 accent-neutral-900 dark:accent-white"
                />
                <span className={checked ? "" : "text-neutral-500"}>{u.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
