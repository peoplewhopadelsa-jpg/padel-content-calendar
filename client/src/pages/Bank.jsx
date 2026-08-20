import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { useFormatTypes, useLiveResource } from "../store.jsx";
import { BANK_STATUS_LABELS } from "../theme.js";
import { displayDate } from "../dateUtils.js";
import Modal from "../components/Modal.jsx";
import FormatChipPicker from "../components/FormatChipPicker.jsx";

export default function Bank() {
  const { formatTypes } = useFormatTypes();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.listSessions().then((rows) => {
      setSessions(rows);
      if (rows[0]) setSessionId(String(rows[0].id));
    });
  }, []);

  const refetch = useCallback(async () => {
    if (!sessionId) {
      setSummary(null);
      setItems([]);
      setLoading(false);
      return;
    }
    const [s, i] = await Promise.all([api.getBankSummary(sessionId), api.listBankItems({ session_id: sessionId })]);
    setSummary(s);
    setItems(i);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useLiveResource("bank", refetch);
  useLiveResource("sessions", useCallback(() => api.listSessions().then(setSessions), []));

  async function handleStatusChange(item, status) {
    await api.updateBankItem(item.id, { status });
    refetch();
  }

  async function handleDelete(item) {
    if (!confirm("Delete this bank item?")) return;
    await api.deleteBankItem(item.id);
    refetch();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Content bank</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={!sessions.length}>
          <Plus size={16} /> Add item
        </button>
      </div>
      <p className="page-sub">What's shot and edited for the in-progress cycle, before it becomes the next posting bank.</p>

      {sessions.length === 0 ? (
        <div className="empty-state">Create a session first — bank items are tracked against a session's shoot.</div>
      ) : (
        <>
          <div className="form-field" style={{ maxWidth: 280 }}>
            <label>Cycle (session)</label>
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {displayDate(s.date, { weekday: "long" })}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="loading-state">Loading…</div>
          ) : (
            <>
              <div className="bank-summary-grid">
                {summary?.by_format.map((f) => (
                  <div key={f.format_type_id} className="bank-summary-card">
                    <p className="bank-summary-name">
                      <span className="badge-dot" style={{ background: f.color }} />
                      {f.name}
                    </p>
                    <p className="bank-summary-total">{f.total}</p>
                    <div className="bank-summary-bar">
                      {f.total > 0 && (
                        <>
                          <div style={{ width: `${(f.raw / f.total) * 100}%`, background: "var(--baseline)" }} />
                          <div style={{ width: `${(f.cut / f.total) * 100}%`, background: "var(--muted)" }} />
                          <div style={{ width: `${(f.ready / f.total) * 100}%`, background: "var(--brand)" }} />
                        </>
                      )}
                    </div>
                    <div className="bank-summary-breakdown">
                      <span>{f.raw} raw</span>
                      <span>{f.cut} cut</span>
                      <span>{f.ready} ready</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="section-title">Items</p>
              {items.length === 0 ? (
                <div className="empty-state">No bank items for this cycle yet.</div>
              ) : (
                <div className="bank-list">
                  {items.map((item) => (
                    <div key={item.id} className="bank-item-row">
                      {item.format_name ? (
                        <span className="badge">
                          <span className="badge-dot" style={{ background: item.format_color }} />
                          {item.format_name}
                        </span>
                      ) : (
                        <span className="badge badge-muted">Untagged</span>
                      )}
                      <div className="bank-item-main">
                        {item.note && <span className="bank-item-note">{item.note}</span>}
                      </div>
                      <select
                        className="status-select"
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                      >
                        {Object.entries(BANK_STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item)} aria-label="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAdd && (
        <AddBankItemModal
          formatTypes={formatTypes.filter((f) => f.active)}
          sessions={sessions}
          defaultSessionId={sessionId}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function AddBankItemModal({ formatTypes, sessions, defaultSessionId, onClose, onAdded }) {
  const [sessionId, setSessionId] = useState(defaultSessionId);
  const [formatTypeId, setFormatTypeId] = useState(null);
  const [status, setStatus] = useState("raw");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await api.createBankItem({ session_id: sessionId || null, format_type_id: formatTypeId, status, note });
    onAdded();
  }

  return (
    <Modal title="Add bank item" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Session</label>
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {displayDate(s.date, { weekday: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Format</label>
          <FormatChipPicker formatTypes={formatTypes} value={formatTypeId} onChange={setFormatTypeId} includeNone />
        </div>
        <div className="form-field">
          <label>Status</label>
          <div className="chip-row">
            {Object.entries(BANK_STATUS_LABELS).map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={`chip${status === v ? " selected" : ""}`}
                style={status === v ? { background: "var(--brand)" } : undefined}
                onClick={() => setStatus(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Adding…" : "Add item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
