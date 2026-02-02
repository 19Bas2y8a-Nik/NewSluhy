import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>NewSluhy</h1>
      <p>Telegram-бот для поиска источников информации. Webhook: <code>/api/webhook</code></p>
      <p>
        <Link href="/mini">Telegram Mini App (TMA)</Link>
      </p>
    </main>
  );
}
