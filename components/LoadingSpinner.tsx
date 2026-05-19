"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { at: 0, label: "자료를 찾는 중..." },
  { at: 2500, label: "위키백과 한국어·영어판을 살펴보는 중..." },
  { at: 6500, label: "The Guardian 평론을 모으는 중..." },
  { at: 10500, label: "한국어로 정리하는 중..." },
];

export default function LoadingSpinner() {
  const [label, setLabel] = useState(STAGES[0].label);

  useEffect(() => {
    const timers = STAGES.slice(1).map((s) =>
      setTimeout(() => setLabel(s.label), s.at),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-paper-300" />
        <div className="absolute inset-0 rounded-full border-2 border-t-accent-dark border-transparent animate-spin" />
      </div>
      <p
        key={label}
        className="text-ink-700 text-sm sm:text-base text-center animate-[fade_300ms_ease-out]"
      >
        {label}
      </p>
      <p className="text-xs text-ink-700/60">보통 10~15초 정도 걸려요</p>
    </div>
  );
}
