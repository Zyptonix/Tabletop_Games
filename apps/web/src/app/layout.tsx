import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Tabletop Arena",
  description: "Private realtime tabletop games for friends.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="low-power-mode dark-ui">
        <MotionConfig reducedMotion="always">
          {children}
        </MotionConfig>
      </body>
    </html>
  );
}
