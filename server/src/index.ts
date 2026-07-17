import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import "./db";
import { UPLOADS_DIR } from "./db";
import authRoutes from "./routes/auth";
import logsRoutes from "./routes/logs";
import friendsRoutes from "./routes/friends";
import feedRoutes from "./routes/feed";
import notificationsRoutes from "./routes/notifications";
import metaRoutes from "./routes/meta";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/api/auth", authRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/meta", metaRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Fit 15 API listening on http://localhost:${PORT}`);
});
