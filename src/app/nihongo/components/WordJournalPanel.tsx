"use client";

import { useState, useEffect, useMemo } from "react";
import { WordJournalEntry, GrammarPointJournalEntry } from "../types";
import { getStage, STAGE_COLORS } from "../acquisition";
import {
  dbGetWordJournal,
  dbGetGrammarPatterns,
  dbGetGrammarPointsJournal,
  computeJournalStats,
  computeGrammarPointsStats,
  getPatternListFromPatterns,
  getWordsForCramFromJournal,
} from "../db";
import {
  X,
  BookOpen,
  Search,
  Dumbbell,
  BarChart3,
  Bookmark,
  Star,
  Languages,
  ExternalLink,
} from "lucide-react";
import AudioButton from "./AudioButton";
import CramSession from "./CramSession";

interface WordJournalPanelProps {
  onClose: () => void;
  refreshTrigger: number;
}

type Tab = "journal" | "grammar" | "stats" | "cram";
type SortMode = "recent" | "frequent" | "level";
type FilterMode = "all" | "acquired" | "learning" | "bookmarked";

export default function WordJournalPanel({
  onClose,
  refreshTrigger,
}: WordJournalPanelProps) {
  const [tab, setTab] = useState<Tab>("journal");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [entries, setEntries] = useState<WordJournalEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, acquired: 0, bookmarked: 0, byLevel: {} as Record<number, number> });
  const [patterns, setPatterns] = useState<string[]>([]);

  // Grammar points
  const [grammarEntries, setGrammarEntries] = useState<GrammarPointJournalEntry[]>([]);
  const [grammarStats, setGrammarStats] = useState({ total: 0, acquired: 0, bookmarked: 0, byLevel: {} as Record<number, number> });
  const [grammarSearch, setGrammarSearch] = useState("");
  const [grammarSort, setGrammarSort] = useState<SortMode>("recent");
  const [grammarFilter, setGrammarFilter] = useState<FilterMode>("all");

  // Cram state
  const [cramActive, setCramActive] = useState(false);
  const [cramWords, setCramWords] = useState<WordJournalEntry[]>([]);
  const [cramFilter, setCramFilter] = useState<"all" | "bookmarked" | "learning">("learning");

  const [journal, setJournal] = useState<Record<string, WordJournalEntry>>({});

  useEffect(() => {
    refresh();
  }, [refreshTrigger]);

  const refresh = async () => {
    const [j, p, gpj] = await Promise.all([
      dbGetWordJournal(),
      dbGetGrammarPatterns(),
      dbGetGrammarPointsJournal(),
    ]);
    setJournal(j);
    setEntries(Object.values(j));
    setStats(computeJournalStats(j));
    setPatterns(getPatternListFromPatterns(p));
    setGrammarEntries(Object.values(gpj));
    setGrammarStats(computeGrammarPointsStats(gpj));
  };

  const filtered = useMemo(() => {
    let result = [...entries];
    if (filter === "acquired") result = result.filter((e) => e.naturallyAcquired);
    else if (filter === "learning") result = result.filter((e) => !e.naturallyAcquired && e.encounterCount > 0);
    else if (filter === "bookmarked") result = result.filter((e) => e.bookmarked);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.word.includes(q) || e.reading.includes(q) || e.meaning.toLowerCase().includes(q));
    }
    if (sort === "recent") result.sort((a, b) => b.lastSeen - a.lastSeen);
    else if (sort === "frequent") result.sort((a, b) => b.encounterCount - a.encounterCount);
    else if (sort === "level") result.sort((a, b) => b.jlptLevel - a.jlptLevel || b.encounterCount - a.encounterCount);
    return result;
  }, [entries, filter, search, sort]);

  const filteredGrammar = useMemo(() => {
    let result = [...grammarEntries];
    if (grammarFilter === "acquired") result = result.filter((e) => e.naturallyAcquired);
    else if (grammarFilter === "learning") result = result.filter((e) => !e.naturallyAcquired && e.encounterCount > 0);
    else if (grammarFilter === "bookmarked") result = result.filter((e) => e.bookmarked);
    if (grammarSearch) {
      const q = grammarSearch.toLowerCase();
      result = result.filter((e) => e.name.includes(q) || e.meaning.toLowerCase().includes(q));
    }
    if (grammarSort === "recent") result.sort((a, b) => b.lastSeen - a.lastSeen);
    else if (grammarSort === "frequent") result.sort((a, b) => b.encounterCount - a.encounterCount);
    else if (grammarSort === "level") result.sort((a, b) => b.jlptLevel - a.jlptLevel || b.encounterCount - a.encounterCount);
    return result;
  }, [grammarEntries, grammarFilter, grammarSearch, grammarSort]);

  const startCram = () => {
    let words: WordJournalEntry[];
    if (cramFilter === "bookmarked") {
      words = getWordsForCramFromJournal(journal, { bookmarkedOnly: true });
    } else if (cramFilter === "learning") {
      words = getWordsForCramFromJournal(journal, { maxEncounters: 4 });
    } else {
      words = getWordsForCramFromJournal(journal, {});
    }
    if (words.length === 0) return;
    setCramWords(words);
    setCramActive(true);
  };

  return (
    <div className="fixed inset-0 md:static md:inset-auto md:w-96 bg-[#f0f0f0] md:border-l flex flex-col z-50 min-h-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={22} className="text-white" />
          <h2 className="font-extrabold text-lg text-white">Journal</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Quick stats */}
      <div className="bg-white p-3 grid grid-cols-4 gap-2">
        <div className="text-center bg-emerald-50 rounded-xl p-2">
          <div className="text-lg font-extrabold text-emerald-600">{stats.total}</div>
          <div className="text-[10px] font-bold text-emerald-400 uppercase">Words</div>
        </div>
        <div className="text-center bg-sky-50 rounded-xl p-2">
          <div className="text-lg font-extrabold text-sky-600">{stats.acquired}</div>
          <div className="text-[10px] font-bold text-sky-400 uppercase">Acq.</div>
        </div>
        <div className="text-center bg-violet-50 rounded-xl p-2">
          <div className="text-lg font-extrabold text-violet-600">{grammarStats.total}</div>
          <div className="text-[10px] font-bold text-violet-400 uppercase">Grammar</div>
        </div>
        <div className="text-center bg-amber-50 rounded-xl p-2">
          <div className="text-lg font-extrabold text-amber-600">{grammarStats.acquired}</div>
          <div className="text-[10px] font-bold text-amber-400 uppercase">G.Acq.</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-t border-b border-gray-100">
        {([
          { key: "journal" as Tab, label: "Words", icon: BookOpen },
          { key: "grammar" as Tab, label: "Grammar", icon: Languages },
          { key: "stats" as Tab, label: "Stats", icon: BarChart3 },
          { key: "cram" as Tab, label: "Cram", icon: Dumbbell },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-3 text-xs font-bold transition-colors ${
              tab === key
                ? "border-b-2 border-emerald-500 text-emerald-600 bg-emerald-50/50"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {tab === "journal" && (
          <div className="p-3 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search words..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { key: "all" as FilterMode, label: "All" },
                { key: "learning" as FilterMode, label: "Learning" },
                { key: "acquired" as FilterMode, label: "Acquired" },
                { key: "bookmarked" as FilterMode, label: "Saved" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                    filter === key ? "bg-emerald-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="flex-1" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-1"
              >
                <option value="recent">Recent</option>
                <option value="frequent">Most seen</option>
                <option value="level">JLPT level</option>
              </select>
            </div>
            <div className="space-y-1.5">
              {filtered.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  {entries.length === 0
                    ? "Start a conversation to begin building your word journal."
                    : "No words match your filters."}
                </div>
              ) : (
                filtered.slice(0, 100).map((entry) => (
                  <div key={entry.id} className="flex items-center bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 mr-2.5 ${STAGE_COLORS[getStage(entry.encounterCount)].dot}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-800 text-sm">{entry.word}</span>
                        <span className="text-gray-400 text-xs">{entry.reading}</span>
                        <AudioButton text={entry.word} size={10} className="text-gray-300" />
                        {entry.bookmarked && <Bookmark size={10} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{entry.meaning || "—"}</div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">x{entry.encounterCount}</span>
                      {entry.jlptLevel > 0 && (
                        <span className="text-[10px] font-bold text-violet-500 bg-violet-50 rounded-full px-1.5 py-0.5">N{entry.jlptLevel}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
              {filtered.length > 100 && (
                <div className="text-center text-xs text-gray-400 py-2">Showing 100 of {filtered.length} words</div>
              )}
            </div>
          </div>
        )}

        {tab === "grammar" && (
          <div className="p-3 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={grammarSearch}
                onChange={(e) => setGrammarSearch(e.target.value)}
                placeholder="Search grammar..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { key: "all" as FilterMode, label: "All" },
                { key: "learning" as FilterMode, label: "Learning" },
                { key: "acquired" as FilterMode, label: "Acquired" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setGrammarFilter(key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                    grammarFilter === key ? "bg-violet-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="flex-1" />
              <select
                value={grammarSort}
                onChange={(e) => setGrammarSort(e.target.value as SortMode)}
                className="text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-1"
              >
                <option value="recent">Recent</option>
                <option value="frequent">Most seen</option>
                <option value="level">JLPT level</option>
              </select>
            </div>
            <div className="space-y-1.5">
              {filteredGrammar.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  {grammarEntries.length === 0
                    ? "Grammar points will appear as you practice conversations."
                    : "No grammar points match your filters."}
                </div>
              ) : (
                filteredGrammar.slice(0, 100).map((entry) => (
                  <div key={entry.id} className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
                    <div className="flex items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 mr-2.5 ${STAGE_COLORS[getStage(entry.encounterCount)].dot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-800 text-sm">{entry.name}</span>
                          {entry.url && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-violet-400 hover:text-violet-600 transition-colors"
                              title="View on BunPro"
                            >
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{entry.meaning}</div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">x{entry.encounterCount}</span>
                        {entry.jlptLevel > 0 && (
                          <span className="text-[10px] font-bold text-violet-500 bg-violet-50 rounded-full px-1.5 py-0.5">N{entry.jlptLevel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {filteredGrammar.length > 100 && (
                <div className="text-center text-xs text-gray-400 py-2">Showing 100 of {filteredGrammar.length} grammar points</div>
              )}
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div className="p-4 space-y-4">
            {/* Vocabulary JLPT coverage */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-sm text-gray-700 mb-3">Vocabulary Coverage</h3>
              {[
                { level: 5, target: 800, color: "bg-emerald-400" },
                { level: 4, target: 1500, color: "bg-sky-400" },
                { level: 3, target: 3700, color: "bg-amber-400" },
                { level: 2, target: 6000, color: "bg-violet-400" },
                { level: 1, target: 10000, color: "bg-rose-400" },
              ].map(({ level, target, color }) => {
                const count = stats.byLevel[level] || 0;
                const pct = Math.min(100, (count / target) * 100);
                return (
                  <div key={level} className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-gray-600">N{level}</span>
                      <span className="text-gray-400">{count}/{target}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grammar JLPT coverage */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-sm text-gray-700 mb-3">Grammar Coverage</h3>
              {[
                { level: 5, target: 126, color: "bg-emerald-400" },
                { level: 4, target: 177, color: "bg-sky-400" },
                { level: 3, target: 218, color: "bg-amber-400" },
                { level: 2, target: 217, color: "bg-violet-400" },
                { level: 1, target: 184, color: "bg-rose-400" },
              ].map(({ level, target, color }) => {
                const count = grammarStats.byLevel[level] || 0;
                const pct = Math.min(100, (count / target) * 100);
                return (
                  <div key={level} className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-gray-600">N{level}</span>
                      <span className="text-gray-400">{count}/{target}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Morphological patterns */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-sm text-gray-700 mb-3">
                Conjugation Patterns ({patterns.length})
              </h3>
              {patterns.length === 0 ? (
                <p className="text-xs text-gray-400">Patterns appear as you do conversations.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {patterns.map((p) => (
                    <span key={p} className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{p}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Acquisition summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Acquisition</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-2xl font-extrabold text-gray-700">{stats.total - stats.acquired}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Words Learning</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <div className="text-2xl font-extrabold text-emerald-600">{stats.acquired}</div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase">Words Acquired</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-2xl font-extrabold text-gray-700">{grammarStats.total - grammarStats.acquired}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Grammar Learning</div>
                </div>
                <div className="bg-violet-50 rounded-xl p-3">
                  <div className="text-2xl font-extrabold text-violet-600">{grammarStats.acquired}</div>
                  <div className="text-[10px] font-bold text-violet-400 uppercase">Grammar Acquired</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "cram" && (
          <div className="p-4">
            {cramActive ? (
              <CramSession words={cramWords} onClose={() => { setCramActive(false); refresh(); }} />
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-violet-100 rounded-full mb-3">
                      <Dumbbell size={28} className="text-violet-500" />
                    </div>
                    <h3 className="font-extrabold text-lg text-gray-800">Cram Session</h3>
                    <p className="text-sm text-gray-400 mt-1">Drill words on your terms. No schedule, no pressure.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">What to practice</label>
                    <div className="space-y-2">
                      {([
                        { key: "learning" as const, label: "Words I'm learning", desc: "Seen 1-4 times", count: entries.filter((e) => !e.naturallyAcquired && e.encounterCount > 0 && e.meaning).length },
                        { key: "bookmarked" as const, label: "Saved words", desc: "Words you bookmarked", count: entries.filter((e) => e.bookmarked && e.meaning).length },
                        { key: "all" as const, label: "Everything", desc: "All words with meanings", count: entries.filter((e) => e.meaning).length },
                      ]).map(({ key, label, desc, count }) => (
                        <button
                          key={key}
                          onClick={() => setCramFilter(key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors text-left ${
                            cramFilter === key ? "border-violet-400 bg-violet-50" : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-sm text-gray-800">{label}</div>
                            <div className="text-xs text-gray-400">{desc}</div>
                          </div>
                          <span className="text-sm font-bold text-gray-400">{count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={startCram}
                    className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-extrabold text-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-200"
                  >
                    <Star size={18} className="inline mr-1.5 -mt-0.5" />
                    Start
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
