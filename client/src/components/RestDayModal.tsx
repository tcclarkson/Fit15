import { useState } from "react";
import { api } from "../api";
import { todayLocal, yesterdayLocal } from "../date";
import type { StreakInfo } from "../types";

interface Props {
  onClose: () => void;
  onRested: (result: { streak: StreakInfo; totalFit15Days: number }) => void;
  defaultDay?: "today" | "yesterday";
}

const SELF_CARE_TIPS = [
  "Take 5 slow, deep breaths — in for 4, out for 6.",
  "Drink a big glass of water.",
  "Do a gentle 2-minute stretch, wherever you are.",
  "Step outside for a minute of fresh air.",
  "Roll your shoulders and unclench your jaw.",
  "Give yourself permission to rest — and an earlier night.",
];

export default function RestDayModal({ onClose, onRested, defaultDay = "today" }: Props) {
  const [day, setDay] = useState<"today" | "yesterday">(defaultDay);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show a couple of gentle suggestions, stable per open.
  const [tips] = useState(() => {
    const shuffled = [...SELF_CARE_TIPS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  });

  async function takeRestDay() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<{ streak: StreakInfo; totalFit15Days: number }>("/logs/rest", {
        logDate: day === "today" ? todayLocal() : yesterdayLocal(),
      });
      onRested(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-neutral-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">Take a rest day 🌙</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Life happens, and rest is part of taking care of yourself too. Your streak is safe — no shame here. 💛
        </p>

        <div className="mt-4 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">If you can, one small thing</p>
          <ul className="mt-2 space-y-1.5">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <span className="text-orange-400">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex gap-2">
          {(["today", "yesterday"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold capitalize transition ${
                day === d
                  ? "border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                  : "border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={takeRestDay}
          disabled={submitting}
          className="mt-4 w-full rounded-xl bg-orange-500 py-3.5 text-base font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {submitting ? "Saving…" : `Log rest day for ${day}`}
        </button>
      </div>
    </div>
  );
}
