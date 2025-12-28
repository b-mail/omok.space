import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050510",
        primary: "#7b2cbf",
        secondary: "#4cc9f0",
        accent: "#f72585",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "space-gradient": "linear-gradient(to right, #7b2cbf, #4cc9f0)",
      },
    },
  },
  plugins: [],
};
export default config;
