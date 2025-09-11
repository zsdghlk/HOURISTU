const V1 = "https://laws.e-gov.go.jp/api/1";

// v1: 法令本文XML（法令ID or 法令番号どちらでもOK）
export async function getLawXml(lawIdOrNo: string): Promise<string> {
  const url = `${V1}/lawdata/${encodeURIComponent(lawIdOrNo)}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });
  if (!res.ok) throw new Error(`getLawXml failed: ${res.status}`);
  return await res.text();
}

