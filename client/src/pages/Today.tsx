import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { todayLocal } from "../date";
import { useActivities } from "../hooks/useActivities";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import LogActivityModal from "../components/LogActivityModal";
import RestDayModal from "../components/RestDayModal";
import type { ActivityLog, StreakInfo } from "../types";

const REST = "rest";

interface StreakResponse {
  streak: StreakInfo;
  totalFit15Days: number;
  todayLog: ActivityLog | null;
  loggedToday: boolean;
  loggedYesterday: boolean;
}

export default function Today() {
  const { user } = useAuth();
  const activities = useActivities();
  const { refresh: refreshNotifications } = useNotifications();
  const [data, setData] = useState<StreakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [logDay, setLogDay] = useState<"today" | "yesterday" | null>(null);
  const [showRest, setShowRest] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<StreakResponse>(`/logs/streak/me?today=${todayLocal()}`);
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activityLabel = (key: string) => activities.find((a) => a.key === key)?.label || key;
  const activityEmoji = (key: string) => activities.find((a) => a.key === key)?.emoji || "🔥";

  if (loading || !data) {
    return <div className="p-6 text-center text-neutral-400">Loading…</div>;
  }

  const { streak, totalFit15Days, todayLog, loggedYesterday } = data;
  const isRestToday = todayLog?.activity_type === REST;

  async function afterAction() {
    setJustLogged(true);
    setLogDay(null);
    setShowRest(false);
    refreshNotifications();
    await load();
  }

  return (
    <div className="px-5 pt-6">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Hey {user?.displayName} 👋</p>

      <div className="mt-4 flex flex-col items-center rounded-3xl bg-gradient-to-b from-orange-50 to-white p-8 text-center shadow-sm dark:from-orange-500/10 dark:to-neutral-900">
        <div className={`text-6xl ${justLogged ? "animate-pop" : ""}`}>🔥</div>
        <div className="mt-2 text-5xl font-black text-neutral-900 dark:text-neutral-50">{streak.currentStreak}</div>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-orange-500">
          day{streak.currentStreak === 1 ? "" : "s"} streak
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-neutral-900">
          <div className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50">{streak.longestStreak}</div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Longest streak</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-neutral-900">
          <div className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50">{totalFit15Days}</div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Fit 15 days</div>
        </div>
      </div>

      {/* Nudge: moved but forgot to log yesterday */}
      {!todayLog && !loggedYesterday && (
        <button
          onClick={() => setLogDay("yesterday")}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left dark:border-amber-900/50 dark:bg-amber-500/10"
        >
          <span className="text-xl">📅</span>
          <span className="flex-1 text-xs text-amber-700 dark:text-amber-400">
            <span className="font-bold">Didn't log yesterday?</span> If you moved, add it so your streak keeps going.
          </span>
          <span className="text-amber-500">→</span>
        </button>
      )}

      <div className="mt-6">
        {todayLog ? (
          isRestToday ? (
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-500/10">
              <span className="text-2xl">🌙</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Resting today — streak safe 💛</p>
                <p className="text-xs text-indigo-600/80 dark:text-indigo-400">Rest is part of taking care of yourself.</p>
              </div>
              <button
                onClick={() => setLogDay("today")}
                className="text-xs font-semibold text-indigo-700 underline dark:text-indigo-300"
              >
                I moved
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-500/10">
              <span className="text-2xl">{activityEmoji(todayLog.activity_type)}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-green-700 dark:text-green-400">Today's movement is done ✅</p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  {todayLog.minutes} min · {activityLabel(todayLog.activity_type)}
                  {todayLog.note ? ` — "${todayLog.note}"` : ""}
                </p>
              </div>
              <button
                onClick={() => setLogDay("today")}
                className="text-xs font-semibold text-green-700 underline dark:text-green-400"
              >
                Edit
              </button>
            </div>
          )
        ) : (
          <>
            <button
              onClick={() => setLogDay("today")}
              className="w-full rounded-2xl bg-orange-500 py-4 text-lg font-extrabold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 active:scale-[0.98]"
            >
              Log Today
            </button>
            <button
              onClick={() => setShowRest(true)}
              className="mt-3 w-full text-center text-sm font-medium text-neutral-400 hover:text-indigo-500"
            >
              Can't today? Take a rest day 🌙
            </button>
          </>
        )}
      </div>

      {!todayLog && (
        <p className="mt-3 text-center text-xs text-neutral-400">
          Did you move for at least 15 minutes today? That's the only question.
        </p>
      )}

      {logDay && (
        <LogActivityModal
          defaultDay={logDay}
          onClose={() => setLogDay(null)}
          onLogged={afterAction}
        />
      )}
      {showRest && <RestDayModal onClose={() => setShowRest(false)} onRested={afterAction} />}
    </div>
  );
}
