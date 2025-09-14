import { fetchLawJson, listArticleKeys } from "./egov";

/** Glossary エントリ */
export type GlossItem = {
  term: string;        // 語
  definition: string;  // 定義（短く整形）
  artKey: string;      // 出典条
};

/** e-Gov law → 簡易用語集を抽出（「〜とは、〜をいう。」） */
export async function extractGlossary(lawId: string, maxPerArticle = 10): Promise<GlossItem[]> {
  const law = await fetchLawJson(lawId);
  const main = law?.LawBody?.MainProvision;
  const arts = Array.isArray(main?.Article) ? main.Article : main?.Article ? [main.Article] : [];
  const results: GlossItem[] = [];
  const seen = new Set<string>();

  const rx = /([一-龯々〆ヶぁ-ゖァ-ヿA-Za-z0-9・ー「」『』\(\)（）［］【】\-\.]+?)とは、(.+?)をいう。/g;

  for (const a of arts) {
    // 第○条キー
    const title = a?.ArticleTitle || a?.ArticleNum || a?.Num || a?.$?.Num || "";
    const artKey = String(title).replace(/[^\d\-]/g, "");
    const paras = Array.isArray(a?.Paragraph) ? a.Paragraph : a?.Paragraph ? [a.Paragraph] : [];
    let count = 0;

    for (const p of paras) {
      const sentences = Array.isArray(p?.Sentence) ? p.Sentence : p?.Sentence ? [p.Sentence] : [];
      for (const s of sentences) {
        const text = typeof s === "string" ? s : s?._ ?? "";
        if (!text) continue;

        rx.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = rx.exec(text)) !== null) {
          const term = m[1].trim().replace(/^[「『（(]+|[）」』）)]+$/g, "");
          const def = m[2].trim().replace(/。+$/,"");
          if (!term || term.length > 20 || def.length > 120) continue;
          const key = `${term}#${artKey}`;
          if (seen.has(key)) continue;
          results.push({ term, definition: def, artKey });
          seen.add(key);
          count++;
          if (count >= maxPerArticle) break;
        }
        if (count >= maxPerArticle) break;
      }
    }
  }
  // ざっくり重複語は最初の定義を優先
  const firstByTerm = new Map<string, GlossItem>();
  for (const g of results) if (!firstByTerm.has(g.term)) firstByTerm.set(g.term, g);
  return Array.from(firstByTerm.values()).slice(0, 200);
}
