"use client";

import { useState, useEffect } from "react";
import { LearnerProfile } from "../types";
import {
  getLearnerProfile,
  saveLearnerProfile,
  rebuildProfile,
  serializeProfileForPrompt,
} from "../learner-profile";
import {
  X,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

const LEVEL_OPTIONS: LearnerProfile["estimatedLevel"][] = [
  "N5",
  "N4",
  "N3",
  "N2",
  "N1",
];

export default function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [showRawPrompt, setShowRawPrompt] = useState(false);

  useEffect(() => {
    if (open) {
      const p = rebuildProfile();
      setProfile(p);
    }
  }, [open]);

  if (!open || !profile) return null;

  const overrideLevel = (level: LearnerProfile["estimatedLevel"]) => {
    profile.estimatedLevel = level;
    saveLearnerProfile(profile);
    setProfile({ ...profile });
  };

  const resetProfile = () => {
    if (
      confirm(
        "Reset your learner profile? Your word journal will be kept, but level and stats will be recalculated.",
      )
    ) {
      const fresh = rebuildProfile();
      setProfile(fresh);
    }
  };

  const clearAllData = () => {
    if (
      confirm(
        "Delete ALL data? This removes your word journal, conversation history, and profile. This cannot be undone.",
      )
    ) {
      localStorage.removeItem("nihongo-learner-profile");
      localStorage.removeItem("nihongo-word-journal");
      localStorage.removeItem("nihongo-grammar-patterns");
      localStorage.removeItem("nihongo-conversation-history");
      localStorage.removeItem("nihongo-saved-conversations");
      localStorage.removeItem("nihongo-ai-conversations");
      localStorage.removeItem("nihongo-srs-cards");
      localStorage.removeItem("nihongo-srs-migrated");
      window.location.reload();
    }
  };

  const promptText = serializeProfileForPrompt(profile);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-gray-600" />
            <h2 className="font-extrabold text-lg text-gray-800">
              Learner Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Level */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Estimated Level
            </label>
            <div className="flex gap-2">
              {LEVEL_OPTIONS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => overrideLevel(lvl)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                    profile.estimatedLevel === lvl
                      ? "bg-emerald-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Auto-calculated from your vocabulary. Tap to override.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3 text-center">
              <div className="text-2xl font-extrabold text-emerald-600">
                {profile.totalWords}
              </div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase">
                Words Seen
              </div>
            </div>
            <div className="bg-sky-50 rounded-2xl p-3 text-center">
              <div className="text-2xl font-extrabold text-sky-600">
                {profile.acquiredWords}
              </div>
              <div className="text-[10px] font-bold text-sky-400 uppercase">
                Acquired (5+)
              </div>
            </div>
            <div className="bg-violet-50 rounded-2xl p-3 text-center">
              <div className="text-2xl font-extrabold text-violet-600">
                {profile.conversationsCompleted}
              </div>
              <div className="text-[10px] font-bold text-violet-400 uppercase">
                Conversations
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-3 text-center">
              <div className="text-2xl font-extrabold text-amber-600">
                {profile.mcTotal > 0
                  ? `${Math.round(profile.mcAccuracy * 100)}%`
                  : "—"}
              </div>
              <div className="text-[10px] font-bold text-amber-400 uppercase">
                Quiz Accuracy
              </div>
            </div>
          </div>

          {/* JLPT Coverage */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              JLPT Vocabulary Coverage
            </label>
            {[
              { level: 5, target: 800, color: "bg-emerald-400" },
              { level: 4, target: 1500, color: "bg-sky-400" },
              { level: 3, target: 3700, color: "bg-amber-400" },
              { level: 2, target: 6000, color: "bg-violet-400" },
              { level: 1, target: 10000, color: "bg-rose-400" },
            ].map(({ level, target, color }) => {
              const count = profile.wordsByLevel[level] || 0;
              const pct = Math.min(100, (count / target) * 100);
              return (
                <div key={level} className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-bold text-gray-600">N{level}</span>
                    <span className="text-gray-400">
                      {count}/{target} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grammar Patterns */}
          {profile.grammarPatternsSeen.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Grammar Patterns Seen ({profile.grammarPatternsSeen.length})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {profile.grammarPatternsSeen.map((p) => (
                  <span
                    key={p}
                    className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Next to learn */}
          {(profile.wordsToTeach.length > 0 ||
            profile.grammarToIntroduce.length > 0) && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Next to Introduce
              </label>
              {profile.grammarToIntroduce.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500">Grammar: </span>
                  {profile.grammarToIntroduce.map((g) => (
                    <span
                      key={g}
                      className="text-xs font-medium bg-violet-50 text-violet-600 px-2 py-0.5 rounded-lg mr-1"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {profile.wordsToTeach.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">Words: </span>
                  {profile.wordsToTeach.map((w) => (
                    <span
                      key={w}
                      className="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg mr-1"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reinforcement */}
          {profile.reinforcementWords.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Reinforcing (seen 2-4x)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {profile.reinforcementWords.map((w) => (
                  <span
                    key={w}
                    className="text-xs font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raw prompt (collapsible) */}
          <div>
            <button
              onClick={() => setShowRawPrompt(!showRawPrompt)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              What Claude sees
              {showRawPrompt ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
            </button>
            {showRawPrompt && (
              <pre className="mt-2 p-3 bg-gray-900 text-emerald-400 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {promptText}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-4 space-y-2">
            <button
              onClick={resetProfile}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={14} />
              Recalculate Profile
            </button>
            <button
              onClick={clearAllData}
              className="w-full py-2.5 text-rose-500 text-sm font-bold hover:bg-rose-50 rounded-xl transition-colors"
            >
              Delete All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
