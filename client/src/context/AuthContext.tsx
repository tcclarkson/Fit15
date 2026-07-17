import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { api } from "../api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signup: (input: { email: string; username: string; password: string; displayName: string }) => Promise<void>;
  login: (input: { emailOrUsername: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signup = useCallback(async (input: { email: string; username: string; password: string; displayName: string }) => {
    const res = await api.post<{ user: User }>("/auth/signup", input);
    setUser(res.user);
  }, []);

  const login = useCallback(async (input: { emailOrUsername: string; password: string }) => {
    const res = await api.post<{ user: User }>("/auth/login", input);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
