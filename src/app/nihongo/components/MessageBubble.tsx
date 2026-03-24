"use client";

import { useState } from "react";
import { DisplayMessage, KuromojiToken, VocabWord } from "../types";
import TokenWord from "./TokenWord";
import AudioButton from "./AudioButton";
import { ChevronDown, ChevronUp, Globe } from "lucide-react";

interface MessageBubbleProps {
  message: DisplayMessage;
  vocabulary: VocabWord[];
  tokens?: KuromojiToken[];
  onAddToSRS: (word: string, reading: string, meaning: string) => void;
}

export default function MessageBubble({
  message,
  vocabulary,
  tokens,
  onAddToSRS,
}: MessageBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(false);

  const isUser = message.isUser;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
          isUser
            ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-br-sm"
            : "bg-white text-gray-900 rounded-bl-sm border-2 border-gray-100"
        }`}
      >
        <div
          className={`text-xs font-bold mb-1 uppercase tracking-wider ${isUser ? "text-sky-200" : "text-emerald-500"}`}
        >
          {message.speaker}
        </div>
        <div className="text-lg leading-relaxed">
          {tokens && tokens.length > 0
            ? tokens.map((token, i) => (
                <TokenWord
                  key={i}
                  token={token}
                  vocabulary={vocabulary}
                  onAddToSRS={onAddToSRS}
                  darkBg={isUser}
                />
              ))
            : message.text}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <AudioButton
            text={message.text}
            size={16}
            className={
              isUser
                ? "text-sky-200 hover:text-white"
                : "text-gray-300 hover:text-gray-600"
            }
          />
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`flex items-center gap-0.5 text-xs font-semibold transition-colors px-2 py-1 rounded-lg ${
              isUser
                ? "text-sky-200 hover:text-white hover:bg-white/10"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Globe size={12} />
            {showTranslation ? "Hide" : "EN"}
            {showTranslation ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>
        </div>
        {showTranslation && (
          <div
            className={`mt-2 text-sm border-t pt-2 ${
              isUser
                ? "border-sky-400/50 text-sky-100"
                : "border-gray-100 text-gray-500"
            }`}
          >
            {message.translation}
          </div>
        )}
      </div>
    </div>
  );
}
