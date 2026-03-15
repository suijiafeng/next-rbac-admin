import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", "html[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // 沿用 CSS 变量，主题切换无需重新编译
        bg: {
          layout: "var(--bg-layout)",
          container: "var(--bg-container)",
          elevated: "var(--bg-elevated)",
          subtle: "var(--bg-subtle)",
        },
        border: {
          DEFAULT: "var(--border-base)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
        },
        brand: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          active: "var(--color-primary-active)",
        },
        // 保留旧 token 兼容
        background: "var(--bg-layout)",
        foreground: "var(--text-primary)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      spacing: {
        header: "var(--header-height)",
        sider: "var(--sider-width)",
        "sider-collapsed": "var(--sider-width-collapsed)",
      },
    },
  },
  plugins: [],
};
export default config;
