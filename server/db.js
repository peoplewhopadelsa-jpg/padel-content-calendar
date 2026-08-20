import { createClient } from "@libsql/client";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const dataDir = path.join(__dirname, "..", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  url = `file:${path.join(dataDir, "content.db")}`;
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function toPlain(result) {
  return result.rows.map((row) => {
    const obj = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function all(sql, args = []) {
  const result = await client.execute({ sql, args });
  return toPlain(result);
}

export async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

export async function run(sql, args = []) {
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : null,
    rowsAffected: result.rowsAffected,
  };
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS format_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS session_shoot_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    shot INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_shoot_items_session ON session_shoot_items(session_id)`,
  `CREATE TABLE IF NOT EXISTS bank_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    format_type_id INTEGER REFERENCES format_types(id) ON DELETE SET NULL,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'cut', 'ready')),
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bank_items_session ON bank_items(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bank_items_format ON bank_items(format_type_id)`,
  `CREATE TABLE IF NOT EXISTS inspo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('link', 'image')),
    url TEXT DEFAULT '',
    image_path TEXT DEFAULT '',
    format_type_id INTEGER REFERENCES format_types(id) ON DELETE SET NULL,
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_inspo_format ON inspo_items(format_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inspo_created ON inspo_items(created_at)`,
  `CREATE TABLE IF NOT EXISTS calendar_days (
    date TEXT PRIMARY KEY,
    format_type_id INTEGER REFERENCES format_types(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'needs_content' CHECK (status IN ('needs_content', 'ready_to_post', 'posted')),
    linked_bank_item_id INTEGER REFERENCES bank_items(id) ON DELETE SET NULL,
    linked_inspo_item_id INTEGER REFERENCES inspo_items(id) ON DELETE SET NULL,
    note TEXT DEFAULT '',
    result_metric INTEGER,
    result_tag TEXT CHECK (result_tag IS NULL OR result_tag IN ('worked_well', 'mid', 'flopped')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

export async function initDb() {
  await client.execute("PRAGMA foreign_keys = ON");
  for (const stmt of SCHEMA_STATEMENTS) {
    await client.execute(stmt);
  }

  const countRow = await get("SELECT COUNT(*) AS n FROM format_types");
  if (countRow.n === 0) {
    const defaults = [
      ["Video - social", "#3987e5"],
      ["Picture - social", "#199e70"],
      ["Trendy video", "#d55181"],
      ["Trendy creative", "#c98500"],
    ];
    for (let i = 0; i < defaults.length; i++) {
      const [name, color] = defaults[i];
      await run("INSERT INTO format_types (name, color, active, sort_order) VALUES (?, ?, 1, ?)", [name, color, i]);
    }
  }
}

export default client;
