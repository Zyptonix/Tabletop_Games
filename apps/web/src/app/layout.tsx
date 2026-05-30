import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Tabletop Arena",
  description: "Private realtime tabletop games for friends."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
