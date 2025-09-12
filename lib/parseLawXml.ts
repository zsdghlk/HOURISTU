import { XMLParser } from "fast-xml-parser";

export type Paragraph = { text: string };
export type Article = {
  key: string;
  number?: string;        // 「第十四条」など（見出しで使う）
  paragraphs: Paragraph[];
  prefix?: string;        // 「附則（昭和xx年法律第yy号 YYYY-MM-DD 改正）」など（グループ見出し用）
};
export type ParsedLaw = {
  lawTitle?: string;
  meta: { lawNo?: string; promulgationDate?: string; enforcementDate?: string };
  articles: Article[];
};

export async function parseLawXml(xml: string): Promise<ParsedLaw> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text",
    trimValues: true,
    isArray: (name: string) => ["Article", "Paragraph", "Item"].includes(name),
  });

  let root: any;
  try {
    root = parser.parse(xml);
  } catch (e) {
    console.error("[parseLawXml] XML parse error:", e);
    return { lawTitle: undefined, meta: {}, articles: [] };
  }

  const appl = root?.DataRoot?.ApplData ?? root?.DataRoot ?? root;

  const lawTitle = firstString(appl?.LawTitle?.text ?? appl?.LawTitle);

  // 公布日（YYYY-MM-DD）をできるだけ作る
  let promulgation =
    formatDate(firstString(appl?.PromulgationDate ?? appl?.Promulgation)) || undefined;
  if (!promulgation) {
    const lawNode = appl?.Law;
    const ad = eraPartsToAD(lawNode);
    if (ad) promulgation = ad;
  }

  const meta = {
    lawNo: firstString(appl?.LawNum ?? appl?.LawNo ?? appl?.LawNumber),
    promulgationDate: promulgation,
    enforcementDate: firstString(appl?.EnforcementDate),
  };

  const rawArticles: Article[] = [];
  collectArticles(appl, rawArticles, undefined, undefined, meta);

  // ドキュメント順そのまま。number が無くても描画できるように key を補う
  const articles = rawArticles
    .map((a, i) => ({ ...a, key: a.number || a.key || `art-${i + 1}` }))
    .filter((a) => a.paragraphs.length > 0);

  return { lawTitle, meta, articles };
}

function collectArticles(
  node: any,
  sink: Article[],
  kname?: string,
  prefix?: string,
  rootMeta?: { lawNo?: string; promulgationDate?: string }
) {
  if (!node || typeof node !== "object") return;

  // コンテナ（章/節/附則ノードなど）由来の prefix
  let curPrefix = derivePrefix(node, kname, prefix, rootMeta);

  // 直下 Article
  const arts = toArray(node?.Article);
  for (const art of arts) {
    const titleStr =
      firstString(art?.ArticleTitle?.text ?? art?.ArticleTitle) ??
      firstString(art?.ArticleCaption?.text ?? art?.ArticleCaption) ??
      firstString(art?.Title);

    // 1) 条番号を強化して取得
    const rawNum =
      firstString(art?.Num) ||
      firstString(art?.ArticleNum) ||
      firstString(art?.Number) ||
      extractArticleNumber(titleStr) ||
      undefined;

    // 2) 「附則 第三十一条」など “番号側” に附則が混ざっていたら除去
    const number =
      rawNum?.replace(/^附則\s*/i, "") ||
      extractArticleNumber(titleStr) ||
      rawNum;

    // 3) 記事（条）単位での“附則”強制判定（これが今回の肝）
    let articlePrefix = curPrefix;
    const hasFusokuInTitle = /附則/.test(titleStr ?? "");
    const hasFusokuInNum = /附則/.test(rawNum ?? "");
    if (!articlePrefix && (hasFusokuInTitle || hasFusokuInNum)) {
      // この条自体が「附則」を示しているとみなし、ノード情報からラベルを生成
      articlePrefix = buildSupplLabel(node, rootMeta);
    }

    // 本文抽出
    const paragraphs: Paragraph[] = [];
    for (const p of toArray(art?.Paragraph)) {
      const t = cleanPara(deepText(p));
      if (t) paragraphs.push({ text: t });
    }
    for (const it of toArray(art?.Item)) {
      const t = cleanPara(deepText(it));
      if (t) paragraphs.push({ text: t });
    }
    if (paragraphs.length === 0) {
      const t = cleanPara(deepText(art));
      if (t) paragraphs.push({ text: t });
    }

    sink.push({
      key: number || rawNum || "",
      number: number || undefined,
      paragraphs,
      prefix: articlePrefix, // ← ここに必ず入るようにした
    });
  }

  // 子ノードへ
  for (const childKey of Object.keys(node)) {
    const v = (node as any)[childKey];
    if (v && typeof v === "object") {
      if (Array.isArray(v)) v.forEach((x) => collectArticles(x, sink, childKey, curPrefix, rootMeta));
      else collectArticles(v, sink, childKey, curPrefix, rootMeta);
    }
  }
}

