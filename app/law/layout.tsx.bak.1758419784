"use client";
import React from "react";
import { LawProvider, useLawMode } from "@/features/accessible-law/LawContext";
import HeaderPortal from "@/features/accessible-law/HeaderPortal";

function LawTabsInline() {
  const { mode, setMode } = useLawMode();
  // ヘッダーの「ホーム」と同じ高さ/サイズ感に揃えるクラス
  const base = "law-tab no-underline";
  return (
    <div className="law-tabs-inline">
      <button
        onClick={() => setMode("original")}
        className={`${base}`}
        aria-pressed={mode === "original"}
      >
        原文
      </button>
      <button
        onClick={() => setMode("easy")}
        className={`${base}`}
        aria-pressed={mode === "easy"}
      >
        分かりやすい
      </button>
    </div>
  );
}

export default function LawLayout({ children }: { children: React.ReactNode }) {
  return (
    <LawProvider>
      {/* /law 配下だけヘッダーに差し込まれる。ホームではこのレイアウト自体が使われないので非表示。 */}
      <HeaderPortal>
        <LawTabsInline />
      </HeaderPortal>
      {/* ページ本体 */}
      <div className="p-4">{children}</div>
    </LawProvider>
  );
}
