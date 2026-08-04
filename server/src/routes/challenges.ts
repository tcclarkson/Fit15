import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { dbGet, dbAll, dbRun } from "../db";
import { requireAuth, AuthedRequest } from "../auth";
import { getUserLogDays } from "../logDays";
import { computeChallengeProgress, addDays } from "../challengeProgress";
import { notify } from "../notify";

const router = Router();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function publicUser(u: any) {
  return { id: u.id, username: u.username, displayName: u.display_name, avatarEmoji: u.avatar_emoji };
}

async function areFriends(userA: string, userB: string): Promise<boolean> {
  const row = await dbGet(
    `SELECT 1 as ok FROM friendships WHERE status = 'accepted' AND
     ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
    [userA, userB, userB, userA]
  );
  return !!row;
}

async function getMembership(challengeId: string, userId: string): Promise<any> {
  return dbGet("SELECT * FROM challenge_members WHERE challenge_id = ? AND user_id = ?", [
    challengeId,
    userId,
  ]);
}

async function inviteToChallenge(
  challengeId: string,
  inviterId: string,
  inviteeId: string,
  challengeName: string
) {
  await dbRun(
    `INSERT INTO challenge_members (id, challenge_id, user_id, status, invited_by, created_at)
     VALUES (?, ?, ?, 'invited', ?, ?)`,
    [uuidv4(), challengeId, inviteeId, inviterId, new Date().toISOString()]
  );

  const inviter = (await dbGet("SELECT display_name FROM users WHERE id = ?", [inviterId])) as any;
  await notify(
    inviteeId,
    `${inviter.display_name} invited you to join "${challengeName}".`,
    "challenge_invite",
    inviterId
  );
}

// Create a challenge (fixed shared dates, or a personal rolling window), optionally inviting friends.
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { name, windowType, startDate, endDate, durationDays, inviteUserIds } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Challenge name is required" });
  }
  if (windowType !== "fixed" && windowType !== "rolling") {
    return res.status(400).json({ error: "windowType must be 'fixed' or 'rolling'" });
  }

  let memberStart: string;
  let memberEnd: string;

  if (windowType === "fixed") {
    if (!isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate) {
      return res.status(400).json({ error: "Fixed challenges need a valid startDate and endDate" });
    }
    memberStart = startDate;
    memberEnd = endDate;
  } else {
    const duration = Number(durationDays);
    if (!Number.isFinite(duration) || duration < 1 || duration > 365) {
      return res.status(400).json({ error: "durationDays must be between 1 and 365" });
    }
    memberStart = todayStr();
    memberEnd = addDays(memberStart, duration - 1);
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const trimmedName = name.trim().slice(0, 60);

  await dbRun(
    `INSERT INTO challenges (id, creator_id, name, window_type, start_date, end_date, duration_days, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      req.userId,
      trimmedName,
      windowType,
      windowType === "fixed" ? startDate : null,
      windowType === "fixed" ? endDate : null,
      windowType === "rolling" ? Math.round(Number(durationDays)) : null,
      now,
    ]
  );

  await dbRun(
    `INSERT INTO challenge_members (id, challenge_id, user_id, status, member_start_date, member_end_date, created_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    [uuidv4(), id, req.userId, memberStart, memberEnd, now]
  );

  if (Array.isArray(inviteUserIds)) {
    for (const inviteeId of inviteUserIds) {
      if (inviteeId === req.userId) continue;
      if (!(await areFriends(req.userId!, inviteeId))) continue;
      if (await getMembership(id, inviteeId)) continue;
      await inviteToChallenge(id, req.userId!, inviteeId, trimmedName);
    }
  }

  const challenge = await dbGet("SELECT * FROM challenges WHERE id = ?", [id]);
  res.status(201).json({ challenge });
});

// List challenges I'm active in or invited to.
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await dbAll<any>(
    `SELECT cm.*, c.name, c.window_type, c.start_date, c.end_date, c.duration_days, c.creator_id
     FROM challenge_members cm
     JOIN challenges c ON c.id = cm.challenge_id
     WHERE cm.user_id = ? AND cm.status IN ('active', 'invited')
     ORDER BY cm.created_at DESC`,
    [req.userId]
  );

  const today = todayStr();
  const days = await getUserLogDays(req.userId!);

  const challenges = await Promise.all(
    rows.map(async (r) => {
      const countRow = (await dbGet<{ c: number }>(
        "SELECT COUNT(*) as c FROM challenge_members WHERE challenge_id = ? AND status = 'active'",
        [r.challenge_id]
      ))!;

      let inviterName: string | null = null;
      if (r.status === "invited" && r.invited_by) {
        const inviter = (await dbGet("SELECT display_name FROM users WHERE id = ?", [r.invited_by])) as any;
        inviterName = inviter?.display_name || null;
      }

      return {
        id: r.challenge_id,
        name: r.name,
        windowType: r.window_type,
        startDate: r.start_date,
        endDate: r.end_date,
        durationDays: r.duration_days,
        isCreator: r.creator_id === req.userId,
        memberCount: Number(countRow.c),
        myStatus: r.status,
        invitedBy: inviterName,
        myProgress:
          r.status === "active"
            ? computeChallengeProgress(days, r.member_start_date, r.member_end_date, r.reset_date, today)
            : null,
      };
    })
  );

  res.json({ challenges });
});

// Detail + leaderboard.
router.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.params.id, req.userId!);
  if (!membership) return res.status(404).json({ error: "Challenge not found" });

  const challenge = (await dbGet("SELECT * FROM challenges WHERE id = ?", [req.params.id])) as any;
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const today = todayStr();
  const members = await dbAll<any>(
    `SELECT cm.*, u.username, u.display_name, u.avatar_emoji
     FROM challenge_members cm JOIN users u ON u.id = cm.user_id
     WHERE cm.challenge_id = ? AND cm.status = 'active'`,
    [req.params.id]
  );

  const leaderboard = (
    await Promise.all(
      members.map(async (m) => {
        const progress = computeChallengeProgress(
          await getUserLogDays(m.user_id),
          m.member_start_date,
          m.member_end_date,
          m.reset_date,
          today
        );
        return {
          user: publicUser({ id: m.user_id, username: m.username, display_name: m.display_name, avatar_emoji: m.avatar_emoji }),
          progress,
        };
      })
    )
  ).sort(
    (a, b) =>
      b.progress.totalDaysHit - a.progress.totalDaysHit ||
      b.progress.currentStreak - a.progress.currentStreak
  );

  const myProgress =
    membership.status === "active"
      ? computeChallengeProgress(
          await getUserLogDays(req.userId!),
          membership.member_start_date,
          membership.member_end_date,
          membership.reset_date,
          today
        )
      : null;

  res.json({
    challenge: {
      id: challenge.id,
      name: challenge.name,
      windowType: challenge.window_type,
      startDate: challenge.start_date,
      endDate: challenge.end_date,
      durationDays: challenge.duration_days,
      isCreator: challenge.creator_id === req.userId,
    },
    myStatus: membership.status,
    myProgress,
    leaderboard,
  });
});

// Invite friends into a challenge you're active in.
router.post("/:id/invite", requireAuth, async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.params.id, req.userId!);
  if (!membership || membership.status !== "active") {
    return res.status(403).json({ error: "You must be an active member to invite others" });
  }
  const challenge = (await dbGet("SELECT * FROM challenges WHERE id = ?", [req.params.id])) as any;
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const { userIds } = req.body || {};
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: "userIds is required" });
  }

  let invited = 0;
  for (const inviteeId of userIds) {
    if (inviteeId === req.userId) continue;
    if (!(await areFriends(req.userId!, inviteeId))) continue;
    if (await getMembership(req.params.id, inviteeId)) continue;
    await inviteToChallenge(req.params.id, req.userId!, inviteeId, challenge.name);
    invited += 1;
  }

  res.json({ ok: true, invited });
});

// Accept or decline an invite.
router.post("/:id/respond", requireAuth, async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.params.id, req.userId!);
  if (!membership || membership.status !== "invited") {
    return res.status(404).json({ error: "No pending invite found" });
  }
  const { accept } = req.body || {};

  if (!accept) {
    await dbRun("UPDATE challenge_members SET status = 'declined' WHERE id = ?", [membership.id]);
    return res.json({ ok: true, status: "declined" });
  }

  const challenge = (await dbGet("SELECT * FROM challenges WHERE id = ?", [req.params.id])) as any;
  let memberStart: string;
  let memberEnd: string;
  if (challenge.window_type === "fixed") {
    memberStart = challenge.start_date;
    memberEnd = challenge.end_date;
  } else {
    memberStart = todayStr();
    memberEnd = addDays(memberStart, challenge.duration_days - 1);
  }

  await dbRun(
    "UPDATE challenge_members SET status = 'active', member_start_date = ?, member_end_date = ? WHERE id = ?",
    [memberStart, memberEnd, membership.id]
  );

  res.json({ ok: true, status: "active" });
});

// Leave a challenge.
router.post("/:id/leave", requireAuth, async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.params.id, req.userId!);
  if (!membership) return res.status(404).json({ error: "Not a member" });
  await dbRun("UPDATE challenge_members SET status = 'left' WHERE id = ?", [membership.id]);
  res.json({ ok: true });
});

// Manually restart my progress within this challenge (keeps the window/leaderboard intact).
router.post("/:id/restart", requireAuth, async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.params.id, req.userId!);
  if (!membership || membership.status !== "active") {
    return res.status(404).json({ error: "Not an active member" });
  }
  const today = todayStr();
  if (today > membership.member_end_date) {
    return res.status(400).json({ error: "This challenge has already ended" });
  }
  await dbRun("UPDATE challenge_members SET reset_date = ? WHERE id = ?", [today, membership.id]);
  res.json({ ok: true });
});

export default router;
