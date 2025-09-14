import { NextRequest, NextResponse } from "next/server";
import { fetchLawJson, listArticleKeys } from "@/lib/egov";

export const revalidate = 86400;

export async function GET(
  _req: NextRequest,
  { params }: { params: { lawId: string } }
) {
  try {
    const law = await fetchLawJson(params.lawId);
    const title = law?.LawName || law?.LawTitle || "（無題の法令）";
    const articles = listArticleKeys(law);
    return NextResponse.json({ lawId: params.lawId, title, articles });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 502 });
  }
}
