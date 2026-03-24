"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { KuromojiToken, VocabWord } from "../types";
import { Plus, Volume2 } from "lucide-react";
import { speakJapanese } from "./AudioButton";
import { useHighlight, HighlightLevel } from "../highlight-context";

// Grammar colors per intensity level
interface GrammarStyle {
  subtle: { bg: string; darkBg: string };
  vivid: { bg: string; darkBg: string };
  label: string;
}

const GRAMMAR_COLORS: Record<string, GrammarStyle> = {
  名詞: {
    subtle: { bg: "bg-sky-100/60", darkBg: "bg-sky-300/30" },
    vivid: { bg: "bg-sky-200", darkBg: "bg-sky-300/50" },
    label: "noun",
  },
  動詞: {
    subtle: { bg: "bg-emerald-100/60", darkBg: "bg-emerald-300/30" },
    vivid: { bg: "bg-emerald-200", darkBg: "bg-emerald-300/50" },
    label: "verb",
  },
  形容詞: {
    subtle: { bg: "bg-amber-100/60", darkBg: "bg-amber-300/30" },
    vivid: { bg: "bg-amber-200", darkBg: "bg-amber-300/50" },
    label: "i-adj",
  },
  助詞: {
    subtle: { bg: "bg-gray-100/50", darkBg: "bg-white/15" },
    vivid: { bg: "bg-gray-200", darkBg: "bg-white/30" },
    label: "particle",
  },
  助動詞: {
    subtle: { bg: "bg-violet-100/60", darkBg: "bg-violet-300/30" },
    vivid: { bg: "bg-violet-200", darkBg: "bg-violet-300/50" },
    label: "aux",
  },
  副詞: {
    subtle: { bg: "bg-rose-100/60", darkBg: "bg-rose-300/30" },
    vivid: { bg: "bg-rose-200", darkBg: "bg-rose-300/50" },
    label: "adverb",
  },
  接続詞: {
    subtle: { bg: "bg-gray-100/50", darkBg: "bg-white/15" },
    vivid: { bg: "bg-gray-200", darkBg: "bg-white/30" },
    label: "conj",
  },
  感動詞: {
    subtle: { bg: "bg-yellow-100/60", darkBg: "bg-yellow-300/30" },
    vivid: { bg: "bg-yellow-200", darkBg: "bg-yellow-300/50" },
    label: "interj",
  },
  連体詞: {
    subtle: { bg: "bg-cyan-100/60", darkBg: "bg-cyan-300/30" },
    vivid: { bg: "bg-cyan-200", darkBg: "bg-cyan-300/50" },
    label: "pre-noun",
  },
  形容動詞: {
    subtle: { bg: "bg-orange-100/60", darkBg: "bg-orange-300/30" },
    vivid: { bg: "bg-orange-200", darkBg: "bg-orange-300/50" },
    label: "na-adj",
  },
};

const DEFAULT_STYLE: GrammarStyle = {
  subtle: { bg: "bg-gray-100/40", darkBg: "bg-white/10" },
  vivid: { bg: "bg-gray-200/70", darkBg: "bg-white/25" },
  label: "",
};

function getGrammarColor(pos: string, level: HighlightLevel, darkBg: boolean): { className: string; label: string } {
  if (level === "off") return { className: "", label: (GRAMMAR_COLORS[pos] || DEFAULT_STYLE).label };
  const style = GRAMMAR_COLORS[pos] || DEFAULT_STYLE;
  const intensity = style[level];
  return {
    className: darkBg ? intensity.darkBg : intensity.bg,
    label: style.label,
  };
}

interface TokenWordProps {
  token: KuromojiToken;
  vocabulary: VocabWord[];
  onAddToSRS: (word: string, reading: string, meaning: string) => void;
  darkBg?: boolean;
}

