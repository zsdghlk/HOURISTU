// lib/parseLawXml.ts
// e-Gov v1 XML を「法令名・条・段落」にざっくり整形する最小パーサ

type Paragraph = { text: string };
export type Article = { key: string; title?: string; number?: string; paragraphs: Paragraph[] };

export type ParsedLaw = {
  lawTitle?: string;
  articles: Article[];
};

export async function parseLawXml(xml: string): Promise<ParsedLaw> {
  // @ts-ignore
  const { XMLParser } = await import("fast-xml-parser");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text",
    isArray: (name: string) => ["Article", "Paragraph"].includes(name),
  });

  let root: any;
  try {
    root = parser.parse(xml);
  } catch {
    return { lawTitle: undefined, articles: [] };
  }

  const appl = root?.DataRoot?.ApplData ?? root?.DataRoot ?? root;
  const lawTitle: string | undefined = firstString(appl?.LawTitle?.text ?? appl?.LawTitle);

  const articles: Article[] = [];
  collectArticlesDeep(appl, articles);

  return {
    lawTitle,
    articles: articles.map((a, i) => ({ ...a, key: a.key || `art-${a.number || String(i + 1)}` })),
  };
}

function collectArticlesDeep(node: any, sink: Article[]) {
  if (!node || typeof node !== "object") return;

  const arts = toArray(node?.Article);
  for (const art of arts) {
    const title = firstString(art?.ArticleTitle?.text ?? art?.ArticleTitle);
    const number = firstString(
      art?.ArticleCaption?.text ?? art?.ArticleCaption ?? extractArticleNumber(title)
    );

    const parasRaw = toArray(art?.Paragraph);
    const paragraphs: Paragraph[] =
      parasRaw.length > 0
        ? parasRaw.map((p: any) => ({ text: normalizeText(p?.text ?? p) }))
        : [{ text: normalizeText(collectTextShallow(art)) }];

    sink.push({ key: number || title || "", title: title || undefined, number: number || undefined, paragraphs });
  }

  for (const k of Object.keys(node)) {
    const v = (node as any)[k];
    if (v && typeof v === "object") {
      if (Array.isArray(v)) v.forEach((x) => collectArticlesDeep(x, sink));
      else collectArticlesDeep(v, sink);
    }
  }
}

// ---- utils ----
function toArray<T>(v: T | T[] | undefined): T[] { return v == null ? [] : Array.isArray(v) ? v : [v]; }

function firstString(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "text" in v) return firstString(v.text);
  return undefined;
}

function collectTextShallow(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  let out = "";
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === "string") out += v + " ";
    else if (v && typeof v === "object" && "text" in v && typeof v.text === "string") out += v.text + " ";
  }
  return out.trim();
}

function normalizeText(t: any): string {
  const s = typeof t === "string" ? t : t == null ? "" : String(t);
  return s.replace(/\s+/g, " ").trim();
}

function extractArticleNumber(title?: string): string | undefined {
  if (!title) return undefined;
  const m = title.match(/第\s*([一二三四五六七八九十百千\d]+)\s*条/);
  return m ? `第${m[1]}条` : undefined;
}
