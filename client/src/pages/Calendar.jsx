import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useFormatTypes, useLiveResource } from "../store.jsx";
import { addDaysLocal, formatLocal, todayLocal, displayDate } from "../dateUtils.js";
import { STATUS_LABELS, RESULT_TAGS } from "../theme.js";
import Modal from "../components/Modal.jsx";
import FormatChipPicker from "../components/FormatChipPicker.jsx";

// The grid always spans two full Sun–Sat weeks (the current week plus the
// next one) so it lines up cleanly under 7 weekday columns with no filler
// cells — still a 2-week rolling window, just week-aligned instead of an
// arbitrary today-centered offset.
function startOfWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - date.getDay());
  return formatLocal(date);
}

function statusDotColor(day) {
  if (day.status === "posted") {
    if (day.result_tag === "worked_well") return "var(--good)";
    if (day.result_tag === "flopped") return "var(--bad)";
    if (day.result_tag === "mid") return "#eda100";
    return "var(--text-secondary)";
  }
  if (day.status === "ready_to_post") return "var(--brand)";
  return "var(--bad)";
}

export default function Calendar() {
  const { formatTypes } = useFormatTypes();
  const [today, setToday] = useState(todayLocal());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(null);

  const range = useMemo(() => {
    const start = startOfWeek(today);
    return { start, end: addDaysLocal(start, 13) };
  }, [today]);

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
        <>
          <div className="calendar-weekdays">
            {days.slice(0, 7).map((d) => (
              <span key={d.date}>{displayDate(d.date, { weekday: "short" }).split(" ")[0]}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((d) => (
              <DayCell key={d.date} day={d} isToday={d.date === today} onClick={() => setActiveDate(d.date)} />
            ))}
          </div>
        </>
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

function DayCell({ day, isToday, onClick }) {
  return (
    <div className={`cal-cell${isToday ? " today" : ""}`} onClick={onClick}>
      <div className="cal-cell-top">
        <span className="cal-cell-date">{Number(day.date.slice(8, 10))}</span>
        <span className="cal-status-dot" style={{ background: statusDotColor(day) }} />
      </div>
      {day.format_name && (
        <>
          <span className="cal-cell-format" style={{ background: day.format_color }}>
            {day.format_name}
          </span>
          <span className="cal-cell-format-dot" style={{ background: day.format_color }} />
        </>
      )}
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
