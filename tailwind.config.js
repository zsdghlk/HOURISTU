cat > /workspaces/HOURISTU/tailwind.config.js <<'JS'
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // v4 では必須ではないが、念のため明示
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#007BFF",
        bgpage: "#F8F9FA",
        cta: "#FF7A00",
      },
    },
  },
  plugins: [],
};
JS
