"use client";

import Link from "next/link";
import { ROKUPO } from "@/lib/rokupo";

export default function Home() {
  return (
    <main id="top" className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">六法全書（基本六法）</h1>
        <p className="text-base leading-relaxed opacity-80">
          題名をクリックすると詳細（本文）へ移動します。
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROKUPO.map((l) => (
          <li key={l.lawId}>
            <article className="group border rounded-2xl p-4 transition-colors hover:border-gray-400">
              <h2 className="text-lg font-semibold leading-snug">
                <Link
                  href={`/law/${l.lawId}`}
                  className="no-underline group-hover:underline"
                >
                  {l.title}
                </Link>
              </h2>
              <dl className="mt-2 text-sm opacity-80 space-y-1">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-gray-500">法令番号</dt>
                  <dd className="break-words">{l.lawNo}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-gray-500">Law ID</dt>
                  <dd className="break-all">{l.lawId}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <Link
                  href={`/law/${l.lawId}`}
                  className="inline-block border rounded-lg px-3 py-2 text-sm no-underline hover:bg-gray-50"
                >
                  本文を開く →
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </main>
  );
}
