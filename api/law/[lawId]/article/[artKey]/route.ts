import { NextRequest, NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

// artKey 例: "9", "9-2", "177"
export const revalidate = 86400;

export async function GET(
  _req: NextRequest,
  { params }: { params: { lawId: string; artKey: string } }
) {
  // V1「条文内容取得API」のURIは仕様書通り。実運用では lawId + 条指定を付与して取得します。
  // 仕様詳細は V1 仕様書 / ドキュメント参照。:contentReference[oaicite:3]{index=3}
  const uri = `https://laws.e-gov.go.jp/api/1/lawdata/${params.lawId}`; // フォールバック: 全文→抽出
  const res = await fetch(uri, { next: { revalidate } });
  if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  const xml = await res.text();
  const json = await parseStringPromise(xml, { explicitArray: false });

  // 超簡易：Article の中から "第{artKey}条" に合うものを1件抽出
  const law = json?.DataRoot?.Law || json?.DataRoot;
  const main = law?.LawBody?.MainProvision;
  const list = main?.Article ? (Array.isArray(main.Article) ? main.Article : [main.Article]) : [];
  const target = list.find((a: any) => {
    const t = a?.ArticleTitle || a?.ArticleNum || a?.Num || a?.$?.Num || "";
    const plain = String(t).replace(/[^\d\-]/g, ""); // "第9条"→"9"
    return plain === params.artKey;
  });

  const paragraphs = [];
  if (target?.Paragraph) {
    const paras = Array.isArray(target.Paragraph) ? target.Paragraph : [target.Paragraph];
    for (const p of paras) {
      // 文（Sentence）寄せ集め（シンプル整形）
      const sentences = p?.Sentence ? (Array.isArray(p.Sentence) ? p.Sentence : [p.Sentence]) : [];
      const text = sentences.map((s: any) => (typeof s === "string" ? s : s?._ || "")).join("");
      paragraphs.push(text);
    }
  }

  const html = `
    <h2 class="text-xl font-semibold mb-2">第${params.artKey}条</h2>
    ${paragraphs.map((t) => `<p class="mb-3 leading-relaxed">${t}</p>`).join("") || "<p>本文の抽出に失敗しました。</p>"}
  `;

  return NextResponse.json({ lawId: params.lawId, artKey: params.artKey, html });
}
