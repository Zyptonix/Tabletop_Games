import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        table: {
          felt: "#17694f",
          rail: "#412b1d",
          ink: "#171717"
        }
      },
      boxShadow: {
        card: "0 14px 30px rgb(0 0 0 / 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
