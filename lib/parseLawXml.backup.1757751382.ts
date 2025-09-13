import { XMLParser } from "fast-xml-parser";

/** 画面用に返す最小情報 */
export type ParsedArticle = {
  num: string;                                // 例: 第3条 / 第3条の2
  title?: string;
  paragraphs: { num?: string; text: string }[];
  isSupplement?: boolean;
  supLabel?: string;
};

/* ========== ユーティリティ ========== */

/** "3"→"第3条", "3_2"→"第3条の2"、既に「第…条」ならそのまま */
function normalizeArticleNum(raw?: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  if (/第.+条/.test(s)) return s;
  if (s.includes("_")) {
    const [main, sub] = s.split("_");
    if (main && sub) return `第${main}条の${sub}`;
  }
  if (/^[0-9]+$/.test(s)) return `第${s}条`;
  if (/^[一二三四五六七八九十百千万]+$/.test(s)) return `第${s}条`;
  return s;
}

/** 任意オブジェクト配下から「テキストらしきもの」を全部かき集めて連結 */
function collectText(n: any): string {
  if (n == null) return "";
  if (typeof n === "string") return n;
  if (typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(collectText).join("");
  if (typeof n === "object") {
    // fast-xml-parser: デフォルトではテキストは "text" に入る
    if (typeof (n as any).text === "string") return (n as any).text;
    // その他のプロパティも再帰で収集
    return Object.values(n).map(collectText).join("");
  }
  return "";
}

/** Paragraph配列へ正規化（Paragraph が無い条は Sentence を丸ごと1段落に） */
function normalizeParagraphs(article: any): { num?: string; text: string }[] {
  const p = article?.Paragraph;
  if (p) {
    const arr = Array.isArray(p) ? p : [p];
    return arr.map((x: any) => {
      const num = x?.ParagraphNum ?? x?.ParaNum ?? x?.Num ?? undefined;
      // Sentence / ParagraphSentence / それ以外…全部テキストを吸い上げ
      const text =
        collectText(x?.Sentence) ||
        collectText(x?.ParagraphSentence) ||
        collectText(x);
      const t = (text || "").trim();
      return { num, text: t };
    });
  }
  // Paragraph がない場合は条直下の Sentence 等を1段落として扱う
  const text =
    collectText(article?.Sentence) ||
    collectText(article?.ParagraphSentence) ||
    collectText(article);
  const t = (text || "").trim();
  return t ? [{ text: t }] : [];
}

/* ========== 本体 ========== */
/**
 * e-Gov 法令XMLから Article を**深さ優先で網羅的に収集**する
 * - LawBody/MainProvision/SupplProvision 配下のどの階層でも拾う
 * - ArticleNum が無くても段落があれば採用（見出しは空）
 */
export function parseLawXml(xml: string): ParsedArticle[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text",
    trimValues: true,
  });
  const j = parser.parse(xml);

  // LawBody の取り出し（実装差異に強く）
  const lawBody =
    j?.DataRoot?.ApplData?.LawFullText?.LawBody ??
    j?.DataRoot?.ApplData?.LawContents?.LawBody ??
    j?.DataRoot?.ApplData?.Law?.LawBody ??
    null;
  if (!lawBody) return [];

  const results: ParsedArticle[] = [];

  function walk(node: any, inSuppl = false, supLabel?: string) {
    if (!node || typeof node !== "object") return;

    // 1) このノード自身が Article を持つ場合
    const list = Array.isArray(node.Article)
      ? node.Article
      : node.Article
      ? [node.Article]
      : [];
    for (const a of list) {
      const num = normalizeArticleNum(a?.ArticleNum ?? a?.Num ?? "");
      const title = a?.ArticleTitle ?? a?.Title ?? "";
      const paragraphs = normalizeParagraphs(a);
      if (!num && paragraphs.length === 0) continue;
      results.push({ num, title, paragraphs, isSupplement: inSuppl, supLabel });
    }

    // 2) このノード自身が Article そのもの（ケース対策）
    const maybeArticle =
      (node as any)?.ArticleNum || (node as any)?.Paragraph || (node as any)?.Sentence ? node : null;
    if (maybeArticle && !list.length) {
      const num = normalizeArticleNum((node as any)?.ArticleNum ?? (node as any)?.Num ?? "");
      const title = (node as any)?.ArticleTitle ?? (node as any)?.Title ?? "";
      const paragraphs = normalizeParagraphs(node);
      if (num || paragraphs.length) {
        results.push({ num, title, paragraphs, isSupplement: inSuppl, supLabel });
      }
    }

    // 3) 子要素を再帰（Chapter/Section/Subsection/Division/Item などすべて）
    for (const [k, v] of Object.entries(node)) {
      if (!v || typeof v !== "object") continue;
      const nextSuppl =
        inSuppl ||
        k.toLowerCase().includes("suppl"); // SupplProvision / Suppl～ 判定
      const nextSupLabel =
        supLabel ||
        (node as any)?.SupplProvisionLabel ||
        (node as any)?.SupplLawNum ||
        (node as any)?.EnactStatement ||
        undefined;
      if (Array.isArray(v)) {
        for (const child of v) walk(child, nextSuppl, nextSupLabel);
      } else {
        walk(v, nextSuppl, nextSupLabel);
      }
    }
  }

  walk(lawBody, false, undefined);
  return results;
}
