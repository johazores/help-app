"use client";

/**
 * The lifeline ring is Sagip's signature element. The marigold arc fills as the
 * check-in window elapses; when it completes, the net opens to the family. It
 * turns an abstract time predicate into something a person can feel at a glance.
 */
export function LifelineRing({
  progress,
  centerLabel,
  centerSub,
  size = 220,
  open = false,
}: {
  progress: number; // 0..1 of the window elapsed
  centerLabel: string;
  centerSub?: string;
  size?: number;
  open?: boolean;
}) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const dash = c * clamped;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7E1D5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={open ? "#EBA13B" : "#0C3B3A"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <span className="font-display text-[26px] font-bold leading-tight text-ink">{centerLabel}</span>
        {centerSub ? <span className="mt-1 text-[14px] text-subtle">{centerSub}</span> : null}
      </div>
    </div>
  );
}
