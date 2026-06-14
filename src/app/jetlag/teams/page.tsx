"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Shuffle } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { ParticipantPicker } from "./components/ParticipantPicker";
import { SizeEditor } from "./components/SizeEditor";
import { TeamList } from "./components/TeamList";

export default function TeamsPage() {
  const users = useQuery(api.users.list);
  const teams = useQuery(api.teams.list);
  const generate = useMutation(api.teams.generate);

  // Selected participants. Initialized to "all users" once they first load.
  const [selected, setSelected] = useState<Set<Id<"users">>>(new Set());
  const [initialized, setInitialized] = useState(false);

  const [sizes, setSizes] = useState<number[]>([2, 3]);
  const [namePrefix, setNamePrefix] = useState("Team");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Select everyone by default the first time users load.
  useEffect(() => {
    if (!initialized && users && users.length > 0) {
      setSelected(new Set(users.map((u) => u._id)));
      setInitialized(true);
    }
  }, [users, initialized]);

  function toggle(id: Id<"users">) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (users) setSelected(new Set(users.map((u) => u._id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  function changeSize(index: number, value: number) {
    setSizes((prev) =>
      prev.map((s, i) => (i === index ? Math.max(1, value || 1) : s)),
    );
  }

  function addSize() {
    setSizes((prev) => [...prev, 2]);
  }

  function removeSize(index: number) {
    setSizes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      await generate({
        sizes,
        participantIds: Array.from(selected),
        namePrefix: namePrefix.trim() || "Team",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate teams.");
    } finally {
      setGenerating(false);
    }
  }

  // Loading state for the initial query.
  if (users === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  // Empty state: no users have joined yet.
  if (users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
          <h1 className="text-lg font-semibold">No people yet</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Open the Chat tab and set a name first. Once people have joined,
            you can split them into teams here.
          </p>
        </div>
      </div>
    );
  }

  const canGenerate = selected.size > 0 && sizes.length > 0 && !generating;

  return (
    <div className="mx-auto grid h-full max-w-5xl grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
      {/* Left column: configuration */}
      <div className="flex min-h-0 flex-col gap-6">
        <ParticipantPicker
          users={users}
          selected={selected}
          onToggle={toggle}
          onSelectAll={selectAll}
          onClearAll={clearAll}
        />

        <SizeEditor
          sizes={sizes}
          selectedCount={selected.size}
          onChange={changeSize}
          onAdd={addSize}
          onRemove={removeSize}
        />

        <div className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor="name-prefix">
            Name prefix
          </label>
          <input
            id="name-prefix"
            value={namePrefix}
            onChange={(e) => setNamePrefix(e.target.value)}
            placeholder="Team"
            className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          <Shuffle className="h-4 w-4" />
          {generating ? "Generating…" : "Generate teams"}
        </button>
      </div>

      {/* Right column: existing teams (newest first, reactive) */}
      <div className="flex min-h-0 flex-col gap-3">
        <h2 className="text-sm font-semibold">Existing teams</h2>
        {teams === undefined ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : (
          <TeamList teams={teams} />
        )}
      </div>
    </div>
  );
}
