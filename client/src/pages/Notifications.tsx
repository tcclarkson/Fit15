import { useNotifications } from "../context/NotificationsContext";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="px-4 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead()} className="text-xs font-semibold text-orange-500 hover:underline">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-400 shadow-sm dark:bg-neutral-900">
          Nothing yet. When friends move or keep a streak alive, you'll see it here.
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`block w-full rounded-xl p-3 text-left text-sm shadow-sm transition ${
                n.read
                  ? "bg-white text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
                  : "bg-orange-50 font-medium text-neutral-800 dark:bg-orange-500/10 dark:text-neutral-100"
              }`}
            >
              <p>{n.message}</p>
              <p className="mt-1 text-xs text-neutral-400">{timeAgo(n.created_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
