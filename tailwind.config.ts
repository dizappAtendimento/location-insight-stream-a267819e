import type { Config } from "tailwindcss";

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
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
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
        // Platform specific colors
        instagram: "hsl(var(--instagram))",
        linkedin: "hsl(var(--linkedin))",
        whatsapp: "hsl(var(--whatsapp))",
        places: "hsl(var(--places))",
        // Highlight color for values
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
        },
        // Surface layers
        surface: {
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        // Status colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        link: {
          DEFAULT: "hsl(var(--link))",
          foreground: "hsl(var(--link-foreground))",
          glow: "hsl(var(--link-glow))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      boxShadow: {
        'glow': '0 0 20px hsl(var(--primary) / 0.25)',
        'glow-lg': '0 0 40px hsl(var(--primary) / 0.35)',
        'glow-xl': '0 0 60px hsl(var(--primary) / 0.4)',
        'inner-glow': 'inset 0 0 20px hsl(var(--primary) / 0.08)',
        'card': '0 1px 3px hsl(var(--foreground) / 0.02), 0 4px 12px hsl(var(--foreground) / 0.04)',
        'card-hover': '0 4px 12px hsl(var(--foreground) / 0.04), 0 16px 32px hsl(var(--foreground) / 0.08)',
        'elevated': '0 2px 4px hsl(var(--foreground) / 0.02), 0 8px 16px hsl(var(--foreground) / 0.06), 0 24px 48px hsl(var(--foreground) / 0.06)',
        'subtle': '0 1px 2px hsl(var(--foreground) / 0.03)',
        'premium': '0 0 0 1px hsl(var(--border) / 0.5), 0 1px 2px hsl(var(--foreground) / 0.02), 0 8px 24px hsl(var(--foreground) / 0.06)',
        'premium-hover': '0 0 0 1px hsl(var(--border) / 0.6), 0 2px 4px hsl(var(--foreground) / 0.03), 0 12px 32px hsl(var(--foreground) / 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(263 80% 65%) 100%)',
        'gradient-instagram': 'linear-gradient(135deg, hsl(328 85% 60%) 0%, hsl(35 100% 60%) 100%)',
        'gradient-linkedin': 'linear-gradient(135deg, hsl(201 100% 40%) 0%, hsl(201 100% 55%) 100%)',
        'gradient-whatsapp': 'linear-gradient(135deg, hsl(142 70% 45%) 0%, hsl(142 100% 50%) 100%)',
        'gradient-places': 'linear-gradient(135deg, hsl(150 80% 45%) 0%, hsl(150 100% 55%) 100%)',
        'gradient-subtle': 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--surface-2)) 100%)',
        'gradient-shine': 'linear-gradient(135deg, transparent 0%, hsl(var(--foreground) / 0.02) 50%, transparent 100%)',
        'gradient-glass': 'linear-gradient(135deg, hsl(var(--card) / 0.9) 0%, hsl(var(--card) / 0.7) 100%)',
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
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.2)" },
          "50%": { boxShadow: "0 0 35px hsl(var(--primary) / 0.35)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.005)", opacity: "0.95" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.35s ease-out forwards",
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
        "fade-in-scale": "fade-in-scale 0.25s ease-out forwards",
        "scale-in": "scale-in 0.25s ease-out forwards",
        "slide-in-left": "slide-in-left 0.35s ease-out forwards",
        "slide-in-right": "slide-in-right 0.35s ease-out forwards",
        "slide-in-up": "slide-in-up 0.35s ease-out forwards",
        "float": "float 5s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        "glow": "glow 4s ease-in-out infinite",
        "shimmer": "shimmer 2.5s ease-in-out infinite",
        "bounce-soft": "bounce-soft 2.5s ease-in-out infinite",
        "breathe": "breathe 4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'premium': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;