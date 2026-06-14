"use client";

import { useState } from "react";
import { KuromojiToken, VocabWord } from "../types";
import TokenizedText from "./TokenizedText";
import AudioButton from "./AudioButton";
import { Globe } from "lucide-react";
import GrammarBreakdown from "./GrammarBreakdown";

interface MultipleChoiceProps {
  question: string;
  questionTranslation: string;
  choices: string[];
  choiceTranslations: string[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
  correctIndex: number;
  showResult: boolean;
  vocabulary: VocabWord[];
  onAddToSRS: (word: string, reading: string, meaning: string) => void;
  tokenCache: Record<string, KuromojiToken[]>;
  onTokenized: (text: string, tokens: KuromojiToken[]) => void;
}

const CHOICE_COLORS = [
  {
    idle: "border-sky-200 bg-sky-50 hover:border-sky-400 hover:bg-sky-100",
    label: "text-sky-400",
    audio: "text-sky-300 hover:text-sky-500 hover:bg-sky-100",
    divider: "border-sky-200",
    enBtn: "text-sky-300 hover:text-sky-500 hover:bg-sky-100",
  },
  {
    idle: "border-violet-200 bg-violet-50 hover:border-violet-400 hover:bg-violet-100",
    label: "text-violet-400",
    audio: "text-violet-300 hover:text-violet-500 hover:bg-violet-100",
    divider: "border-violet-200",
    enBtn: "text-violet-300 hover:text-violet-500 hover:bg-violet-100",
  },
  {
    idle: "border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100",
    label: "text-amber-400",
    audio: "text-amber-300 hover:text-amber-500 hover:bg-amber-100",
    divider: "border-amber-200",
    enBtn: "text-amber-300 hover:text-amber-500 hover:bg-amber-100",
  },
  {
    idle: "border-rose-200 bg-rose-50 hover:border-rose-400 hover:bg-rose-100",
    label: "text-rose-400",
    audio: "text-rose-300 hover:text-rose-500 hover:bg-rose-100",
    divider: "border-rose-200",
    enBtn: "text-rose-300 hover:text-rose-500 hover:bg-rose-100",
  },
];

export default function MultipleChoice({
  question,
  questionTranslation,
  choices,
  choiceTranslations,
  onSelect,
  selectedIndex,
  correctIndex,
  showResult,
  vocabulary,
  onAddToSRS,
  tokenCache,
  onTokenized,
}: MultipleChoiceProps) {
  const [showQuestionEN, setShowQuestionEN] = useState(false);
  const [revealedChoices, setRevealedChoices] = useState<Set<number>>(
    new Set(),
  );

  const toggleChoice = (i: number) => {
    setRevealedChoices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-lg text-gray-800 flex-1">
            <TokenizedText
              text={question}
              vocabulary={vocabulary}
              onAddToSRS={onAddToSRS}
              tokenCache={tokenCache}
              onTokenized={onTokenized}
              audioSize={16}
            />
          </p>
          <button
            onClick={() => setShowQuestionEN(!showQuestionEN)}
            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
              showQuestionEN
                ? "bg-sky-100 text-sky-600"
                : "bg-gray-100 text-gray-400 hover:text-gray-600"
            }`}
          >
            <Globe size={12} />
            EN
          </button>
        </div>
        {showQuestionEN && (
          <p className="text-sm text-gray-500 italic mt-1">
            {questionTranslation}
          </p>
        )}
        <GrammarBreakdown text={question} className="mt-1" />
      </div>
      <div className="grid gap-3">
        {choices.map((choice, i) => {
          const color = CHOICE_COLORS[i];
          let classes = color.idle;
          let labelColor = color.label;
          let audioColor = color.audio;
          let dividerColor = color.divider;
          let enBtnColor = color.enBtn;

          if (showResult) {
            if (i === correctIndex) {
              classes =
                "border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-100";
              labelColor = "text-emerald-500";
              audioColor = "text-emerald-400 hover:text-emerald-600";
              dividerColor = "border-emerald-300";
              enBtnColor = "text-emerald-400 hover:text-emerald-600";
            } else if (i === selectedIndex) {
              classes = "border-rose-400 bg-rose-50 shadow-md shadow-rose-100";
              labelColor = "text-rose-500";
              audioColor = "text-rose-400 hover:text-rose-600";
              dividerColor = "border-rose-300";
              enBtnColor = "text-rose-400 hover:text-rose-600";
            } else {
              classes = "border-gray-200 bg-gray-50 opacity-50";
              labelColor = "text-gray-300";
              audioColor = "text-gray-300";
              dividerColor = "border-gray-200";
              enBtnColor = "text-gray-300";
            }
          } else if (i === selectedIndex) {
            classes =
              "border-sky-500 bg-sky-100 ring-2 ring-sky-300 shadow-md";
            labelColor = "text-sky-600";
          }

          const isRevealed = revealedChoices.has(i);

          return (
            <div
              key={i}
              className={`flex items-center rounded-2xl border-2 transition-all ${classes}`}
            >
              <button
                onClick={() => !showResult && onSelect(i)}
                disabled={showResult}
                className="flex-1 text-left p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-extrabold text-lg ${labelColor} shrink-0`}
                  >
                    {["A", "B", "C", "D"][i]}
                  </span>
                  <span className="text-gray-800 font-medium">
                    <TokenizedText
                      text={choice}
                      vocabulary={vocabulary}
                      onAddToSRS={onAddToSRS}
                      tokenCache={tokenCache}
                      onTokenized={onTokenized}
                      showAudio={false}
                    />
                  </span>
                </div>
                {isRevealed && choiceTranslations?.[i] && (
                  <div className="text-xs text-gray-400 italic mt-1 ml-8">
                    {choiceTranslations[i]}
                  </div>
                )}
                {isRevealed && (
                  <div className="ml-8" onClick={(e) => e.stopPropagation()}>
                    <GrammarBreakdown text={choice} />
                  </div>
                )}
              </button>
              <div
                className={`flex items-center self-stretch border-l ${dividerColor}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChoice(i);
                  }}
                  className={`px-2 py-2 transition-colors ${isRevealed ? "text-sky-500" : enBtnColor}`}
                  title="Show translation"
                >
                  <Globe size={14} />
                </button>
                <AudioButton
                  text={choice}
                  size={20}
                  className={`px-3 py-4 ${audioColor}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
