import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1F3A",
          50: "#EAF0FA",
          100: "#C7D6ED",
          600: "#16305A",
          900: "#0B1F3A",
        },
        teal: {
          DEFAULT: "#0F7A82",
          50: "#E6F5F5",
          500: "#0F7A82",
          600: "#0C6167",
        },
        safe: {
          green: "#1E8A5F",
          amber: "#C97A1E",
          red: "#B4423A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
