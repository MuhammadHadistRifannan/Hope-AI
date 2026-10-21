import type { Config } from "tailwindcss";
import defaultColors from "tailwindcss/colors";
import plugin from "tailwindcss/plugin";

// Palet ramah buta warna (mode "cvd-safe", dari kebutuhan buta_warna). Merah dan hijau
// adalah pasangan yang paling sering tertukar, jadi semua kelas green/emerald/red/rose
// membaca variabel CSS: warna Tailwind asli secara bawaan, lalu biru dan oranye
// (pasangan Okabe-Ito) saat mode aktif. Oranye digeser satu tingkat lebih gelap
// supaya teksnya tetap lolos kontras 4,5:1 di atas putih.
const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
const SWAPPED = {
  green: { to: "blue", shift: 0 },
  emerald: { to: "blue", shift: 0 },
  red: { to: "orange", shift: 1 },
  rose: { to: "orange", shift: 1 },
} as const;
type Palette = Record<(typeof SHADES)[number], string>;
const paletteOf = (name: string) => (defaultColors as unknown as Record<string, Palette>)[name];
const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const swappableColors = Object.fromEntries(
  Object.keys(SWAPPED).map((name) => [
    name,
    Object.fromEntries(SHADES.map((shade) => [shade, `rgb(var(--cvd-${name}-${shade}) / <alpha-value>)`])),
  ])
);
const cvdVariables = (safe: boolean) =>
  Object.fromEntries(
    Object.entries(SWAPPED).flatMap(([name, { to, shift }]) =>
      SHADES.map((shade, index) => {
        const source = safe ? paletteOf(to)[SHADES[Math.min(index + shift, SHADES.length - 1)]] : paletteOf(name)[shade];
        return [`--cvd-${name}-${shade}`, rgbOf(source)];
      })
    )
  );
const colorBlindSafe = plugin(({ addBase }) => {
  addBase({ ":root": cvdVariables(false), ".cvd-safe": cvdVariables(true) });
});

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
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
        // Mendaftarkan font baru dengan nama class 'airfool'
        airfool: ['Airfool', 'sans-serif'], 
        cherry: ['"Cherry Bomb One"', 'system-ui'],
        magic: ['"Magic Red"', 'cursive', 'sans-serif'],
        // Huruf serif untuk judul bagian di landing page
        editorial: ['Fraunces', 'Georgia', 'serif'],
        // Huruf pixel untuk landing page
        pixel: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        ...swappableColors,
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(59, 130, 246, 0.6)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), colorBlindSafe],
} satisfies Config;
