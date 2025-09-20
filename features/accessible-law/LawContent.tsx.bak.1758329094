"use client";
import { useLawMode } from "./LawContext";

export default function LawContent({ originalHtml }: { originalHtml: string }) {
  const { mode } = useLawMode();

  if (mode === "easy") {
    return (
      <div className="p-4 text-gray-500 italic">
        （分かりやすい文は準備中です）
      </div>
    );
  }

  if (!originalHtml || originalHtml.length < 50) {
    // 万一APIが空のときだけ
    return <div>本文を取得できませんでした</div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: originalHtml }} />;
}
