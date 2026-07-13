type Tone = "active" | "open" | "received" | "closed" | "neutral";

const tones: Record<Tone, string> = {
  active: "bg-sage/15 text-ink",
  open: "bg-marigold/20 text-marigold-deep",
  received: "bg-ink text-paper",
  closed: "bg-line text-subtle",
  neutral: "bg-ink/5 text-ink",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
