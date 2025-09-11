"use client";

import Link from "next/link";
import { ROKUPO } from "@/lib/rokupo";

export default function Home() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">六法全書（基本六法）</h1>
      <p className="opacity-80">題名をクリックすると詳細（本文）へ移動します。</p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROKUPO.map((l) => (
          <li key={l.lawId} className="border rounded-xl p-4">
            <div className="text-lg font-semibold">
              <Link href={`/law/${l.lawId}`} className="underline">
                {l.title}
              </Link>
            </div>
            <div className="text-sm opacity-70 mt-1">法令番号：{l.lawNo}</div>
            <div className="text-xs opacity-60 mt-1 break-all">Law ID：{l.lawId}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
