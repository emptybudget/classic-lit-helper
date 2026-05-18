"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import ResultTabs from "@/components/ResultTabs";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { LiteratureResult, SearchState } from "@/types/literature";

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
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const [lastQuery, setLastQuery] = useState<string | null>(null);

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
        | { data: LiteratureResult }
        | { error: string; rate_limited?: boolean; resetIn?: number };

      if (!res.ok) {
        if (res.status === 429 || ("rate_limited" in payload && payload.rate_limited)) {
          setState({
            kind: "rate_limited",
            message: "error" in payload ? payload.error : "오늘 검색 횟수를 모두 사용했어요.",
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

  const disabled = state.kind === "loading";

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
      <header className="mb-10 sm:mb-14 text-center">
        <p className="font-display italic text-accent-dark text-sm tracking-widest uppercase">
          Classic Literature Helper
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-ink-900">
          고전문학 도우미
        </h1>
        <p className="mt-3 text-ink-700 leading-relaxed">
          위키백과에서 발췌한 자료를 바탕으로 작품의 시대·작가·상징·평론을 한 페이지에 정리해 드려요.
        </p>
      </header>

      <section className="page-card p-6 sm:p-8 mb-10">
        <SearchForm
          onSubmit={handleSearch}
          disabled={disabled}
          showExamples={state.kind === "idle"}
        />
      </section>

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
              초기화: {formatResetIn(state.resetIn)}
            </p>
          )}
        </section>
      )}

      {state.kind === "success" && <ResultTabs data={state.data} />}

      <footer className="mt-16 text-center text-xs text-ink-700/70">
        Wikipedia · Gemini 2.5 Flash · 하루 5회 한도
      </footer>
    </main>
  );
}
