import { Router } from "express";
import { all, get, run } from "../db.js";
import { broadcast } from "../events.js";

const router = Router();

const DEFAULT_TEMPLATE = [
  "Wide court establishing shot",
  "Rally close-ups",
  "Player reactions / celebrations",
  "Crowd / social atmosphere",
  "Interviews / quotes",
  "Behind the scenes setup",
];

async function itemsForSession(sessionId) {
  return all("SELECT * FROM session_shoot_items WHERE session_id = ? ORDER BY sort_order, id", [sessionId]);
}

router.get("/", async (_req, res) => {
  const sessions = await all("SELECT * FROM sessions ORDER BY date DESC, id DESC");
  const withItems = await Promise.all(sessions.map(async (s) => ({ ...s, items: await itemsForSession(s.id) })));
  res.json(withItems);
});

router.get("/:id", async (req, res) => {
  const session = await get("SELECT * FROM sessions WHERE id = ?", [req.params.id]);
  if (!session) return res.status(404).json({ error: "Not found" });
  res.json({ ...session, items: await itemsForSession(session.id) });
});

router.post("/", async (req, res) => {
  const { date, notes } = req.body;
  if (!date) return res.status(400).json({ error: "Date is required" });

  const result = await run("INSERT INTO sessions (date, notes) VALUES (?, ?)", [date, notes || ""]);
  const sessionId = result.lastInsertRowid;

  const mostRecent = await get("SELECT id FROM sessions WHERE id != ? ORDER BY date DESC, id DESC LIMIT 1", [
    sessionId,
  ]);
  const templateLabels = mostRecent
    ? (await itemsForSession(mostRecent.id)).map((i) => i.label)
    : DEFAULT_TEMPLATE;

  for (let i = 0; i < templateLabels.length; i++) {
    await run("INSERT INTO session_shoot_items (session_id, label, shot, sort_order) VALUES (?, ?, 0, ?)", [
      sessionId,
      templateLabels[i],
      i,
    ]);
  }

  const session = await get("SELECT * FROM sessions WHERE id = ?", [sessionId]);
  broadcast("sessions");
  res.status(201).json({ ...session, items: await itemsForSession(sessionId) });
});

router.put("/:id", async (req, res) => {
  const existing = await get("SELECT * FROM sessions WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { date, notes } = req.body;
  await run("UPDATE sessions SET date = ?, notes = ? WHERE id = ?", [
    date != null ? date : existing.date,
    notes != null ? notes : existing.notes,
    req.params.id,
  ]);
  const session = await get("SELECT * FROM sessions WHERE id = ?", [req.params.id]);
  broadcast("sessions");
  res.json({ ...session, items: await itemsForSession(session.id) });
});

router.delete("/:id", async (req, res) => {
  await run("DELETE FROM sessions WHERE id = ?", [req.params.id]);
  broadcast("sessions");
  res.status(204).end();
});

router.post("/:id/items", async (req, res) => {
  const { label } = req.body;
  if (!label || !label.trim()) return res.status(400).json({ error: "Label is required" });
  const maxRow = await get("SELECT COALESCE(MAX(sort_order), -1) AS m FROM session_shoot_items WHERE session_id = ?", [
    req.params.id,
  ]);
  await run("INSERT INTO session_shoot_items (session_id, label, shot, sort_order) VALUES (?, ?, 0, ?)", [
    req.params.id,
    label.trim(),
    Number(maxRow.m) + 1,
  ]);
  broadcast("sessions");
  res.status(201).json(await itemsForSession(req.params.id));
});

router.put("/:id/items/:itemId", async (req, res) => {
  const existing = await get("SELECT * FROM session_shoot_items WHERE id = ? AND session_id = ?", [
    req.params.itemId,
    req.params.id,
  ]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { label, shot } = req.body;
  await run("UPDATE session_shoot_items SET label = ?, shot = ? WHERE id = ?", [
    label != null ? label.trim() : existing.label,
    shot != null ? (shot ? 1 : 0) : existing.shot,
    req.params.itemId,
  ]);
  broadcast("sessions");
  res.json(await itemsForSession(req.params.id));
});

router.delete("/:id/items/:itemId", async (req, res) => {
  await run("DELETE FROM session_shoot_items WHERE id = ? AND session_id = ?", [req.params.itemId, req.params.id]);
  broadcast("sessions");
  res.json(await itemsForSession(req.params.id));
});

export default router;
