// lib/egov.ts
// e-Gov v1 のベースURLを定義
const V1 = "https://laws.e-gov.go.jp/api/1";

// v1: 法令本文XML（法令ID or 法令番号どちらでもOK）
export async function getLawXml(lawIdOrNo: string): Promise<string> {
  const url = `${V1}/lawdata/${encodeURIComponent(lawIdOrNo)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });
    if (!res.ok) throw new Error(String(res.status));
    return await res.text();
  } catch (e) {
    return `<error>Failed to fetch law data for ${lawIdOrNo}: ${String(e)}</error>`;
  }
}
