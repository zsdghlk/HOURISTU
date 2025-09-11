// app/law/[lawId]/page.tsx
import Link from "next/link";
import { getLawXml } from "@/lib/egov";
import { parseLawXml } from "@/lib/parseLawXml";

// 小さなユーティリティ（クライアント不要なのでサーバー側でOK）
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

export default async function LawDetail({ params, searchParams }: { params: { lawId: string }, searchParams: { q?: string } }) {
  const xml = await getLawXml(params.lawId);
  const parsed = await parseLawXml(xml);
  const q = (searchParams?.q ?? "").trim();

  // 検索フィルタ
  const arts = q
    ? parsed.articles.filter(a =>
        (a.number ?? a.title ?? "").includes(q) || a.paragraphs.some(p => p.text.includes(q))
      )
    : parsed.articles;

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="text-sm opacity-70 break-all">LawId: {params.lawId}</div>
        <h1 className="text-2xl font-bold">{parsed.lawTitle ?? "法令"}</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <Link href="/" className="underline text-sm">← 六法トップへ</Link>
          <form className="ml-auto" action="" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="条名や本文で検索"
              className="border rounded px-3 py-2 text-sm min-w-[220px]"
            />
          </form>
        </div>
      </header>

      {/* 目次（検索後はヒットした条のみ） */}
      {arts.length > 0 && (
        <nav className="space-y-2 sticky top-0 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 py-2">
          <h2 className="text-lg font-semibold">目次</h2>
          <ul className="flex flex-wrap gap-2">
            {arts.map((a) => (
              <li key={a.key}>
                <a href={`#${a.key}`} className="underline">
                  {a.number ?? a.title ?? a.key}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* 本文 */}
      <article className="space-y-6">
        {arts.map((a) => (
          <section key={a.key} id={a.key} className="scroll-mt-24">
            <h3 className="text-base font-semibold mb-2">
              {a.number ?? a.title ?? a.key}
            </h3>
            <div className="space-y-2 leading-7">
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

      {/* Raw XML（検証用：折りたたみ） */}
      <details className="border rounded-xl p-4">
        <summary className="cursor-pointer font-semibold">Raw XML</summary>
        <pre className="overflow-auto text-sm mt-3">{xml}</pre>
      </details>
    </main>
  );
}
