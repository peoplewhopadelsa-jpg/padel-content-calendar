import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Link2, Upload } from "lucide-react";
import { api } from "../api.js";
import { useFormatTypes, useLiveResource } from "../store.jsx";
import Modal from "../components/Modal.jsx";

export default function Inspo() {
  const { formatTypes } = useFormatTypes();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const refetch = useCallback(async () => {
    const rows = await api.listInspo(filter || undefined);
    setItems(rows);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useLiveResource("inspo", refetch);

  async function handleDelete(item) {
    if (!confirm("Delete this inspo item?")) return;
    await api.deleteInspo(item.id);
    refetch();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Inspo bank</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add inspo
        </button>
      </div>

      <div className="inspo-toolbar">
        <button className={`chip${filter === null ? " selected" : ""}`} style={filter === null ? { background: "var(--brand)" } : undefined} onClick={() => setFilter(null)}>
          All
        </button>
        {formatTypes.filter((f) => f.active).map((f) => (
          <button
            key={f.id}
            className={`chip${filter === f.id ? " selected" : ""}`}
            style={filter === f.id ? { background: f.color } : undefined}
            onClick={() => setFilter(filter === f.id ? null : f.id)}
          >
            <span className="chip-dot" style={{ background: f.color }} />
            {f.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">Nothing saved yet. Paste a link or upload a screenshot to get started.</div>
      ) : (
        <div className="inspo-grid">
          {items.map((item) => (
            <InspoCard key={item.id} item={item} onDelete={() => handleDelete(item)} onOpenImage={setLightbox} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddInspoModal
          formatTypes={formatTypes.filter((f) => f.active)}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}

      {lightbox && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setLightbox(null)}>
          <img src={lightbox} alt="" style={{ maxWidth: "94vw", maxHeight: "90vh", borderRadius: 10 }} />
        </div>
      )}
    </div>
  );
}

function InspoCard({ item, onDelete, onOpenImage }) {
  const domain = item.kind === "link" ? safeHostname(item.url) : null;

  return (
    <div className="inspo-card">
      <button className="inspo-delete" onClick={onDelete} aria-label="Delete">
        <Trash2 size={13} />
      </button>
      {item.kind === "image" ? (
        <img
          className="inspo-thumb"
          src={item.image_path}
          alt={item.note || "inspo screenshot"}
          onClick={() => onOpenImage(item.image_path)}
        />
      ) : (
        <a className="inspo-link-thumb" href={item.url} target="_blank" rel="noreferrer">
          <Link2 size={26} />
          <span className="inspo-link-domain">{domain}</span>
        </a>
      )}
      <div className="inspo-body">
        {item.format_name ? (
          <span className="badge">
            <span className="badge-dot" style={{ background: item.format_color }} />
            {item.format_name}
          </span>
        ) : (
          <span className="badge badge-muted">Untagged</span>
        )}
        {item.note && <div className="inspo-note">{item.note}</div>}
      </div>
    </div>
  );
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function AddInspoModal({ formatTypes, onClose, onAdded }) {
  const [mode, setMode] = useState("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(formatTypeId) {
    setError("");
    if (mode === "link" && !url.trim()) {
      setError("Paste a link first");
      return;
    }
    if (mode === "image" && !file) {
      setError("Choose a screenshot first");
      return;
    }
    setSaving(true);
    try {
      if (mode === "link") {
        await api.createInspoLink({ url: url.trim(), note, format_type_id: formatTypeId });
      } else {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("note", note);
        if (formatTypeId) formData.append("format_type_id", formatTypeId);
        await api.createInspoImage(formData);
      }
      onAdded();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Add inspo" onClose={onClose}>
      <div className="add-mode-toggle">
        <button type="button" className={`btn${mode === "link" ? " active" : ""}`} onClick={() => setMode("link")}>
          <Link2 size={15} /> Link
        </button>
        <button type="button" className={`btn${mode === "image" ? " active" : ""}`} onClick={() => setMode("image")}>
          <Upload size={15} /> Screenshot
        </button>
      </div>

      {mode === "link" ? (
        <div className="form-field">
          <label>Reel / TikTok link</label>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste link here"
            inputMode="url"
          />
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <div
            className={`upload-dropzone${file ? " has-file" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img className="upload-preview" src={preview} alt="preview" />
            ) : (
              <>
                <Upload size={22} />
                <div style={{ marginTop: 8 }}>Tap to choose a screenshot</div>
              </>
            )}
          </div>
        </>
      )}

      {showNote ? (
        <div className="form-field">
          <label>Note</label>
          <input autoFocus={mode === "image"} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 14, padding: "4px 0" }} onClick={() => setShowNote(true)}>
          + Add a note
        </button>
      )}

      {error && <div className="form-error">{error}</div>}

      <div className="form-field">
        <label>Tag it to save</label>
        <div className="chip-row">
          {formatTypes.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip"
              style={{ borderColor: f.color }}
              disabled={saving}
              onClick={() => submit(f.id)}
            >
              <span className="chip-dot" style={{ background: f.color }} />
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => submit(null)}>
          {saving ? "Saving…" : "Save without tag"}
        </button>
      </div>
    </Modal>
  );
}
