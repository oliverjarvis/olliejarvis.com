"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnswerMode, ConversationExchange, KuromojiToken, VocabWord } from "../types";
import { Shuffle, PenLine, Lightbulb, Mic } from "lucide-react";
import { speakJapanese } from "./AudioButton";
import TokenizedText from "./TokenizedText";

interface AnswerPanelProps {
  mode: AnswerMode;
  exchange: ConversationExchange;
  onSubmit: (answer: string) => void;
  vocabulary: VocabWord[];
  onAddToSRS: (word: string, reading: string, meaning: string) => void;
  tokenCache: Record<string, KuromojiToken[]>;
  onTokenized: (text: string, tokens: KuromojiToken[]) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string): string {
  return s
    .replace(/[。、！？…・「」『』（）\s.!?,;:\-～〜]/g, "")
    .replace(/[\u30A1-\u30F6]/g, (m) =>
      String.fromCharCode(m.charCodeAt(0) - 0x60),
    )
    .toLowerCase();
}

// Fetch readings from the tokenize API for better matching
async function getReadings(text: string): Promise<string> {
  try {
    const res = await fetch("/api/nihongo/tokenize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (data.tokens) {
      return data.tokens.map((t: { reading: string }) => t.reading).join("");
    }
  } catch {
    // fallback
  }
  return normalize(text);
}

