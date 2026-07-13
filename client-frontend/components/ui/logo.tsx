export function Logo({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "paper" }) {
  const color = tone === "paper" ? "#F6F3EC" : "#0C3B3A";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M16 3c5 3 9 4.2 11 4.5V17c0 6.2-4.6 9.8-11 12-6.4-2.2-11-5.8-11-12V7.5C7 7.2 11 6 16 3Z"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M11 16.4 14.6 20 21 12.5" stroke="#EBA13B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-[22px] font-bold" style={{ color }}>
        Sagip
      </span>
    </span>
  );
}
