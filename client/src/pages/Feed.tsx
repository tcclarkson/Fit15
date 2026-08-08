import { useEffect, useState } from "react";
import { api } from "../api";
import { formatFriendlyDate } from "../date";
import { useActivities } from "../hooks/useActivities";
import type { FeedItem } from "../types";

const REACTION_EMOJIS = ["🔥", "👏", "💪", "🎉"];

export default function Feed() {
  const activities = useActivities();
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    api.get<{ items: FeedItem[] }>("/feed").then((res) => setItems(res.items));
  }, []);

  const activityMeta = (key: string) => activities.find((a) => a.key === key);

  // Optimistically toggle a reaction, then persist.
  async function toggleReaction(logId: string, emoji: string) {
    setItems((prev) =>
      prev
        ? prev.map((it) => {
            if (it.id !== logId) return it;
            const mine = it.myReactions.includes(emoji);
            const counts = { ...it.reactions };
            counts[emoji] = (counts[emoji] || 0) + (mine ? -1 : 1);
            if (counts[emoji] <= 0) delete counts[emoji];
            return {
              ...it,
              reactions: counts,
              myReactions: mine ? it.myReactions.filter((e) => e !== emoji) : [...it.myReactions, emoji],
            };
          })
        : prev
    );
    try {
      await api.post(`/feed/${logId}/react`, { emoji });
    } catch {
      // On failure, refetch to resync.
      const res = await api.get<{ items: FeedItem[] }>("/feed");
      setItems(res.items);
    }
  }

  if (!items) return <div className="p-6 text-center text-neutral-400">Loading…</div>;

  if (items.length === 0) {
    return (
      <div className="px-6 pt-16 text-center text-neutral-400">
        <div className="text-4xl">📣</div>
        <p className="mt-3 font-medium">No activity yet</p>
        <p className="mt-1 text-sm">Add friends to see their Fit 15 activity here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pt-4">
      {items.map((item) => {
        const isRest = item.activityType === "rest";
        const meta = activityMeta(item.activityType);
        return (
          <div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.user.avatarEmoji}</span>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-bold text-neutral-900 dark:text-neutral-50">
                    {item.isMe ? "You" : item.user.displayName}
                  </span>{" "}
                  {isRest ? (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      took a rest day <span>🌙</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        completed {item.isMe ? "your" : "their"} Fit 15 · {meta?.label || item.activityType}
                      </span>{" "}
                      <span>{meta?.emoji}</span>
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">{formatFriendlyDate(item.logDate)}</p>
                {item.note && (
                  <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm italic text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    “{item.note}”
                  </p>
                )}
                {item.photoUrl && (
                  <img src={item.photoUrl} alt="" className="mt-2 max-h-64 w-full rounded-xl object-cover" />
                )}

                {/* Props / reactions */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {REACTION_EMOJIS.map((emoji) => {
                    const count = item.reactions[emoji] || 0;
                    const mine = item.myReactions.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(item.id, emoji)}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition ${
                          mine
                            ? "border-orange-400 bg-orange-50 dark:border-orange-500/60 dark:bg-orange-500/15"
                            : "border-neutral-200 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                        }`}
                        aria-label={`React ${emoji}`}
                        aria-pressed={mine}
                      >
                        <span>{emoji}</span>
                        {count > 0 && (
                          <span
                            className={`text-xs font-semibold ${
                              mine ? "text-orange-600 dark:text-orange-400" : "text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
