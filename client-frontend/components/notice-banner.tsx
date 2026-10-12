import type { Notice } from "@/lib/use-notice";

/** Page-level status line. Errors interrupt screen readers; successes wait politely. */
export function NoticeBanner({ notice, className = "" }: { notice: Notice | null; className?: string }) {
  return (
    <div aria-live={notice?.bad ? "assertive" : "polite"} className={className}>
      {notice ? (
        <p
          role={notice.bad ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-[15px] font-medium ${
            notice.bad ? "bg-danger/10 text-danger" : "bg-sage/15 text-ink"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
