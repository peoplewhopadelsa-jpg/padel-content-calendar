import { Router } from "express";
import { all, get, run } from "../db.js";
import { broadcast } from "../events.js";

const router = Router();

const SELECT = `
  SELECT b.*, f.name AS format_name, f.color AS format_color, s.date AS session_date
  FROM bank_items b
  LEFT JOIN format_types f ON f.id = b.format_type_id
  LEFT JOIN sessions s ON s.id = b.session_id
`;

router.get("/", async (req, res) => {
  const { session_id, status } = req.query;
  const clauses = [];
  const args = [];
  if (session_id) {
    clauses.push("b.session_id = ?");
    args.push(session_id);
  }
  if (status) {
    clauses.push("b.status = ?");
    args.push(status);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const rows = await all(`${SELECT}${where} ORDER BY b.created_at DESC, b.id DESC`, args);
  res.json(rows);
});

router.get("/summary", async (req, res) => {
  let sessionId = req.query.session_id;
  if (!sessionId) {
    const latest = await get("SELECT id FROM sessions ORDER BY date DESC, id DESC LIMIT 1");
    sessionId = latest ? latest.id : null;
  }
  const formats = await all("SELECT * FROM format_types WHERE active = 1 ORDER BY sort_order, id");
  const counts = sessionId
    ? await all(
        `SELECT format_type_id, status, COUNT(*) AS n FROM bank_items WHERE session_id = ? GROUP BY format_type_id, status`,
        [sessionId]
      )
    : [];
  const byFormat = formats.map((f) => {
    const rows = counts.filter((c) => c.format_type_id === f.id);
    const raw = rows.find((r) => r.status === "raw")?.n || 0;
    const cut = rows.find((r) => r.status === "cut")?.n || 0;
    const ready = rows.find((r) => r.status === "ready")?.n || 0;
    return { format_type_id: f.id, name: f.name, color: f.color, raw, cut, ready, total: raw + cut + ready };
  });
  res.json({ session_id: sessionId, by_format: byFormat });
});

router.post("/", async (req, res) => {
  const { format_type_id, session_id, status, note } = req.body;
  const result = await run("INSERT INTO bank_items (format_type_id, session_id, status, note) VALUES (?, ?, ?, ?)", [
    format_type_id || null,
    session_id || null,
    status || "raw",
    note || "",
  ]);
  const row = await get(`${SELECT} WHERE b.id = ?`, [result.lastInsertRowid]);
  broadcast("bank");
  res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const existing = await get("SELECT * FROM bank_items WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { format_type_id, session_id, status, note } = req.body;
  await run("UPDATE bank_items SET format_type_id = ?, session_id = ?, status = ?, note = ? WHERE id = ?", [
    format_type_id !== undefined ? format_type_id : existing.format_type_id,
    session_id !== undefined ? session_id : existing.session_id,
    status != null ? status : existing.status,
    note != null ? note : existing.note,
    req.params.id,
  ]);
  const row = await get(`${SELECT} WHERE b.id = ?`, [req.params.id]);
  broadcast("bank");
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  await run("DELETE FROM bank_items WHERE id = ?", [req.params.id]);
  broadcast("bank");
  res.status(204).end();
});

export default router;
