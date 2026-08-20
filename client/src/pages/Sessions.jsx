import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { api } from "../api.js";
import { useLiveResource } from "../store.jsx";
import { displayDate, todayLocal } from "../dateUtils.js";
import Modal from "../components/Modal.jsx";

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState(new Set());

  const refetch = useCallback(async () => {
    const rows = await api.listSessions();
    setSessions(rows);
    setLoading(false);
    setExpanded((prev) => (prev.size ? prev : new Set(rows[0] ? [rows[0].id] : [])));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useLiveResource("sessions", refetch);

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDeleteSession(s) {
    if (!confirm(`Delete the session from ${displayDate(s.date)}? This removes its shoot list.`)) return;
    await api.deleteSession(s.id);
    refetch();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Sessions</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> New session
        </button>
      </div>
      <p className="page-sub">Shoot list for each session night. Check items off as you capture them.</p>

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">No sessions logged yet. Add one to start a shoot list.</div>
      ) : (
        <div className="session-list">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              isOpen={expanded.has(s.id)}
              onToggle={() => toggleExpanded(s.id)}
              onDelete={() => handleDeleteSession(s)}
              onChanged={refetch}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <NewSessionModal
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

function SessionCard({ session, isOpen, onToggle, onDelete, onChanged }) {
  const [newLabel, setNewLabel] = useState("");
  const shotCount = session.items.filter((i) => i.shot).length;

  async function toggleItem(item) {
    await api.updateShootItem(session.id, item.id, { shot: !item.shot });
    onChanged();
  }

  async function deleteItem(item) {
    await api.deleteShootItem(session.id, item.id);
    onChanged();
  }

  async function addItem(e) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    await api.addShootItem(session.id, newLabel.trim());
    setNewLabel("");
    onChanged();
  }

  return (
    <div className="card">
      <div className="session-card-header" onClick={onToggle}>
        <div>
          <p className="session-title">{displayDate(session.date, { weekday: "long" })}</p>
          {session.notes && <p className="session-meta">{session.notes}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="session-progress">
            {shotCount}/{session.items.length} shot
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete session"
          >
            <Trash2 size={15} />
          </button>
          {isOpen ? <ChevronUp size={18} color="var(--muted)" /> : <ChevronDown size={18} color="var(--muted)" />}
        </div>
      </div>

      {isOpen && (
        <>
          <ul className="shoot-list">
            {session.items.map((item) => (
              <li key={item.id} className={`shoot-item${item.shot ? " shot" : ""}`}>
                <button className="shoot-checkbox" onClick={() => toggleItem(item)} aria-label="Toggle shot">
                  {item.shot && <Check size={13} strokeWidth={3} />}
                </button>
                <span className="shoot-label">{item.label}</span>
                <button className="shoot-item-delete" onClick={() => deleteItem(item)} aria-label="Remove item">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <form className="shoot-add-row" onSubmit={addItem}>
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Add a shot to capture" />
            <button type="submit" className="btn btn-sm">
              Add
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function NewSessionModal({ onClose, onCreated }) {
  const [date, setDate] = useState(todayLocal());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createSession({ date, notes });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="New session" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <p className="text-muted" style={{ fontSize: 12, marginTop: -6 }}>
          The shoot list is copied from the most recent session — edit freely once created.
        </p>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create session"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
