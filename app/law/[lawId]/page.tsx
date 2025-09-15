import { fetchLawJson } from "@/lib/egov";

/** 文字列 or { _: string } のどちらでも拾う */
function textOf(x: any): string {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (x._) return String(x._);
  return "";
}

/** LawTitle / LawName を頑丈に解決（なければ ID を出す） */
function resolveTitle(law: any, fallbackId: string): string {
  const cands = [
    textOf(law?.LawTitle?._),
    textOf(law?.LawTitle),
    textOf(law?.LawName),
    textOf(law?.LawBody?.LawTitle?._),
    textOf(law?.LawBody?.LawTitle),
  ];
  const t = cands.find((s) => s && s.trim().length > 0);
  return t || `（法令名不明：${fallbackId}）`;
}

/** 汎用レンダラ：Article/Paragraph/Item/ParagraphSentence を順に潰して文字列化 */
function renderNode(node: any): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(renderNode).join("");
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (node._) return node._;

  // 構造的なノード
  if (node.Article) {
    const arr = Array.isArray(node.Article) ? node.Article : [node.Article];
    return arr.map(renderNode).join("");
  }
  if (node.Paragraph) {
    const arr = Array.isArray(node.Paragraph) ? node.Paragraph : [node.Paragraph];
    return arr.map(renderNode).join("");
  }
  if (node.Item) {
    const arr = Array.isArray(node.Item) ? node.Item : [node.Item];
    return arr.map(renderNode).join("");
  }
  if (node.ParagraphSentence) {
    const arr = Array.isArray(node.ParagraphSentence) ? node.ParagraphSentence : [node.ParagraphSentence];
    return arr.map((s: any) => (typeof s === "string" ? s : (s?._ ?? ""))).join("");
  }

  // その他のキーも一応なめる
  return Object.keys(node).map((k) => renderNode((node as any)[k])).join("");
}

export default async function LawPage(props: { params: Promise<{ lawId: string }> }) {
  const { lawId } = await props.params;
  const law = await fetchLawJson(lawId);
  const body = law?.LawBody ?? {};

  const title = resolveTitle(law, lawId);

  // 本文・附則
  const mainHtml  = renderNode(body.MainProvision);
  const supplHtml = renderNode(body.SupplProvision);

  // 説明ボックス（存在する要素だけを載せる／本文のみのときは非表示）
  const hasSuppl = !!body?.SupplProvision;
  const hasAmend = !!body?.AmendProvision; // 将来用

  const aboutLines: string[] = [];
  if (hasSuppl || hasAmend) {
    // 本文は常に
    aboutLines.push(`<p class="mb-2"><span class="font-bold text-blue-700 dark:text-blue-300">📖 本文</span> …… 法律の本体部分（第1条〜最終条）。</p>`);
    if (hasSuppl) {
      aboutLines.push(`<p class="mb-2"><span class="font-bold text-green-700 dark:text-green-300">�� 附則</span> …… 制定や改正に伴う施行期日・経過措置・特例など。改正のたびに新しい附則が追加されるため、附則内でも「第一条」から番号が再開する場合があります。</p>`);
    }
    if (hasAmend) {
      aboutLines.push(`<p class="mb-0"><span class="font-bold text-purple-700 dark:text-purple-300">📝 改正経過</span> …… 歴代の改正法の附則などを時系列で表示します。</p>`);
    }
  }
  const aboutHtml =
    aboutLines.length > 0
      ? `<div id="about-law-sections" data-has-suppl="${hasSuppl}" data-has-amend="${hasAmend}" class="mb-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/30 p-4 text-sm leading-relaxed">` +
        aboutLines.join("") +
        `</div>`
      : "";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>

      {/* 説明ボックス（条件付き） */}
      <div dangerouslySetInnerHTML={{ __html: aboutHtml }} />

      {/* 本文 */}
      <article className="prose dark:prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: mainHtml }} />
      </article>

      {/* 附則（条件付き） */}
      {supplHtml && (
        <section className="mt-10 text-sm">
          <h2 className="text-lg font-semibold mb-2">附則</h2>
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: supplHtml }} />
        </section>
      )}
    </main>
  );
}
