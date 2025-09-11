import Link from "next/link";

export default async function LawTop({ params }: { params: { lawId: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE}/api/law/${params.lawId}`, { cache: "force-cache" });
  if (!res.ok) return <main className="p-6">読み込みに失敗しました。</main>;
  const { title, articles } = await res.json();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <a
          href={`https://laws.e-gov.go.jp/law/${params.lawId}`}
          className="text-sm underline text-muted-foreground"
          target="_blank" rel="noreferrer"
        >
          e-Govで開く
        </a>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-2">目次（条）</h2>
        {articles?.length ? (
          <ul className="flex flex-wrap gap-2">
            {articles.slice(0, 60).map((k: string) => (
              <li key={k}>
                <Link
                  className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-accent"
                  href={`/law/${params.lawId}/art/${k}`}
                  prefetch={false}
                >
                  第{k}条
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">目次を抽出できませんでした。</p>
        )}
      </section>
    </main>
  );
}
