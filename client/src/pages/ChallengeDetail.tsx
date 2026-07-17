import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import type { ChallengeDetail as ChallengeDetailType, FriendEntry } from "../types";

function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState<ChallengeDetailType | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<ChallengeDetailType>(`/challenges/${id}`);
    setDetail(res);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function openInvite() {
    const res = await api.get<{ friends: FriendEntry[] }>("/friends");
    setFriends(res.friends);
    setShowInvite(true);
  }

  async function invite(userId: string) {
    const res = await api.post<{ invited: number }>(`/challenges/${id}/invite`, { userIds: [userId] });
    setInviteMsg(res.invited > 0 ? "Invite sent!" : "Already invited or a member");
    setTimeout(() => setInviteMsg(null), 2000);
  }

  async function restart() {
    if (!confirm("Restart your progress in this challenge? Your day count will start over from today.")) return;
    await api.post(`/challenges/${id}/restart`);
    await load();
  }

  async function leave() {
    if (!confirm("Leave this challenge?")) return;
    await api.post(`/challenges/${id}/leave`);
    navigate("/challenges");
  }

  if (!detail) return <div className="p-6 text-center text-neutral-400">Loading…</div>;

  const { challenge, myProgress, leaderboard } = detail;
  const existingMemberIds = new Set(leaderboard.map((l) => l.user.id));

  return (
    <div className="px-4 pt-4">
      <button onClick={() => navigate("/challenges")} className="mb-2 text-sm text-neutral-400 hover:text-neutral-600">
        ‹ Challenges
      </button>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">{challenge.name}</h1>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {challenge.windowType === "fixed" ? "Group" : "Personal"}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          {challenge.windowType === "fixed" && challenge.startDate && challenge.endDate
            ? `${formatDate(challenge.startDate)} – ${formatDate(challenge.endDate)}`
            : `${challenge.durationDays}-day goal`}
        </p>

        {myProgress && (
          <div className="mt-4">
            {myProgress.isUpcoming ? (
              <p className="text-sm font-medium text-neutral-500">Starts in {myProgress.daysUntilStart} days</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 font-semibold text-orange-500">
                    🔥 {myProgress.currentStreak} day streak
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {myProgress.totalDaysHit}/{myProgress.targetDays} days
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${Math.min(100, (myProgress.totalDaysHit / myProgress.targetDays) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-400">
                  {myProgress.isEnded ? "This challenge has ended." : `${myProgress.daysRemaining} days left`}
                </p>
              </>
            )}

            <div className="mt-4 flex gap-2">
              {!myProgress.isEnded && !myProgress.isUpcoming && (
                <button
                  onClick={restart}
                  className="flex-1 rounded-full bg-neutral-100 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  Restart my progress
                </button>
              )}
              <button
                onClick={openInvite}
                className="flex-1 rounded-full bg-neutral-100 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              >
                Invite friends
              </button>
              <button
                onClick={leave}
                className="flex-1 rounded-full bg-red-50 py-2 text-xs font-bold text-red-500 hover:bg-red-100 dark:bg-red-500/10"
              >
                Leave
              </button>
            </div>
            {inviteMsg && <p className="mt-2 text-center text-xs text-neutral-400">{inviteMsg}</p>}
          </div>
        )}
      </div>

      <h2 className="mb-2 mt-5 text-sm font-bold text-neutral-500 dark:text-neutral-400">Leaderboard</h2>
      <div className="space-y-2">
        {leaderboard.map((entry, i) => (
          <div
            key={entry.user.id}
            className={`flex items-center gap-3 rounded-xl p-3 shadow-sm ${
              entry.user.id === user?.id
                ? "bg-orange-50 dark:bg-orange-500/10"
                : "bg-white dark:bg-neutral-900"
            }`}
          >
            <span className="w-4 text-sm font-bold text-neutral-400">{i + 1}</span>
            <span className="text-xl">{entry.user.avatarEmoji}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                {entry.user.id === user?.id ? "You" : entry.user.displayName}
              </p>
              <p className="text-xs text-neutral-400">
                {entry.progress.isUpcoming
                  ? `Starts in ${entry.progress.daysUntilStart}d`
                  : `${entry.progress.totalDaysHit}/${entry.progress.targetDays} days`}
              </p>
            </div>
            <div className="flex items-center gap-1 text-orange-500">
              <span>🔥</span>
              <span className="font-bold">{entry.progress.currentStreak}</span>
            </div>
          </div>
        ))}
      </div>

      {showInvite && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setShowInvite(false)}
        >
          <div
            className="max-h-[80svh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-neutral-900 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">Invite friends</h2>
              <button onClick={() => setShowInvite(false)} className="text-neutral-400">
                ✕
              </button>
            </div>
            {friends.filter((f) => !existingMemberIds.has(f.user.id)).length === 0 ? (
              <p className="text-sm text-neutral-400">All your friends are already in this challenge.</p>
            ) : (
              <div className="space-y-1">
                {friends
                  .filter((f) => !existingMemberIds.has(f.user.id))
                  .map((f) => (
                    <div key={f.user.id} className="flex items-center gap-3 rounded-lg p-2">
                      <span className="text-xl">{f.user.avatarEmoji}</span>
                      <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
                        {f.user.displayName}
                      </span>
                      <button
                        onClick={() => invite(f.user.id)}
                        className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
