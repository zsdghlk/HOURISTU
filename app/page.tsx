import Link from "next/link";
import { FEATURED_LAWS } from "@/lib/featuredLaws";
import { RecentUpdates } from "@/components/RecentUpdates";
import { TopicChips } from "@/components/TopicChips";

export default async function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 space-y-10">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">法令カードからサッと開く</h1>
        <p className="text-sm text-muted-foreground">よく使う法令を最初から表示しています。クリックで中へ。</p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {FEATURED_LAWS.map(law => (
            <li key={law.lawId}>
              <Link href={`/law/${law.lawId}`} className="block rounded-2xl border p-4 hover:shadow-sm focus:outline-none focus:ring">
                <div className="text-base font-semibold">{law.title}</div>
                {law.alias && <div className="text-xs text-muted-foreground mt-0.5">{law.alias}</div>}
                {law.highlightArticles?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {law.highlightArticles.map(a => (
                      <Link
                        key={a.key}
                        href={`/law/${law.lawId}/art/${a.key}`}
                        className="inline-block text-xs underline text-primary/80"
                        prefetch={false}
                      >
                        {a.label ?? `第${a.key}条`}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">カテゴリで見る</h2>
        <TopicChips />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">最近の改正</h2>
        {/* APIにつないだら自動で最新に置き換わる */}
        <RecentUpdates />
      </section>

      <footer className="pt-6 text-xs text-muted-foreground">
        出典：e-Gov法令検索（デジタル庁）／サイト内の要約・解説は非公式です
      </footer>
    </main>
  );
}
