import type { Config } from "tailwindcss";
import { theme } from "./src/lib/theme";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ...theme.colors,
      },
      fontFamily: {
        sans: theme.typography.fontFamily.base.split(", "),
      },
      screens: theme.breakpoints,
    },
  },
  plugins: [],
} satisfies Config;
