"use client";

import { useState, useEffect, useCallback } from "react";
import { KuromojiToken, VocabWord } from "../types";
import TokenWord from "./TokenWord";
import AudioButton from "./AudioButton";

interface TokenizedTextProps {
  text: string;
  vocabulary: VocabWord[];
  onAddToSRS: (word: string, reading: string, meaning: string) => void;
  tokenCache: Record<string, KuromojiToken[]>;
  onTokenized: (text: string, tokens: KuromojiToken[]) => void;
  showAudio?: boolean;
  audioSize?: number;
  className?: string;
}

export default function TokenizedText({
  text,
  vocabulary,
  onAddToSRS,
  tokenCache,
  onTokenized,
  showAudio = true,
  audioSize = 14,
  className = "",
}: TokenizedTextProps) {
  const [loading, setLoading] = useState(false);

  const tokens = tokenCache[text];

  const tokenize = useCallback(async () => {
    if (tokens || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/nihongo/tokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.tokens) {
        onTokenized(text, data.tokens);
      }
    } catch {
      // fallback: plain text
    }
    setLoading(false);
  }, [text, tokens, loading, onTokenized]);

  useEffect(() => {
    tokenize();
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={`inline ${className}`}>
      {tokens && tokens.length > 0
        ? tokens.map((token, i) => (
            <TokenWord
              key={i}
              token={token}
              vocabulary={vocabulary}
              onAddToSRS={onAddToSRS}
            />
          ))
        : text}
      {showAudio && (
        <AudioButton
          text={text}
          size={audioSize}
          className="ml-1 inline-flex align-middle text-gray-400 hover:text-gray-700"
        />
      )}
    </span>
  );
}
