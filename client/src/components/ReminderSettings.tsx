import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  pushSupported,
  getExistingSubscription,
  enableReminders,
  disableReminders,
  updateReminderTime,
} from "../push";

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari
  (navigator as any).standalone === true;

export default function ReminderSettings() {
  const { user } = useAuth();
  const supported = pushSupported();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(toHHMM(user?.reminderMinutes ?? 19 * 60));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    getExistingSubscription().then((sub) => setEnabled(!!sub && !!user?.reminderEnabled));
  }, [supported, user?.reminderEnabled]);

  function flash(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 1800);
  }

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      if (!enabled) {
        await enableReminders(parseHHMM(time));
        setEnabled(true);
        flash("Reminder on 🔔");
      } else {
        await disableReminders();
        setEnabled(false);
        flash("Reminder off");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onTimeChange(v: string) {
    setTime(v);
    if (enabled) {
      try {
        await updateReminderTime(parseHHMM(v));
        flash("Time updated");
      } catch {
        setError("Couldn't update the time");
      }
    }
  }

  if (!supported) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Daily reminder</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {isStandalone()
            ? "Notifications aren't supported on this browser."
            : "To get a daily reminder, add Fit 15 to your Home Screen first (Share → Add to Home Screen), then open it from there."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Daily reminder 🔔</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            A nudge to log your Fit 15 — only if you haven't yet that day.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          role="switch"
          aria-checked={enabled}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
            enabled ? "bg-orange-500" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <label className="text-sm text-neutral-600 dark:text-neutral-300">Remind me at</label>
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
      )}

      {savedMsg && <p className="mt-2 text-xs text-neutral-400">{savedMsg}</p>}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
