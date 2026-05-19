"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onUnlocked: (remaining: number, admin: boolean) => void;
}

export default function UnlockModal({ open, onClose, onUnlocked }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError(null);
    setShowHint(false);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || password.trim().length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        remaining?: number;
        admin?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "비밀번호가 달라요.");
        return;
      }
      onUnlocked(data.remaining ?? 5, data.admin === true);
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="page-card max-w-md w-full p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl text-ink-900 mb-2">5회 추가 잠금 해제</h2>
        <p className="text-ink-700 text-sm mb-4">
          비밀번호를 입력하면 검색 횟수를 5회로 충전해 드려요.
        </p>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          maxLength={100}
          autoComplete="off"
          className="w-full px-4 py-3 rounded-md bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowHint((s) => !s)}
            className="text-sm text-ink-700 underline"
          >
            {showHint ? "힌트 숨기기" : "힌트 보기"}
          </button>
          {showHint && (
            <p className="mt-2 text-sm text-ink-900 italic">
              민재에게 기프티콘을 보내세요
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-ink-700 hover:text-ink-900"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || password.trim().length === 0}
            className="px-5 py-2 rounded-md bg-accent-dark text-paper-50 hover:bg-ink-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "확인 중..." : "확인"}
          </button>
        </div>
      </form>
    </div>
  );
}