/* =================== 附則ラベルの生成 =================== */

// コンテナ（章/節/附則）からの派生
function derivePrefix(
  node: any,
  kname?: string,
  inherited?: string,
  rootMeta?: { lawNo?: string; promulgationDate?: string }
): string | undefined {
  let prefix = inherited;

  const hasSupplKey = !!(kname && /(Suppl|Supplement|SupplProvision|Appendix|附則)/i.test(kname));
  const label =
    firstString(node?.ChapterTitle?.text ?? node?.ChapterTitle) ??
    firstString(node?.SectionTitle?.text ?? node?.SectionTitle) ??
    firstString(node?.Title?.text ?? node?.Title) ??
    firstString(node?.Caption?.text ?? node?.Caption);
  const hasSupplLabel = !!(label && /附則/.test(label));

  if (hasSupplKey || hasSupplLabel) {
    prefix = buildSupplLabel(node, rootMeta);
  }
  return prefix;
}

// ノードや Law 属性から「附則（法令番号 西暦日付 改正）」を作る
function buildSupplLabel(
  node: any,
  rootMeta?: { lawNo?: string; promulgationDate?: string }
): string {
  const lawNum =
    firstString(node?.LawNum ?? node?.LawNo ?? node?.LawNumber ?? node?.Law?.Num) ||
    rootMeta?.lawNo ||
    "";

  // 可能ならこの附則固有の日付、なければ Law 属性、最後に root の公布日
  let prom =
    formatDate(firstString(node?.PromulgationDate ?? node?.Promulgation)) || undefined;
  if (!prom) {
    const ad = eraPartsToAD(node?.Law);
    if (ad) prom = ad;
  }
  if (!prom) prom = rootMeta?.promulgationDate;

  const tag = [lawNum, prom].filter(Boolean).join(" ");
  return tag ? `附則（${tag} 改正）` : "附則";
}

/* =================== テキスト整形 =================== */

function deepText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(deepText).join("");
  if (typeof v === "object") {
    let out = "";
    if ("text" in v && (typeof (v as any).text === "string" || typeof (v as any).text === "number")) {
      out += String((v as any).text);
    }
    for (const key of Object.keys(v)) {
      if (key === "text") continue;
      if (key.startsWith("@_")) continue;
      out += deepText((v as any)[key]);
    }
    return out;
  }
  return "";
}

function cleanPara(raw: string): string | undefined {
  let s = normalizeWs(raw);
  s = s.replace(/\d*(vertical|main|proviso)/gi, "");
  s = s.replace(/\b(?:true|false)\b/gi, "");
  s = s.replace(/([。．.])\s*\d+\s*(?:true|false)?\s*$/i, "$1");
  s = s.replace(/\s*\d+(?:true|false)\s*$/i, "");
  s = s.replace(/\s*\d+\s*$/i, "");
  s = s.replace(/\s+/g, " ").trim();
  if (/^（.+）$/.test(s)) return undefined;
  return s || undefined;
}

/* =================== ユーティリティ =================== */

function toArray<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}
function firstString(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "text" in (v as any)) return firstString((v as any).text);
  return undefined;
}
function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
function extractArticleNumber(title?: string): string | undefined {
  if (!title) return undefined;
  const m = title.match(/第\s*([一二三四五六七八九十百千万\d]+)\s*条/);
  return m ? `第${m[1]}条` : undefined;
}
function formatDate(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return s;
}
function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }
function eraPartsToAD(lawNode?: any): string | undefined {
  if (!lawNode) return undefined;
  const era = firstString(lawNode?.Era);
  const eraYearStr = firstString(lawNode?.Year);
  const mmStr = firstString(lawNode?.PromulgateMonth);
  const ddStr = firstString(lawNode?.PromulgateDay);
  const eraBase: Record<string, number> = {
    Meiji: 1868, 明治: 1868,
    Taisho: 1912, 大正: 1912,
    Showa: 1926, 昭和: 1926,
    Heisei: 1989, 平成: 1989,
    Reiwa: 2019, 令和: 2019,
  };
  const base = era ? eraBase[era] : undefined;
  const y = eraYearStr ? Number(eraYearStr) : NaN;
  const mm = mmStr ? Number(mmStr) : NaN;
  const dd = ddStr ? Number(ddStr) : NaN;
  if (!base || !Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(dd)) return undefined;
  return `${base + y - 1}-${pad2(mm)}-${pad2(dd)}`;
}
