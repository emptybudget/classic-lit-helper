"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SearchForm from "@/components/SearchForm";
import ResultTabs from "@/components/ResultTabs";
import LoadingSpinner from "@/components/LoadingSpinner";
import HelpModal from "@/components/HelpModal";
import UnlockModal from "@/components/UnlockModal";
import {
  clearHistory,
  getHistory,
  pushHistory,
  type HistoryItem,
} from "@/lib/history";
import type {
  DisambiguationOption,
  LiteratureResult,
  SearchState,
} from "@/types/literature";

interface Quota {
  remaining: number;
  limit: number;
  admin?: boolean;
}

const HELP_HIDE_KEY = "clh:help:hideDate";

function formatResetIn(ms: number): string {
  if (!ms || ms <= 0) return "곧";
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) return `약 ${totalMin}분 뒤`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `약 ${hours}시간 뒤`;
  return `약 ${hours}시간 ${mins}분 뒤`;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const today = new Date().toDateString();
      const hidden = localStorage.getItem(HELP_HIDE_KEY);
      if (hidden !== today) setShowHelp(true);
    } catch {}
    setHistory(getHistory());
    void fetchQuota();
  }, []);

  async function fetchQuota() {
    try {
      const res = await fetch("/api/quota");
      if (!res.ok) return;
      const data = (await res.json()) as { remaining: number; limit: number; admin?: boolean };
      setQuota({ remaining: data.remaining, limit: data.limit, admin: data.admin });
    } catch {}
  }

  function hideHelpToday() {
    try {
      localStorage.setItem(HELP_HIDE_KEY, new Date().toDateString());
    } catch {}
    setShowHelp(false);
  }

  async function handleSearch(title: string) {
    setLastQuery(title);
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await res.json()) as
        | { data: LiteratureResult; quota?: Quota; cached?: boolean }
        | { disambiguation: DisambiguationOption[] }
        | { error: string; rate_limited?: boolean; quota_error?: boolean; resetIn?: number };

      if (!res.ok) {
        if ("quota_error" in payload && payload.quota_error) {
          setState({
            kind: "quota_exceeded",
            message:
              "error" in payload ? payload.error : "AI 서비스 한도에 도달했어요.",
          });
          return;
        }
        if (res.status === 429 || ("rate_limited" in payload && payload.rate_limited)) {
          setQuota((q) => (q ? { ...q, remaining: 0 } : { remaining: 0, limit: 5 }));
          setState({
            kind: "rate_limited",
            message:
              "error" in payload ? payload.error : "오늘 검색 횟수를 모두 사용했어요.",
            resetIn: "resetIn" in payload ? payload.resetIn : undefined,
          });
          return;
        }
        setState({
          kind: "error",
          message: "error" in payload ? payload.error : "검색에 실패했어요.",
        });
        return;
      }

      if ("data" in payload) {
        setState({ kind: "success", data: payload.data });
        setHistory(pushHistory(payload.data.title || title));
        if (payload.quota) setQuota(payload.quota);
        else void fetchQuota();
      } else if ("disambiguation" in payload) {
        setState({
          kind: "disambiguation",
          query: title,
          candidates: payload.disambiguation,
        });
      } else {
        setState({ kind: "error", message: "응답 형식이 올바르지 않아요." });
      }
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "네트워크 오류가 발생했어요.",
      });
    }
  }

  function handleUnlocked(remaining: number, admin: boolean) {
    setQuota({ remaining, limit: admin ? -1 : 5, admin });
    setShowUnlock(false);
    if (state.kind === "rate_limited") setState({ kind: "idle" });
  }

  const disabled = state.kind === "loading";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <div className="flex items-center justify-end gap-2 mb-6">
        {quota && (
          quota.admin ? (
            <span
              className="px-3 py-1 text-xs sm:text-sm rounded-full bg-ink-900 text-paper-50 border border-ink-800"
              aria-label="관리자 모드: 무제한 검색"
            >
              관리자 · <span className="font-semibold">무제한</span>
            </span>
          ) : (
            <span
              className="px-3 py-1 text-xs sm:text-sm rounded-full bg-paper-100 border border-paper-200 text-ink-700"
              aria-label={`남은 검색 횟수 ${quota.remaining}회 / 총 ${quota.limit}회`}
            >
              남은 검색{" "}
              <span className="text-ink-900 font-semibold">{quota.remaining}</span>
              <span className="text-ink-700/60">/{quota.limit}</span>
            </span>
          )
        )}
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          aria-label="사용 안내 열기"
          className="w-8 h-8 rounded-full bg-paper-100 border border-paper-200 text-ink-700 hover:bg-paper-200 hover:text-ink-900 transition flex items-center justify-center font-semibold"
        >
          ?
        </button>
      </div>

      <header className="mb-10 sm:mb-14 text-center">
        <p className="font-display italic text-accent-dark text-sm tracking-widest uppercase">
          Classic Literature Helper
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-ink-900">
          고전문학 도우미
        </h1>
        <p className="mt-3 text-ink-700 leading-relaxed">
          위키백과와 The Guardian 발췌를 토대로 작품의 시대·작가·상징·평론을 한 페이지에 정리해 드려요.
        </p>
      </header>

      <section className="page-card p-6 sm:p-8 mb-10">
        <SearchForm
          onSubmit={handleSearch}
          disabled={disabled}
          showExamples={state.kind === "idle"}
          initialValue={initialQuery}
        />
      </section>

      {state.kind === "idle" && history.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm text-ink-700 font-semibold uppercase tracking-wider">
              최근 본 작품
            </h2>
            <button
              type="button"
              onClick={() => setHistory(clearHistory())}
              className="text-xs text-ink-700/70 hover:text-ink-900 underline"
            >
              전체 지우기
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <Link
                key={h.title}
                href={`/work/${encodeURIComponent(h.title)}`}
                className="chip text-sm"
              >
                {h.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {state.kind === "loading" && (
        <section className="page-card">
          <LoadingSpinner />
        </section>
      )}

      {state.kind === "error" && (
        <section className="page-card p-6 sm:p-8 border-accent/40">
          <h2 className="font-semibold text-ink-900 mb-1">문제가 생겼어요</h2>
          <p className="text-ink-700">{state.message}</p>
          <div className="mt-4 flex gap-3">
            {lastQuery && (
              <button
                onClick={() => handleSearch(lastQuery)}
                className="px-4 py-2 rounded-md bg-accent-dark text-paper-50 text-sm hover:bg-ink-800 transition"
              >
                다시 시도
              </button>
            )}
            <button
              onClick={() => setState({ kind: "idle" })}
              className="text-sm underline text-accent-dark"
            >
              처음으로
            </button>
          </div>
        </section>
      )}

      {state.kind === "rate_limited" && (
        <section className="page-card p-6 sm:p-8">
          <h2 className="font-semibold text-ink-900 mb-1">오늘 검색 횟수를 모두 사용했어요</h2>
          <p className="text-ink-700">{state.message}</p>
          {state.resetIn !== undefined && (
            <p className="mt-2 text-sm text-ink-700/80">
              자동 초기화: {formatResetIn(state.resetIn)}
            </p>
          )}
          <div className="mt-5">
            <button
              onClick={() => setShowUnlock(true)}
              className="px-5 py-2 rounded-md bg-accent-dark text-paper-50 text-sm hover:bg-ink-800 transition"
            >
              비밀번호로 5회 더 받기
            </button>
          </div>
        </section>
      )}

      {state.kind === "quota_exceeded" && (
        <section className="page-card p-6 sm:p-8">
          <h2 className="font-semibold text-ink-900 mb-1">AI 서비스 한도에 도달했어요</h2>
          <p className="text-ink-700 leading-relaxed">{state.message}</p>
          <button
            onClick={() => setState({ kind: "idle" })}
            className="mt-4 text-sm underline text-accent-dark"
          >
            처음으로
          </button>
        </section>
      )}

      {state.kind === "disambiguation" && (
        <section className="page-card p-6 sm:p-8">
          <h2 className="font-semibold text-ink-900 mb-1">
            "{state.query}"에 해당하는 작품이 여러 개 있어요
          </h2>
          <p className="text-ink-700 text-sm mb-5">정확한 작품을 골라 주세요.</p>
          <ul className="space-y-2">
            {state.candidates.map((c, i) => (
              <li key={`${c.lang}-${c.title}-${i}`}>
                <button
                  type="button"
                  onClick={() => handleSearch(c.title)}
                  className="w-full text-left p-3 rounded-md bg-paper-50 border border-paper-200 hover:bg-paper-100 hover:border-paper-300 transition"
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-ink-900">{c.title}</span>
                    <span className="text-xs text-ink-700/70 uppercase">{c.lang}</span>
                  </div>
                  {c.description && (
                    <p className="text-sm text-ink-700 mt-1 leading-relaxed">{c.description}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setState({ kind: "idle" })}
            className="mt-5 text-sm underline text-accent-dark"
          >
            처음으로
          </button>
        </section>
      )}

      {state.kind === "success" && <ResultTabs data={state.data} />}

      <footer className="mt-16 text-center text-xs text-ink-700/70">
        Wikipedia · The Guardian · Gemini 2.5 Flash
      </footer>

      <HelpModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        onHideToday={hideHelpToday}
      />
      <UnlockModal
        open={showUnlock}
        onClose={() => setShowUnlock(false)}
        onUnlocked={handleUnlocked}
      />
    </main>
  );
}
