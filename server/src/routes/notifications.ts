import { Router } from "express";
import { dbGet, dbAll, dbRun } from "../db";
import { requireAuth, AuthedRequest } from "../auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const notifications = await dbAll(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    [req.userId]
  );
  const row = (await dbGet<{ c: number }>(
    "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0",
    [req.userId]
  ))!;
  res.json({ notifications, unreadCount: Number(row.c) });
});

router.post("/:id/read", requireAuth, async (req: AuthedRequest, res) => {
  await dbRun("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.userId,
  ]);
  res.json({ ok: true });
});

router.post("/read-all", requireAuth, async (req: AuthedRequest, res) => {
  await dbRun("UPDATE notifications SET read = 1 WHERE user_id = ?", [req.userId]);
  res.json({ ok: true });
});

export default router;
