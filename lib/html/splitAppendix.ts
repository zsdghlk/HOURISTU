/**
 * e-Gov のHTMLを「附則」見出しで二分する。
 * - 見出しは <h1>～<h3> の「附則」「附  則」などを許容
 * - 見つからなければ appendix は空
 */
export function splitAppendix(html: string): { main: string; appendix: string } {
  if (!html) return { main: "", appendix: "" };
  const mark = /(<!--[^>]*-->\s*)*<(h[1-3])[^>]*>\s*附\s*則\s*<\/\2>/i;
  const idx = html.search(mark);
  if (idx < 0) return { main: html, appendix: "" };
  const before = html.slice(0, idx);
  const after = html.slice(idx);
  return { main: before, appendix: after };
}
