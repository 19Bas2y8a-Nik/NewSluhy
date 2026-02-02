import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "NewSluhy — Поиск источников",
  description: "Telegram Mini App для поиска источников информации",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2481cc",
};

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return children;
}
