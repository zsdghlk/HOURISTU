"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Props = { lawId: string; artKey: string };

export default function ArticleNav({ lawId, artKey }: Props) {
  const [keys, setKeys] = useState<string[]>([]);
  useEffect(() => {
    fetch(`/api/law/${lawId}`, { cache: "force-cache" })
      .then(r => r.json())
      .then(d => setKeys(Array.isArray(d?.articles) ? d.articles.map(String) : []))
      .catch(() => {});
  }, [lawId]);

  if (!keys.length) return null;
  const idx = keys.indexOf(String(artKey));
  const prev = idx > 0 ? keys[idx - 1] : null;
  const next = idx >= 0 && idx < keys.length - 1 ? keys[idx + 1] : null;

  return (
    <nav className="flex items-center justify-between gap-3 my-4">
      <div>
        {prev ? (
          <Link href={`/law/${lawId}/art/${prev}`} className="underline text-sm" prefetch={false}>
            ← 第{prev}条
          </Link>
        ) : <span className="text-sm text-muted-foreground">　</span>}
      </div>
      <div>
        {next ? (
          <Link href={`/law/${lawId}/art/${next}`} className="underline text-sm" prefetch={false}>
            第{next}条 →
          </Link>
        ) : <span className="text-sm text-muted-foreground">　</span>}
      </div>
    </nav>
  );
}
