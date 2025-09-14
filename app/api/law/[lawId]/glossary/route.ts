import { NextResponse } from "next/server";
import { extractGlossary } from "@/lib/glossary";

export const revalidate = 86400;

export async function GET(_: Request, { params }: { params: { lawId: string } }) {
  try {
    const items = await extractGlossary(params.lawId);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message ?? "failed" }, { status: 502 });
  }
}
