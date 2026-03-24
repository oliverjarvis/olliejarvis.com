"use client";

import { useState, useEffect } from "react";
import { SRSCard } from "../types";
import { getCards, getDueCards, reviewCard, removeCard } from "../srs";
import {
  X,
  Trash2,
  Flame,
  Star,
  BookOpen,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import AudioButton from "./AudioButton";

interface SRSPanelProps {
  onClose: () => void;
  refreshTrigger: number;
}

const LEVEL_CONFIG = [
  { label: "New", color: "bg-gray-300", textColor: "text-gray-600" },
  { label: "Seen", color: "bg-rose-400", textColor: "text-rose-700" },
  { label: "Learning", color: "bg-orange-400", textColor: "text-orange-700" },
  { label: "Familiar", color: "bg-amber-400", textColor: "text-amber-700" },
  { label: "Known", color: "bg-emerald-400", textColor: "text-emerald-700" },
  { label: "Mastered", color: "bg-sky-400", textColor: "text-sky-700" },
];

export default function SRSPanel({ onClose, refreshTrigger }: SRSPanelProps) {
  const [cards, setCards] = useState<SRSCard[]>([]);
  const [dueCards, setDueCards] = useState<SRSCard[]>([]);
  const [currentCard, setCurrentCard] = useState<SRSCard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [tab, setTab] = useState<"review" | "all">("review");
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(
    null,
  );

  useEffect(() => {
    refresh();
  }, [refreshTrigger]);

  const refresh = () => {
    const all = getCards();
    const due = getDueCards();
    setCards(all);
    setDueCards(due);
    if (due.length > 0) {
      setCurrentCard(due[0]);
      setShowAnswer(false);
    } else {
      setCurrentCard(null);
    }
    setLastResult(null);
  };

  const handleReview = (correct: boolean) => {
    if (!currentCard) return;
    setLastResult(correct ? "correct" : "wrong");
    const updated = reviewCard(currentCard.id, correct);
    setCards(updated);

    setTimeout(() => {
      setShowAnswer(false);
      setLastResult(null);
      const newDue = updated.filter((c) => c.nextReview <= Date.now());
      setDueCards(newDue);
      setCurrentCard(newDue.length > 0 ? newDue[0] : null);
    }, 400);
  };

  const handleRemove = (id: string) => {
    const updated = removeCard(id);
    setCards(updated);
    const newDue = updated.filter((c) => c.nextReview <= Date.now());
    setDueCards(newDue);
    if (currentCard?.id === id) {
      setCurrentCard(newDue.length > 0 ? newDue[0] : null);
    }
  };

  const mastered = cards.filter((c) => c.level >= 5).length;

  return (
    <div className="fixed inset-0 md:static md:inset-auto md:w-96 bg-[#f0f0f0] md:border-l flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={22} className="text-white" />
          <h2 className="font-extrabold text-lg text-white">Word Bank</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white p-4 grid grid-cols-3 gap-3">
        <div className="text-center bg-violet-50 rounded-2xl p-3">
          <div className="text-2xl font-extrabold text-violet-600">
            {cards.length}
          </div>
          <div className="text-xs font-bold text-violet-400 uppercase tracking-wider">
            Total
          </div>
        </div>
        <div className="text-center bg-orange-50 rounded-2xl p-3">
          <div className="flex items-center justify-center gap-1">
            <Flame size={16} className="text-orange-500" />
            <span className="text-2xl font-extrabold text-orange-600">
              {dueCards.length}
            </span>
          </div>
          <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">
            Due
          </div>
        </div>
        <div className="text-center bg-emerald-50 rounded-2xl p-3">
          <div className="flex items-center justify-center gap-1">
            <Star size={16} className="text-emerald-500" />
            <span className="text-2xl font-extrabold text-emerald-600">
              {mastered}
            </span>
          </div>
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Mastered
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-t border-b border-gray-100">
        <button
          onClick={() => setTab("review")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            tab === "review"
              ? "border-b-3 border-violet-500 text-violet-600 bg-violet-50/50"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Review
          {dueCards.length > 0 && (
            <span className="ml-1.5 bg-orange-400 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
              {dueCards.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            tab === "all"
              ? "border-b-3 border-violet-500 text-violet-600 bg-violet-50/50"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          All Cards
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "review" ? (
          currentCard ? (
            <div className="space-y-4">
              {/* Flashcard with flip */}
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
                    className={`text-center p-8 bg-white rounded-3xl shadow-lg border-2 transition-colors duration-300 ${
                      lastResult === "correct"
                        ? "border-emerald-400"
                        : lastResult === "wrong"
                          ? "border-rose-400"
                          : "border-gray-100"
                    }`}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="text-5xl font-extrabold mb-3">
                      {currentCard.word}
                    </div>
                    <div className="text-gray-400 text-lg font-medium">
                      {currentCard.reading}
                    </div>
                    <AudioButton
                      text={currentCard.word}
                      size={24}
                      className="mt-3 text-violet-300 hover:text-violet-500"
                    />
                    <div className="mt-4 flex items-center justify-center gap-1.5">
                      {LEVEL_CONFIG.map((lvl, i) => (
                        <div
                          key={i}
                          className={`h-2 w-6 rounded-full transition-colors ${
                            i <= currentCard.level ? lvl.color : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs font-bold text-gray-400 mt-1.5 uppercase tracking-wider">
                      {LEVEL_CONFIG[currentCard.level]?.label || "New"}
                    </div>
                    <div className="mt-4 text-xs font-bold text-violet-400">
                      Tap to flip
                    </div>
                  </div>

                  {/* Back */}
                  <div
                    className={`absolute inset-0 text-center p-6 bg-white rounded-3xl shadow-lg border-2 flex flex-col items-center justify-center overflow-hidden transition-colors duration-300 ${
                      lastResult === "correct"
                        ? "border-emerald-400 bg-emerald-50"
                        : lastResult === "wrong"
                          ? "border-rose-400 bg-rose-50"
                          : "border-gray-100"
                    }`}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="text-gray-400 text-lg font-medium mb-2">
                      {currentCard.word}
                    </div>
                    <div className="text-xl font-extrabold text-gray-800 overflow-y-auto max-h-[60%] w-full px-2">
                      {currentCard.meaning}
                    </div>
                    <AudioButton
                      text={currentCard.word}
                      size={20}
                      className="mt-3 text-violet-300 hover:text-violet-500 shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* Actions — always visible, no layout shift */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleReview(false)}
                  disabled={!showAnswer}
                  className="py-4 bg-rose-100 text-rose-700 rounded-2xl font-extrabold text-lg hover:bg-rose-200 active:bg-rose-300 transition-colors border-2 border-rose-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <RotateCcw
                    size={18}
                    className="inline mr-1.5 -mt-0.5"
                  />
                  Again
                </button>
                <button
                  onClick={() => handleReview(true)}
                  disabled={!showAnswer}
                  className="py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold text-lg hover:bg-emerald-200 active:bg-emerald-300 transition-colors border-2 border-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Sparkles
                    size={18}
                    className="inline mr-1.5 -mt-0.5"
                  />
                  Good
                </button>
              </div>

              {/* Progress */}
              <div className="text-center text-xs font-bold text-gray-400">
                {dueCards.length} card{dueCards.length !== 1 ? "s" : ""}{" "}
                remaining
              </div>
            </div>
          ) : (
            <div className="text-center mt-16 space-y-3">
              <div className="inline-flex p-4 bg-emerald-100 rounded-full">
                <Star size={36} className="text-emerald-500" />
              </div>
              <p className="text-lg font-extrabold text-gray-700">
                All caught up!
              </p>
              <p className="text-sm text-gray-400 font-medium">
                Tap words in conversations to grow your deck.
              </p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {cards.length === 0 ? (
              <div className="text-center mt-16 space-y-3">
                <div className="inline-flex p-4 bg-violet-100 rounded-full">
                  <BookOpen size={36} className="text-violet-400" />
                </div>
                <p className="text-lg font-extrabold text-gray-700">
                  No cards yet
                </p>
                <p className="text-sm text-gray-400 font-medium">
                  Tap words in conversations to add them.
                </p>
              </div>
            ) : (
              cards.map((card) => {
                const lvl = LEVEL_CONFIG[card.level] || LEVEL_CONFIG[0];
                return (
                  <div
                    key={card.id}
                    className="flex items-center bg-white rounded-2xl p-3 shadow-sm border border-gray-100"
                  >
                    {/* Level dot */}
                    <div
                      className={`w-3 h-3 rounded-full ${lvl.color} shrink-0 mr-3`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">
                          {card.word}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {card.reading}
                        </span>
                        <AudioButton
                          text={card.word}
                          size={12}
                          className="text-gray-300 hover:text-violet-500"
                        />
                      </div>
                      <span className="text-gray-500 text-sm block truncate">
                        {card.meaning}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          card.level >= 5
                            ? "bg-sky-100 text-sky-600"
                            : card.level >= 3
                              ? "bg-emerald-100 text-emerald-600"
                              : card.level >= 1
                                ? "bg-orange-100 text-orange-600"
                                : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {lvl.label}
                      </span>
                      <button
                        onClick={() => handleRemove(card.id)}
                        className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
