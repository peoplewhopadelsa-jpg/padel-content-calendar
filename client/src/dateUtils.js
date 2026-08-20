// All helpers operate on local calendar dates as plain YYYY-MM-DD strings.
// Never round-trip through toISOString() for local-date math — it silently
// shifts the date in any timezone ahead of UTC.

export function todayLocal() {
  const d = new Date();
  return formatLocal(d);
}

export function formatLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysLocal(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return formatLocal(date);
}

export function displayDate(dateStr, opts = {}) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: opts.weekday ?? "short",
    day: "numeric",
    month: "short",
  });
}
