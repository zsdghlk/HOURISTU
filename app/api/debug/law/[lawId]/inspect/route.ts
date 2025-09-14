import { fetchLawJson, toArray } from "@/lib/egov";

const collectArticles = (node: any): any[] => {
  if (!node) return [];
  let arr: any[] = [];
  if (node.Article) arr = arr.concat(toArray(node.Article));
  if (node.Chapter) arr = arr.concat(...toArray(node.Chapter).map(collectArticles));
  if (node.Section) arr = arr.concat(...toArray(node.Section).map(collectArticles));
  return arr;
};

export async function GET(_req: Request, { params }: { params: { lawId: string } }) {
  const { lawId } = params;
  const law = await fetchLawJson(lawId);
  const body = law?.LawBody ?? {};

  const hasPreamble = !!body.Preamble;
  const mainDirect = toArray(body?.MainProvision?.Article).length;
  const mainNested = collectArticles(body?.MainProvision).length;
  const suppl = toArray(body?.SupplProvision?.Article).length;
  const amend = toArray(body?.AmendProvision?.Article).length;

  const summary = {
    lawId,
    lawName: law?.LawName ?? (typeof law?.LawTitle === "string" ? law.LawTitle : law?.LawTitle?._),
    hasPreamble,
    counts: { mainDirect, mainNested, suppl, amend },
    bodyKeys: Object.keys(body),
  };
  console.log("[inspect]", summary);
  return new Response(JSON.stringify(summary, null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
}
