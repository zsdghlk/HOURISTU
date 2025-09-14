"use client";
import { useEffect, useRef, useState } from "react";

type GlossItem = { term: string; definition: string; artKey: string };
type Props = { lawId: string };

export default function GlossaryPop({ lawId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<GlossItem[]>([]);
  const tipRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const v = localStorage.getItem("law_glossary_enabled");
    if (v === "1") setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      unmarkAll();
      localStorage.setItem("law_glossary_enabled", "0");
      return;
    }
    localStorage.setItem("law_glossary_enabled", "1");
    fetch(`/api/law/${lawId}/glossary`, { cache: "force-cache" })
      .then(r => r.json())
      .then(d => {
        const arr: GlossItem[] = Array.isArray(d?.items) ? d.items : [];
        setItems(arr);
      })
      .catch(() => setItems([]));
  }, [enabled, lawId]);

  useEffect(() => {
    if (!enabled || !items.length) return;
    markTerms(items);
  }, [enabled, items]);

  useEffect(() => {
    const tip = document.createElement("div");
    tip.className = "fixed z-50 hidden rounded-xl border bg-background text-foreground shadow-md max-w-[80vw] md:max-w-sm p-3";
    tip.setAttribute("id", "glossary-tip");
    document.body.appendChild(tip);
    tipRef.current = tip;
    return () => { tip.remove(); };
  }, []);

  function showTip(x: number, y: number, html: string) {
    const tip = tipRef.current!;
    tip.innerHTML = html;
    tip.style.left = Math.min(x + 12, window.innerWidth - tip.offsetWidth - 12) + "px";
    tip.style.top = Math.min(y + 12, window.innerHeight - tip.offsetHeight - 12) + "px";
    tip.classList.remove("hidden");
  }
  function hideTipSoon() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      tipRef.current?.classList.add("hidden");
    }, 120);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
      <button
        aria-pressed={enabled}
        onClick={() => setEnabled(v => !v)}
        className="text-sm underline"
      >
        用語ポップ{enabled ? "：ON" : "：OFF"}
      </button>
      <span className="text-xs text-muted-foreground">定義にホバー/タップで表示</span>
    </div>
  );

  // ---- helpers ----
  function unmarkAll() {
    const root = document.getElementById("article-root");
    if (!root) return;
    for (const el of Array.from(root.querySelectorAll("span[data-gloss-term]"))) {
      const parent = el.parentNode!;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  }

  function markTerms(items: GlossItem[]) {
    const root = document.getElementById("article-root");
    if (!root) return;

    // 既存マーク解除
    unmarkAll();

    // 長い語→短い語の順で置換重複を抑制
    const terms = items
      .filter(g => g.term.length >= 2)
      .sort((a, b) => b.term.length - a.term.length)
      .slice(0, 80); // 過負荷回避

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = (node as Text).parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest("ruby, mark, span[data-gloss-term]")) return NodeFilter.FILTER_REJECT;
        const v = node.nodeValue ?? "";
        return v.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    } as any);

    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    for (const tn of textNodes) {
      let text = tn.nodeValue ?? "";
      let changed = false;
      const frag = document.createDocumentFragment();

      let idx = 0;
      while (idx < text.length) {
        const hit = terms.find(g => text.startsWith(g.term, idx));
        if (hit) {
          if (idx > 0) frag.appendChild(document.createTextNode(text.slice(idx - 0, idx)));
          const span = document.createElement("span");
          span.setAttribute("data-gloss-term", hit.term);
          span.setAttribute("data-gloss-def", hit.definition);
          span.setAttribute("data-gloss-art", hit.artKey);
          span.className = "gloss-term underline decoration-dotted underline-offset-2 cursor-help";
          span.textContent = hit.term;

          span.addEventListener("mouseenter", (e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const html = renderTip(hit);
            showTip(rect.left + rect.width / 2, rect.bottom, html);
          });
          span.addEventListener("mouseleave", hideTipSoon);
          span.addEventListener("click", (e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const html = renderTip(hit);
            showTip(rect.left + rect.width / 2, rect.bottom, html);
          });

          frag.appendChild(span);
          idx += hit.term.length;
          changed = true;
        } else {
          // 1文字進める
          idx++;
          const ch = text[idx - 1];
          frag.appendChild(document.createTextNode(ch));
        }
      }

      if (changed) tn.parentNode?.replaceChild(frag, tn);
    }
  }

  function renderTip(g: GlossItem) {
    const url = `/law/${lawId}/art/${g.artKey}`;
    return `
      <div class="text-sm">
        <div class="font-semibold mb-1">${escapeHtml(g.term)}</div>
        <div class="mb-2">${escapeHtml(g.definition)}</div>
        <a href="${url}" class="underline text-xs" onclick="document.getElementById('glossary-tip')?.classList.add('hidden')">定義条（第${g.artKey}条）を開く →</a>
      </div>
    `;
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]!));
  }
}
