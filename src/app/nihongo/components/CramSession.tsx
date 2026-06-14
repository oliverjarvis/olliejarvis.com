"use client";

import { useState, useMemo } from "react";
import { WordJournalEntry } from "../types";
import AudioButton from "./AudioButton";
import { RotateCcw, Sparkles, ArrowLeft } from "lucide-react";

interface CramSessionProps {
  words: WordJournalEntry[];
  onClose: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CramSession({ words, onClose }: CramSessionProps) {
  const deck = useMemo(() => shuffle(words), [words]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [known, setKnown] = useState(0);
  const [total, setTotal] = useState(0);

  const current = deck[index];
  const isFinished = index >= deck.length;

  const handleAnswer = (correct: boolean) => {
    setTotal((n) => n + 1);
    if (correct) setKnown((n) => n + 1);
    setShowAnswer(false);
    setIndex((n) => n + 1);
  };

  if (isFinished) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex p-4 bg-emerald-100 rounded-full">
          <Sparkles size={36} className="text-emerald-500" />
        </div>
        <div className="text-xl font-extrabold text-gray-800">
          Session complete!
        </div>
        <p className="text-gray-500 font-medium">
          {known}/{total} words recalled
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-md"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm font-bold text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <span className="text-xs font-bold text-gray-400">
          {index + 1} / {deck.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-300 rounded-full"
          style={{ width: `${((index + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div
        className="cursor-pointer"
        style={{ perspective: "800px" }}
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: showAnswer ? "rotateY(180deg)" : "rotateY(0)",
          }}
        >
          {/* Front */}
          <div
            className="text-center p-8 bg-white rounded-3xl shadow-lg border-2 border-gray-100"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-5xl font-extrabold mb-3">{current.word}</div>
            <div className="text-gray-400 text-lg font-medium">
              {current.reading}
            </div>
            <AudioButton
              text={current.word}
              size={24}
              className="mt-3 text-violet-300 hover:text-violet-500"
            />
            {current.jlptLevel > 0 && (
              <div className="mt-3 text-xs font-bold text-gray-300">
                N{current.jlptLevel}
              </div>
            )}
            <div className="mt-4 text-xs font-bold text-violet-400">
              Tap to flip
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 text-center p-6 bg-white rounded-3xl shadow-lg border-2 border-gray-100 flex flex-col items-center justify-center overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="text-gray-400 text-lg font-medium mb-2">
              {current.word}
            </div>
            <div className="text-xl font-extrabold text-gray-800 overflow-y-auto max-h-[60%] w-full px-2">
              {current.meaning}
            </div>
            <AudioButton
              text={current.word}
              size={20}
              className="mt-3 text-violet-300 hover:text-violet-500 shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleAnswer(false)}
          disabled={!showAnswer}
          className="py-4 bg-rose-100 text-rose-700 rounded-2xl font-extrabold text-lg hover:bg-rose-200 transition-colors border-2 border-rose-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <RotateCcw size={18} className="inline mr-1.5 -mt-0.5" />
          Nope
        </button>
        <button
          onClick={() => handleAnswer(true)}
          disabled={!showAnswer}
          className="py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold text-lg hover:bg-emerald-200 transition-colors border-2 border-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Sparkles size={18} className="inline mr-1.5 -mt-0.5" />
          Know it
        </button>
      </div>
    </div>
  );
}
