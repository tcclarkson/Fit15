export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
}

export interface ActivityDef {
  key: string;
  label: string;
  emoji: string;
  noun: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  minutes: number;
  note: string | null;
  photo_url: string | null;
  log_date: string;
  created_at: string;
}

export interface FriendEntry {
  friendshipId: string;
  user: PublicUser;
  streak: StreakInfo;
  loggedToday: boolean;
  todayActivity: { activityType: string; minutes: number } | null;
  daysAheadOfMe: number;
}

export interface FriendRequest {
  friendshipId: string;
  user: PublicUser;
}

export interface FeedItem {
  id: string;
  user: PublicUser;
  activityType: string;
  minutes: number;
  note: string | null;
  photoUrl: string | null;
  logDate: string;
  createdAt: string;
  isMe: boolean;
}

export interface AppNotification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  related_user_id: string | null;
  created_at: string;
  read: 0 | 1;
}
