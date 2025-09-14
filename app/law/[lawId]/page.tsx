import { fetchLawJson, toArray } from "@/lib/egov";

/** Article を木構造から収集（Article 以外は追わない） */
function collectArticles(node: any): any[] {
  if (!node || typeof node !== "object") return [];
  let out: any[] = [];
  if ((node as any).Article) out = out.concat(toArray((node as any).Article));
  for (const k of Object.keys(node)) {
    const v = (node as any)[k];
    if (v && typeof v === "object") {
      const arr = Array.isArray(v) ? v : [v];
      for (const c of arr) out = out.concat(collectArticles(c));
    }
  }
  return out;
}

/** ParagraphSentence / Sentence からテキストを集める（再帰） */
function collectSentences(node: any): string[] {
  if (!node) return [];
  if (typeof node === "string") return [node];
  if (typeof node === "object") {
    const out: string[] = [];
    if ((node as any).Sentence) {
      for (const s of toArray((node as any).Sentence)) out.push(...collectSentences(s));
    }
    if ((node as any).ParagraphSentence) {
      for (const s of toArray((node as any).ParagraphSentence)) out.push(...collectSentences(s));
    }
    if ((node as any)._ && typeof (node as any)._ === "string") out.push((node as any)._);
    return out;
  }
  return [];
}

/** 段落レンダリング */
function renderParagraph(p: any): string {
  const num =
    (typeof p?.ParagraphNum === "string" ? p.ParagraphNum : p?.ParagraphNum?._) ||
    (typeof p?.Num === "string" ? p.Num : p?.Num?._) || "";
  const text = collectSentences(p?.ParagraphSentence ?? p?.Sentence ?? p).join("");
  return `<p>${num ? `<span class="mr-2">${num}</span>` : ""}${text}</p>`;
}

/** 条レンダリング（見出し＋本文） */
function renderArticlePlain(a: any, fallbackKey: string): string {
  const cap =
    (typeof a?.ArticleCaption === "string" ? a.ArticleCaption : a?.ArticleCaption?._) || "";
  const ttl =
    (typeof a?.ArticleTitle === "string" ? a.ArticleTitle : a?.ArticleTitle?._) ||
    (typeof a?.$?.Num === "string" ? a.$.Num : "") || fallbackKey;

  const paragraphs = toArray(a?.Paragraph);
  const bodyHtml = paragraphs.map(renderParagraph).join("");
  const heading =
    `<h3 class="text-lg font-semibold mt-8 mb-2">` +
    `${cap ? `<span class="mr-2">${cap}</span>` : ""}${ttl}` +
    `</h3>`;
  return heading + bodyHtml;
}

export default async function LawPage(props: { params: Promise<{ lawId: string }> }) {
  const { lawId } = await props.params;
  const law = await fetchLawJson(lawId);
  const body = law?.LawBody ?? {};

  const title =
    (typeof law?.LawTitle === "string" ? law?.LawTitle : law?.LawTitle?._) ||
    law?.LawName || "（無題の法令）";

  /** 施行日情報（EnactStatement は文字列 or 文字列配列）だけを安全に抽出 */
  const enactHtml = toArray(law?.EnactStatement)
    .map((x: any) => (typeof x === "string" ? x : (x?._ ?? "")))
    .filter(Boolean)
    .map((t) => `<p>${t}</p>`)
    .join("");

  /** 本文（MainProvision 配下の Article のみ） */
  const mainArticles = collectArticles(body?.MainProvision);
  const mainHtml = mainArticles.map((a: any, i: number) => renderArticlePlain(a, String(i + 1))).join("");

  /** 附則・改正（各ノード配下の Article のみ）。text-sm で軽め表示 */
  const supplArticles = collectArticles(body?.SupplProvision);
  const supplHtml = supplArticles.map((a: any, i: number) => renderArticlePlain(a, `附則${i + 1}`)).join("");

  const amendArticles = collectArticles(body?.AmendProvision);
  const amendHtml = amendArticles.map((a: any, i: number) => renderArticlePlain(a, `改正${i + 1}`)).join("");

  /** 改正年月日（AmendProvision 直下にメタがある場合のみ軽く表示）*/
  const amendDates = (() => {
    const info = (body as any)?.AmendProvision?.AmendLawInfo;
    if (!info) return "";
    const txt = collectSentences(info).join("") ||
      toArray(info).map((x: any) => (typeof x === "string" ? x : (x?._ ?? ""))).join("");
    return txt ? `<p>${txt}</p>` : "";
  })();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>

      {/* 施行日情報（小さめ） */}
      {enactHtml && (
        <section className="mb-6 text-sm">
          <h2 className="text-lg font-semibold mb-2">施行日情報</h2>
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: enactHtml }} />
        </section>
      )}

      {/* 本文 */}
      <article className="prose dark:prose-invert max-w-none">
        {mainHtml ? <div dangerouslySetInnerHTML={{ __html: mainHtml }} /> : <p>本文が見つかりませんでした。</p>}
      </article>

      {/* 附則（小さめ） */}
      {supplHtml && (
        <section className="mt-10 text-sm">
          <h2 className="text-lg font-semibold mb-2">附則</h2>
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: supplHtml }} />
        </section>
      )}

      {/* 改正経過（小さめ） */}
      {amendHtml && (
        <section className="mt-10 text-sm">
          <h2 className="text-lg font-semibold mb-2">改正経過</h2>
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: amendHtml }} />
        </section>
      )}

      {/* 改正年月日（小さめ、あれば） */}
      {amendDates && (
        <section className="mt-10 text-sm">
          <h2 className="text-lg font-semibold mb-2">改正年月日</h2>
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: amendDates }} />
        </section>
      )}
    </main>
  );
}
