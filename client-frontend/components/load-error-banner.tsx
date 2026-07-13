import { Button } from "@/components/ui/button";

/** Inline retry banner for transient load failures (server down, rates unavailable, etc.). */
export function LoadErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/40 bg-danger/10 px-5 py-4 text-[15px] text-ink"
    >
      <p className="font-semibold">Couldn&rsquo;t load this page</p>
      <p className="mt-1 text-body">{message}</p>
      {onRetry ? (
        <Button size="md" variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
