"use client";

import { ChangeEvent, useRef, useState } from "react";
// v9 of read-excel-file exposes its entry points only via subpaths in its
// package `exports` map (there is no root "." export), so we import the browser
// build explicitly — the bare "read-excel-file" specifier does not resolve
// under bundler module resolution.
import readXlsxFile from "read-excel-file/browser";
import { Loader2, Upload } from "lucide-react";

type ImportItem = { text: string; extra?: Record<string, string> };

// A single parsed spreadsheet cell / row. read-excel-file@9 ships `.d.ts`
// declarations whose default-export overload incorrectly resolves to
// `Sheet[]`; at runtime `readXlsxFile(file)` (no options) returns rows, so we
// describe that real shape here and cast the result below.
type Cell = string | number | boolean | Date | null;
type Row = Cell[];

/**
 * Parse the rows returned by read-excel-file into list items.
 *
 *  - 0 rows -> nothing.
 *  - >1 columns -> first row is a header; every later row's first column is the
 *    item text and the remaining columns become `extra` metadata keyed by header.
 *  - 1 column -> no header; every row is an item.
 */
export function parseRows(rows: Row[]): ImportItem[] {
  if (rows.length === 0) return [];

  const columnCount = Math.max(...rows.map((r) => r.length));

  // Single-column sheets have no header: every row is an item.
  if (columnCount <= 1) {
    const items: ImportItem[] = [];
    for (const row of rows) {
      const text = String(row[0] ?? "").trim();
      if (text) items.push({ text });
    }
    return items;
  }

  // Multi-column sheets: row 0 is the header.
  const header = rows[0].map((cell) => String(cell ?? "").trim());
  const items: ImportItem[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const text = String(row[0] ?? "").trim();
    if (!text) continue;

    const extra: Record<string, string> = {};
    for (let c = 1; c < header.length; c++) {
      const key = header[c];
      if (!key) continue;
      const value = String(row[c] ?? "").trim();
      if (!value) continue;
      extra[key] = value;
    }

    items.push(
      Object.keys(extra).length ? { text, extra } : { text },
    );
  }
  return items;
}

export function ExcelImport({
  disabled,
  onImport,
}: {
  disabled: boolean;
  // Returns the number of items actually added.
  onImport: (items: ImportItem[]) => Promise<number>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setResult(null);
    try {
      const rows = (await readXlsxFile(file)) as unknown as Row[];
      const items = parseRows(rows);
      if (items.length === 0) {
        setResult("No items found in that file.");
        return;
      }
      const added = await onImport(items);
      setResult(`Imported ${added} item${added === 1 ? "" : "s"}.`);
    } catch (err) {
      setResult(
        err instanceof Error ? `Import failed: ${err.message}` : "Import failed.",
      );
    } finally {
      setBusy(false);
      // Reset so selecting the same file again re-triggers onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
          disabled || busy
            ? "cursor-not-allowed border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-600"
            : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {busy ? "Importing…" : "Import from Excel"}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          disabled={disabled || busy}
          onChange={handleFile}
          className="hidden"
        />
      </label>

      <p className="text-xs text-neutral-500">
        First column = item text; any extra columns are stored as metadata.
      </p>

      {result && (
        <p className="text-xs text-neutral-600 dark:text-neutral-300">{result}</p>
      )}
    </div>
  );
}
