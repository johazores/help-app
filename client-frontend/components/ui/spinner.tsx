export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Full-area loading state that screen readers announce. */
export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex justify-center py-20 text-ink">
      <Spinner className="h-7 w-7" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
