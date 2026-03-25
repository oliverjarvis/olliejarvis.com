"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Volume2, BookOpen } from "lucide-react";
import { speakJapanese } from "./AudioButton";

// Detect if text contains Japanese characters
function hasJapanese(text: string): boolean {
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/.test(
    text,
  );
}

export default function SelectionToolbar() {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const checkSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setShow(false);
      return;
    }

    const text = selection.toString().trim();
    if (!hasJapanese(text)) {
      setShow(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const toolbarWidth = 100;
    const left = Math.max(
      8,
      Math.min(
        rect.left + rect.width / 2 - toolbarWidth / 2,
        window.innerWidth - toolbarWidth - 8,
      ),
    );

    setSelectedText(text);
    setPos({
      top: rect.top - 44,
      left,
    });
    setShow(true);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", checkSelection);
    document.addEventListener("mouseup", () =>
      setTimeout(checkSelection, 10),
    );
    document.addEventListener("touchend", () =>
      setTimeout(checkSelection, 10),
    );

    return () => {
      document.removeEventListener("selectionchange", checkSelection);
    };
  }, [checkSelection]);

  // Hide when clicking the toolbar itself (after action)
  const handleAction = useCallback(
    (action: () => void) => {
      return (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        action();
      };
    },
    [],
  );

  if (!show || !selectedText) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-[9999] flex items-center bg-gray-900 text-white rounded-xl shadow-2xl overflow-hidden"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      <button
        onMouseDown={handleAction(() => speakJapanese(selectedText))}
        className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-700 transition-colors text-sm font-bold"
      >
        <Volume2 size={14} />
        Listen
      </button>
      <div className="w-px h-6 bg-gray-700" />
      <button
        onMouseDown={handleAction(() => {
          window.open(
            `https://ichi.moe/cl/qr/?q=${encodeURIComponent(selectedText)}&r=htr`,
            "_blank",
          );
        })}
        className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-700 transition-colors text-sm font-bold"
      >
        <BookOpen size={14} />
        Lookup
      </button>
    </div>,
    document.body,
  );
}
