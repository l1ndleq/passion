import type { Config } from "tailwindcss";

const config: Config = {
 content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // ✅ ДОБАВЬ ЭТО
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: { extend: {
    fontFamily: {
  sans: ["var(--font-inter)", "system-ui", "sans-serif"],
  serif: ["var(--font-cormorant)", "serif"],
},

  } },
  plugins: [],
};

export default config;