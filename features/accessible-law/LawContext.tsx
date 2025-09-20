"use client";
import React, { createContext, useContext, useState } from "react";

type Mode = "original" | "easy";
type Ctx = { mode: Mode; setMode: (m: Mode) => void };

const LawCtx = createContext<Ctx>({ mode: "original", setMode: () => {} });

export function LawProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("original"); // 初期表示=原文
  return <LawCtx.Provider value={{ mode, setMode }}>{children}</LawCtx.Provider>;
}

export function useLawMode() {
  return useContext(LawCtx);
}
