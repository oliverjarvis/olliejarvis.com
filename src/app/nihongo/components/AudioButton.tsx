"use client";

import { useState, useCallback, useRef } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";

// In-memory cache for the current session
const audioCache = new Map<string, string>();

function getTtsUrl(text: string): string {
  return `/api/nihongo/tts?text=${encodeURIComponent(text)}`;
}

interface AudioButtonProps {
  text: string;
  size?: number;
  className?: string;
}

export default function AudioButton({
  text,
  size = 16,
  className = "",
}: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playUrl = useCallback(
    (url: string) => {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      setIsLoading(false);
      audio.play();
    },
    [],
  );

  const speak = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (isPlaying) {
      stop();
      return;
    }

    // Check memory cache
    const cached = audioCache.get(text);
    if (cached) {
      playUrl(cached);
      return;
    }

    // Fetch from Edge TTS (GET — browser + CDN will cache)
    setIsLoading(true);
    try {
      const url = getTtsUrl(text);
      const res = await fetch(url);
      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioCache.set(text, blobUrl);
      playUrl(blobUrl);
    } catch {
      // Fallback to Web Speech API
      setIsLoading(false);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.85;
      const voices = speechSynthesis.getVoices();
      const ja = voices.find((v) => v.lang.startsWith("ja"));
      if (ja) utterance.voice = ja;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      speechSynthesis.speak(utterance);
    }
  }, [text, isPlaying, stop, playUrl]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speak();
      }}
      disabled={isLoading}
      className={`inline-flex items-center justify-center p-1 rounded hover:bg-black/5 transition-colors ${className}`}
      title={isPlaying ? "Stop" : "Play audio"}
    >
      {isLoading ? (
        <Loader2 size={size} className="animate-spin" />
      ) : isPlaying ? (
        <Square size={size} />
      ) : (
        <Volume2 size={size} />
      )}
    </button>
  );
}

// For AnswerPanel word taps
export function speakJapanese(text: string) {
  if (typeof window === "undefined") return;

  const cached = audioCache.get(text);
  if (cached) {
    new Audio(cached).play();
    return;
  }

  const url = getTtsUrl(text);
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error();
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      audioCache.set(text, blobUrl);
      new Audio(blobUrl).play();
    })
    .catch(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.85;
      speechSynthesis.speak(utterance);
    });
}
