"use client";
import Link from "next/link";

const TOPICS: { label: string; lawIds: string[] }[] = [
  { label: "民事", lawIds: ["CIVIL-000", "MCP-000"] },
  { label: "刑事", lawIds: ["PENAL-000", "CCP-000"] },
  { label: "労働", lawIds: ["LAB-STD-000", "LAB-CON-000"] },
  { label: "知的財産", lawIds: ["COPY-000"] },
  { label: "個人情報/IT", lawIds: ["PIPA-000"] },
];

export function TopicChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {TOPICS.map(t => (
        <div key={t.label} className="flex items-center gap-2 rounded-full border px-3 py-1">
          <span className="text-sm">{t.label}</span>
          <span className="text-xs text-muted-foreground">|</span>
          <div className="flex gap-2">
            {t.lawIds.map(id => (
              <Link key={id} href={`/law/${id}`} className="text-xs underline" prefetch={false}>
                {id.replace(/-.+/, "") /* 仮表示。あとで正式タイトルに置換 */}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
