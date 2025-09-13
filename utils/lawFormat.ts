/**
 * 条文表示用の番号整形ユーティリティ
 * - 第1項は番号を出さない
 * - 数字のみ: 【第n項】
 * - 漢数字のみ: （一）（二）… を号として扱う
 */
export function formatParagraphNum(num?: string, index?: number): string {
  if (!num || String(num).trim() === "") {
    // 項番号が無い → 先頭段落は無印、2段落目以降は【第(n)項】（indexは0始まり）
    return index && index > 0 ? `【第${index + 1}項】` : "";
  }
  const s = String(num).trim();

  // アラビア数字（1,2,3...）
  if (/^\d+$/.test(s)) {
    return s === "1" ? "" : `【第${s}項】`;
  }

  // 漢数字（号の想定: 一,二,三...）
  if (/^[一二三四五六七八九十百千万]+$/.test(s)) {
    return `（${s}）`;
  }

  // それ以外はそのまま
  return s;
}
