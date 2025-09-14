"use client";
import { useEffect, useRef, useState } from "react";

/**
 * 簡易ルビ化トグル
 * - パターン: 「漢字語（かな・カナ・ー・中点・英数字少し）」を <ruby>base<rt>reading</rt></ruby> に変換
 * - 既存HTMLは #article-root の data-original-html に保存し、OFF時に完全復元
 * - #article-root 内の <ruby> / <mark> は処理しない
 */
export default function ArticleRubyToggle() {
  const [enabled, setEnabled] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    // 設定を復元
    const v = localStorage.getItem("law_ruby_enabled");
    if (v === "1") setEnabled(true);
  }, []);

  useEffect(() => {
    const root = document.getElementById("article-root");
    if (!root) return;

    if (!initialised.current) {
      // 初回だけ元HTMLを保存
      if (!root.getAttribute("data-original-html")) {
        root.setAttribute("data-original-html", root.innerHTML);
      }
      initialised.current = true;
    }

    if (enabled) {
      applyRuby(root);
      localStorage.setItem("law_ruby_enabled", "1");
    } else {
      // 完全復元
      const orig = root.getAttribute("data-original-html");
      if (orig != null) root.innerHTML = orig;
      localStorage.setItem("law_ruby_enabled", "0");
    }
  }, [enabled]);

  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
      <button
        aria-pressed={enabled}
        onClick={() => setEnabled(v => !v)}
        className="text-sm underline"
      >
        ルビ{enabled ? "：ON" : "：OFF"}
      </button>
      <span className="text-xs text-muted-foreground">括弧の読みを表示</span>
    </div>
  );
}

/** #article-root 内をルビ化（破壊的、ただしOFFで完全復元） */
function applyRuby(root: HTMLElement) {
  // <ruby> と <mark> の内部は触らない
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest("ruby, mark")) return NodeFilter.FILTER_REJECT;
      const v = node.nodeValue ?? "";
      if (!v.trim()) return NodeFilter.FILTER_REJECT;
      // 括弧が含まれていなければスキップ
      return v.includes("（") && v.includes("）")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  } as any);

  const targets: Text[] = [];
  while (walker.nextNode()) targets.push(walker.currentNode as Text);

  // ルビ化の素朴な正規表現
  // 例: 国権（こっけん）/ 人格（じんかく）/ データ（データ）/ API（エーピーアイ）
  // base: 主に漢字・かな交じり語を想定、reading: かな・カナ・長音・中点・英数字少し
  const re = /([一-龯々〆ヶぁ-ゖァ-ヿA-Za-z0-9・ー]+)（([ぁ-ゖァ-ヿ・ーA-Za-z0-9]+)）/g;

  for (const t of targets) {
    const text = t.nodeValue ?? "";
    if (!re.test(text)) continue;
    re.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      const [full, base, reading] = m;
      // 直前のテキスト
      if (m.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
      }
      // <ruby>base<rt>reading</rt></ruby>
      const ruby = document.createElement("ruby");
      ruby.textContent = base;
      const rt = document.createElement("rt");
      rt.textContent = reading;
      ruby.appendChild(rt);
      frag.appendChild(ruby);

      lastIndex = m.index + full.length;
    }
    // 残り
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    t.parentNode?.replaceChild(frag, t);
  }
}
