import { Router } from "express";
import { ACTIVITY_TYPES } from "../activities";

const router = Router();

router.get("/activities", (_req, res) => {
  res.json({ activities: ACTIVITY_TYPES });
});

export default router;
