const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function json(path, method, data) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function qs(params = {}) {
  const usable = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!usable.length) return "";
  return `?${new URLSearchParams(usable).toString()}`;
}

export const api = {
  // format types
  listFormatTypes: () => request("/format-types"),
  createFormatType: (data) => json("/format-types", "POST", data),
  updateFormatType: (id, data) => json(`/format-types/${id}`, "PUT", data),
  deleteFormatType: (id) => request(`/format-types/${id}`, { method: "DELETE" }),

  // calendar
  getCalendarRange: (start, end) => request(`/calendar${qs({ start, end })}`),
  saveCalendarDay: (date, data) => json(`/calendar/${date}`, "PUT", data),

  // inspo
  listInspo: (formatTypeId) => request(`/inspo${qs({ format_type_id: formatTypeId })}`),
  createInspoLink: (data) => json("/inspo", "POST", data),
  createInspoImage: (formData) => request("/inspo", { method: "POST", body: formData }),
  updateInspo: (id, data) => json(`/inspo/${id}`, "PUT", data),
  deleteInspo: (id) => request(`/inspo/${id}`, { method: "DELETE" }),

  // sessions
  listSessions: () => request("/sessions"),
  createSession: (data) => json("/sessions", "POST", data),
  updateSession: (id, data) => json(`/sessions/${id}`, "PUT", data),
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),
  addShootItem: (sessionId, label) => json(`/sessions/${sessionId}/items`, "POST", { label }),
  updateShootItem: (sessionId, itemId, data) =>
    json(`/sessions/${sessionId}/items/${itemId}`, "PUT", data),
  deleteShootItem: (sessionId, itemId) =>
    request(`/sessions/${sessionId}/items/${itemId}`, { method: "DELETE" }),

  // bank
  listBankItems: (filters) => request(`/bank${qs(filters)}`),
  getBankSummary: (sessionId) => request(`/bank/summary${qs({ session_id: sessionId })}`),
  createBankItem: (data) => json("/bank", "POST", data),
  updateBankItem: (id, data) => json(`/bank/${id}`, "PUT", data),
  deleteBankItem: (id) => request(`/bank/${id}`, { method: "DELETE" }),
};
