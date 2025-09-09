// scripts/add-tags.js
import fs from "node:fs";

const SRC = "data/kenpo.json";
const OUT = "data/kenpo.tagged.json";

// キーワード → 付与タグ（必要に応じて増やす）
const RULES = [
  { rx: /(戦争.*放棄|交戦権.*否認|武力行使.*永久に)/, tags: ["平和主義","戦争放棄","安全保障"] }, // 9条
  { rx: /(表現の自由|検閲|通信の秘密)/, tags: ["人権","表現の自由","通信の秘密"] },
  { rx: /(信教の自由)/, tags: ["人権","信教の自由"] },
  { rx: /(学問の自由|教育)/, tags: ["人権","教育","学問の自由"] },
  { rx: /(居住.*移転|職業選択)/, tags: ["人権","自由権"] },
  { rx: /(財産権)/, tags: ["人権","財産権"] },
  { rx: /(生存権|健康で文化的)/, tags: ["人権","社会権","生存権"] },
  { rx: /(裁判を受ける権利|法の下の平等|適正手続)/, tags: ["人権","司法","平等","適正手続"] },
  { rx: /(選挙|参政権|公務員の選定)/, tags: ["参政権","選挙"] },
  { rx: /(国会)/, tags: ["国会"] },
  { rx: /(内閣)/, tags: ["内閣"] },
  { rx: /(天皇)/, tags: ["天皇"] },
  { rx: /(地方自治)/, tags: ["地方自治"] },
  { rx: /(予算|財政)/, tags: ["財政"] }
];

const data = JSON.parse(fs.readFileSync(SRC, "utf8"));

for (const ch of data.chapters ?? []) {
  for (const a of ch.articles ?? []) {
    a.tags ??= [];
    for (const r of RULES) {
      if (r.rx.test(a.original)) {
        for (const t of r.tags) if (!a.tags.includes(t)) a.tags.push(t);
      }
    }
    // 最低限の補助キーワード（章タイトルを入れておく）
    a.keywords ??= [];
    if (ch.title && !a.keywords.includes(ch.title)) a.keywords.push(ch.title);
    // IDを自動付与（例: 第一章→1、第一条→1）
    if (!a.id) {
      const chNum = ch.title.match(/第(.+?)章/)?.[1] ?? "前";
      const artNum = a.no.match(/第(.+?)条/)?.[1] ?? "文";
      a.id = `${chNum}-${artNum}`;
    }
  }
}

fs.writeFileSync(OUT, JSON.stringify(data, null, 2), "utf8");
console.log(`done: ${OUT}`);
