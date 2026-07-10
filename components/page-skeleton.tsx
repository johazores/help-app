/** Lightweight loading placeholders — perceived speed without blocking on spinners. */
export function HomePageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-24 rounded bg-line/70" />
      <div className="mt-2 h-9 w-40 rounded bg-line/70" />
      <div className="mt-6 h-36 rounded-2xl bg-line/50" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="h-44 rounded-2xl bg-line/40" />
        <div className="h-44 rounded-2xl bg-line/40" />
      </div>
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card animate-pulse space-y-4 p-6">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 rounded bg-line/60" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}
