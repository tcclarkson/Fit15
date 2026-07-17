import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { todayLocal } from "../date";
import { useActivities } from "../hooks/useActivities";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import LogActivityModal from "../components/LogActivityModal";
import type { ActivityLog, StreakInfo } from "../types";

export default function Today() {
  const { user } = useAuth();
  const activities = useActivities();
  const { refresh: refreshNotifications } = useNotifications();
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [todayLog, setTodayLog] = useState<ActivityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<{ streak: StreakInfo; todayLog: ActivityLog | null }>(
      `/logs/streak/me?today=${todayLocal()}`
    );
    setStreak(res.streak);
    setTodayLog(res.todayLog);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activityLabel = (key: string) => activities.find((a) => a.key === key)?.label || key;
  const activityEmoji = (key: string) => activities.find((a) => a.key === key)?.emoji || "🔥";

  if (loading || !streak) {
    return <div className="p-6 text-center text-neutral-400">Loading…</div>;
  }

  return (
    <div className="px-5 pt-6">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Hey {user?.displayName} 👋</p>

      <div className="mt-4 flex flex-col items-center rounded-3xl bg-gradient-to-b from-orange-50 to-white p-8 text-center shadow-sm dark:from-orange-500/10 dark:to-neutral-900">
        <div className={`text-6xl ${justLogged ? "animate-pop" : ""}`}>🔥</div>
        <div className="mt-2 text-5xl font-black text-neutral-900 dark:text-neutral-50">
          {streak.currentStreak}
        </div>
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
          <div className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50">{streak.totalDays}</div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Fit 15 days</div>
        </div>
      </div>

      <div className="mt-6">
        {todayLog ? (
          <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-500/10">
            <span className="text-2xl">{activityEmoji(todayLog.activity_type)}</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-green-700 dark:text-green-400">
                Today's movement is done ✅
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                {todayLog.minutes} min · {activityLabel(todayLog.activity_type)}
                {todayLog.note ? ` — "${todayLog.note}"` : ""}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-semibold text-green-700 underline dark:text-green-400"
            >
              Edit
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full rounded-2xl bg-orange-500 py-4 text-lg font-extrabold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 active:scale-[0.98]"
          >
            Log Today
          </button>
        )}
      </div>

      {!todayLog && (
        <p className="mt-3 text-center text-xs text-neutral-400">
          Did you move for at least 15 minutes today? That's the only question.
        </p>
      )}

      {showModal && (
        <LogActivityModal
          onClose={() => setShowModal(false)}
          onLogged={(result) => {
            setStreak(result.streak);
            setTodayLog(result.log);
            setShowModal(false);
            setJustLogged(true);
            refreshNotifications();
          }}
        />
      )}
    </div>
  );
}
