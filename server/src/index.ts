import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import "./db";
import { UPLOADS_DIR } from "./db";
import authRoutes from "./routes/auth";
import logsRoutes from "./routes/logs";
import friendsRoutes from "./routes/friends";
import feedRoutes from "./routes/feed";
import notificationsRoutes from "./routes/notifications";
import metaRoutes from "./routes/meta";
import challengesRoutes from "./routes/challenges";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Render (and most PaaS hosts) sit behind a proxy; trust it so secure cookies work.
if (IS_PRODUCTION) app.set("trust proxy", 1);

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
app.use("/api/challenges", challengesRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// In production the built client (client/dist, copied to server/public) is served
// from this same process, so the whole app is reachable from one URL/port.
const CLIENT_DIST = path.join(__dirname, "..", "public");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Fit 15 API listening on http://localhost:${PORT}`);
});
