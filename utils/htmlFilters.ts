/**
 * 段落番号を「(第N項)」に統一。第1項は非表示。
 * - クラス名の揺れ（ParagraphNum/para-num/num…para 等）対応
 * - 半角/全角数字対応
 * - 既に「第N項」の素テキストも括弧付け
 */
export function decorateParaNums(html: string): string {
  if (!html) return html;

  const DIG = '[0-9０-９]+';
  const toHalf = (s: string) => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const wrap = (n: string) => {
    const h = toHalf(n);
    if (h === '1') return '';              // 第1項は表示しない
    return `(第${h}項)`;                   // 括弧付きに統一
  };

  // class に para と num の両方を含む（順不同・大小文字無視）
  const reParaNum = new RegExp(
    `(<[^>]*class="[^"]*(?:para[^"]*num|num[^"]*para)[^"]*"[^>]*>\\s*)(${DIG})(\\s*<\\/[^>]+>)`,
    'gi'
  );
  // よくある別名（ParagraphNum/ParaNum 等）
  const reParagraphNum = new RegExp(
    `(<[^>]*class="[^"]*(?:ParagraphNum|ParaNum|para-num|para_num)[^"]*"[^>]*>\\s*)(${DIG})(\\s*<\\/[^>]+>)`,
    'gi'
  );
  // class 無しの <span>数字</span> を控えめに拾う（過剰置換防止）
  const rePlainSpan = new RegExp(`(<span[^>]*>\\s*)(${DIG})(\\s*<\\/span>)`, 'gi');

  let count = 0;
  const rep = (_m: string, a: string, n: string, b: string) => {
    const w = wrap(n);
    if (w) count++;
    return a + w + b;
  };

  let out = html.replace(reParaNum, rep).replace(reParagraphNum, rep);
  out = out.replace(rePlainSpan, (_m, a, n, b) => {
    const half = toHalf(n);
    if (!/^[0-9]{1,2}$/.test(half)) return a + n + b; // 1〜2桁のみ
    const w = wrap(half);
    if (!w) return '';                                 // 第1項は span ごと消す
    count++;
    return a + w + b;
  });

  // 既に素テキストで「第N項」になっているものも括弧付け（重複括弧は付けない）
  out = out.replace(/(?<![（(])第([0-9０-９]+)項(?![)）])/g, (_m, n) => wrap(n));

  try { console.log('DBG decorateParaNums count=', count, ' head=', out.slice(0, 180)); } catch {}
  return out;
}
