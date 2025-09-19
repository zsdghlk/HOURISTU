import { parseStringPromise } from "xml2js";

/** e-Gov V1 lawdata XML を取得 */
export async function fetchLawJson(lawId: string) {
  const url = `https://laws.e-gov.go.jp/api/1/lawdata/${encodeURIComponent(lawId)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${url} status=${res.status}`);
  const xml = await res.text();
  const json = await parseStringPromise(xml, { explicitArray: false });
  const law = getLawRoot(json);
  if (!law) throw new Error("failed to locate Law node in XML");
  return law;
}

export function toArray<T>(x: T | T[] | undefined): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function getLawRoot(json: any): any {
  return (
    json?.DataRoot?.ApplData?.LawFullText?.Law ||
    json?.DataRoot?.Law ||
    json?.Law ||
    deepFindLaw(json)
  );
}
function deepFindLaw(node: any): any {
  if (!node || typeof node !== "object") return null;
  if ((node as any).LawBody) return node;
  for (const k of Object.keys(node)) {
    const found = deepFindLaw((node as any)[k]);
    if (found) return found;
  }
  return null;
}

function sentenceToText(s: any): string {
  if (typeof s === "string") return s;
  if (s && typeof s._ === "string") return s._;
  return "";
}

function renderParagraphLabel(numRaw: string | undefined): string {
  if (!numRaw) return "";
  const n = String(numRaw).trim();
  if (n === "" || n === "1") return "";
  return `第${n}項`;
}

function renderParagraph(p: any): string {
  const pnumLabel = renderParagraphLabel(p?.Num || p?.$?.Num || p?.ParagraphNum);
  const pnumHtml = pnumLabel
    ? `<span class="inline-block mr-1 text-muted-foreground select-none">${pnumLabel}</span>`
    : "";

  // 段落本文
  const sentences = toArray(p?.ParagraphSentence?.Sentence ?? p?.Sentence);
  const paraText = sentences.map(sentenceToText).join("");

  // 箇条書き
  const items = toArray(p?.Item);
  let itemsHtml = "";
  if (items.length) {
    const li = items
      .map((it) => {
        const texts: string[] = [];
        texts.push(
          ...toArray(it?.ItemSentence?.Sentence).map(sentenceToText),
          ...toArray(it?.ParagraphSentence?.Sentence).map(sentenceToText),
          ...toArray(it?.Sentence).map(sentenceToText),
          ...(typeof it?._ === "string" ? [it._] : [])
        );
        const ss = texts.join("").trim();
        return `<li class="leading-relaxed">${ss || "（本文なし）"}</li>`;
      })
      .join("");
    itemsHtml = `<ol class="list-decimal list-outside pl-6 space-y-1 mt-2">${li}</ol>`;
  }

  return `<div class="mb-3 leading-relaxed">${pnumHtml}<span>${paraText}</span>${itemsHtml}</div>`;
}

export function renderArticleHtml(article: any, fallbackKey: string): string {
  const titleRaw =
    article?.ArticleTitle || article?.$?.Title || article?.Title || `第${fallbackKey}条`;
  const title = typeof titleRaw === "string" ? titleRaw : `第${fallbackKey}条`;
  const paragraphs = toArray(article?.Paragraph);
  const bodyHtml = paragraphs.map(renderParagraph).join("");
  return `<header class="mb-2"><h2 class="text-xl font-semibold">${title}</h2></header>${bodyHtml || ""}`;
}
