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
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["IBM Plex Mono", "SF Mono", "Fira Code", "monospace"],
      },
      colors: {
        pd: {
          canvas: "var(--pd-canvas)",
          ink: "var(--pd-ink)",
          surface: "var(--pd-surface)",
          "surface-raised": "var(--pd-surface-raised)",
          "surface-overlay": "var(--pd-surface-overlay)",
          "surface-glass": "var(--pd-surface-glass)",
          hairline: "var(--pd-hairline)",
          "hairline-subtle": "var(--pd-hairline-subtle)",
          "hairline-accent": "var(--pd-hairline-accent)",
          "hairline-specular": "var(--pd-hairline-specular)",
          "text-primary": "var(--pd-text-primary)",
          text: "var(--pd-text)",
          "text-body": "var(--pd-text-body)",
          "text-muted": "var(--pd-text-muted)",
          "text-faint": "var(--pd-text-faint)",
          "text-dim": "var(--pd-text-dim)",
          accent: "var(--pd-accent)",
          "accent-hover": "var(--pd-accent-hover)",
          "accent-wash": "var(--pd-accent-wash)",
          "accent-glow": "var(--pd-accent-glow)",
          critical: "var(--pd-critical)",
          "critical-wash": "var(--pd-critical-wash)",
          attention: "var(--pd-attention)",
          "attention-wash": "var(--pd-attention-wash)",
          strength: "var(--pd-strength)",
          "strength-wash": "var(--pd-strength-wash)",
          "iridescent-indigo": "var(--pd-iridescent-indigo)",
          "iridescent-cyan": "var(--pd-iridescent-cyan)",
          "iridescent-emerald": "var(--pd-iridescent-emerald)",
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
        "pd-card": "0 8px 32px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03)",
        "pd-elevated": "0 24px 48px -12px rgba(0, 0, 0, 0.75)",
        "pd-glow-accent": "0 0 24px -4px rgba(99, 102, 241, 0.25)",
        "pd-glow-critical": "0 0 24px -4px rgba(244, 63, 94, 0.25)",
        "pd-glow-strength": "0 0 24px -4px rgba(16, 185, 129, 0.25)",
        "pd-glow-attention": "0 0 24px -4px rgba(245, 158, 11, 0.25)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
