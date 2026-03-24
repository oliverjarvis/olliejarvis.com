"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type HighlightLevel = "off" | "subtle" | "vivid";

interface HighlightContextType {
  level: HighlightLevel;
  setLevel: (level: HighlightLevel) => void;
  cycle: () => void;
}

const HighlightContext = createContext<HighlightContextType>({
  level: "subtle",
  setLevel: () => {},
  cycle: () => {},
});

const LEVELS: HighlightLevel[] = ["off", "subtle", "vivid"];

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<HighlightLevel>("subtle");

  const cycle = useCallback(() => {
    setLevel((prev) => {
      const idx = LEVELS.indexOf(prev);
      return LEVELS[(idx + 1) % LEVELS.length];
    });
  }, []);

  return (
    <HighlightContext.Provider value={{ level, setLevel, cycle }}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight() {
  return useContext(HighlightContext);
}
