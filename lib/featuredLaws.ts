export type FeaturedLaw = {
  lawId: string;
  title: string;
  alias?: string;
  highlightArticles?: { key: string; label?: string }[];
};

export const FEATURED_LAWS: FeaturedLaw[] = [
  { lawId: "321CONSTITUTION", title: "日本国憲法", alias: "憲法",
    highlightArticles: [{ key: "9", label: "第9条" }, { key: "13", label: "第13条" }] },
  { lawId: "129AC0000000089", title: "民法",
    highlightArticles: [{ key: "177", label: "第177条（不動産の物権変動）" }] },
  { lawId: "140AC0000000045", title: "刑法" },
  { lawId: "323AC0000000131", title: "刑事訴訟法" },
  { lawId: "408AC0000000109", title: "民事訴訟法" },
  { lawId: "322AC0000000049", title: "労働基準法" },
  { lawId: "419AC0000000128", title: "労働契約法" },
  { lawId: "345AC0000000048", title: "著作権法" },
  { lawId: "415AC0000000057", title: "個人情報の保護に関する法律（個人情報保護法）" },
];
