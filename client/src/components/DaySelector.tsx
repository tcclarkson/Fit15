export const DAY_LABELS = ["Today", "Yesterday", "2 days ago"] as const;

interface Props {
  value: number;
  onChange: (offset: number) => void;
}

// Lets the user pick today / yesterday / 2 days ago when logging a missed day.
export default function DaySelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {DAY_LABELS.map((label, offset) => (
        <button
          key={offset}
          onClick={() => onChange(offset)}
          className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition ${
            value === offset
              ? "border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
              : "border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
