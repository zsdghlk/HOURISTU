import Link from "next/link";
import { getLawXml } from "@/lib/egov";
import { parseLawXml } from "@/lib/parseLawXml";

// テキストハイライト（既存仕様を尊重）
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

export default async function LawDetail({
  params,
  searchParams,
}: {
  params: { lawId: string };
  searchParams: { q?: string };
}) {
  const xml = await getLawXml(params.lawId);
  const parsed = await parseLawXml(xml);
  const q = (searchParams?.q ?? "").trim();

  const arts = q
    ? parsed.articles.filter(
        (a) =>
          (a.number ?? a.title ?? "").includes(q) ||
          a.paragraphs.some((p) => p.text.includes(q))
      )
    : parsed.articles;

  return (
    <main id="top" className="p-6 space-y-8 max-w-5xl mx-auto">
      <header className="space-y-3">
        <div className="text-sm opacity-70 break-all">LawId: {params.lawId}</div>
        <h1 className="text-2xl font-bold">{parsed.lawTitle ?? "法令"}</h1>
        {/* 法令メタ */}
        <ul className="text-sm opacity-80 space-y-0.5">
          {parsed.meta?.lawNo && <li>法令番号：{parsed.meta.lawNo}</li>}
          {parsed.meta?.promulgationDate && <li>公布日：{parsed.meta.promulgationDate}</li>}
          {parsed.meta?.enforcementDate && <li>施行日：{parsed.meta.enforcementDate}</li>}
        </ul>
        {/* ナビ＆検索 */}
        <div className="flex flex-wrap gap-2 items-center">
          <Link href="/" className="inline-block border rounded-lg px-3 py-2 text-sm no-underline hover:bg-gray-50">
            ← 六法トップへ
          </Link>
          <a href="#top" className="inline-block border rounded-lg px-3 py-2 text-sm no-underline hover:bg-gray-50">
            ↑ 先頭へ
          </a>
          <form className="ml-auto" action="" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="条名や本文で検索"
              className="border rounded-lg px-3 py-2 text-sm min-w-[220px]"
            />
          </form>
        </div>
      </header>

      {/* 目次（条） */}
      {arts.length > 0 && (
        <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-3 border-y">
          <div className="flex flex-wrap gap-2">
            {arts.map((a) => (
              <a
                key={a.key}
                href={`#${a.key}`}
                className="inline-block px-3 py-1.5 text-sm rounded-full border hover:bg-gray-50 no-underline"
              >
                {a.number ?? a.title ?? a.key}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* 本文 */}
      <article className="space-y-8">
        {arts.map((a) => (
          <section key={a.key} id={a.key} className="scroll-mt-28">
            <h2 className="text-lg font-semibold mb-3">
              {a.number ?? a.title ?? a.key}
            </h2>
            <div className="space-y-3 text-base leading-relaxed">
              {a.paragraphs.map((p, i) => (
                <p key={i}>{q ? highlight(p.text, q) : p.text}</p>
              ))}
            </div>
          </section>
        ))}
        {arts.length === 0 && (
          <p className="opacity-70">検索に一致する条文は見つかりませんでした。</p>
        )}
      </article>

      {/* Raw XML（検証用） */}
      <details className="border rounded-2xl p-4">
        <summary className="cursor-pointer font-semibold">Raw XML</summary>
        <pre className="overflow-auto text-sm mt-3">{xml}</pre>
      </details>
    </main>
  );
}
