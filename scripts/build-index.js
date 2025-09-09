// scripts/build-index.js
import fs from "node:fs";

const SRC = "data/kenpo.tagged.json";
const OUT = "data/kenpo.index.json";

/** ひらがな→カタカナ・全角→半角・小文字化 */
function norm(s = "") {
  return s
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

const law = JSON.parse(fs.readFileSync(SRC, "utf8"));
const docs = []; // {id,no,chapter,tags,text}

for (const ch of law.chapters ?? []) {
  for (const a of ch.articles ?? []) {
    docs.push({
      id: a.id,
      no: a.no,
      chapter: ch.title,
      tags: a.tags ?? [],
      text: `${a.no} ${ch.title} ${a.original ?? ""} ${(a.keywords ?? []).join(" ")}`
    });
  }
}

// token -> Set<id>
const index = {};
for (const d of docs) {
  const tokens = norm(d.text)
    .replace(/[^\p{Letter}\p{Number}ー一-龯ぁ-ゖァ-ヺ]/gu, " ")
    .split(/\s+/)
    .filter(t => t.length >= 2);
  for (const t of new Set(tokens)) {
    (index[t] ??= new Set()).add(d.id);
  }
}

// Set を配列に
const plain = {};
for (const k in index) plain[k] = Array.from(index[k]);

fs.writeFileSync(
  OUT,
  JSON.stringify({ law: law.law, version: law.version, docs, index: plain }, null, 2),
  "utf8"
);
console.log(`done: ${OUT}  (docs=${docs.length}, tokens=${Object.keys(plain).length})`);
