import { Router } from "express";
import { all, get, run } from "../db.js";
import { broadcast } from "../events.js";

const router = Router();

const SELECT = `
  SELECT c.*,
    f.name AS format_name, f.color AS format_color,
    bi.status AS bank_item_status, bi.note AS bank_item_note,
    ii.kind AS inspo_kind, ii.url AS inspo_url, ii.image_path AS inspo_image_path, ii.note AS inspo_note
  FROM calendar_days c
  LEFT JOIN format_types f ON f.id = c.format_type_id
  LEFT JOIN bank_items bi ON bi.id = c.linked_bank_item_id
  LEFT JOIN inspo_items ii ON ii.id = c.linked_inspo_item_id
`;

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + n);
  return utc.toISOString().slice(0, 10);
}

router.get("/", async (req, res) => {
  const { start, end } = req.query;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!start || !end || !dateRe.test(start) || !dateRe.test(end)) {
    return res.status(400).json({ error: "start and end are required as YYYY-MM-DD" });
  }
  if (end < start) return res.status(400).json({ error: "end must not be before start" });

  const rows = await all(`${SELECT} WHERE c.date >= ? AND c.date <= ?`, [start, end]);
  const byDate = new Map(rows.map((r) => [r.date, r]));

  const result = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 120) {
    guard += 1;
    result.push(
      byDate.get(cursor) || {
        date: cursor,
        format_type_id: null,
        status: "needs_content",
        linked_bank_item_id: null,
        linked_inspo_item_id: null,
        note: "",
        result_metric: null,
        result_tag: null,
        format_name: null,
        format_color: null,
      }
    );
    cursor = addDays(cursor, 1);
  }
  res.json(result);
});

router.put("/:date", async (req, res) => {
  const { date } = req.params;
  const {
    format_type_id,
    status,
    linked_bank_item_id,
    linked_inspo_item_id,
    note,
    result_metric,
    result_tag,
  } = req.body;

  const existing = await get("SELECT * FROM calendar_days WHERE date = ?", [date]);
  const merged = {
    format_type_id: format_type_id !== undefined ? format_type_id : existing?.format_type_id ?? null,
    status: status !== undefined ? status : existing?.status ?? "needs_content",
    linked_bank_item_id:
      linked_bank_item_id !== undefined ? linked_bank_item_id : existing?.linked_bank_item_id ?? null,
    linked_inspo_item_id:
      linked_inspo_item_id !== undefined ? linked_inspo_item_id : existing?.linked_inspo_item_id ?? null,
    note: note !== undefined ? note : existing?.note ?? "",
    result_metric: result_metric !== undefined ? result_metric : existing?.result_metric ?? null,
    result_tag: result_tag !== undefined ? result_tag : existing?.result_tag ?? null,
  };

  await run(
    `INSERT INTO calendar_days (date, format_type_id, status, linked_bank_item_id, linked_inspo_item_id, note, result_metric, result_tag, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(date) DO UPDATE SET
       format_type_id = excluded.format_type_id,
       status = excluded.status,
       linked_bank_item_id = excluded.linked_bank_item_id,
       linked_inspo_item_id = excluded.linked_inspo_item_id,
       note = excluded.note,
       result_metric = excluded.result_metric,
       result_tag = excluded.result_tag,
       updated_at = datetime('now')`,
    [
      date,
      merged.format_type_id,
      merged.status,
      merged.linked_bank_item_id,
      merged.linked_inspo_item_id,
      merged.note,
      merged.result_metric,
      merged.result_tag,
    ]
  );

  const row = await get(`${SELECT} WHERE c.date = ?`, [date]);
  broadcast("calendar");
  res.json(row);
});

export default router;
