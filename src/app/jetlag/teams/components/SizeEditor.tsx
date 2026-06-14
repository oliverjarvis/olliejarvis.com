"use client";

import { Plus, Trash2 } from "lucide-react";

export function SizeEditor({
  sizes,
  selectedCount,
  onChange,
  onAdd,
  onRemove,
}: {
  sizes: number[];
  selectedCount: number;
  onChange: (index: number, value: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const capacity = sizes.reduce((sum, s) => sum + s, 0);
  const differs = capacity !== selectedCount;

  return (
    <section className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Team sizes</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add team
        </button>
      </div>

      <ul className="space-y-2">
        {sizes.map((size, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-14 text-xs text-neutral-500">Team {i + 1}</span>
            <input
              type="number"
              min={1}
              value={size}
              onChange={(e) => onChange(i, Number(e.target.value))}
              className="w-20 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove team ${i + 1}`}
              className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <p
        className={`text-xs ${
          differs ? "text-amber-600 dark:text-amber-500" : "text-neutral-500"
        }`}
      >
        Capacity {capacity} vs {selectedCount} selected.
        {differs &&
          (capacity < selectedCount
            ? " Extra people will be distributed round-robin."
            : " Some teams will end up smaller — that's fine.")}
      </p>
    </section>
  );
}
