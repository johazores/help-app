"use client";

export interface Choice<T extends string | number> {
  value: T;
  label: string;
  note?: string;
}

/**
 * A single-choice group of large buttons. Selection is exposed with
 * aria-pressed, not only with color.
 */
export function ChoiceGrid<T extends string | number>({
  choices,
  value,
  onChange,
  label,
  compact = false,
  columns = 2,
}: {
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  compact?: boolean;
  columns?: 2 | 3;
}) {
  return (
    <div role="group" aria-label={label} className={`grid gap-3 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <button
            key={String(choice.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(choice.value)}
            className={`min-h-12 rounded-xl border text-left ${compact ? "p-3" : "p-4"} ${
              selected ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"
            }`}
          >
            <span className={`block font-semibold ${compact ? "text-[15px]" : "text-[17px]"}`}>
              {choice.label}
            </span>
            {choice.note ? (
              <span className={`mt-0.5 block text-[13px] ${selected ? "text-paper/80" : "text-subtle"}`}>
                {choice.note}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
