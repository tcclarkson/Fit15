import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import ReminderSettings from "../components/ReminderSettings";
import { lastEmoji } from "../emoji";

export default function Profile() {
  const { user, updateAvatar, logout } = useAuth();
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState<string[]>([]);
  const [selected, setSelected] = useState(user?.avatarEmoji || "🏃");
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ avatars: string[] }>("/meta/avatars").then((res) => setAvatars(res.avatars));
  }, []);

  // Auto-save the emoji shortly after it changes — no Save button, consistent
  // with the reminder settings below (which also save on change).
  useEffect(() => {
    if (!user || selected === user.avatarEmoji) return;
    setError(null);
    const t = setTimeout(async () => {
      try {
        await updateAvatar(selected);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [selected, user, updateAvatar]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="px-5 pt-6">
      <h1 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">Profile</h1>

      <div className="mt-4 flex flex-col items-center rounded-3xl bg-white p-6 text-center shadow-sm dark:bg-neutral-900">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-5xl dark:bg-orange-500/10">
          {selected}
        </div>
        <p className="mt-3 text-lg font-bold text-neutral-900 dark:text-neutral-50">{user?.displayName}</p>
        <p className="text-sm text-neutral-400">@{user?.username}</p>
      </div>

      <div className="mb-2 mt-6 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Pick your emoji</p>
        {status === "saved" && <span className="text-xs font-semibold text-green-600">Saved ✓</span>}
        {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
      </div>
      <div className="grid grid-cols-6 gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-neutral-900">
        {avatars.map((emoji) => (
          <button
            key={emoji}
            onClick={() => setSelected(emoji)}
            className={`flex aspect-square items-center justify-center rounded-xl text-2xl transition ${
              selected === emoji
                ? "bg-orange-500/15 ring-2 ring-orange-500"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
            aria-label={`Choose ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-neutral-900">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">Or type any emoji</span>
        <input
          value={selected}
          onChange={(e) => {
            const g = lastEmoji(e.target.value);
            if (g) setSelected(g);
          }}
          inputMode="text"
          maxLength={16}
          aria-label="Type any emoji"
          className="ml-auto w-16 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-center text-2xl outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>

      <ReminderSettings />

      <button
        onClick={handleLogout}
        className="mt-6 w-full rounded-xl border border-neutral-200 py-3 font-semibold text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Log out
      </button>
    </div>
  );
}
