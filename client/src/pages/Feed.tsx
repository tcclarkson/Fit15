import { useEffect, useState } from "react";
import { api } from "../api";
import { formatFriendlyDate } from "../date";
import { useActivities } from "../hooks/useActivities";
import type { FeedItem } from "../types";

export default function Feed() {
  const activities = useActivities();
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    api.get<{ items: FeedItem[] }>("/feed").then((res) => setItems(res.items));
  }, []);

  const activityMeta = (key: string) => activities.find((a) => a.key === key);

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
                  <span className="text-neutral-500 dark:text-neutral-400">
                    logged {item.minutes} min of {meta?.label.toLowerCase() || item.activityType}
                  </span>{" "}
                  <span>{meta?.emoji}</span>
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">{formatFriendlyDate(item.logDate)}</p>
                {item.note && (
                  <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm italic text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    “{item.note}”
                  </p>
                )}
                {item.photoUrl && (
                  <img
                    src={item.photoUrl}
                    alt=""
                    className="mt-2 max-h-64 w-full rounded-xl object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
