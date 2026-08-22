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

async function request(path, { method = "GET", body, form = false, auth = true } = {}) {
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

export const api = {
  // ---------- Auth ----------
  async register({ name, email, password, role = "doctor", clinicName }) {
    const data = await request("/auth/register", {
      method: "POST",
      body: { name, email, password, role, clinic_name: clinicName },
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
  },

  isLoggedIn() {
    return !!getToken();
  },

  async me() {
    return request("/auth/me");
  },

  // ---------- Stats ----------
  async getStats(days = 17) {
    return request(`/stats?days=${days}`);
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

  // ---------- Actions ----------
  async listActions() {
    return request("/actions");
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
};
