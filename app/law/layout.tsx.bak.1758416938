"use client";
import React from "react";
import { LawProvider, useLawMode } from "@/features/accessible-law/LawContext";

function LawTabs() {
  const { mode, setMode } = useLawMode();
  const btn = (label: string, key: "original" | "easy") => (
    <button
      onClick={() => setMode(key)}
      className={`px-4 py-2 transition-colors ${
        mode === key
          ? "font-bold border-b-2 border-blue-500 text-blue-600"
          : "text-gray-600 hover:text-gray-900"
      }`}
      aria-pressed={mode === key}
    >
      {label}
    </button>
  );
  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b flex gap-2">
      {btn("原文", "original")}
      {btn("分かりやすい", "easy")}
    </div>
  );
}

export default function LawLayout({ children }: { children: React.ReactNode }) {
  return (
    <LawProvider>
      <LawTabs />
      <div className="p-4">{children}</div>
    </LawProvider>
  );
}
