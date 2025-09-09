// scripts/validate-law.js
// 使い方: node scripts/validate-law.js [path]   例) node scripts/validate-law.js data/kenpo.json
import fs from "node:fs";
const SRC = process.argv[2] || "data/kenpo.json";

function normalize(data){
  // 期待形: { law, version, chapters:[{ title, articles:[{ id,no,original,easy,tags,keywords }] }] }
  if (Array.isArray(data)){ // 行配列 → 章ごと
    const map = new Map();
    for (const row of data){
      const title = row.chapter ?? row.title ?? "（章）";
      const a = {
        id: row.id ?? "",
        no: row.no ?? row.num ?? row.article ?? "",
        original: row.original ?? row.text ?? "",
        easy: row.easy ?? row.textEasy ?? "",
        tags: Array.isArray(row.tags) ? row.tags : [],
        keywords: Array.isArray(row.keywords) ? row.keywords : [],
      };
      if (!a.id){
        const chNum = title.match(/第(.+?)章/)?.[1] ?? "前";
        const artNum = a.no.match(/第(.+?)条/)?.[1] ?? "文";
        a.id = `${chNum}-${artNum}`;
      }
      if (!map.has(title)) map.set(title, []);
      map.get(title).push(a);
    }
    return { law:"日本国憲法", version:"", chapters:[...map].map(([title,articles])=>({title,articles})) };
  }
  if (data && Array.isArray(data.chapters)){
    const law = data.law ?? data.lawName ?? data.lawId ?? "日本国憲法";
    const version = data.version ?? data.update ?? "";
    const chapters = data.chapters.map(ch=>{
      const title = ch.title ?? ch.chapter ?? "（章）";
      const articles = (ch.articles ?? []).map(a=>{
        const out = {
          id: a.id ?? "",
          no: a.no ?? a.num ?? a.article ?? "",
          original: a.original ?? a.text ?? "",
          easy: a.easy ?? a.textEasy ?? "",
          tags: Array.isArray(a.tags) ? a.tags : [],
          keywords: Array.isArray(a.keywords) ? a.keywords : [],
        };
        if (!out.id){
          const chNum = title.match(/第(.+?)章/)?.[1] ?? "前";
          const artNum = out.no.match(/第(.+?)条/)?.[1] ?? "文";
          out.id = `${chNum}-${artNum}`;
        }
        return out;
      });
      return { title, articles };
    });
    return { law, version, chapters };
  }
  return { law:"日本国憲法", version:"", chapters:[] };
}

function main(){
  const raw = JSON.parse(fs.readFileSync(SRC,"utf8"));
  const norm = normalize(raw);

  const issues = [];
  const seenId = new Set();
  const seenPair = new Set(); // chapter|no

  let total = 0;
  for (const ch of norm.chapters){
    for (const a of ch.articles){
      total++;
      if (!a.no) issues.push(`条番号欠落: chapter="${ch.title}"`);
      if (!a.original) issues.push(`原文欠落: ${ch.title} / ${a.no}`);
      const id = a.id || "(missing)";
      if (seenId.has(id)) issues.push(`ID重複: ${id}`);
      seenId.add(id);
      const key = `${ch.title}|${a.no}`;
      if (seenPair.has(key)) issues.push(`章＋条 重複: ${key}`);
      seenPair.add(key);
    }
  }

  // 章ごとの件数
  const perCh = norm.chapters.map(ch => ({ chapter: ch.title, count: ch.articles.length }));

  console.log("=== VALIDATION RESULT ===");
  console.log(`law: ${norm.law}`);
  console.log(`version: ${norm.version || "(none)"}`);
  console.log(`chapters: ${norm.chapters.length}, articles: ${total}`);
  console.table(perCh);

  if (issues.length){
    console.log("\n--- Issues ---");
    for (const s of issues) console.log("•", s);
    console.log(`\n結果: NG（${issues.length}件）`);
    process.exitCode = 1;
  }else{
    console.log("\n結果: OK（問題なし）");
  }

  // 任意: 正規化結果の出力（デバッグ用）
  // fs.writeFileSync("data/kenpo.normalized.json", JSON.stringify(norm, null, 2));
}
main();
