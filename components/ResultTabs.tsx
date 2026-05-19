"use client";

import { useState } from "react";
import type { LiteratureResult } from "@/types/literature";

const TABS = [
  { id: "background", label: "사전지식" },
  { id: "author", label: "작가 정보" },
  { id: "characters", label: "등장인물" },
  { id: "symbols", label: "상징 & 주제" },
  { id: "criticism", label: "평론" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function SourceList({ sources }: { sources: string[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-5 pt-4 border-t border-paper-200">
      <h4 className="text-sm font-semibold text-ink-700 mb-2">출처</h4>
      <ul className="space-y-1 text-sm">
        {sources.map((s, i) => {
          const isUrl = /^https?:\/\//i.test(s);
          return (
            <li key={i} className="text-ink-700 break-all">
              {isUrl ? (
                <a
                  href={s}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-paper-300 hover:decoration-accent-dark hover:text-ink-900"
                >
                  {s}
                </a>
              ) : (
                s
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-ink-700 mb-1">{label}</h4>
      <p className="text-ink-900 leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
}

export default function ResultTabs({ data }: { data: LiteratureResult }) {
  const [tab, setTab] = useState<TabId>("background");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/work/${encodeURIComponent(data.title)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("링크를 복사하세요:", url);
    }
  }

  return (
    <article className="page-card p-6 sm:p-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl text-ink-900">{data.title}</h2>
          {data.author && <p className="mt-2 text-ink-700 text-lg">{data.author}</p>}
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="shrink-0 px-3 py-1.5 text-xs sm:text-sm rounded-full bg-paper-100 border border-paper-200 text-ink-700 hover:bg-paper-200 hover:text-ink-900 transition"
          aria-label="공유 링크 복사"
        >
          {copied ? "복사됨" : "공유 링크 복사"}
        </button>
      </header>

      <nav className="flex flex-wrap gap-1 sm:gap-3 border-b border-paper-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-button ${tab === t.id ? "tab-button-active" : "tab-button-inactive"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="text-base sm:text-[17px]">
        {tab === "background" && (
          <section>
            <Field label="시대" value={data.background.era} />
            <Field label="갈래" value={data.background.genre} />
            {data.background.context && data.background.context.length > 0 && (
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-ink-700 mb-2">시대 배경</h4>
                <ul className="list-disc pl-5 space-y-1 text-ink-900">
                  {data.background.context.map((c, i) => (
                    <li key={i} className="leading-relaxed">{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <SourceList sources={data.background.sources} />
          </section>
        )}

        {tab === "author" && (
          <section>
            <Field label="생애" value={data.author_info.life} />
            <Field label="집필 동기" value={data.author_info.motivation} />
            <Field label="문학사적 위치" value={data.author_info.literary_position} />
            <SourceList sources={data.author_info.sources} />
          </section>
        )}

        {tab === "characters" && (
          <section>
            {data.characters && data.characters.length > 0 ? (
              <ul className="space-y-4">
                {data.characters.map((c, i) => (
                  <li key={i} className="border-l-2 border-paper-300 pl-4">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <h4 className="font-semibold text-ink-900 text-lg">{c.name}</h4>
                      {c.role && <span className="text-sm text-ink-700">{c.role}</span>}
                    </div>
                    {c.description && (
                      <p className="mt-1 text-ink-900 leading-relaxed">{c.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-700">발췌에서 추출할 등장인물 정보가 부족했어요.</p>
            )}
          </section>
        )}

        {tab === "symbols" && (
          <section>
            {data.symbols && data.symbols.length > 0 ? (
              <ul className="space-y-5">
                {data.symbols.map((s, i) => (
                  <li key={i} className="border-l-2 border-paper-300 pl-4">
                    <h4 className="font-semibold text-ink-900 text-lg">{s.symbol}</h4>
                    <p className="text-ink-700 mt-1 leading-relaxed">{s.meaning}</p>
                    {s.example && (
                      <p className="mt-2 text-ink-900/80 italic leading-relaxed">
                        “{s.example}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-700">발췌에서 추출할 상징 정보가 부족했어요.</p>
            )}
          </section>
        )}

        {tab === "criticism" && (
          <section>
            {data.criticism && data.criticism.length > 0 ? (
              <ul className="space-y-6">
                {data.criticism.map((c, i) => (
                  <li key={i}>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <h4 className="font-semibold text-ink-900">{c.critic}</h4>
                      <span className="text-sm text-ink-700">{c.perspective}</span>
                    </div>
                    {c.quote && (
                      <blockquote className="mt-2 pl-4 border-l-2 border-accent/60 text-ink-900 italic leading-relaxed">
                        “{c.quote}”
                      </blockquote>
                    )}
                    {c.source && (
                      <p className="mt-2 text-sm text-ink-700">출처: {c.source}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-700">발췌 내에 평론 자료가 충분하지 않았어요.</p>
            )}
          </section>
        )}
      </div>

      {data.quotes && data.quotes.length > 0 && (
        <aside className="mt-8 p-5 sm:p-6 rounded-md bg-paper-50 border border-paper-300">
          <h3 className="font-display text-lg text-ink-900 mb-3">핵심 인용</h3>
          <ul className="space-y-4">
            {data.quotes.map((q, i) => (
              <li key={i}>
                <blockquote className="text-ink-900 italic leading-relaxed">
                  “{q.text}”
                </blockquote>
                {q.context && (
                  <p className="mt-1 text-sm text-ink-700">— {q.context}</p>
                )}
              </li>
            ))}
          </ul>
        </aside>
      )}

      {data.reading_tips && (
        <aside className="mt-6 p-5 sm:p-6 rounded-md bg-paper-100 border border-paper-200">
          <h3 className="font-display text-lg text-ink-900 mb-2">읽기 길잡이</h3>
          <p className="text-ink-900 leading-relaxed">{data.reading_tips}</p>
        </aside>
      )}
    </article>
  );
}
