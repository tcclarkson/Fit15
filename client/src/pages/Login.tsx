import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ emailOrUsername, password });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl">🔥</div>
          <h1 className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-neutral-50">Fit 15</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Move 15 minutes a day. Protect your streak.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Email or username
            </label>
            <input
              type="text"
              required
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          New to Fit 15?{" "}
          <Link to="/signup" className="font-semibold text-orange-500 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
