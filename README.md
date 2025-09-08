# HOURISTU

lawsite/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  └─ laws/[lawId]/page.tsx
├─ lib/
│  ├─ types.ts
│  └─ utils.ts
├─ data/              # 生成済みJSON（最初は空OK）
├─ public/
│  ├─ favicon.ico
│  └─ icon-512.png
├─ scripts/
│  ├─ fetch-laws.ts   # 更新一覧→本文XML取得→JSON化（差分のみ）
│  ├─ parse-xml.ts    # XML→条・項のJSON化（超最小パーサ）
│  └─ easyify.ts      # “やさしい日本語”ルール置換
├─ styles/
│  └─ globals.css
├─ .github/workflows/build.yml
├─ package.json
├─ tsconfig.json
├─ next.config.ts
├─ postcss.config.js
├─ tailwind.config.ts
└─ .gitignore
