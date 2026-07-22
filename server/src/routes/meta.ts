import { Router } from "express";
import { ACTIVITY_TYPES } from "../activities";
import { AVATAR_EMOJIS } from "../avatars";

const router = Router();

router.get("/activities", (_req, res) => {
  res.json({ activities: ACTIVITY_TYPES });
});

router.get("/avatars", (_req, res) => {
  res.json({ avatars: AVATAR_EMOJIS });
});

export default router;
