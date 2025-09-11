// app/laws/route.ts
import { NextResponse } from "next/server";

type LawNameListInfo = {
  LawId: string;
  LawName: string;
  LawNo?: string;
  PromulgationDate?: string; // yyyyMMdd
};

export const revalidate = 60 * 60 * 6; // 6h 再検証

export async function GET() {
  const url = "https://laws.e-gov.go.jp/api/1/lawlists/1"; // 全法令の法令名一覧（XML）
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
  }

  const xml = await res.text();
  // 動的importでバンドルを軽く
  // @ts-ignore
  const { XMLParser } = await import("fast-xml-parser");
  const parser = new XMLParser({ ignoreAttributes: false });
  const j = parser.parse(xml);

  const list: any[] = j?.DataRoot?.ApplData?.LawNameListInfo
    ? Array.isArray(j.DataRoot.ApplData.LawNameListInfo)
      ? j.DataRoot.ApplData.LawNameListInfo
      : [j.DataRoot.ApplData.LawNameListInfo]
    : [];

  const items: LawNameListInfo[] = list
  .map((x: any) => ({
    LawId: String(x?.LawId ?? ""),
    LawName: String(x?.LawName ?? ""),
    LawNo: x?.LawNo == null ? undefined : String(x.LawNo),
    PromulgationDate: x?.PromulgationDate == null ? undefined : String(x.PromulgationDate),
  }))
  .filter((x: LawNameListInfo) => x.LawId && x.LawName);

  return NextResponse.json({ count: items.length, items });
}
