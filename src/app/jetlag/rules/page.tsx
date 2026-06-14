"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Doc, Id } from "@convex/_generated/dataModel";
import { Check, Loader2, Pencil, Plus, ScrollText, Trash2, X } from "lucide-react";

export default function RulesPage() {
  const rules = useQuery(api.rules.list);
  const createRule = useMutation(api.rules.create);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      await createRule({ title: t, body: b });
      setTitle("");
      setBody("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-2xl overflow-y-auto px-5 py-6">
      <div className="mb-5 flex items-center gap-2">
        <ScrollText className="h-5 w-5 opacity-70" />
        <h1 className="text-lg font-semibold">Rules</h1>
      </div>

      {/* Add a rule */}
      <form
        onSubmit={handleCreate}
        className="mb-6 space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Rule title"
          maxLength={120}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm font-medium outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe the rule…"
          rows={3}
          className="w-full resize-y rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add rule
          </button>
        </div>
      </form>

      {/* Existing rules */}
      {rules === undefined ? (
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading rules…
        </div>
      ) : rules.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No rules yet. Add the first one above.
        </p>
      ) : (
        <ol className="space-y-2">
          {rules.map((rule, i) => (
            <RuleRow key={rule._id} rule={rule} index={i} />
          ))}
        </ol>
      )}
    </div>
  );
}

function RuleRow({ rule, index }: { rule: Doc<"rules">; index: number }) {
  const updateRule = useMutation(api.rules.update);
  const removeRule = useMutation(api.rules.remove);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rule.title);
  const [body, setBody] = useState(rule.body);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setTitle(rule.title);
    setBody(rule.body);
    setEditing(true);
  }

  async function save() {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      await updateRule({ ruleId: rule._id as Id<"rules">, title: t, body: body.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this rule?")) return;
    await removeRule({ ruleId: rule._id as Id<"rules"> });
  }

  if (editing) {
    return (
      <li className="space-y-2 rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm font-medium outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <span className="mt-0.5 w-6 shrink-0 text-right text-sm tabular-nums text-neutral-400">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="break-words font-medium">{rule.title}</h3>
        {rule.body && (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-neutral-600 dark:text-neutral-300">
            {rule.body}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={startEdit}
          aria-label="Edit rule"
          className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={remove}
          aria-label="Delete rule"
          className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