// Given a full transcript, greedily match available parts
// Uses both surface form and reading-based matching
async function matchPartsFromTranscript(
  transcript: string,
  available: string[],
): Promise<number[]> {
  const normT = normalize(transcript);
  if (!normT) return [];

  // Get readings for the transcript
  const transcriptReading = normalize(await getReadings(transcript));

  // Pre-compute readings for available parts
  const availableNorm = available.map((a) => normalize(a));
  const availableReadings = await Promise.all(
    available.map(async (a) => normalize(await getReadings(a))),
  );

  const matched: number[] = [];
  let remainingSurface = normT;
  let remainingReading = transcriptReading;

  while (remainingSurface.length > 0 || remainingReading.length > 0) {
    let bestIdx = -1;
    let bestPos = Math.max(remainingSurface.length, remainingReading.length);
    let bestLen = 0;
    let matchedOnReading = false;

    for (let i = 0; i < available.length; i++) {
      if (matched.includes(i)) continue;

      // Try surface form match
      const partNorm = availableNorm[i];
      if (partNorm && remainingSurface.length > 0) {
        const pos = remainingSurface.indexOf(partNorm);
        if (pos !== -1 && (pos < bestPos || (pos === bestPos && partNorm.length > bestLen))) {
          bestIdx = i;
          bestPos = pos;
          bestLen = partNorm.length;
          matchedOnReading = false;
        }
      }

      // Try reading match
      const partReading = availableReadings[i];
      if (partReading && remainingReading.length > 0) {
        const pos = remainingReading.indexOf(partReading);
        if (pos !== -1 && (pos < bestPos || (pos === bestPos && partReading.length > bestLen))) {
          bestIdx = i;
          bestPos = pos;
          bestLen = partReading.length;
          matchedOnReading = true;
        }
      }
    }

    if (bestIdx === -1) break;
    matched.push(bestIdx);

    if (matchedOnReading) {
      remainingReading = remainingReading.slice(bestPos + bestLen);
      // Also try to advance surface
      const sNorm = availableNorm[bestIdx];
      const sPos = remainingSurface.indexOf(sNorm);
      if (sPos !== -1) {
        remainingSurface = remainingSurface.slice(sPos + sNorm.length);
      }
    } else {
      remainingSurface = remainingSurface.slice(bestPos + bestLen);
      // Also try to advance reading
      const rNorm = availableReadings[bestIdx];
      const rPos = remainingReading.indexOf(rNorm);
      if (rPos !== -1) {
        remainingReading = remainingReading.slice(rPos + rNorm.length);
      }
    }
  }

  return matched;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionAny = any;

function getSpeechRecognition(): (new () => SpeechRecognitionAny) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function AnswerPanel({
  mode,
  exchange,
  onSubmit,
  vocabulary,
  onAddToSRS,
  tokenCache,
  onTokenized,
}: AnswerPanelProps) {
  const [answer, setAnswer] = useState("");
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);
  const availableRef = useRef<string[]>([]);

  useEffect(() => {
    availableRef.current = availableParts;
  }, [availableParts]);

  useEffect(() => {
    if (mode === "scramble" || mode === "hybrid") {
      const shuffled = shuffleArray(exchange.answerParts);
      setAvailableParts(shuffled);
      setSelectedParts([]);
      setAnswer("");
      setLiveTranscript("");
    }
    return () => stopListening();
  }, [mode, exchange]);

  const speak = (text: string) => speakJapanese(text);

  const handleSelect = useCallback(
    (index: number) => {
      const part = availableParts[index];
      speak(part);
      setSelectedParts((prev) => [...prev, part]);
      setAvailableParts((prev) => prev.filter((_, i) => i !== index));
    },
    [availableParts],
  );

  const handleDeselect = (index: number) => {
    const part = selectedParts[index];
    speak(part);
    setAvailableParts((prev) => [...prev, part]);
    setSelectedParts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInsert = (index: number) => {
    const part = availableParts[index];
    speak(part);
    setAnswer((prev) => prev + part);
    setAvailableParts((prev) => prev.filter((_, i) => i !== index));
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // When speech finishes, match the transcript against available parts
  const processTranscript = useCallback(
    async (transcript: string) => {
      const matched = await matchPartsFromTranscript(
        transcript,
        availableRef.current,
      );
      if (matched.length === 0) return;

      // Select matched parts in order
      const partsToSelect = matched.map((idx) => availableRef.current[idx]);
      const matchedSet = new Set(matched);

      setSelectedParts((prev) => [...prev, ...partsToSelect]);
      setAvailableParts((prev) =>
        prev.filter((_, idx) => !matchedSet.has(idx)),
      );
      setLiveTranscript("");

      // Speak the matched parts
      const fullText = partsToSelect.join("");
      speak(fullText);
    },
    [],
  );

  const startListening = useCallback(() => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) return;

    stopListening();
    setLiveTranscript("");

    const recognition = new SpeechRec();
    recognition.lang = "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setLiveTranscript(final + interim);

      if (final) {
        processTranscript(final);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = () => {
      // Don't set isListening false here — let onend handle it
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;

    // Delay start slightly to avoid Chrome killing it immediately
    setTimeout(() => {
      if (!recognitionRef.current) return;
      try {
        recognition.start();
      } catch {
        setIsListening(false);
      }
    }, 100);
  }, [stopListening, processTranscript]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const hasSpeechRecognition =
    typeof window !== "undefined" && getSpeechRecognition() !== null;

  if (mode === "scramble") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-sky-600 uppercase tracking-wider">
            <Shuffle size={16} />
            <span>Arrange the words</span>
          </div>
          {hasSpeechRecognition && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                isListening
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-200 animate-pulse"
                  : "bg-sky-100 text-sky-600 hover:bg-sky-200"
              }`}
            >
              {isListening ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full" />
                  Listening...
                </>
              ) : (
                <>
                  <Mic size={14} />
                  Speak
                </>
              )}
            </button>
          )}
        </div>

        {/* Answer area — shows selected parts + live transcript */}
        <div className="min-h-[56px] p-4 bg-white rounded-2xl border-2 border-dashed border-sky-300 flex flex-wrap gap-2 items-start">
          {selectedParts.length === 0 && !liveTranscript && (
            <span className="text-gray-400 text-sm font-medium py-1">
              {isListening
                ? "Say the sentence..."
                : "Tap words or press Speak..."}
            </span>
          )}
          {selectedParts.map((part, i) => (
            <button
              key={`sel-${i}`}
              onClick={() => handleDeselect(i)}
              className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 active:bg-sky-700 transition-colors shadow-md shadow-sky-200"
            >
              <TokenizedText
                text={part}
                vocabulary={vocabulary}
                onAddToSRS={onAddToSRS}
                tokenCache={tokenCache}
                onTokenized={onTokenized}
                showAudio={false}
                darkBg={true}
              />
            </button>
          ))}
          {liveTranscript && (
            <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium italic animate-pulse">
              {liveTranscript}
            </span>
          )}
        </div>

        {/* Available word chips */}
        <div className="flex flex-wrap gap-2">
          {availableParts.map((part, i) => (
            <div
              key={`avail-${i}`}
              className="flex items-center bg-white border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-sky-400 hover:bg-sky-50 transition-colors shadow-sm overflow-hidden"
            >
              <button
                onClick={() => handleSelect(i)}
                className="px-4 py-2"
              >
                <TokenizedText
                  text={part}
                  vocabulary={vocabulary}
                  onAddToSRS={onAddToSRS}
                  tokenCache={tokenCache}
                  onTokenized={onTokenized}
                  showAudio={false}
                />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            stopListening();
            onSubmit(selectedParts.join(""));
          }}
          disabled={availableParts.length > 0}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-extrabold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          Check Answer
        </button>
      </div>
    );
  }

  if (mode === "freetext") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-violet-600 uppercase tracking-wider">
          <PenLine size={16} />
          <span>Type your response</span>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="日本語で答えてください..."
          className="w-full p-4 border-2 border-violet-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none min-h-[100px] text-lg resize-none bg-violet-50 placeholder:text-violet-300"
          lang="ja"
          autoFocus
        />

        <button
          onClick={() => onSubmit(answer)}
          disabled={!answer.trim()}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-extrabold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          Submit
        </button>
      </div>
    );
  }

  // Hybrid mode
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-600 uppercase tracking-wider">
        <Lightbulb size={16} />
        <span>Type freely or tap hints</span>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="日本語で答えてください..."
        className="w-full p-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none min-h-[100px] text-lg resize-none bg-amber-50 placeholder:text-amber-300"
        lang="ja"
        autoFocus
      />

      {availableParts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableParts.map((part, i) => (
            <div
              key={`hint-${i}`}
              className="flex items-center bg-white border-2 border-amber-300 rounded-xl text-sm font-bold text-amber-700 hover:border-amber-400 hover:bg-amber-100 transition-colors shadow-sm overflow-hidden"
            >
              <button
                onClick={() => handleInsert(i)}
                className="px-4 py-2"
              >
                <TokenizedText
                  text={part}
                  vocabulary={vocabulary}
                  onAddToSRS={onAddToSRS}
                  tokenCache={tokenCache}
                  onTokenized={onTokenized}
                  showAudio={false}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onSubmit(answer)}
        disabled={!answer.trim()}
        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-extrabold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
      >
        Submit
      </button>
    </div>
  );
}
