export async function fetchLawXml(lawId: string): Promise<string> {
  const url = `https://laws.e-gov.go.jp/api/1/lawdata/${lawId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch law XML: ${res.status}`);
  return await res.text();
}
