import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { FriendEntry, FriendRequest, PublicUser } from "../types";

interface SearchResult extends PublicUser {
  relationshipStatus: "none" | "pending_sent" | "pending_received" | "friends";
}

export default function Friends() {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const loadFriends = useCallback(async () => {
    const res = await api.get<{ friends: FriendEntry[] }>("/friends");
    setFriends(res.friends);
  }, []);

  const loadRequests = useCallback(async () => {
    const res = await api.get<{ requests: FriendRequest[] }>("/friends/requests");
    setRequests(res.requests);
  }, []);

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, [loadFriends, loadRequests]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const res = await api.get<{ users: SearchResult[] }>(`/friends/search?q=${encodeURIComponent(query)}`);
      setResults(res.users);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function sendRequest(targetUserId: string) {
    await api.post("/friends/request", { targetUserId });
    setResults((prev) =>
      prev.map((u) => (u.id === targetUserId ? { ...u, relationshipStatus: "pending_sent" } : u))
    );
  }

  async function accept(friendshipId: string) {
    await api.post(`/friends/${friendshipId}/accept`);
    await Promise.all([loadFriends(), loadRequests()]);
  }

  async function decline(friendshipId: string) {
    await api.post(`/friends/${friendshipId}/decline`);
    await loadRequests();
  }

  async function removeFriend(friendshipId: string, name: string) {
    if (!confirm(`Remove ${name} from your friends?`)) return;
    await api.delete(`/friends/${friendshipId}`);
    await loadFriends();
  }

  return (
    <div className="px-4 pt-4">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name"
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="mt-2 divide-y divide-neutral-100 rounded-xl bg-white shadow-sm dark:divide-neutral-800 dark:bg-neutral-900">
          {searching && <p className="p-3 text-sm text-neutral-400">Searching…</p>}
          {!searching && results.length === 0 && (
            <p className="p-3 text-sm text-neutral-400">No users found.</p>
          )}
          {results.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <span className="text-xl">{u.avatarEmoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{u.displayName}</p>
                <p className="text-xs text-neutral-400">@{u.username}</p>
              </div>
              {u.relationshipStatus === "none" && (
                <button
                  onClick={() => sendRequest(u.id)}
                  className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600"
                >
                  Add
                </button>
              )}
              {u.relationshipStatus === "pending_sent" && (
                <span className="text-xs font-medium text-neutral-400">Requested</span>
              )}
              {u.relationshipStatus === "pending_received" && (
                <span className="text-xs font-medium text-neutral-400">Check requests</span>
              )}
              {u.relationshipStatus === "friends" && (
                <span className="text-xs font-medium text-green-600">Friends ✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Friend requests</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.friendshipId} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-neutral-900">
                <span className="text-xl">{r.user.avatarEmoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{r.user.displayName}</p>
                  <p className="text-xs text-neutral-400">@{r.user.username}</p>
                </div>
                <button
                  onClick={() => accept(r.friendshipId)}
                  className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600"
                >
                  Accept
                </button>
                <button
                  onClick={() => decline(r.friendshipId)}
                  className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Your friends</h2>
        {friends.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-center text-sm text-neutral-400 shadow-sm dark:bg-neutral-900">
            No friends yet — search above to add some accountability.
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.friendshipId} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-neutral-900">
                <span className="text-xl">{f.user.avatarEmoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    {f.user.displayName}
                  </p>
                  <p className="text-xs text-neutral-400">@{f.user.username}</p>
                </div>
                <div className="flex items-center gap-1 text-orange-500" title="Current streak">
                  <span>🔥</span>
                  <span className="font-bold">{f.streak.currentStreak}</span>
                </div>
                <button
                  onClick={() => removeFriend(f.friendshipId, f.user.displayName)}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  aria-label={`Remove ${f.user.displayName}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
