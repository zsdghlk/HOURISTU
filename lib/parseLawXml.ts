export type Paragraph = { num?: string; text: string };
export type Article = {
  key: string;
  number?: string;
  paragraphs: Paragraph[];
  prefix?: string;
};
export type ParsedLaw = {
  lawTitle?: string;
  meta: { lawNo?: string; promulgationDate?: string; enforcementDate?: string };
  articles: Article[];
};

function get1(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : undefined;
}
function getAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

export async function parseLawXml(xml: string): Promise<ParsedLaw> {
  // タイトルは LawTitle or LawName 相当を緩く拾う
  const lawTitle =
    get1(xml, "LawTitle") ||
    get1(xml, "LawName") ||
    get1(xml, "LawTitleFull") ||
    get1(xml, "LawTitleEn") ||
    "";

  const meta = {
    lawNo: get1(xml, "LawNo") || undefined,
    promulgationDate: get1(xml, "PromulgationDate") || undefined,
    enforcementDate: get1(xml, "EnforcementDate") || undefined,
  };

  // Article ブロックをまるごと拾う
  // e-Gov は <Article>…</Article> が基本。見つからない場合 <SupplProvision> 内の Article も同様に拾える。
  const articleBlocks =
    xml.match(/<Article\b[\s\S]*?<\/Article>/gi) || [];

  const articles: Article[] = articleBlocks.map((blk, idx) => {
    // 見出し：ArticleNum / ArticleTitle のどちらか
    const number =
      get1(blk, "ArticleNum") ||
      get1(blk, "ArticleTitle") ||
      undefined;

    // 段落：<Paragraph>…</Paragraph> を列挙
    const parsRaw =
      blk.match(/<Paragraph\b[\s\S]*?<\/Paragraph>/gi) || [];

    const paragraphs: Paragraph[] = parsRaw.map((pblk) => {
      const num = get1(pblk, "ParagraphNum") || undefined;
      // 段落本文は Paragraph ブロック全体から ParagraphNum 部分を除いてタグを剥ぐ
      let textPart = pblk.replace(/<ParagraphNum[^>]*>[\s\S]*?<\/ParagraphNum>/gi, "");
      textPart = stripTags(textPart).replace(/\s+/g, " ").trim();
      return { num, text: textPart };
    }).filter(p => p.text);

    // 段落が取れなかった場合、Article 直下テキストを保険で拾う
    if (paragraphs.length === 0) {
      let txt = stripTags(blk).replace(/\s+/g, " ").trim();
      // 見出し相当を除去
      if (number) txt = txt.replace(number, "").trim();
      if (txt) paragraphs.push({ text: txt });
    }

    return {
      key: number || String(idx + 1),
      number,
      paragraphs,
    };
  }).filter(a => a.paragraphs.length > 0);

  return { lawTitle, meta, articles };
}
