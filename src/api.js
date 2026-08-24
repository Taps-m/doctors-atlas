// api.js
// Thin fetch wrapper for the Doctors Atlas FastAPI backend.
// Set VITE_API_URL in a .env file (or Vercel env vars) to point at
// your deployed backend, e.g. https://your-backend.onrender.com

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("atlas_token");
}

function setToken(token) {
  if (token) localStorage.setItem("atlas_token", token);
  else localStorage.removeItem("atlas_token");
}

/**
 * Short-lived cache of in-flight and just-finished GETs.
 *
 * The dashboard's cards each fetch their own data so they stay
 * independent of one another - good for keeping them decoupled, but it
 * meant one page load fired /daily-log four times, /appointments twice
 * and /stats twice. Identical GETs issued close together now share a
 * single network request, which roughly halves the calls without any
 * component needing to know about it.
 *
 * Deliberately tiny: GETs only, a few seconds, and any write clears it
 * so nothing can serve stale data after a change.
 */
const GET_CACHE_MS = 8000;
const getCache = new Map(); // path -> { at, promise }

function cacheKey(path) {
  return `${getToken() ? "auth" : "anon"}:${path}`;
}

export function clearApiCache() {
  getCache.clear();
}

async function rawRequest(path, { method, body, form, auth }) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  let payload = body;
  if (body && !form) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errJson = await res.json();
      detail = errJson.detail || detail;
    } catch (_) {
      /* ignore parse error */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function request(path, { method = "GET", body, form = false, auth = true } = {}) {
  // Anything that changes data invalidates the cache and is never
  // itself cached.
  if (method !== "GET") {
    getCache.clear();
    return rawRequest(path, { method, body, form, auth });
  }

  const key = cacheKey(path);
  const hit = getCache.get(key);
  if (hit && Date.now() - hit.at < GET_CACHE_MS) {
    return hit.promise;
  }

  const promise = rawRequest(path, { method, body, form, auth });
  getCache.set(key, { at: Date.now(), promise });

  // A failed request must not be remembered, or every card retrying
  // would get the same rejection back for the next few seconds.
  promise.catch(() => {
    const current = getCache.get(key);
    if (current && current.promise === promise) getCache.delete(key);
  });

  return promise;
}

export const api = {
  // ---------- Auth ----------
  async register({ name, email, password, role = "doctor", clinicName, avatarUrl }) {
    const data = await request("/auth/register", {
      method: "POST",
      body: { name, email, password, role, clinic_name: clinicName, avatar_url: avatarUrl },
    });
    setToken(data.access_token);
    return data;
  },

  async login({ email, password }) {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const data = await request("/auth/login", { method: "POST", body: form, form: true });
    setToken(data.access_token);
    return data;
  },

  logout() {
    setToken(null);
    // Never let one account's cached responses survive into the next
    // session in the same tab.
    clearApiCache();
  },

  isLoggedIn() {
    return !!getToken();
  },

  async me() {
    return request("/auth/me");
  },

  // ---------- Stats ----------
  async getStats({ days = 17, start, end } = {}) {
    const params = new URLSearchParams();
    if (start && end) {
      params.set("start", start);
      params.set("end", end);
    } else {
      params.set("days", days);
    }
    return request(`/stats?${params.toString()}`);
  },

  // ---------- AI Advisor ----------
  async askAdvisor(question) {
    return request("/advisor/ask", { method: "POST", body: { question } });
  },

  async getStage() {
    return request("/advisor/stage");
  },

  // ---------- Daily log ----------
  async saveDailyLog(payload) {
    return request("/daily-log", { method: "POST", body: payload });
  },

  async listDailyLogs(limit = 30) {
    return request(`/daily-log?limit=${limit}`);
  },

  // ---------- Actions / Experiments ----------
  async listActions() {
    return request("/actions");
  },

  async createAction({ title, description }) {
    return request("/actions", {
      method: "POST",
      body: { title, description: description || null },
    });
  },

  async startAction(id) {
    return request(`/actions/${id}/start`, { method: "POST" });
  },

  async dismissAction(id) {
    return request(`/actions/${id}/dismiss`, { method: "POST" });
  },

  async measureAction(id) {
    return request(`/actions/${id}/measure`, { method: "POST" });
  },

  // ---------- Patients ----------
  async listPatients() {
    return request("/patients");
  },

  async addPatient({ name, phone, firstVisitAt }) {
    return request("/patients", {
      method: "POST",
      body: { name, phone, first_visit_at: firstVisitAt || null },
    });
  },

  async deletePatient(id) {
    return request(`/patients/${id}`, { method: "DELETE" });
  },

  // ---------- Appointments ----------
  async listAppointments() {
    return request("/appointments");
  },

  async addAppointment({ patientId, scheduledAt }) {
    return request("/appointments", {
      method: "POST",
      body: { patient_id: patientId, scheduled_at: scheduledAt },
    });
  },

  async updateAppointmentStatus(id, status) {
    return request(`/appointments/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  async deleteAppointment(id) {
    return request(`/appointments/${id}`, { method: "DELETE" });
  },

  // ---------- Settings ----------
  async updateProfile({ name, avatarUrl } = {}) {
    const body = {};
    if (name !== undefined) body.name = name;
    if (avatarUrl !== undefined) body.avatar_url = avatarUrl;
    return request("/settings/profile", { method: "PATCH", body });
  },

  async changePassword({ currentPassword, newPassword }) {
    return request("/settings/change-password", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    });
  },

  async getClinic() {
    return request("/settings/clinic");
  },

  // Both fields are optional - send either or both. Pass logoUrl as an
  // empty string to remove an existing logo.
  async updateClinic({ name, logoUrl } = {}) {
    const body = {};
    if (name !== undefined) body.name = name;
    if (logoUrl !== undefined) body.logo_url = logoUrl;
    return request("/settings/clinic", { method: "PATCH", body });
  },

  async listStaff() {
    return request("/settings/staff");
  },

  async removeStaff(id) {
    return request(`/settings/staff/${id}`, { method: "DELETE" });
  },
};
