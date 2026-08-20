import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { all, get, run } from "../db.js";
import { broadcast } from "../events.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

const CLOUDINARY_ENABLED = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Buffered in memory either way: pushed straight to Cloudinary when configured
// (needed for hosts like Render whose local disk doesn't persist), otherwise
// written to local disk so local dev needs no cloud account at all.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image uploads are allowed"));
    cb(null, true);
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "padel-content-calendar" }, (err, result) => {
      if (err) reject(err);
      else resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

function saveLocally(file) {
  const ext = path.extname(file.originalname) || ".jpg";
  const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, name), file.buffer);
  return `/uploads/${name}`;
}

const router = Router();

const SELECT = `
  SELECT i.*, f.name AS format_name, f.color AS format_color
  FROM inspo_items i
  LEFT JOIN format_types f ON f.id = i.format_type_id
`;

router.get("/", async (req, res) => {
  const { format_type_id } = req.query;
  const where = format_type_id ? " WHERE i.format_type_id = ?" : "";
  const args = format_type_id ? [format_type_id] : [];
  const rows = await all(`${SELECT}${where} ORDER BY i.created_at DESC, i.id DESC`, args);
  res.json(rows);
});

router.post("/", upload.single("image"), async (req, res) => {
  const { url, note, format_type_id } = req.body;
  const isImage = !!req.file;

  if (!isImage && (!url || !url.trim())) {
    return res.status(400).json({ error: "Provide a link or upload an image" });
  }

  let imagePath = "";
  if (isImage) {
    try {
      imagePath = CLOUDINARY_ENABLED ? await uploadToCloudinary(req.file.buffer) : saveLocally(req.file);
    } catch (err) {
      return res.status(502).json({ error: `Image upload failed: ${err.message}` });
    }
  }

  const result = await run(
    "INSERT INTO inspo_items (kind, url, image_path, format_type_id, note) VALUES (?, ?, ?, ?, ?)",
    [isImage ? "image" : "link", isImage ? "" : url.trim(), imagePath, format_type_id || null, note || ""]
  );

  const row = await get(`${SELECT} WHERE i.id = ?`, [result.lastInsertRowid]);
  broadcast("inspo");
  res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const existing = await get("SELECT * FROM inspo_items WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { format_type_id, note } = req.body;
  await run("UPDATE inspo_items SET format_type_id = ?, note = ? WHERE id = ?", [
    format_type_id !== undefined ? format_type_id : existing.format_type_id,
    note != null ? note : existing.note,
    req.params.id,
  ]);
  const row = await get(`${SELECT} WHERE i.id = ?`, [req.params.id]);
  broadcast("inspo");
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const existing = await get("SELECT * FROM inspo_items WHERE id = ?", [req.params.id]);
  if (existing?.image_path?.startsWith("/uploads/")) {
    fs.unlink(path.join(__dirname, "..", existing.image_path), () => {});
  }
  // Cloudinary-hosted images are left in place on delete — the DB row is the
  // source of truth and orphaned assets are a non-issue on the free tier.
  await run("DELETE FROM inspo_items WHERE id = ?", [req.params.id]);
  broadcast("inspo");
  res.status(204).end();
});

export default router;
