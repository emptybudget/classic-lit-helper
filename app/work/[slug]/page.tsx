import type { Metadata } from "next";
import Link from "next/link";
import ResultTabs from "@/components/ResultTabs";
import { getCachedResult } from "@/lib/cache";

interface Props {
  params: { slug: string };
}

function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = decodeSlug(params.slug);
  return {
    title: `${title} · 고전문학 도우미`,
    description: `${title}의 시대 배경, 작가, 등장인물, 상징, 평론을 한 페이지에 정리해 드려요.`,
  };
}

export default async function WorkPage({ params }: Props) {
  const title = decodeSlug(params.slug);
  const data = await getCachedResult(title).catch(() => null);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-accent-dark hover:text-ink-900 underline"
        >
          ← 홈으로
        </Link>
        <p className="font-display italic text-accent-dark text-xs tracking-widest uppercase">
          Classic Literature Helper
        </p>
      </div>

      {data ? (
        <ResultTabs data={data} />
      ) : (
        <section className="page-card p-6 sm:p-8">
          <h2 className="font-semibold text-ink-900 mb-2">
            "{title}" 결과가 캐시에 없어요
          </h2>
          <p className="text-ink-700 leading-relaxed mb-5">
            검색 결과는 24시간 동안 캐시되며, 그 사이 같은 링크로 다시 볼 수 있어요. 홈에서 한 번 검색하면 이 페이지가 즉시 표시됩니다.
          </p>
          <Link
            href={`/?q=${encodeURIComponent(title)}`}
            className="inline-block px-5 py-2 rounded-md bg-accent-dark text-paper-50 text-sm hover:bg-ink-800 transition"
          >
            홈에서 "{title}" 검색하기
          </Link>
        </section>
      )}

      <footer className="mt-16 text-center text-xs text-ink-700/70">
        Wikipedia · The Guardian · Gemini 2.5 Flash
      </footer>
    </main>
  );
}
