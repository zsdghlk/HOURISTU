import { fetchLawJson, toArray } from "@/lib/egov";

const collectGeneric = (node: any, path = "root", paths: string[] = []): any[] => {
  if (!node) return [];
  let arr: any[] = [];
  if ((node as any).Article) {
    const arts = toArray((node as any).Article);
    if (paths.length < 20) paths.push(path + ".Article[x]");
    arr = arr.concat(arts);
  }
  for (const k of Object.keys(node ?? {})) {
    const v = (node as any)[k];
    if (v && typeof v === "object") {
      const children = Array.isArray(v) ? v : [v];
      children.forEach((c, i) => {
        arr = arr.concat(collectGeneric(c, `${path}.${k}[${i}]`, paths));
      });
    }
  }
  return arr;
};

function shapeKeys(node: any, depth = 0, maxDepth = 3): any {
  if (!node || typeof node !== "object" || depth >= maxDepth) return null;
  const keys = Object.keys(node);
  const out: Record<string, any> = {};
  for (const k of keys) {
    const v = (node as any)[k];
    if (Array.isArray(v)) {
      out[`${k}[]`] = v.length ? shapeKeys(v[0], depth + 1, maxDepth) : "[]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = shapeKeys(v, depth + 1, maxDepth);
    } else {
      out[k] = typeof v;
    }
  }
  return out;
}

const s2t = (s: any): string => typeof s === "string" ? s : (s?._ ?? "");

export async function GET(_req: Request, ctx: { params: Promise<{ lawId: string }> }) {
  const { lawId } = await ctx.params;
  const law = await fetchLawJson(lawId);
  const body = law?.LawBody ?? {};
  const paths: string[] = [];

  const articles = collectGeneric(body?.MainProvision, "MainProvision", paths);
  const a0 = articles[0] || {};
  const p0 = toArray(a0?.Paragraph)[0] || {};
  const ps0 = p0?.ParagraphSentence ?? null;
  const sArr = ps0?.Sentence ? toArray(ps0.Sentence) : null;

  const summary = {
    lawId,
    counts: {
      main_nested: articles.length,
    },
    sample_article_paths: paths,
    main_keys_tree: shapeKeys(body?.MainProvision, 0, 3),

    // 追加デバッグ
    first_article_keys: Object.keys(a0 || {}),
    first_paragraph_keys: Object.keys(p0 || {}),
    paragraph_sentence_type: ps0 ? (Array.isArray(ps0) ? "array" : typeof ps0) : null,
    paragraph_sentence_keys: ps0 && !Array.isArray(ps0) && typeof ps0 === "object" ? Object.keys(ps0) : null,
    sentence_types: sArr ? Array.from(new Set(sArr.map(x => typeof x === "string" ? "string" : (x && typeof x._ === "string") ? "object._" : typeof x))) : null,
    sentence_sample_texts: sArr ? sArr.slice(0,3).map(s2t) : null
  };

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
