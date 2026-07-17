import { Router } from "express";
import { db } from "../db";
import { requireAuth, AuthedRequest } from "../auth";

const router = Router();

router.get("/", requireAuth, (req: AuthedRequest, res) => {
  const notifications = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(req.userId);
  const unreadCount = (
    db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0").get(req.userId) as any
  ).c;
  res.json({ notifications, unreadCount });
});

router.post("/:id/read", requireAuth, (req: AuthedRequest, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(
    req.params.id,
    req.userId
  );
  res.json({ ok: true });
});

router.post("/read-all", requireAuth, (req: AuthedRequest, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(req.userId);
  res.json({ ok: true });
});

export default router;
