"use client";

import { useState, type FormEvent } from "react";

const EXAMPLES = ["햄릿", "변신", "구운몽", "죄와 벌"];

interface Props {
  onSubmit: (title: string) => void;
  disabled?: boolean;
  showExamples?: boolean;
  initialValue?: string;
}

export default function SearchForm({
  onSubmit,
  disabled,
  showExamples = true,
  initialValue = "",
}: Props) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  function handleChip(title: string) {
    if (disabled) return;
    setValue(title);
    onSubmit(title);
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="작품 제목을 입력하세요 (예: 햄릿)"
          maxLength={120}
          disabled={disabled}
          className="flex-1 px-4 py-3 rounded-md bg-paper-50 border border-paper-300 text-ink-900 placeholder:text-ink-700/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="px-6 py-3 rounded-md bg-accent-dark text-paper-50 font-medium hover:bg-ink-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          살펴보기
        </button>
      </form>
      {showExamples && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-700/80 mr-1">예시:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleChip(ex)}
              disabled={disabled}
              className="chip text-sm disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
