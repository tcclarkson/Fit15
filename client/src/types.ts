export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  reminderEnabled?: boolean;
  reminderMinutes?: number | null;
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
  reactions: Record<string, number>;
  myReactions: string[];
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

export type ChallengeWindowType = "fixed" | "rolling";
export type ChallengeMemberStatus = "invited" | "active" | "declined" | "left";

export interface ChallengeProgress {
  currentStreak: number;
  totalDaysHit: number;
  targetDays: number;
  daysRemaining: number;
  daysUntilStart: number;
  isUpcoming: boolean;
  isEnded: boolean;
  effectiveStart: string;
  effectiveEnd: string;
}

export interface ChallengeSummary {
  id: string;
  name: string;
  windowType: ChallengeWindowType;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  isCreator: boolean;
  memberCount: number;
  myStatus: ChallengeMemberStatus;
  invitedBy: string | null;
  myProgress: ChallengeProgress | null;
}

export interface ChallengeLeaderboardEntry {
  user: PublicUser;
  progress: ChallengeProgress;
}

export interface ChallengeDetail {
  challenge: {
    id: string;
    name: string;
    windowType: ChallengeWindowType;
    startDate: string | null;
    endDate: string | null;
    durationDays: number | null;
    isCreator: boolean;
  };
  myStatus: ChallengeMemberStatus;
  myProgress: ChallengeProgress | null;
  leaderboard: ChallengeLeaderboardEntry[];
}
