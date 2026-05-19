"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onHideToday: () => void;
}

export default function HelpModal({ open, onClose, onHideToday }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="page-card max-w-md w-full p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl text-ink-900 mb-3">사용 안내</h2>
        <div className="text-ink-900 space-y-3 leading-relaxed text-[15px]">
          <p>
            관심 있는 고전·세계 문학 작품의 제목을 검색하면, 위키백과와 The Guardian 발췌를 토대로 한 페이지 분량의 한국어 해설을 만들어 드려요.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-700">
            <li>제목은 한국어 또는 영어로 입력 가능 (한글이면 자동으로 영문 위키도 함께 조회)</li>
            <li>4개 탭: 사전지식 · 작가 · 상징 &amp; 주제 · 평론</li>
            <li>하루 검색 한도는 5회 (IP 기준, 자정 초기화)</li>
            <li>한도 초과 시 비밀번호로 5회 더 받을 수 있어요</li>
          </ul>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onHideToday}
            className="px-4 py-2 text-sm text-ink-700 hover:text-ink-900 underline"
          >
            오늘 하루 그만보기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md bg-accent-dark text-paper-50 hover:bg-ink-800 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
