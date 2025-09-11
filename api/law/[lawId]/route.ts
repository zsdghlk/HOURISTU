import { NextRequest, NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

export const revalidate = 86400; // 1日

export async function GET(
  _req: NextRequest,
  { params }: { params: { lawId: string } }
) {
  const url = `https://laws.e-gov.go.jp/api/1/lawdata/${params.lawId}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  const xml = await res.text();
  const json = await parseStringPromise(xml, { explicitArray: false });

  // ざっくり抽出（タイトルと条番号の配列）
  const law = json?.DataRoot?.Law || json?.DataRoot; // XMLの揺れ吸収
  const title = law?.LawName || law?.LawTitle || "（無題の法令）";

  // MainProvision > Article[] から条番号を拾う（無ければ空）
  const articles = []
  const main = law?.LawBody?.MainProvision;
  const list = main?.Article ? (Array.isArray(main.Article) ? main.Article : [main.Article]) : [];
  for (const a of list) {
    const num = a?.ArticleTitle?.Match || a?.ArticleTitle || a?.ArticleNum || a?.Num || a?.$?.Num;
    if (num) articles.push(String(num).replace(/第|条/g, "").trim()); // "第9条"→"9"
  }

  return NextResponse.json({ lawId: params.lawId, title, articles });
}
