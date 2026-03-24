"use client";

import { useState } from "react";
import { LearnerProfile } from "../types";
import { initProfile } from "../learner-profile";
import { MessageCircle, ChevronRight, Sparkles } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: (profile: LearnerProfile) => void;
}

const LEVELS: {
  level: LearnerProfile["estimatedLevel"];
  label: string;
  description: string;
  examples: string;
  color: string;
  gradient: string;
}[] = [
  {
    level: "N5",
    label: "Just starting",
    description:
      "You know hiragana/katakana and some basic words like greetings, numbers, and simple sentences.",
    examples: "こんにちは、ありがとう、これは何ですか",
    color: "border-emerald-400 bg-emerald-50",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    level: "N4",
    label: "Basic",
    description:
      "You can have simple daily conversations, order food, ask directions, and talk about your routine.",
    examples: "駅までどう行きますか、週末に映画を見ました",
    color: "border-sky-400 bg-sky-50",
    gradient: "from-sky-400 to-blue-500",
  },
  {
    level: "N3",
    label: "Intermediate",
    description:
      "You can discuss opinions, read simple articles, and understand most everyday conversations.",
    examples: "環境問題について話し合いましょう、彼の意見に賛成です",
    color: "border-amber-400 bg-amber-50",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    level: "N2",
    label: "Upper intermediate",
    description:
      "You can read newspapers, follow TV shows, and discuss complex topics with nuance.",
    examples: "この政策は経済に大きな影響を与えるだろう",
    color: "border-violet-400 bg-violet-50",
    gradient: "from-violet-400 to-purple-500",
  },
  {
    level: "N1",
    label: "Advanced",
    description:
      "You can engage with native content fluently — literature, business Japanese, academic texts.",
    examples: "彼の主張は論理的整合性を欠いている",
    color: "border-rose-400 bg-rose-50",
    gradient: "from-rose-400 to-pink-500",
  },
];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [selected, setSelected] = useState<LearnerProfile["estimatedLevel"] | null>(null);

  const handleStart = () => {
    if (!selected) return;
    const profile = initProfile(selected);
    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 pb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <MessageCircle
            size={40}
            className="text-white"
            fill="white"
            strokeWidth={0}
          />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            日本語練習
          </h1>
        </div>
        <p className="text-white/80 font-medium text-lg max-w-md mx-auto">
          Learn Japanese through conversations. No flashcard grind — just
          natural, comprehensible input.
        </p>
      </div>

      {/* Level selection */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 -mt-6">
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="font-extrabold text-xl text-gray-800">
              What&apos;s your Japanese level?
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              This helps us create conversations at the right difficulty.
              You can always change this later.
            </p>
          </div>

          <div className="space-y-3">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.level}
                onClick={() => setSelected(lvl.level)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  selected === lvl.level
                    ? `${lvl.color} shadow-md ring-2 ring-offset-1 ring-${lvl.color.split("-")[1]}-300`
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${lvl.gradient}`}
                    >
                      {lvl.level}
                    </span>
                    <span className="font-bold text-gray-800">{lvl.label}</span>
                  </div>
                  {selected === lvl.level && (
                    <Sparkles size={16} className="text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">{lvl.description}</p>
                <p className="text-xs text-gray-400 font-mono">{lvl.examples}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={!selected}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-extrabold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            Start learning
            <ChevronRight size={20} />
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 mb-8">
          Not sure? Pick &quot;Just starting&quot; — the system adapts as you go.
        </p>
      </div>
    </div>
  );
}
