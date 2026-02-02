"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import Link from "next/link";

interface RankedSource {
  title: string;
  link: string;
  confidence: number;
  reason?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export default function MiniAppPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<RankedSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) {
      setError("Введите текст или ссылку на пост t.me/…");
      return;
    }

    setLoading(true);
    setError(null);
    setSources([]);

    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${base}/api/find-sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Ошибка при поиске");
        return;
      }

      setSources(data.sources ?? []);
      if ((data.sources ?? []).length === 0) {
        setError("Подходящих источников не найдено");
      }
    } catch {
      setError("Ошибка сети. Проверьте подключение.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <div className="tma-root">
        <header className="tma-header">
          <h1 className="tma-title">NewSluhy</h1>
          <p className="tma-subtitle">Поиск источников информации</p>
        </header>

        <form onSubmit={handleSubmit} className="tma-form">
          <textarea
            className="tma-input"
            placeholder="Вставьте текст или ссылку на пост t.me/…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <button type="submit" className="tma-btn" disabled={loading}>
            {loading ? "Поиск…" : "Найти источники"}
          </button>
        </form>

        {error && <div className="tma-error">{error}</div>}

        {sources.length > 0 && (
          <section className="tma-results">
            <h2 className="tma-results-title">Найденные источники</h2>
            <ul className="tma-list">
              {sources.map((s, i) => (
                <li key={i} className="tma-item">
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tma-link"
                  >
                    {s.title}
                  </a>
                  <div className="tma-meta">
                    <span className="tma-confidence">Уверенность: {s.confidence}%</span>
                    {s.reason && <span className="tma-reason">{s.reason}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {typeof window !== "undefined" && !window.Telegram?.WebApp && (
          <p className="tma-dev-link">
            <Link href="/">← На главную</Link>
          </p>
        )}

        <style jsx>{`
          .tma-root {
            min-height: 100vh;
            padding: 16px;
            padding-bottom: 24px;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--tg-theme-bg-color, #fff);
            color: var(--tg-theme-text-color, #000);
          }

          .tma-header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--tg-theme-hint-color, #999);
          }

          .tma-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
          }

          .tma-subtitle {
            margin: 4px 0 0;
            font-size: 0.9rem;
            color: var(--tg-theme-hint-color, #666);
          }

          .tma-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
          }

          .tma-input {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--tg-theme-hint-color, #ccc);
            border-radius: 12px;
            font-size: 1rem;
            font-family: inherit;
            resize: vertical;
            box-sizing: border-box;
            background: var(--tg-theme-secondary-bg-color, #f5f5f5);
            color: var(--tg-theme-text-color, #000);
          }

          .tma-input:focus {
            outline: none;
            border-color: var(--tg-theme-button-color, #2481cc);
          }

          .tma-btn {
            padding: 14px 20px;
            background: var(--tg-theme-button-color, #2481cc);
            color: var(--tg-theme-button-text-color, #fff);
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
          }

          .tma-btn:hover:not(:disabled) {
            opacity: 0.9;
          }

          .tma-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .tma-error {
            padding: 12px;
            background: rgba(255, 59, 48, 0.15);
            border-radius: 10px;
            color: #c00;
            font-size: 0.95rem;
            margin-bottom: 16px;
          }

          .tma-results {
            margin-top: 24px;
          }

          .tma-results-title {
            margin: 0 0 12px;
            font-size: 1.1rem;
            font-weight: 600;
          }

          .tma-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .tma-item {
            padding: 14px;
            margin-bottom: 10px;
            background: var(--tg-theme-secondary-bg-color, #f5f5f5);
            border-radius: 12px;
          }

          .tma-link {
            display: block;
            font-weight: 600;
            color: var(--tg-theme-link-color, #2481cc);
            text-decoration: none;
            margin-bottom: 6px;
          }

          .tma-link:hover {
            text-decoration: underline;
          }

          .tma-meta {
            font-size: 0.85rem;
            color: var(--tg-theme-hint-color, #666);
          }

          .tma-confidence {
            display: inline-block;
            margin-right: 8px;
          }

          .tma-reason {
            display: block;
            margin-top: 4px;
          }

          .tma-dev-link {
            margin-top: 24px;
            font-size: 0.9rem;
          }

          .tma-dev-link a {
            color: var(--tg-theme-link-color, #2481cc);
          }
        `}</style>
      </div>
    </>
  );
}
