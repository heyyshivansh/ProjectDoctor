import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1560px",
      },
    },
    extend: {
      fontFamily: {
        display: ["IBM Plex Sans", "system-ui", "-apple-system", "sans-serif"],
        sans: ["IBM Plex Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["IBM Plex Mono", "SF Mono", "Fira Code", "monospace"],
      },
      colors: {
        pd: {
          canvas: "var(--pd-canvas)",
          "canvas-subtle": "var(--pd-canvas-subtle)",
          surface: "var(--pd-surface)",
          "surface-raised": "var(--pd-surface-raised)",
          "surface-overlay": "var(--pd-surface-overlay)",
          "surface-glass": "var(--pd-surface-glass)",
          border: "var(--pd-border)",
          "border-hover": "var(--pd-border-hover)",
          "border-focus": "var(--pd-border-focus)",
          "text-primary": "var(--pd-text-primary)",
          "text-body": "var(--pd-text-body)",
          "text-muted": "var(--pd-text-muted)",
          "text-faint": "var(--pd-text-faint)",
          ai: "var(--pd-ai)",
          "ai-hover": "var(--pd-ai-hover)",
          "ai-wash": "var(--pd-ai-wash)",
          "ai-glow": "var(--pd-ai-glow)",
          mint: "var(--pd-mint)",
          "mint-wash": "var(--pd-mint-wash)",
          "mint-glow": "var(--pd-mint-glow)",
          coral: "var(--pd-coral)",
          "coral-wash": "var(--pd-coral-wash)",
          "coral-glow": "var(--pd-coral-glow)",
          amber: "var(--pd-amber)",
          "amber-wash": "var(--pd-amber-wash)",
          "amber-glow": "var(--pd-amber-glow)",
          tech: "var(--pd-tech)",
          "tech-wash": "var(--pd-tech-wash)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "pd-card": "0 1px 4px -1px rgba(6, 78, 59, 0.08), 0 1px 2px -1px rgba(6, 78, 59, 0.05)",
        "pd-elevated": "0 8px 24px -4px rgba(6, 78, 59, 0.12), 0 2px 8px -2px rgba(6, 78, 59, 0.08)",
        "pd-glow-emerald": "0 0 16px -4px rgba(6, 78, 59, 0.15), 0 0 6px -2px rgba(6, 78, 59, 0.08)",
        "pd-glow-mint": "0 0 16px -4px rgba(5, 150, 105, 0.15), 0 0 6px -2px rgba(5, 150, 105, 0.08)",
        "pd-glow-coral": "0 0 16px -4px rgba(220, 38, 38, 0.12), 0 0 6px -2px rgba(220, 38, 38, 0.06)",
        "pd-glow-amber": "0 0 16px -4px rgba(180, 83, 9, 0.12), 0 0 6px -2px rgba(180, 83, 9, 0.06)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
