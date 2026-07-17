import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import CreateChallengeModal from "../components/CreateChallengeModal";
import type { ChallengeSummary } from "../types";

function formatWindow(c: ChallengeSummary): string {
  if (c.windowType === "fixed" && c.startDate && c.endDate) {
    const fmt = (d: string) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };
    return `${fmt(c.startDate)} – ${fmt(c.endDate)}`;
  }
  return `${c.durationDays}-day goal`;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
      <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<ChallengeSummary[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<{ challenges: ChallengeSummary[] }>("/challenges");
    setChallenges(res.challenges);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string, accept: boolean) {
    await api.post(`/challenges/${id}/respond`, { accept });
    await load();
  }

  if (!challenges) return <div className="p-6 text-center text-neutral-400">Loading…</div>;

  const invites = challenges.filter((c) => c.myStatus === "invited");
  const active = challenges.filter((c) => c.myStatus === "active");

  return (
    <div className="px-4 pt-4">
      {invites.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Invites</h2>
          <div className="space-y-2">
            {invites.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-50">{c.invitedBy}</span> invited
                  you to
                </p>
                <p className="mt-0.5 font-bold text-neutral-900 dark:text-neutral-50">{c.name}</p>
                <p className="text-xs text-neutral-400">{formatWindow(c)}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => respond(c.id, true)}
                    className="flex-1 rounded-full bg-orange-500 py-1.5 text-xs font-bold text-white hover:bg-orange-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respond(c.id, false)}
                    className="flex-1 rounded-full bg-neutral-100 py-1.5 text-xs font-bold text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Your challenges</h2>
        <button onClick={() => setShowCreate(true)} className="text-sm font-semibold text-orange-500 hover:underline">
          + New
        </button>
      </div>

      {active.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-400 shadow-sm dark:bg-neutral-900">
          No challenges yet. Start a group reboot with friends, or set your own personal goal.
        </p>
      ) : (
        <div className="space-y-2">
          {active.map((c) => {
            const p = c.myProgress!;
            const pct = (p.totalDaysHit / p.targetDays) * 100;
            return (
              <Link
                key={c.id}
                to={`/challenges/${c.id}`}
                className="block rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-neutral-900 dark:text-neutral-50">{c.name}</p>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {c.windowType === "fixed" ? "Group" : "Personal"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {formatWindow(c)} · {c.memberCount} member{c.memberCount === 1 ? "" : "s"}
                </p>

                {p.isUpcoming ? (
                  <p className="mt-3 text-sm font-medium text-neutral-500">Starts in {p.daysUntilStart} days</p>
                ) : (
                  <>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 font-semibold text-orange-500">
                        🔥 {p.currentStreak}
                      </span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {p.totalDaysHit}/{p.targetDays} days
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar pct={pct} />
                    </div>
                    {p.isEnded ? (
                      <p className="mt-2 text-xs font-semibold text-neutral-400">Ended</p>
                    ) : (
                      <p className="mt-2 text-xs text-neutral-400">{p.daysRemaining} days left</p>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateChallengeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
