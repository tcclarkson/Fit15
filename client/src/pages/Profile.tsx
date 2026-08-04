import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import ReminderSettings from "../components/ReminderSettings";

export default function Profile() {
  const { user, updateAvatar, logout } = useAuth();
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState<string[]>([]);
  const [selected, setSelected] = useState(user?.avatarEmoji || "🏃");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ avatars: string[] }>("/meta/avatars").then((res) => setAvatars(res.avatars));
  }, []);

  const dirty = selected !== user?.avatarEmoji;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await updateAvatar(selected);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

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

      <p className="mb-2 mt-6 text-sm font-medium text-neutral-600 dark:text-neutral-300">Pick your emoji</p>
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

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <button
        onClick={save}
        disabled={!dirty || saving}
        className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : savedMsg ? "Saved ✓" : "Save"}
      </button>

      <ReminderSettings />

      <button
        onClick={handleLogout}
        className="mt-3 w-full rounded-xl border border-neutral-200 py-3 font-semibold text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Log out
      </button>
    </div>
  );
}
