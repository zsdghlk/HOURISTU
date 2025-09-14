import { fetchLawJson, toArray } from "@/lib/egov";

const collectGeneric = (node: any, path = "root", paths: string[] = []): any[] => {
  if (!node) return [];
  let arr: any[] = [];
  if (node.Article) {
    const arts = toArray(node.Article);
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

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ lawId: string }> }
) {
  const { lawId } = await ctx.params;
  const law = await fetchLawJson(lawId);
  const body = law?.LawBody ?? {};
  const paths: string[] = [];
  const articles = collectGeneric(body?.MainProvision, "MainProvision", paths);

  const firstArticle = articles[0];
  const firstParagraph = firstArticle?.Paragraph ? toArray(firstArticle.Paragraph)[0] : null;
  const firstItem = firstParagraph?.Item ? toArray(firstParagraph.Item)[0] : null;

  const summary = {
    lawId,
    body_keys: Object.keys(body),
    counts: {
      main_direct: toArray(body?.MainProvision?.Article).length,
      main_nested: articles.length,
      suppl_direct: toArray(body?.SupplProvision?.Article).length,
      amend_direct: toArray(body?.AmendProvision?.Article).length,
    },
    sample_article_paths: paths,
    main_keys_tree: shapeKeys(body?.MainProvision, 0, 3),

    // ★ デバッグ対象
    first_article_keys: firstArticle ? Object.keys(firstArticle) : null,
    first_paragraph_keys: firstParagraph ? Object.keys(firstParagraph) : null,
    first_paragraph_sentence_types: firstParagraph?.Sentence
      ? toArray(firstParagraph.Sentence).map((s: any) => typeof s)
      : null,
    first_paragraph_sentence_sample: firstParagraph?.Sentence
      ? JSON.stringify(toArray(firstParagraph.Sentence)[0])
      : null,
    first_item_keys: firstItem ? Object.keys(firstItem) : null,
    first_item_sentence_types: firstItem?.Sentence
      ? toArray(firstItem.Sentence).map((s: any) => typeof s)
      : null,
    first_item_sentence_sample: firstItem?.Sentence
      ? JSON.stringify(toArray(firstItem.Sentence)[0])
      : null,
  };

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
