"use client";
import { LawProvider, useLawMode } from "@/features/accessible-law/LawContext";

function LawTabs() {
  const { mode, setMode } = useLawMode();
  return (
    <div className="sticky top-0 z-50 bg-white border-b flex">
      <button
        onClick={() => setMode("original")}
        className={`px-4 py-2 ${mode === "original" ? "font-bold border-b-2 border-blue-500" : ""}`}
      >
        原文
      </button>
      <button
        onClick={() => setMode("easy")}
        className={`px-4 py-2 ${mode === "easy" ? "font-bold border-b-2 border-blue-500" : ""}`}
      >
        分かりやすい
      </button>
    </div>
  );
}

export default function LawLayout({ children }: { children: React.ReactNode }) {
  return (
    <LawProvider>
      <LawTabs />
      <div>{children}</div>
    </LawProvider>
  );
}
