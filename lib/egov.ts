import { parseStringPromise } from "xml2js";

/** e-Gov V1 lawdata XML → JSON */
export async function fetchLawJson(lawId: string, revalidateSec = 86400) {
  const url = `https://laws.e-gov.go.jp/api/1/lawdata/${lawId}`;
  const res = await fetch(url, { next: { revalidate: revalidateSec } });
  if (!res.ok) throw new Error(`fetch failed: ${url}`);
  const xml = await res.text();
  const json = await parseStringPromise(xml, { explicitArray: false });
  // Lawオブジェクト位置の揺れを吸収
  const law = json?.DataRoot?.Law || json?.DataRoot;
  return law;
}

/** JSONのArticle配列を強制配列化 */
function toArray<T>(x: T | T[] | undefined): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

/** Article の「第○条」表記から数字キー "9", "9-2" 等を抽出 */
function normalizeArticleKey(article: any): string | null {
  const t = article?.ArticleTitle || article?.ArticleNum || article?.Num || article?.$?.Num || "";
  const key = String(t).replace(/[^\d\-]/g, "");
  return key || null;
}

/** 法令本文の Article[] を列挙 */
export function listArticleKeys(law: any): string[] {
  const main = law?.LawBody?.MainProvision;
  const articles = toArray(main?.Article);
  const keys: string[] = [];
  for (const a of articles) {
    const k = normalizeArticleKey(a);
    if (k) keys.push(k);
  }
  return keys;
}

/** 指定 artKey に一致する Article を返す */
export function findArticleByKey(law: any, artKey: string): any | null {
  const main = law?.LawBody?.MainProvision;
  const articles = toArray(main?.Article);
  for (const a of articles) {
    const k = normalizeArticleKey(a);
    if (k === artKey) return a;
  }
  return null;
}

/** Sentence 要素をテキスト化（Sentence は string or object になりうる） */
function sentenceToText(s: any): string {
  if (typeof s === "string") return s;
  if (typeof s?._ === "string") return s._;
  return "";
}

/** 段落(Paragraph) → HTML文字列（号があれば <ol> ） */
function renderParagraph(p: any): string {
  // 段落本文（Sentence 羅列）
  const sentences = toArray(p?.Sentence);
  const paraText = sentences.map(sentenceToText).join("");

  // 号（Item）
  const items = toArray(p?.Item);
  let itemsHtml = "";
  if (items.length) {
    const li = items
      .map((it) => {
        const num = it?.Num || it?.$?.Num || "";
        const s = toArray(it?.Sentence).map(sentenceToText).join("");
        // 号番号を太字＋本文
        return `<li><span class="font-semibold">${num}</span>　${s}</li>`;
      })
      .join("");
    itemsHtml = `<ol class="list-decimal pl-6 space-y-1 mt-2">${li}</ol>`;
  }

  return `<p class="mb-3 leading-relaxed">${paraText}</p>${itemsHtml}`;
}

/** Article → 階層HTML（見出し＋Paragraph/Item） */
export function renderArticleHtml(article: any, artKey: string): string {
  const titleRaw = article?.ArticleTitle || `第${artKey}条`;
  const title = typeof titleRaw === "string" ? titleRaw : `第${artKey}条`;

  // 前段（前文）: Paragraph 群
  const paragraphs = toArray(article?.Paragraph);
  const bodyHtml = paragraphs.map(renderParagraph).join("");

  // 付属（SupplementaryProvision 等）まではここでは扱わない（必要なら拡張）

  return `
    <header class="mb-3">
      <h2 class="text-xl font-semibold">${title}</h2>
    </header>
    ${bodyHtml || "<p>本文を抽出できませんでした。</p>"}
  `;
}

/** lawId + artKey から HTML を取得（1関数で完結） */
export async function getArticleHtml(lawId: string, artKey: string) {
  const law = await fetchLawJson(lawId);
  const article = findArticleByKey(law, artKey);
  if (!article) return { html: "<p>該当条が見つかりませんでした。</p>", title: law?.LawName ?? "" };
  const html = renderArticleHtml(article, artKey);
  return { html, title: law?.LawName ?? "" };
}
