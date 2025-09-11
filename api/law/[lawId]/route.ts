import { NextResponse } from "next/server";

type LawNameListInfo = {
  LawId: string;
  LawName: string;
  LawNo?: string;
  PromulgationDate?: string; // yyyyMMdd
};

export const revalidate = 60 * 60 * 6; // 6h

export async function GET() {
  const url = "https://laws.e-gov.go.jp/api/1/lawlists/1"; // 全法令
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
  }
  const xml = await res.text();

  // XML -> JSON
  // @ts-ignore
  const { XMLParser } = await import("fast-xml-parser");
  const parser = new XMLParser({ ignoreAttributes: false });
  const j = parser.parse(xml);

  // 仕様：DataRoot.ApplData.LawNameListInfo[] に LawId/Name/No/PromulgationDate が入る
  // （v1仕様書の表 2-1 / 2-2 参照）
  const list: any[] =
    j?.DataRoot?.ApplData?.LawNameListInfo
      ? Array.isArray(j.DataRoot.ApplData.LawNameListInfo)
        ? j.DataRoot.ApplData.LawNameListInfo
        : [j.DataRoot.ApplData.LawNameListInfo]
      : [];

  const normalized: LawNameListInfo[] = list.map((x: any) => ({
    LawId: x?.LawId ?? "",
    LawName: x?.LawName ?? "",
    LawNo: x?.LawNo,
    PromulgationDate: x?.PromulgationDate
  })).filter((x: LawNameListInfo) => x.LawId && x.LawName);

  // クライアント側のページングを楽にするため軽い形で返す
  return NextResponse.json({ count: normalized.length, items: normalized });
}
