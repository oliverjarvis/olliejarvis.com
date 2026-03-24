"use client";

import { useState, useCallback, useRef } from "react";
import { BookOpen, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface BreakdownPart {
  part: string;
  role: string;
  meaning: string;
}

interface GrammarData {
  breakdown: BreakdownPart[];
  structure: string;
  note?: string;
}

// Shared cache across all instances
const grammarCache = new Map<string, GrammarData>();

interface GrammarBreakdownProps {
  text: string;
  className?: string;
}

const ROLE_COLORS: Record<string, string> = {
  topic: "bg-sky-100 text-sky-700",
  subject: "bg-sky-100 text-sky-700",
  object: "bg-amber-100 text-amber-700",
  verb: "bg-emerald-100 text-emerald-700",
  adjective: "bg-orange-100 text-orange-700",
  adverb: "bg-rose-100 text-rose-700",
  particle: "bg-gray-100 text-gray-600",
  copula: "bg-violet-100 text-violet-700",
};

function getRoleColor(role: string): string {
  const lower = role.toLowerCase();
  for (const [key, color] of Object.entries(ROLE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "bg-gray-100 text-gray-600";
}

export default function GrammarBreakdown({
  text,
  className = "",
}: GrammarBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<GrammarData | null>(null);
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);

  const fetchGrammar = useCallback(async () => {
    if (data || fetchedRef.current) return;
    fetchedRef.current = true;

    const cached = grammarCache.get(text);
    if (cached) {
      setData(cached);
      return;
    }

    setIsLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/nihongo/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      grammarCache.set(text, result);
      setData(result);
    } catch {
      setError(true);
      fetchedRef.current = false;
    }
    setIsLoading(false);
  }, [text, data]);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !data) fetchGrammar();
  };

  return (
    <div className={className}>
      <button
        onClick={toggle}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
          isOpen
            ? "bg-indigo-100 text-indigo-600"
            : "bg-gray-100 text-gray-400 hover:text-gray-600"
        }`}
      >
        <BookOpen size={12} />
        Grammar
        {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-indigo-500">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs font-medium">Analyzing grammar...</span>
            </div>
          ) : error ? (
            <p className="text-xs text-gray-500">
              Could not load grammar breakdown.
            </p>
          ) : data ? (
            <>
              {/* Structure pattern */}
              <div className="text-xs font-mono text-indigo-600 bg-indigo-100 rounded-lg px-2 py-1.5">
                {data.structure}
              </div>

              {/* Breakdown table */}
              <div className="space-y-1">
                {data.breakdown.map((part, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="font-bold text-gray-800 min-w-[3rem]">
                      {part.part}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${getRoleColor(part.role)}`}
                    >
                      {part.role}
                    </span>
                    <span className="text-gray-500">{part.meaning}</span>
                  </div>
                ))}
              </div>

              {/* Note */}
              {data.note && (
                <div className="text-xs text-indigo-700 bg-indigo-100/50 rounded-lg px-2 py-1.5 font-medium">
                  {data.note}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
