import type { Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    logs: false,
    themes: [
      {
        dark: {
          primary: "#fa9549",
          secondary: "#7fd5ff",
          accent: "#8fff66",
          neutral: "#4a4a55", // or 9698a7
          "base-100": "#2d2d40",
          info: "#498cfa",
          success: "#5ffa49",
          warning: "#fae449",
          error: "#fa4949",
        },
      },
    ],
  },
} satisfies Config;
