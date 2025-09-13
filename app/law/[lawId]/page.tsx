import { getLawXml } from "@/lib/egov";
import { formatParagraphNum } from "../../../utils/lawFormat";
import { parseLawXml } from "@/lib/parseLawXml";
import { ROKUPO } from "@/lib/rokupo";

function highlight(text: string, q: string) {
  if (!q) return text;
  try {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return text.split(re).reduce<JSX.Element[]>((acc, part, i, arr) => {
      acc.push(<span key={`p${i}`}>{part}</span>);
      if (i < arr.length - 1) acc.push(<mark key={`m${i}`}>{q}</mark>);
      return acc;
    }, []);
  } catch {
    return text;
  }
}

type Art = { number?: string; key: string; paragraphs: { text: string }[]; prefix?: string };

export default async function LawDetail(props: {
  params: Promise<{ lawId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { lawId } = await props.params;
  const { q: rawQ } = await props.searchParams;

  // 取得・解析
  const xml = await getLawXml(lawId);
  const parsed = await parseLawXml(xml);
  const q = (rawQ ?? "").trim();

  const fallback = ROKUPO.find((x) => x.lawId === lawId)?.title;
  const pageTitle = parsed.lawTitle || fallback || "法令";

  const arts: Art[] = q
    ? parsed.articles.filter(
        (a) =>
          (a.number ?? "").includes(q) ||
          a.paragraphs.some((p) => p.text.includes(q))
      )
    : parsed.articles;

  // ====== 連続する prefix（附則ラベル）ごとにグループ化 ======
  // prefix が同じ連続範囲でまとめ、「附則（…改正）」をグループ見出しに表示
  const groups: { label: string; items: Art[] }[] = [];
  let cur = "";
  for (const a of arts) {
    const label = a.prefix || "本則";
    if (label !== cur) {
      groups.push({ label, items: [] });
      cur = label;
    }
    groups[groups.length - 1].items.push(a);
  }

  return (
    <div>
      <section className="section" style={{ paddingBlock: "8px" }}>
        <h1 style={{ marginBottom: 8 }}>{pageTitle}</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <form action="" method="get" style={{ marginLeft: "auto" }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="条名や本文で検索"
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: ".95rem",
                minWidth: 220,
              }}
            />
          </form>
        </div>
      </section>

      {arts.length === 0 ? (
        <section className="section">
          <p className="muted">条文が見つかりませんでした。</p>
        </section>
      ) : (
        <article className="section">
          {groups.map((g, gi) => (
            <div key={`g-${gi}`} style={{ marginBottom: 28 }}>
              {/* ■ 附則パートだけにラベルを表示（例: 附則（昭和22年法律第74号 1947-05-03 改正）） */}
              {g.label !== "本則" && (
                <div
                  className="muted"
                  style={{
                    margin: "0 0 10px 4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: ".95rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontWeight: 600,
                    }}
                  >
                    {g.label}
                  </span>
                  <span>（この附則の条文）</span>
                </div>
              )}

              {g.items.map((a, idx) => {
                const uniqueKey = `${g.label}-${a.number || a.key}-${idx}`;

                // 本則: 「第○条」, 附則: 「附則（…） 第○条」だと重複感が強いので
                // グループ見出しにラベル、各条の見出しは「第○条」だけに絞る。

                return (
                  <section key={uniqueKey} id={uniqueKey} className="card">
                      <h2 style={{ marginBottom: 8 }}>
                        {(() => {
                          const labelRaw = (a.supLabel || a.prefix || g.label || "").trim();
                          const isSup = Boolean(a.isSupplement) || /附則/.test(labelRaw);
                          const supLabel = isSup
                            ? (labelRaw && !labelRaw.startsWith("附則") ? `附則（${labelRaw}）` : (labelRaw || "附則"))
                            : "";
                          const head = isSup
                            ? `${supLabel} ${formatArticleHeading(a.number ?? a.key)}`
                            : formatArticleHeading(a.number ?? a.key);
                          return head;
                        })()}
                      </h2>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {a.paragraphs.map((p, i) => (
                        <p key={`${uniqueKey}-p${i}`}>{formatParagraphNum(p.num, i)}{q ? highlight(p.text, q) : p.text}</p>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ))}
        </article>
      )}
    </div>
  );
}

// ---- 表示整形ヘルパー（追加）----
function displayArticleNum(n?: string): string {
  if (!n) return "";
  if (/^第.+条/.test(n)) return n;                 // 既に整形済み
  if (n.includes("_")) {
    const [main, sub] = n.split("_");
    if (main && sub) return `第${main}条の${sub}`;  // "3_2" → "第3条の2"
  }
  if (/^[0-9]+$/.test(n)) return `第${n}条`;       // "3" → "第3条"
  return n;
}

// --- 見出しを「第○条／第○条の△」に統一する最終フォーマッタ ---
function formatArticleHeading(input?: string): string {
  const s = (input ?? "").trim();
  if (!s) return "";
  if (s === "前文") return s;                    // 前文はそのまま
  if (/^第.+条/.test(s)) return s;               // 既に整形済みはそのまま
  const m = s.match(/^(\d+)_(\d+)$/);            // "3_2" → "第3条の2"
  if (m) return `第${m[1]}条の${m[2]}`;
  if (/^\d+$/.test(s)) return `第${s}条`;        // "3" → "第3条"
  // 漢数字のみ等にも対応（任意）
  if (/^[一二三四五六七八九十百千万]+$/.test(s)) return `第${s}条`;
  return s;                                      // それ以外は素通し
}
