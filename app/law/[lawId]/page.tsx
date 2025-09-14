import { fetchLawJson, toArray } from "@/lib/egov";

export default async function LawPage(props: { params: Promise<{ lawId: string }> }) {
  const { lawId } = await props.params;
  const law = await fetchLawJson(lawId);

  const title =
    (typeof law?.LawTitle === "string" ? law?.LawTitle : law?.LawTitle?._) ||
    law?.LawName ||
    "（無題の法令）";

  // どんなキーでも潜って Article を収集（shape と同じ方針）
  const collectGeneric = (node: any): any[] => {
    if (!node || typeof node !== "object") return [];
    let arr: any[] = [];
    if ((node as any).Article) arr = arr.concat(toArray((node as any).Article));
    for (const k of Object.keys(node)) {
      const v = (node as any)[k];
      if (v && typeof v === "object") {
        const children = Array.isArray(v) ? v : [v];
        for (const c of children) arr = arr.concat(collectGeneric(c));
      }
    }
    return arr;
  };

  const toText = (s: any): string =>
    typeof s === "string" ? s : (s?._ ?? "");

  const renderParagraph = (p: any): string => {
    if (!p) return "";
    const num =
      (typeof p?.ParagraphNum === "string" ? p.ParagraphNum : p?.ParagraphNum?._) ||
      (typeof p?.Num === "string" ? p.Num : p?.Num?._) ||
      "";
    const sentences = toArray(p?.ParagraphSentence || p?.Sentence);
    const text = sentences.map(toText).join("");
    // 番号があれば先頭に出す（読みやすく）
    return `<p>${num ? `<span class="mr-2">${num}</span>` : ""}${text}</p>`;
  };

  const renderArticlePlain = (a: any, fallbackKey: string): string => {
    const cap =
      (typeof a?.ArticleCaption === "string" ? a.ArticleCaption : a?.ArticleCaption?._) || "";
    const ttl =
      (typeof a?.ArticleTitle === "string" ? a.ArticleTitle : a?.ArticleTitle?._) ||
      (typeof a?.$?.Num === "string" ? a.$.Num : "") ||
      fallbackKey;

    const paragraphs = toArray(a?.Paragraph);
    const bodyHtml = paragraphs.map(renderParagraph).join("");

    const heading =
      `<h3 class="text-lg font-semibold mt-8 mb-2">` +
      `${cap ? `<span class="mr-2">${cap}</span>` : ""}${ttl}` +
      `</h3>`;

    return heading + (bodyHtml || "");
  };

  // 本文（MainProvision を汎用走査）
  const mainArticles = collectGeneric(law?.LawBody?.MainProvision);
  const mainHtml = mainArticles
    .map((a: any, i: number) => renderArticlePlain(a, String(i + 1)))
    .join("");

  // 前文（ParagraphSentence に対応）
  const preambleText = (() => {
    const pre = law?.LawBody?.Preamble;
    if (!pre) return "";
    const ps = toArray(pre?.Paragraph);
    const lines = ps.map((p: any) => {
      const ss = toArray(p?.ParagraphSentence || p?.Sentence);
      return ss.map(toText).join("");
    });
    return lines.join("\n");
  })();

  // 附則・改正（まず直下、0件なら汎用走査）
  const collectOrDirect = (node: any): any[] => {
    let arr = toArray(node?.Article);
    if (arr.length === 0) arr = collectGeneric(node);
    return arr;
  };

  const supplHtml = collectOrDirect(law?.LawBody?.SupplProvision)
    .map((a: any, i: number) => renderArticlePlain(a, `附則${i + 1}`))
    .join("");

  const amendHtml = collectOrDirect(law?.LawBody?.AmendProvision)
    .map((a: any, i: number) => renderArticlePlain(a, `改正${i + 1}`))
    .join("");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>

      {preambleText && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">前文</h2>
          <p className="leading-relaxed whitespace-pre-wrap">{preambleText}</p>
        </section>
      )}

      <article className="prose dark:prose-invert max-w-none">
        {mainHtml
          ? <div dangerouslySetInnerHTML={{ __html: mainHtml }} />
          : <p className="text-muted-foreground">本文が見つかりませんでした。</p>}
      </article>

      {supplHtml && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-2">附 則</h2>
          <div className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: supplHtml }} />
        </section>
      )}

      {amendHtml && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-2">改正経過</h2>
          <div className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: amendHtml }} />
        </section>
      )}
    </main>
  );
}
