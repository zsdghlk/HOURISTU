// lib/parseLawXml.ts
// 目的: e-Gov v1 XMLから「法令名・メタ・条・段落テキスト」を安全に抽出
// [object Object] にならないよう、任意のネストを再帰的にテキスト化する。

type Paragraph = { text: string };
export type Article = { key: string; title?: string; number?: string; paragraphs: Paragraph[] };

export type ParsedLaw = {
  lawTitle?: string;
  meta: {
    lawNo?: string;
    promulgationDate?: string;
    enforcementDate?: string;
  };
  articles: Article[];
};

export async function parseLawXml(xml: string): Promise<ParsedLaw> {
  // @ts-ignore
  const { XMLParser } = await import("fast-xml-parser");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text",
    // Article/Paragraph は必ず配列化
    isArray: (name: string) => ["Article", "Paragraph"].includes(name),
  });

  let root: any;
  try {
    root = parser.parse(xml);
  } catch {
    return { lawTitle: undefined, meta: {}, articles: [] };
  }

  const appl = root?.DataRoot?.ApplData ?? root?.DataRoot ?? root;

  const lawTitle = firstString(appl?.LawTitle?.text ?? appl?.LawTitle);

  // ---- meta 抽出（キー揺れに対応）----
  const lawNo = coalesceString(appl?.LawNo, appl?.LawNum, appl?.LawNumber, appl?.LawNameNum, path(root, ["DataRoot","LawInfo","LawNo"]));
  const promulgationDate = coalesceString(appl?.PromulgationDate, appl?.Promulgation, path(root, ["DataRoot","LawInfo","PromulgationDate"]));
  const enforcementDate = coalesceString(appl?.EnforcementDate, path(root, ["DataRoot","LawInfo","EnforcementDate"]));

  const meta = {
    lawNo: norm(lawNo),
    promulgationDate: norm(promulgationDate),
    enforcementDate: norm(enforcementDate),
  };

  // ---- 条文抽出 ----
  const articles: Article[] = [];
  collectArticlesDeep(appl, articles);

  return {
    lawTitle,
    meta,
    articles: articles.map((a, i) => ({ ...a, key: a.key || `art-${a.number || String(i + 1)}` })),
  };
}

// 任意の深さにある Article を集める（Chapter/Section 等の下にも現れる）
function collectArticlesDeep(node: any, sink: Article[]) {
  if (!node || typeof node !== "object") return;

  const arts = toArray(node?.Article);
  for (const art of arts) {
    const title = firstString(art?.ArticleTitle?.text ?? art?.ArticleTitle);
    const number = firstString(art?.ArticleCaption?.text ?? art?.ArticleCaption ?? extractArticleNumber(title));

    // 段落は Paragraph の他、中身が Sentence/Item/Ruby 等のオブジェクトでもあり得る。
    // → 再帰関数 deepText でテキストを吸い出す。
    const parasRaw = toArray(art?.Paragraph);
    const paragraphs: Paragraph[] =
      parasRaw.length > 0
        ? parasRaw.map((p: any) => ({ text: normalizeWs(deepText(p)) })).filter(p => p.text)
        : [{ text: normalizeWs(deepText(art)) }]; // Paragraphが無い場合のフォールバック

    sink.push({
      key: number || title || "",
      title: title || undefined,
      number: number || undefined,
      paragraphs,
    });
  }

  // 子ノードも探索
  for (const k of Object.keys(node)) {
    const v = (node as any)[k];
    if (v && typeof v === "object") {
      if (Array.isArray(v)) v.forEach(x => collectArticlesDeep(x, sink));
      else collectArticlesDeep(v, sink);
    }
  }
}

// ---- テキスト抽出ユーティリティ ----

// 任意の値から、人間が読むテキストのみを抽出（属性やタグ名は無視）
function deepText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";

  if (Array.isArray(v)) {
    return v.map(deepText).join("");
  }

  if (typeof v === "object") {
    // fast-xml-parser の text ノード名は "text"
    let buf: string[] = [];
    // 先に text を拾う
    if ("text" in v && (typeof v.text === "string" || typeof v.text === "number")) {
      buf.push(String(v.text));
    }
    // 代表的な子要素（Sentence/Item/Ruby/Line/Note 等）も再帰で吸う
    for (const key of Object.keys(v)) {
      if (key === "text") continue;                // すでに処理
      if (key.startsWith("@_")) continue;          // 属性は無視
      const child = (v as any)[key];
      if (child == null) continue;
      buf.push(deepText(child));
    }
    return buf.join("");
  }

  return "";
}

function toArray<T>(v: T | T[] | undefined): T[] { return v == null ? [] : Array.isArray(v) ? v : [v]; }

function firstString(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "text" in v) return firstString((v as any).text);
  return undefined;
}

function coalesceString(...candidates: any[]): string | undefined {
  for (const c of candidates) {
    const s = firstString(c);
    if (s) return s;
  }
  return undefined;
}

function path(obj: any, keys: string[]): any {
  let cur = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[k];
  }
  return cur;
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function extractArticleNumber(title?: string): string | undefined {
  if (!title) return undefined;
  const m = title.match(/第\s*([一二三四五六七八九十百千\d]+)\s*条/);
  return m ? `第${m[1]}条` : undefined;
}

function norm(v?: string): string | undefined {
  if (!v) return undefined;
  return v.trim() || undefined;
}
