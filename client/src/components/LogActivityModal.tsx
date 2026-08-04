import { useState } from "react";
import { useActivities } from "../hooks/useActivities";
import { api } from "../api";
import { localDateOffset } from "../date";
import DaySelector, { DAY_LABELS } from "./DaySelector";
import type { ActivityLog, StreakInfo } from "../types";

interface Props {
  onClose: () => void;
  onLogged: (result: { log: ActivityLog; streak: StreakInfo }) => void;
  defaultOffset?: number;
}

export default function LogActivityModal({ onClose, onLogged, defaultOffset = 0 }: Props) {
  const activities = useActivities();
  const [dayOffset, setDayOffset] = useState(defaultOffset);
  const [activityType, setActivityType] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(15);
  const [showExtras, setShowExtras] = useState(false);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!activityType) {
      setError("Pick an activity first");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("activityType", activityType);
      form.set("minutes", String(minutes));
      form.set("logDate", localDateOffset(dayOffset));
      form.set("isBackfill", dayOffset > 0 ? "true" : "false");
      if (note.trim()) form.set("note", note.trim());
      if (photo) form.set("photo", photo);

      const result = await api.postForm<{ log: ActivityLog; streak: StreakInfo }>("/logs", form);
      onLogged(result);
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">
            Log {DAY_LABELS[dayOffset]} 🔥
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-5">
          <DaySelector value={dayOffset} onChange={setDayOffset} />
        </div>
        {dayOffset > 0 && (
          <p className="mb-4 -mt-3 text-center text-xs text-neutral-400">
            Forgot to log? Add it to keep your streak.
          </p>
        )}

        <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">What did you do?</p>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {activities.map((a) => (
            <button
              key={a.key}
              onClick={() => setActivityType(a.key)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-xs font-semibold transition ${
                activityType === a.key
                  ? "border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              <span className="text-2xl">{a.emoji}</span>
              {a.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Minutes</p>
        <div className="mb-5 flex items-center justify-center gap-4">
          <button
            onClick={() => setMinutes((m) => Math.max(5, m - 5))}
            className="h-11 w-11 rounded-full bg-neutral-100 text-xl font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            aria-label="Subtract 5 minutes"
          >
            –
          </button>
          <div className="w-20 text-center">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-50">{minutes}</span>
            <span className="ml-1 text-sm text-neutral-500">min</span>
          </div>
          <button
            onClick={() => setMinutes((m) => m + 5)}
            className="h-11 w-11 rounded-full bg-neutral-100 text-xl font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            aria-label="Add 5 minutes"
          >
            +
          </button>
        </div>
        {minutes < 15 && (
          <p className="mb-4 -mt-3 text-center text-xs font-medium text-amber-600">
            15 minutes minimum to keep your streak alive.
          </p>
        )}

        {!showExtras ? (
          <button
            onClick={() => setShowExtras(true)}
            className="mb-5 w-full text-center text-sm font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            + Add a note or photo (optional)
          </button>
        ) : (
          <div className="mb-5 space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Beautiful hike today!"
              rows={2}
              className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="w-full text-sm text-neutral-500 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-neutral-400 dark:file:bg-neutral-800"
            />
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || minutes < 15}
          className="w-full rounded-xl bg-orange-500 py-3.5 text-base font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {submitting ? "Logging…" : "Keep my streak alive 🔥"}
        </button>
      </div>
    </div>
  );
}
