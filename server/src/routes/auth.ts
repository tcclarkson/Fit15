import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { signToken, COOKIE_NAME, requireAuth, AuthedRequest } from "../auth";

const router = Router();

const AVATAR_EMOJIS = ["🏃", "🚴", "🧘", "🏊", "🥾", "💃", "🏓", "⚽", "🏋️", "🚶"];

function publicUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.display_name,
    avatarEmoji: u.avatar_emoji,
  };
}

router.post("/signup", (req, res) => {
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

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? OR username = ?")
    .get(String(email).toLowerCase(), normalizedUsername);
  if (existing) {
    return res.status(409).json({ error: "Email or username already in use" });
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatarEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  db.prepare(
    `INSERT INTO users (id, email, username, display_name, password_hash, avatar_emoji, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    String(email).toLowerCase(),
    normalizedUsername,
    displayName?.trim() || normalizedUsername,
    passwordHash,
    avatarEmoji,
    new Date().toISOString()
  );

  const token = signToken(id);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { emailOrUsername, password } = req.body || {};
  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: "Email/username and password are required" });
  }
  const identifier = String(emailOrUsername).trim().toLowerCase();
  const user = db
    .prepare("SELECT * FROM users WHERE email = ? OR username = ?")
    .get(identifier, identifier) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signToken(user.id);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.json({ user: publicUser(user) });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

export default router;
