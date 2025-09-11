import Link from "next/link";

export async function RecentUpdates() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE}/api/updates`, { cache: "no-store" });
  const { items } = res.ok ? await res.json() : { items: [] as any[] };
  if (!items.length) return <p className="text-sm text-muted-foreground">本日の更新は取得できませんでした。</p>;

  return (
    <ul className="divide-y rounded-2xl border">
      {items.map((it: any) => (
        <li key={`${it.lawId}-${it.date}`} className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href={`/law/${it.lawId}`} className="font-medium underline hover:no-underline">
                {it.title}
              </Link>
              <div className="text-xs text-muted-foreground">{it.date}</div>
            </div>
            <Link href={`/law/${it.lawId}`} className="text-sm underline" prefetch={false}>
              開く →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
