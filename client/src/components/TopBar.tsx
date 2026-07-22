import { Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import { useAuth } from "../context/AuthContext";

export default function TopBar() {
  const { unreadCount } = useNotifications();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-1.5 text-lg font-extrabold text-neutral-900 dark:text-neutral-50">
          <span>🔥</span>
          Fit 15
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/notifications"
            className="relative rounded-full p-2 text-xl text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xl hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            aria-label="Profile"
          >
            {user?.avatarEmoji || "🙂"}
          </Link>
        </div>
      </div>
    </header>
  );
}
