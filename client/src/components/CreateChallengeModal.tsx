import { useEffect, useState } from "react";
import { api } from "../api";
import { todayLocal } from "../date";
import type { ChallengeWindowType, FriendEntry } from "../types";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const DURATION_PRESETS = [21, 30, 60, 75, 90];

export default function CreateChallengeModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [windowType, setWindowType] = useState<ChallengeWindowType>("fixed");
  const [startDate, setStartDate] = useState(todayLocal());
  const [endDate, setEndDate] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [inviteIds, setInviteIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<{ friends: FriendEntry[] }>("/friends").then((res) => setFriends(res.friends));
  }, []);

  function toggleInvite(userId: string) {
    setInviteIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Give your challenge a name");
      return;
    }
    if (windowType === "fixed" && (!startDate || !endDate || endDate < startDate)) {
      setError("Pick a valid start and end date");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/challenges", {
        name: name.trim(),
        windowType,
        startDate: windowType === "fixed" ? startDate : undefined,
        endDate: windowType === "fixed" ? endDate : undefined,
        durationDays: windowType === "rolling" ? durationDays : undefined,
        inviteUserIds: [...inviteIds],
      });
      onCreated();
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
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">New Challenge 🏆</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="August Reboot"
          maxLength={60}
          className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setWindowType("fixed")}
            className={`rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
              windowType === "fixed"
                ? "border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            Group challenge
            <p className="mt-0.5 text-xs font-normal text-neutral-400">Same start/end for everyone</p>
          </button>
          <button
            onClick={() => setWindowType("rolling")}
            className={`rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
              windowType === "rolling"
                ? "border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            Personal goal
            <p className="mt-0.5 text-xs font-normal text-neutral-400">Your own countdown, starts today</p>
          </button>
        </div>

        {windowType === "fixed" ? (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-neutral-500">Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationDays(d)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    durationDays === d
                      ? "bg-orange-500 text-white"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
        )}

        {friends.length > 0 && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Invite friends (optional)
            </label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">
              {friends.map((f) => (
                <label
                  key={f.user.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <input
                    type="checkbox"
                    checked={inviteIds.has(f.user.id)}
                    onChange={() => toggleInvite(f.user.id)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span>{f.user.avatarEmoji}</span>
                  <span className="text-sm text-neutral-700 dark:text-neutral-200">{f.user.displayName}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl bg-orange-500 py-3.5 text-base font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create challenge"}
        </button>
      </div>
    </div>
  );
}