export default function TokenWord({
  token,
  vocabulary,
  onAddToSRS,
  darkBg = false,
}: TokenWordProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [lookupMeaning, setLookupMeaning] = useState<string | null>(null);
  const [lookupUrl, setLookupUrl] = useState<string | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    placeBelow: boolean;
  } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isPunctuation =
    token.pos === "記号" ||
    /^[。、！？…・「」『』（）\s.!?,;:]+$/.test(token.surface_form);

  const vocabEntry = vocabulary.find(
    (v) => v.word === token.surface_form || v.word === token.basic_form,
  );

  const { level: highlightLevel } = useHighlight();
  const grammarColor = getGrammarColor(token.pos, highlightLevel, darkBg);

  const handleLookup = useCallback(async () => {
    if (lookupMeaning || isLooking || vocabEntry) return;
    setIsLooking(true);
    try {
      const res = await fetch("/api/nihongo/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: token.basic_form || token.surface_form,
        }),
      });
      const data = await res.json();
      if (data.results?.length > 0 && data.results[0].meaning) {
        setLookupMeaning(data.results[0].meaning);
      }
      if (data.url) setLookupUrl(data.url);
    } catch {
      // Lookup failed silently
    }
    setIsLooking(false);
  }, [
    token.basic_form,
    token.surface_form,
    lookupMeaning,
    isLooking,
    vocabEntry,
  ]);

  const updatePosition = useCallback(() => {
    if (!wordRef.current) return;
    const rect = wordRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const placeBelow = spaceAbove < 200;
    const popoverWidth = 220;
    const centerX = rect.left + rect.width / 2 - popoverWidth / 2;
    const clampedLeft = Math.max(
      8,
      Math.min(centerX, window.innerWidth - popoverWidth - 8),
    );
    setPopoverPos({
      top: placeBelow ? rect.bottom + 8 : rect.top - 8,
      left: clampedLeft,
      placeBelow,
    });
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setShowPopover(false);
    }, 150);
  }, [cancelClose]);

  const openPopover = useCallback(() => {
    cancelClose();
    updatePosition();
    setShowPopover(true);
    if (!vocabEntry && !lookupMeaning) handleLookup();
  }, [cancelClose, updatePosition, vocabEntry, lookupMeaning, handleLookup]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakJapanese(token.surface_form);
    if (showPopover) {
      setShowPopover(false);
    } else {
      openPopover();
    }
  };

  // Close on click outside
  useEffect(() => {
    if (!showPopover) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        wordRef.current &&
        !wordRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopover]);

  if (isPunctuation) {
    return <span>{token.surface_form}</span>;
  }

  const reading = vocabEntry?.reading || token.reading;
  const meaning = vocabEntry?.meaning || lookupMeaning;
  const ichiMoeUrl =
    lookupUrl ||
    `https://ichi.moe/cl/qr/?q=${encodeURIComponent(token.basic_form || token.surface_form)}&r=htr`;

  const popover =
    showPopover && popoverPos
      ? createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] bg-white border rounded-2xl shadow-xl p-3 w-[220px] text-sm text-gray-900"
            style={{
              top: popoverPos.placeBelow ? popoverPos.top : undefined,
              bottom: popoverPos.placeBelow
                ? undefined
                : window.innerHeight - popoverPos.top,
              left: popoverPos.left,
            }}
            onMouseEnter={() => {
              cancelClose();
              setShowPopover(true);
            }}
            onMouseLeave={scheduleClose}
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-lg">{token.surface_form}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakJapanese(token.surface_form);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Volume2 size={14} />
              </button>
            </div>
            {token.basic_form && token.basic_form !== token.surface_form && (
              <div className="text-gray-400 text-xs">
                dict: {token.basic_form}
              </div>
            )}
            {reading && (
              <div className="text-gray-500 text-sm">{reading}</div>
            )}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${getGrammarColor(token.pos, "vivid", false).className} text-gray-700`}
              >
                {grammarColor.label || token.pos}
              </span>
              {token.grammar_note && (
                <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-indigo-100 text-indigo-700">
                  {token.grammar_note}
                </span>
              )}
            </div>
            {meaning ? (
              <div className="mt-1.5 text-gray-700 font-medium">{meaning}</div>
            ) : isLooking ? (
              <div className="mt-1.5 text-gray-400 text-xs">Looking up...</div>
            ) : (
              <a
                href={ichiMoeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 text-blue-500 text-xs underline block"
              >
                Look up on ichi.moe
              </a>
            )}
            <button
              className="mt-2 flex items-center gap-1 text-xs bg-emerald-500 text-white px-2 py-1 rounded-lg hover:bg-emerald-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAddToSRS(
                  token.basic_form || token.surface_form,
                  reading || "",
                  meaning || "",
                );
              }}
            >
              <Plus size={12} />
              Add to SRS
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <span ref={wordRef} className="relative inline-block">
      <span
        className={`cursor-pointer rounded-md px-0.5 transition-colors ${
          grammarColor.className
            ? `${grammarColor.className} hover:brightness-95`
            : "hover:bg-gray-100"
        }`}
        onClick={handleClick}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
      >
        {token.surface_form}
      </span>
      {popover}
    </span>
  );
}
