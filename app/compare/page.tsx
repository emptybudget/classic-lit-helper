import type { Metadata } from "next";
import Link from "next/link";
import type { LiteratureResult } from "@/types/literature";
import { getCachedResult } from "@/lib/cache";

export const metadata: Metadata = {
  title: "두 작품 비교 · 고전문학 도우미",
  description: "이미 검색해 둔 두 작품을 나란히 비교해 살펴봅니다.",
};

interface Props {
  searchParams: { a?: string; b?: string };
}

function summarize(field: string | null | undefined): string {
  return field && field.trim() ? field : "—";
}

function joinNames<T>(arr: T[] | undefined, pick: (x: T) => string, max: number): string {
  if (!arr || arr.length === 0) return "—";
  return arr.slice(0, max).map(pick).join(" · ");
}

function ComparisonColumn({
  title,
  data,
}: {
  title: string | undefined;
  data: LiteratureResult | null;
}) {
  if (!title) {
    return (
      <section className="page-card p-6">
        <p className="text-ink-700 text-sm">작품 제목을 입력해 주세요.</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="page-card p-6">
        <h2 className="font-display text-xl text-ink-900 mb-2">{title}</h2>
        <p className="text-sm text-ink-700 mb-4">
          캐시에 결과가 없어요. 먼저 홈에서 검색하면 24시간 동안 이 자리에 표시됩니다.
        </p>
        <Link
          href={`/?q=${encodeURIComponent(title)}`}
          className="inline-block px-4 py-2 rounded-md bg-accent-dark text-paper-50 text-sm hover:bg-ink-800 transition"
        >
          "{title}" 검색하기
        </Link>
      </section>
    );
  }

  return (
    <section className="page-card p-6 sm:p-7">
      <header className="flex gap-3 items-start mb-5">
        {data.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.cover_url}
            alt=""
            loading="lazy"
            className="shrink-0 w-16 rounded shadow-sm border border-paper-200 bg-paper-100"
          />
        )}
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-ink-900 leading-tight break-keep">
            {data.title}
          </h2>
          {data.author && (
            <p className="text-ink-700 mt-1 text-sm">{data.author}</p>
          )}
        </div>
      </header>

      <dl className="space-y-3 text-sm">
        <Row label="시대" value={summarize(data.background?.era)} />
        <Row label="갈래" value={summarize(data.background?.genre)} />
        <Row
          label="주요 인물"
          value={joinNames(data.characters, (c) => c.name, 4)}
        />
        <Row
          label="상징"
          value={joinNames(data.symbols, (s) => s.symbol, 4)}
        />
      </dl>

      {data.quotes && data.quotes.length > 0 && (
        <div className="mt-5 pt-4 border-t border-paper-200">
          <h3 className="text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
            대표 인용
          </h3>
          <blockquote className="text-ink-900 italic text-sm leading-relaxed">
            “{data.quotes[0].text}”
          </blockquote>
        </div>
      )}

      {data.reading_tips && (
        <div className="mt-5 pt-4 border-t border-paper-200">
          <h3 className="text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
            읽기 길잡이
          </h3>
          <p className="text-ink-900 text-sm leading-relaxed">{data.reading_tips}</p>
        </div>
      )}

      <div className="mt-5">
        <Link
          href={`/work/${encodeURIComponent(data.title)}`}
          className="text-sm text-accent-dark underline hover:text-ink-900"
        >
          전체 결과 보기 →
        </Link>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="shrink-0 w-16 text-ink-700 font-semibold">{label}</dt>
      <dd className="text-ink-900 break-keep">{value}</dd>
    </div>
  );
}

export default async function ComparePage({ searchParams }: Props) {
  const a = searchParams.a?.trim() || undefined;
  const b = searchParams.b?.trim() || undefined;

  const [dataA, dataB] = await Promise.all([
    a ? getCachedResult(a).catch(() => null) : Promise.resolve(null),
    b ? getCachedResult(b).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-accent-dark hover:text-ink-900 underline"
        >
          ← 홈으로
        </Link>
        <p className="font-display italic text-accent-dark text-xs tracking-widest uppercase">
          Compare
        </p>
      </div>

      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl sm:text-4xl text-ink-900">두 작품 비교</h1>
        <p className="mt-2 text-ink-700 text-sm">
          이미 검색해 본 두 작품을 입력하면 캐시에서 불러와 나란히 보여 드려요.
        </p>
      </header>

      <form
        method="get"
        action="/compare"
        className="page-card p-5 sm:p-6 mb-8 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
      >
        <label className="block text-sm">
          <span className="text-ink-700 mb-1 block">작품 A</span>
          <input
            name="a"
            defaultValue={a ?? ""}
            placeholder="예: 햄릿"
            maxLength={120}
            className="w-full px-3 py-2 rounded-md bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-700 mb-1 block">작품 B</span>
          <input
            name="b"
            defaultValue={b ?? ""}
            placeholder="예: 오셀로"
            maxLength={120}
            className="w-full px-3 py-2 rounded-md bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="px-5 py-2 rounded-md bg-accent-dark text-paper-50 text-sm hover:bg-ink-800 transition"
        >
          비교
        </button>
      </form>

      <div className="grid md:grid-cols-2 gap-5">
        <ComparisonColumn title={a} data={dataA} />
        <ComparisonColumn title={b} data={dataB} />
      </div>
    </main>
  );
}
