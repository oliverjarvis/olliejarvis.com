"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Dices, List as ListIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { ExcelImport } from "./components/ExcelImport";

export default function ListsPage() {
  const [selectedListId, setSelectedListId] = useState<Id<"lists"> | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  const lists = useQuery(api.lists.list);
  const selected = useQuery(
    api.lists.get,
    selectedListId ? { listId: selectedListId } : "skip",
  );

  const createList = useMutation(api.lists.create);
  const addItems = useMutation(api.lists.addItems);
  const removeList = useMutation(api.lists.remove);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const id = await createList({ name });
      setNewListName("");
      setSelectedListId(id);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!selectedListId) return;
    if (!confirm("Delete this list and all of its items?")) return;
    await removeList({ listId: selectedListId });
    setSelectedListId(null);
  }

  async function handleManualAdd(e: FormEvent) {
    e.preventDefault();
    const text = manualText.trim();
    if (!text || !selectedListId) return;
    const description = manualDesc.trim() || undefined;
    setAddingManual(true);
    try {
      await addItems({ listId: selectedListId, items: [{ text, description }] });
      setManualText("");
      setManualDesc("");
    } finally {
      setAddingManual(false);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left: all lists + create */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
        <form
          onSubmit={handleCreate}
          className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800"
        >
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="New list"
            maxLength={60}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
          />
          <button
            type="submit"
            disabled={creating || !newListName.trim()}
            aria-label="Create list"
            className="inline-flex items-center justify-center rounded-md bg-neutral-900 p-2 text-white transition disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {lists === undefined ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading lists…
            </div>
          ) : lists.length === 0 ? (
            <p className="px-2 py-3 text-sm text-neutral-400">
              No lists yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-1">
              {lists.map((l) => {
                const active = l._id === selectedListId;
                return (
                  <li key={l._id}>
                    <button
                      onClick={() => setSelectedListId(l._id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ListIcon className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate">{l.name}</span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          active
                            ? "bg-white/20 dark:bg-neutral-900/10"
                            : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {l.itemCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Right: selected list */}
      <section className="flex min-w-0 flex-1 flex-col">
        {selectedListId === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-neutral-400">
            <ListIcon className="h-8 w-8 opacity-50" />
            <p className="text-sm">Select a list, or create one, to view its items.</p>
          </div>
        ) : selected === undefined ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading list…
          </div>
        ) : selected.list === null ? (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
            This list no longer exists.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold">
                  {selected.list.name}
                </h1>
                <p className="text-xs text-neutral-500">
                  {selected.items.length} item
                  {selected.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={handleDelete}
                aria-label="Delete list"
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-4 w-4" />
                Delete list
              </button>
            </div>

            {/* Import + manual add */}
            <div className="space-y-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <ExcelImport
                disabled={false}
                onImport={(items) =>
                  addItems({ listId: selectedListId, items })
                }
              />

              <form onSubmit={handleManualAdd} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Challenge title…"
                    className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm font-medium outline-none focus:border-neutral-500 dark:border-neutral-700"
                  />
                  <button
                    type="submit"
                    disabled={addingManual || !manualText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {addingManual ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </button>
                </div>
                <input
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Description (optional)…"
                  className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
                />
              </form>

              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Dices className="h-3.5 w-3.5" />
                These items are what the dice roller in Chat draws from.
              </p>
            </div>

            {/* Items */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {selected.items.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  No items yet. Import an Excel file or add one above.
                </p>
              ) : (
                <ol className="space-y-1">
                  {selected.items.map((item, i) => (
                    <li
                      key={item._id}
                      className="flex items-start gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                    >
                      <span className="mt-0.5 w-6 shrink-0 text-right text-xs tabular-nums text-neutral-400">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium">{item.text}</p>
                        {item.description && (
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-neutral-500 dark:text-neutral-400">
                            {item.description}
                          </p>
                        )}
                        {item.extra && Object.keys(item.extra).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(item.extra).map(([k, val]) => (
                              <span
                                key={k}
                                className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                              >
                                <span className="font-medium">{k}:</span> {val}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
