import fetch from "node-fetch";
import { DOMParser } from "xmldom";
import xpath from "xpath";
import fs from "fs";

const LAW_ID = "321CONSTITUTION"; // 日本国憲法
const API_URL = `https://laws.e-gov.go.jp/api/1/lawdata/${LAW_ID}`;

function text(node) {
  if (!node) return "";
  return node.toString ? node.toString() : String(node);
}

function norm(s) {
  return s.replace(/\s+/g, " ").trim();
}

(async () => {
  console.log("Fetching:", API_URL);
  const res = await fetch(API_URL);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");

  // 前文（あれば）
  const preambleNode = xpath.select1("string(//Preamble)", doc);
  const preamble = norm(text(preambleNode || ""));
  // すべての条（附則含む）
  const articleNodes = xpath.select("//Article", doc);

  // 章ごとにまとめる
  const chaptersMap = new Map(); // title -> {title, articles:[]}

  const pushArticle = (chapterTitle, no, original) => {
    if (!chaptersMap.has(chapterTitle)) {
      chaptersMap.set(chapterTitle, { title: chapterTitle, articles: [] });
    }
    chaptersMap.get(chapterTitle).articles.push({
      no,
      original,
      easy: "" // ← あとで追記する欄
    });
  };

  // 前文がある場合は最初に入れる
  if (preamble) {
    pushArticle("前文", "前文", preamble);
  }

  for (const at of articleNodes) {
    const no = norm(xpath.select1("string(ArticleTitle)", at)); // 例: 第一条
    // 条文本文（段落を連結）
    const paragraphTexts = xpath
      .select("Paragraph", at)
      .map((p) => norm(xpath.select1("string(.//Sentence)", p)));
    const original = paragraphTexts.join("\n");

    // 章タイトル（無ければ空→「（章なし）」に格納）
    let chapterTitle = norm(
      xpath.select1("string(ancestor::Chapter[1]/ChapterTitle)", at)
    );
    if (!chapterTitle) chapterTitle = "（章なし／本則）";

    pushArticle(chapterTitle, no || "（条番号不明）", original);
  }

  // 章を配列に
  const chapters = Array.from(chaptersMap.values());

  const out = {
    law: "日本国憲法",
    version: new Date().toISOString().slice(0, 10),
    chapters
  };

  fs.writeFileSync("data/kenpo.json", JSON.stringify(out, null, 2));
  console.log("Wrote: data/kenpo.json");
})();
