import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { api } from "../api";
import type { AppNotification } from "../types";
import { useAuth } from "./AuthContext";

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const res = await api.get<{ notifications: AppNotification[]; unreadCount: number }>("/notifications");
    setNotifications(res.notifications);
    setUnreadCount(res.unreadCount);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      await api.post(`/notifications/${id}/read`);
      await refresh();
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    await api.post("/notifications/read-all");
    await refresh();
  }, [refresh]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, refresh, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
