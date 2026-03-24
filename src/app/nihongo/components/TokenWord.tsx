"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { KuromojiToken, VocabWord } from "../types";
import { Plus, Volume2 } from "lucide-react";
import { speakJapanese } from "./AudioButton";

// Grammar-based color map (pos → tailwind classes)
const GRAMMAR_COLORS: Record<
  string,
  { bg: string; text: string; darkBg: string; label: string }
> = {
  名詞: {
    bg: "bg-sky-100/70",
    text: "text-sky-800",
    darkBg: "bg-sky-400/30",
    label: "noun",
  },
  動詞: {
    bg: "bg-emerald-100/70",
    text: "text-emerald-800",
    darkBg: "bg-emerald-400/30",
    label: "verb",
  },
  形容詞: {
    bg: "bg-amber-100/70",
    text: "text-amber-800",
    darkBg: "bg-amber-400/30",
    label: "i-adj",
  },
  助詞: {
    bg: "bg-gray-100/70",
    text: "text-gray-600",
    darkBg: "bg-white/15",
    label: "particle",
  },
  助動詞: {
    bg: "bg-violet-100/70",
    text: "text-violet-800",
    darkBg: "bg-violet-400/30",
    label: "aux",
  },
  副詞: {
    bg: "bg-rose-100/70",
    text: "text-rose-800",
    darkBg: "bg-rose-400/30",
    label: "adverb",
  },
  接続詞: {
    bg: "bg-gray-100/70",
    text: "text-gray-700",
    darkBg: "bg-white/15",
    label: "conj",
  },
  感動詞: {
    bg: "bg-yellow-100/70",
    text: "text-yellow-800",
    darkBg: "bg-yellow-400/30",
    label: "interj",
  },
  連体詞: {
    bg: "bg-cyan-100/70",
    text: "text-cyan-800",
    darkBg: "bg-cyan-400/30",
    label: "pre-noun",
  },
  形容動詞: {
    bg: "bg-orange-100/70",
    text: "text-orange-800",
    darkBg: "bg-orange-400/30",
    label: "na-adj",
  },
};

const DEFAULT_COLOR = {
  bg: "bg-gray-100/50",
  text: "text-gray-700",
  darkBg: "bg-white/10",
  label: "",
};

function getGrammarColor(pos: string) {
  return GRAMMAR_COLORS[pos] || DEFAULT_COLOR;
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

  const grammarColor = getGrammarColor(token.pos);

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
    // Play the word audio
    speakJapanese(token.surface_form);
    // Toggle popover
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
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${grammarColor.bg} ${grammarColor.text}`}
              >
                {grammarColor.label || token.pos}
              </span>
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
          darkBg
            ? `${grammarColor.darkBg} hover:brightness-125`
            : `${grammarColor.bg} hover:brightness-95`
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
