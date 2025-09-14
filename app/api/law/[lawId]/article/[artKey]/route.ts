import { NextRequest, NextResponse } from "next/server";
import { getArticleHtml } from "@/lib/egov";

export const revalidate = 86400;

export async function GET(
  _req: NextRequest,
  { params }: { params: { lawId: string; artKey: string } }
) {
  try {
    const { html, title } = await getArticleHtml(params.lawId, params.artKey);
    return NextResponse.json({ lawId: params.lawId, artKey: params.artKey, title, html });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 502 });
  }
}
