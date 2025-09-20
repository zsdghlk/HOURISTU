"use client";
import { useLawMode } from "./LawContext";

export default function LawContent({ originalHtml }: { originalHtml: string }) {
  const { mode } = useLawMode();

  if (mode === "easy") {
    return <div className="p-4 text-gray-500 italic">（分かりやすい文は準備中です）</div>;
  }

  const len = (originalHtml || "").length;

  return (
    <div className="p-4">
      <div className="text-xs text-gray-500 mb-3">
        [debug] mode=original / html_len={len}
      </div>
      <div
        className="border rounded p-4 bg-white text-black"
        dangerouslySetInnerHTML={{ __html: originalHtml }}
      />
    </div>
  );
}
