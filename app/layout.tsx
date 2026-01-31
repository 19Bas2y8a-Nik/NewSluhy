import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NewSluhy",
  description: "Telegram-бот для поиска источников информации",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
