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

export async function GET(_req: Request, { params }: { params: { lawId: string } }) {
  const law = await fetchLawJson(params.lawId);
  const body = law?.LawBody ?? {};
  const paths: string[] = [];
  const mainCount = collectGeneric(body?.MainProvision, "MainProvision", paths).length;

  const summary = {
    lawId: params.lawId,
    lawName: law?.LawName ?? (typeof law?.LawTitle === "string" ? law.LawTitle : law?.LawTitle?._),
    hasPreamble: !!body.Preamble,
    hasSuppl: !!body.SupplProvision,
    hasAmend: !!body.AmendProvision,
    counts: {
      main_direct: toArray(body?.MainProvision?.Article).length,
      main_nested: mainCount,
      suppl_direct: toArray(body?.SupplProvision?.Article).length,
      amend_direct: toArray(body?.AmendProvision?.Article).length
    },
    body_keys: Object.keys(body),
    sample_article_paths: paths,
    main_keys_tree: shapeKeys(body?.MainProvision, 0, 3)
  };
  return new Response(JSON.stringify(summary, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
