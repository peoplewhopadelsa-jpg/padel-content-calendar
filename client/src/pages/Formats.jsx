import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { api } from "../api.js";
import { useFormatTypes } from "../store.jsx";
import { SWATCHES } from "../theme.js";
import Modal from "../components/Modal.jsx";

export default function Formats() {
  const { formatTypes, loading, refetch } = useFormatTypes();
  const [showAdd, setShowAdd] = useState(false);
  const [openSwatchFor, setOpenSwatchFor] = useState(null);

  async function handleRename(f, name) {
    if (name === f.name) return;
    await api.updateFormatType(f.id, { name });
    refetch();
  }

  async function handleColor(f, color) {
    setOpenSwatchFor(null);
    await api.updateFormatType(f.id, { color });
    refetch();
  }

  async function handleToggleActive(f) {
    await api.updateFormatType(f.id, { active: f.active ? 0 : 1 });
    refetch();
  }

  async function handleDelete(f) {
    if (!confirm(`Delete "${f.name}"? Past items tagged with it will show as untagged.`)) return;
    await api.deleteFormatType(f.id);
    refetch();
  }

  const active = formatTypes.filter((f) => f.active);
  const inactive = formatTypes.filter((f) => !f.active);

  return (
    <div>
      <div className="page-header">
        <h2>Formats</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add format
        </button>
      </div>
      <p className="page-sub">
        The colour-coded tags used across the calendar and inspo bank. Add, rename, or remove any time.
      </p>

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : formatTypes.length === 0 ? (
        <div className="empty-state">No format types yet. Add your first one to get started.</div>
      ) : (
        <>
          <div className="format-list">
            {active.map((f) => (
              <FormatRow
                key={f.id}
                f={f}
                openSwatchFor={openSwatchFor}
                setOpenSwatchFor={setOpenSwatchFor}
                onRename={handleRename}
                onColor={handleColor}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {inactive.length > 0 && (
            <>
              <p className="section-title">Inactive</p>
              <div className="format-list">
                {inactive.map((f) => (
                  <FormatRow
                    key={f.id}
                    f={f}
                    openSwatchFor={openSwatchFor}
                    setOpenSwatchFor={setOpenSwatchFor}
                    onRename={handleRename}
                    onColor={handleColor}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showAdd && (
        <AddFormatModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function FormatRow({ f, openSwatchFor, setOpenSwatchFor, onRename, onColor, onToggleActive, onDelete }) {
  return (
    <div className={`format-row${!f.active ? " inactive-row" : ""}`}>
      <div style={{ position: "relative" }}>
        <button
          className="format-swatch"
          style={{ background: f.color }}
          onClick={() => setOpenSwatchFor(openSwatchFor === f.id ? null : f.id)}
          aria-label="Change colour"
        />
        {openSwatchFor === f.id && (
          <div
            className="card"
            style={{ position: "absolute", top: 30, left: 0, zIndex: 10, padding: 10, width: 160 }}
          >
            <div className="swatch-picker">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  className={c === f.color ? "selected" : ""}
                  style={{ background: c }}
                  onClick={() => onColor(f, c)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <input
        className="format-name-input"
        defaultValue={f.name}
        onBlur={(e) => onRename(f, e.target.value.trim() || f.name)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
        <input type="checkbox" checked={!!f.active} onChange={() => onToggleActive(f)} />
        Active
      </label>
      <button className="btn btn-ghost btn-sm" onClick={() => onDelete(f)} aria-label="Delete">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function AddFormatModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Name is required");
    setSaving(true);
    try {
      await api.createFormatType({ name: name.trim(), color });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Add format type" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Name</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meme" />
        </div>
        <div className="form-field">
          <label>Colour tag</label>
          <div className="swatch-picker">
            {SWATCHES.map((c) => (
              <button
                type="button"
                key={c}
                className={c === color ? "selected" : ""}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Adding…" : "Add format"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
