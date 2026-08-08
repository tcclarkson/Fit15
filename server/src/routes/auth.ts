import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { dbGet, dbRun } from "../db";
import { signToken, COOKIE_NAME, AUTH_COOKIE_OPTIONS, requireAuth, AuthedRequest } from "../auth";
import { AVATAR_EMOJIS, isValidAvatarEmoji } from "../avatars";

const router = Router();

function publicUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.display_name,
    avatarEmoji: u.avatar_emoji,
    reminderEnabled: !!u.reminder_enabled,
    reminderMinutes: u.reminder_minutes ?? null,
  };
}

router.post("/signup", async (req, res) => {
  const { email, username, password, displayName } = req.body || {};
  if (!email || !username || !password) {
    return res.status(400).json({ error: "Email, username, and password are required" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const normalizedUsername = String(username).trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    return res.status(400).json({ error: "Username must be 3-20 characters: letters, numbers, underscore" });
  }

  const existing = await dbGet(
    "SELECT id FROM users WHERE email = ? OR username = ?",
    [String(email).toLowerCase(), normalizedUsername]
  );
  if (existing) {
    return res.status(409).json({ error: "Email or username already in use" });
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatarEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  await dbRun(
    `INSERT INTO users (id, email, username, display_name, password_hash, avatar_emoji, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      String(email).toLowerCase(),
      normalizedUsername,
      displayName?.trim() || normalizedUsername,
      passwordHash,
      avatarEmoji,
      new Date().toISOString(),
    ]
  );

  const token = signToken(id);
  res.cookie(COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
  const user = await dbGet("SELECT * FROM users WHERE id = ?", [id]);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { emailOrUsername, password } = req.body || {};
  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: "Email/username and password are required" });
  }
  const identifier = String(emailOrUsername).trim().toLowerCase();
  const user = (await dbGet("SELECT * FROM users WHERE email = ? OR username = ?", [
    identifier,
    identifier,
  ])) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signToken(user.id);
  res.cookie(COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
  res.json({ user: publicUser(user) });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await dbGet("SELECT * FROM users WHERE id = ?", [req.userId]);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

// Update the signed-in user's profile (display name and/or avatar emoji).
router.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body || {};
  const updates: string[] = [];
  const params: any[] = [];

  if (body.avatarEmoji !== undefined) {
    if (!body.avatarEmoji || !isValidAvatarEmoji(body.avatarEmoji)) {
      return res.status(400).json({ error: "Pick a single emoji" });
    }
    updates.push("avatar_emoji = ?");
    params.push(body.avatarEmoji);
  }

  if (body.displayName !== undefined) {
    const name = String(body.displayName).trim();
    if (name.length < 1 || name.length > 30) {
      return res.status(400).json({ error: "Name must be 1-30 characters" });
    }
    updates.push("display_name = ?");
    params.push(name);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  params.push(req.userId);
  await dbRun(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
  const user = await dbGet("SELECT * FROM users WHERE id = ?", [req.userId]);
  res.json({ user: publicUser(user) });
});

export default router;
