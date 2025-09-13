import { parseLawXml, type ParsedLaw } from "@/lib/parseLawXml";
import { formatParagraphNum } from "../../../utils/lawFormat";
import { ROKUPO } from "@/lib/rokupo";

type Art = { number?: string; key: string; paragraphs: { num?: string; text: string }[]; prefix?: string };

// 取得（直接 e-Gov API 叩き）——サーバーコンポーネント内なので OK
async function fetchXml(lawId: string): Promise<string> {
  const res = await fetch(`https://laws.e-gov.go.jp/api/1/lawdata/${lawId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch XML: ${res.status}`);
  return res.text();
}

function highlight(text: string, q: string) {
  if (!q) return text;
  try {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return text.split(re).reduce<JSX.Element[]>((acc, part, i, arr) => {
      acc.push(<span key={`p${i}`}>{part}</span>);
      if (i < arr.length - 1) acc.push(<mark key={`m${i}`}>{q}</mark>);
      return acc;
    }, []);
  } catch {
    return text;
  }
}

export default async function LawDetail(props: {
  params: Promise<{ lawId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { lawId } = await props.params;
  const { q: rawQ } = await props.searchParams;
  const q = (rawQ ?? "").trim();

  // XML → パース
  const xml = await fetchXml(lawId);
  const parsed = await parseLawXml(xml);

  // タイトル
  const fallback = ROKUPO.find((x) => x.lawId === lawId)?.title;
  const pageTitle = parsed.lawTitle || fallback || "法令";

  // フィルタ
  let arts: Art[] = parsed.articles as any;
  if (q) {
    arts = arts.filter(
      (a) =>
        (a.number ?? "").includes(q) ||
        (a.paragraphs || []).some((p) => p.text?.includes(q))
    );
  }

  if (!Array.isArray(arts) || arts.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>{pageTitle}</h1>
        <div>条文が見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>{pageTitle}</h1>

      <div style={{ display: "grid", gap: 12 }}>
        {arts.map((a, idxA) => {
          const heading = a.number ? `第${a.number}条` : a.key;
          const ukey = `${a.key}-${idxA}`;
          return (
            <section key={ukey} className="card">
              <h2 style={{ marginBottom: 8 }}>{heading}</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {(a.paragraphs || []).map((p, i) => (
                  <p key={`${ukey}-p${i}`}>
                    {formatParagraphNum?.(p?.num as any, i)}
                    {highlight(p.text || "", q)}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
