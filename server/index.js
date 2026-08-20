import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { initDb } from "./db.js";
import { eventsRouter } from "./events.js";
import formatTypesRouter from "./routes/formatTypes.js";
import sessionsRouter from "./routes/sessions.js";
import bankRouter from "./routes/bank.js";
import inspoRouter from "./routes/inspo.js";
import calendarRouter from "./routes/calendar.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await initDb();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/events", eventsRouter);
app.use("/api/format-types", formatTypesRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/bank", bankRouter);
app.use("/api/inspo", inspoRouter);
app.use("/api/calendar", calendarRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Padel content calendar API listening on http://localhost:${PORT}`);
});
