export default async function ArticlePage({ params }: { params: { lawId: string; artKey: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE}/api/law/${params.lawId}/article/${params.artKey}`, { cache: "force-cache" });
  if (!res.ok) return <main className="p-6">読み込みに失敗しました。</main>;
  const { html } = await res.json();
  return (
    <main className="prose dark:prose-invert mx-auto max-w-3xl px-4 py-6">
      <nav className="mb-4 text-sm">
        <a href={`/law/${params.lawId}`} className="underline">← 目次に戻る</a>
      </nav>
      <article dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
