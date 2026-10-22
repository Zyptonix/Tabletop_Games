import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { performanceConfig } from "@/config/performance";
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
  const reduceMotion = performanceConfig.highPerformanceMode || !performanceConfig.motion;
  const performanceClasses = [
    performanceConfig.highPerformanceMode ? "high-performance-mode" : "",
    reduceMotion ? "no-motion" : "",
    performanceConfig.highPerformanceMode || !performanceConfig.glowEffects ? "no-glow-effects" : "",
    performanceConfig.highPerformanceMode || !performanceConfig.backdropBlur ? "no-backdrop-blur" : ""
  ].filter(Boolean).join(" ");

  return (
    <html lang="en">
      <body className={performanceClasses}>
        <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
          {children}
        </MotionConfig>
      </body>
    </html>
  );
}
