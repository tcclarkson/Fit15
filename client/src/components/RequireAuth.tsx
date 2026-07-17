import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationsProvider } from "../context/NotificationsContext";

export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-3xl">
        🔥
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <NotificationsProvider>
      <Outlet />
    </NotificationsProvider>
  );
}
