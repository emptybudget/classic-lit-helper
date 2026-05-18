export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-paper-300" />
        <div className="absolute inset-0 rounded-full border-2 border-t-accent-dark border-transparent animate-spin" />
      </div>
      <p className="text-ink-700 text-sm sm:text-base">
        {message ?? "고전 문헌을 탐색하는 중... (10~15초 소요)"}
      </p>
    </div>
  );
}
