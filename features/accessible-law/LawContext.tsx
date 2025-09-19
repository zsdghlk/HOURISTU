"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type Mode = "original" | "easy";

const LawContext = createContext<{
  mode: Mode;
  setMode: (m: Mode) => void;
}>({ mode: "original", setMode: () => {} });

export function LawProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("original");
  return (
    <LawContext.Provider value={{ mode, setMode }}>
      {children}
    </LawContext.Provider>
  );
}

export function useLawMode() {
  return useContext(LawContext);
}
