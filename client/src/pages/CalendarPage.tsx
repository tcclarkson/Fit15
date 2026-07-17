import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { todayLocal } from "../date";
import { useActivities } from "../hooks/useActivities";
import type { ActivityLog } from "../types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const activities = useActivities();
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = todayLocal().split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ logs: ActivityLog[] }>("/logs/me").then((res) => setLogs(res.logs));
  }, []);

  const logsByDate = useMemo(() => {
    const map = new Map<string, ActivityLog>();
    logs?.forEach((l) => map.set(l.log_date, l));
    return map;
  }, [logs]);

  const today = todayLocal();
  const { year, month } = cursor;
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const cells: (string | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ymd(year, month, i + 1)),
  ];

  const selectedLog = selectedDate ? logsByDate.get(selectedDate) : null;
  const activityMeta = (key: string) => activities.find((a) => a.key === key);

  function changeMonth(delta: number) {
    setSelectedDate(null);
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  if (!logs) return <div className="p-6 text-center text-neutral-400">Loading…</div>;

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm dark:bg-neutral-900">
        <button
          onClick={() => changeMonth(-1)}
          className="rounded-full px-3 py-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="font-bold text-neutral-900 dark:text-neutral-50">
          {firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => changeMonth(1)}
          className="rounded-full px-3 py-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const log = logsByDate.get(date);
          const isToday = date === today;
          const day = Number(date.split("-")[2]);
          return (
            <button
              key={date}
              onClick={() => log && setSelectedDate(date)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition ${
                log
                  ? "bg-orange-500 text-white"
                  : isToday
                  ? "border-2 border-orange-300 text-neutral-600 dark:text-neutral-300"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              {log ? activityMeta(log.activity_type)?.emoji || "🔥" : day}
            </button>
          );
        })}
      </div>

      {selectedLog && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <p className="font-bold text-neutral-900 dark:text-neutral-50">
              {activityMeta(selectedLog.activity_type)?.emoji}{" "}
              {activityMeta(selectedLog.activity_type)?.label || selectedLog.activity_type}
            </p>
            <button onClick={() => setSelectedDate(null)} className="text-neutral-400">
              ✕
            </button>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{selectedLog.minutes} minutes</p>
          {selectedLog.note && (
            <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm italic text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              “{selectedLog.note}”
            </p>
          )}
          {selectedLog.photo_url && (
            <img src={selectedLog.photo_url} alt="" className="mt-2 max-h-64 w-full rounded-xl object-cover" />
          )}
        </div>
      )}
    </div>
  );
}
