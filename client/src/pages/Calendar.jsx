import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Image as ImageIcon, StickyNote } from "lucide-react";
import { api } from "../api.js";
import { useFormatTypes, useLiveResource } from "../store.jsx";
import { addDaysLocal, todayLocal, displayDate } from "../dateUtils.js";
import { STATUS_LABELS, RESULT_TAGS } from "../theme.js";
import Modal from "../components/Modal.jsx";
import FormatBadge from "../components/FormatBadge.jsx";
import FormatChipPicker from "../components/FormatChipPicker.jsx";

const PAST_DAYS = 3;
const FUTURE_DAYS = 10;

export default function Calendar() {
  const { formatTypes } = useFormatTypes();
  const [today, setToday] = useState(todayLocal());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(null);

  const range = useMemo(
    () => ({ start: addDaysLocal(today, -PAST_DAYS), end: addDaysLocal(today, FUTURE_DAYS) }),
    [today]
  );

  const refetch = useCallback(async () => {
    const rows = await api.getCalendarRange(range.start, range.end);
    setDays(rows);
    setLoading(false);
  }, [range.start, range.end]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useLiveResource("calendar", refetch);

  useEffect(() => {
    function onFocus() {
      setToday(todayLocal());
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const formatById = useMemo(() => new Map(formatTypes.map((f) => [f.id, f])), [formatTypes]);
  const activeDay = days.find((d) => d.date === activeDate);

  return (
    <div>
      <div className="page-header">
        <h2>Calendar</h2>
      </div>
      <p className="page-sub">Two weeks, rolling. Tap a day to assign a format, log status, or attach content.</p>

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : (
        <div className="calendar-list">
          {days.map((d) => (
            <DayCard key={d.date} day={d} isToday={d.date === today} onClick={() => setActiveDate(d.date)} />
          ))}
        </div>
      )}

      {activeDay && (
        <DayEditModal
          day={activeDay}
          formatTypes={formatTypes}
          onClose={() => setActiveDate(null)}
          onSaved={() => {
            setActiveDate(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function DayCard({ day, isToday, onClick }) {
  return (
    <div className={`day-card${isToday ? " today" : ""}`} onClick={onClick}>
      <div className="day-date">
        <div className="day-date-dow">{displayDate(day.date, { weekday: "short" }).split(" ")[0]}</div>
        <div className="day-date-num">{Number(day.date.slice(8, 10))}</div>
      </div>
      <div className="day-body">
        <div className="day-top-row">
          <FormatBadge name={day.format_name} color={day.format_color} />
          <span className={`status-pill status-${day.status}`}>{STATUS_LABELS[day.status]}</span>
          {day.status === "posted" && day.result_tag && (
            <span className={`result-tag result-${day.result_tag}`}>
              {RESULT_TAGS.find((r) => r.value === day.result_tag)?.label}
            </span>
          )}
          {day.status === "posted" && day.result_metric != null && (
            <span className="badge badge-muted">{day.result_metric.toLocaleString()}</span>
          )}
        </div>
        <div className="day-meta-row">
          {day.note ? (
            <span className="day-note">
              <StickyNote size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
              {day.note}
            </span>
          ) : !day.format_name ? (
            <span className="day-unassigned">Unassigned — TBD</span>
          ) : null}
          {day.linked_bank_item_id && (
            <span className="badge badge-muted">
              <Link2 size={11} /> Bank
            </span>
          )}
          {day.linked_inspo_item_id && (
            <span className="badge badge-muted">
              <ImageIcon size={11} /> Inspo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DayEditModal({ day, formatTypes, onClose, onSaved }) {
  const [formatTypeId, setFormatTypeId] = useState(day.format_type_id);
  const [status, setStatus] = useState(day.status);
  const [note, setNote] = useState(day.note || "");
  const [linkedBankItemId, setLinkedBankItemId] = useState(day.linked_bank_item_id || "");
  const [linkedInspoItemId, setLinkedInspoItemId] = useState(day.linked_inspo_item_id || "");
  const [resultMetric, setResultMetric] = useState(day.result_metric ?? "");
  const [resultTag, setResultTag] = useState(day.result_tag || "");
  const [bankItems, setBankItems] = useState([]);
  const [inspoItems, setInspoItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listBankItems().then(setBankItems);
    api.listInspo().then(setInspoItems);
  }, []);

  async function handleSave() {
    setSaving(true);
    await api.saveCalendarDay(day.date, {
      format_type_id: formatTypeId,
      status,
      note,
      linked_bank_item_id: linkedBankItemId || null,
      linked_inspo_item_id: linkedInspoItemId || null,
      result_metric: resultMetric === "" ? null : Number(resultMetric),
      result_tag: resultTag || null,
    });
    onSaved();
  }

  return (
    <Modal title={displayDate(day.date, { weekday: "long" })} onClose={onClose}>
      <div className="form-field">
        <label>Format</label>
        <FormatChipPicker formatTypes={formatTypes} value={formatTypeId} onChange={setFormatTypeId} includeNone />
      </div>

      <div className="form-field">
        <label>Status</label>
        <div className="chip-row">
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip${status === value ? " selected" : ""}`}
              style={status === value ? { background: "var(--brand)" } : undefined}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label>Note</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional free text" />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label>Linked bank item</label>
          <select value={linkedBankItemId} onChange={(e) => setLinkedBankItemId(e.target.value)}>
            <option value="">None</option>
            {bankItems.map((b) => (
              <option key={b.id} value={b.id}>
                {(b.format_name || "Untagged") + " · " + b.status + (b.note ? ` · ${b.note}` : "")}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Inspo reference</label>
          <select value={linkedInspoItemId} onChange={(e) => setLinkedInspoItemId(e.target.value)}>
            <option value="">None</option>
            {inspoItems.map((i) => (
              <option key={i.id} value={i.id}>
                {(i.format_name || "Untagged") + " · " + (i.note || (i.kind === "link" ? i.url : "screenshot"))}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status === "posted" && (
        <>
          <p className="section-title">Result (optional)</p>
          <div className="form-row">
            <div className="form-field">
              <label>Views / likes</label>
              <input
                type="number"
                min="0"
                value={resultMetric}
                onChange={(e) => setResultMetric(e.target.value)}
                placeholder="e.g. 4200"
              />
            </div>
            <div className="form-field">
              <label>Quick take</label>
              <div className="chip-row">
                {RESULT_TAGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`chip${resultTag === r.value ? " selected" : ""}`}
                    style={resultTag === r.value ? { background: "var(--brand)" } : undefined}
                    onClick={() => setResultTag(resultTag === r.value ? "" : r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
