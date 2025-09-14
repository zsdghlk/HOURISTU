"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * 条内検索（クライアント）:
 * - "/" で検索欄にフォーカス
 * - Enter = 次へ, Shift+Enter = 前へ
 * - マッチは <mark data-law-hit> でハイライト
 */
export default function ArticleSearch() {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const matchesRef = useRef<HTMLElement[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" でフォーカス
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "Enter" && document.activeElement === inputRef.current) {
        e.preventDefault();
        if (e.shiftKey) gotoPrev(); else gotoNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 検索 + ハイライト（素朴な全文検索）
  const highlight = useMemo(() => {
    return (query: string) => {
      const root = document.getElementById("article-root");
      if (!root) return;
      // 既存ハイライトを解除
      for (const m of Array.from(root.querySelectorAll("mark[data-law-hit]"))) {
        const parent = m.parentNode!;
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m);
      }
      matchesRef.current = [];
      setIdx(0);
      if (!query) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const targets: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node.nodeValue && node.nodeValue.trim()) targets.push(node);
      }
      const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

      for (const t of targets) {
        const text = t.nodeValue!;
        let m: RegExpExecArray | null;
        let lastIndex = 0;
        const frag = document.createDocumentFragment();
        re.lastIndex = 0;
        while ((m = re.exec(text)) !== null) {
          const before = text.slice(lastIndex, m.index);
          if (before) frag.appendChild(document.createTextNode(before));
          const mark = document.createElement("mark");
          mark.setAttribute("data-law-hit", "");
          mark.textContent = m[0];
          frag.appendChild(mark);
          matchesRef.current.push(mark);
          lastIndex = m.index + m[0].length;
        }
        if (matchesRef.current.length && lastIndex < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        if (frag.childNodes.length) {
          t.parentNode?.replaceChild(frag, t);
        }
      }
    };
  }, []);

  function goto(n: number) {
    const M = matchesRef.current;
    if (!M.length) return;
    const clamped = ((n % M.length) + M.length) % M.length;
    setIdx(clamped);
    const el = M[clamped];
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    // 一時的な強調
    el.classList.add("ring-2","ring-offset-2","ring-yellow-500","rounded-sm");
    setTimeout(() => el.classList.remove("ring-2","ring-offset-2","ring-yellow-500","rounded-sm"), 600);
  }
  function gotoNext() { goto(idx + 1); }
  function gotoPrev() { goto(idx - 1); }

  useEffect(() => { highlight(q); }, [q, highlight]);

  const count = matchesRef.current.length;
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2 flex-wrap">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="条内検索（/でフォーカス）"
        className="min-w-[12rem] flex-1 bg-transparent outline-none"
      />
      <div className="text-xs text-muted-foreground">{count ? `${idx+1}/${count}` : "0件"}</div>
      <div className="flex items-center gap-1">
        <button onClick={gotoPrev} className="text-sm underline">前へ</button>
        <button onClick={gotoNext} className="text-sm underline">次へ</button>
        <button onClick={() => setQ("")} className="text-sm underline">クリア</button>
      </div>
    </div>
  );
}
