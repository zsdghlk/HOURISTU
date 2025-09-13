export function formatArticleHeading(input: unknown): string {
  // "7" -> "第七条" / "第一条"など既に「第…条」ならそのまま
  const s = String(input ?? "").trim();
  if (!s) return "";
  if (/^第.+条$/.test(s)) return s;
  // 半角数字だけ来たときの簡易対応（本来は漢数字変換だが最小実装）
  return `第${s}条`;
}

export function formatParagraphNum(num: unknown, indexZeroBased?: number): string {
  // "2" -> "（二）" / undefined か 0段落目なら空
  const raw = String(num ?? "").trim();
  if (!raw || raw === "1") return "";     // 第1段落は通例番号省略
  return `（${raw}） `;
}
