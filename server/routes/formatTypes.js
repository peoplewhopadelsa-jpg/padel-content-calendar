import { Router } from "express";
import { all, get, run } from "../db.js";
import { broadcast } from "../events.js";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await all("SELECT * FROM format_types ORDER BY sort_order, id");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  if (!color) return res.status(400).json({ error: "Color is required" });
  const maxRow = await get("SELECT COALESCE(MAX(sort_order), -1) AS m FROM format_types");
  const result = await run("INSERT INTO format_types (name, color, active, sort_order) VALUES (?, ?, 1, ?)", [
    name.trim(),
    color,
    Number(maxRow.m) + 1,
  ]);
  const row = await get("SELECT * FROM format_types WHERE id = ?", [result.lastInsertRowid]);
  broadcast("format-types");
  res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const { name, color, active } = req.body;
  const existing = await get("SELECT * FROM format_types WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  await run("UPDATE format_types SET name = ?, color = ?, active = ? WHERE id = ?", [
    name != null ? name.trim() : existing.name,
    color != null ? color : existing.color,
    active != null ? (active ? 1 : 0) : existing.active,
    req.params.id,
  ]);
  const row = await get("SELECT * FROM format_types WHERE id = ?", [req.params.id]);
  broadcast("format-types");
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  await run("DELETE FROM format_types WHERE id = ?", [req.params.id]);
  broadcast("format-types");
  res.status(204).end();
});

export default router;
