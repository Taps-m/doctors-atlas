import React, { useState } from "react";
import { api } from "../../api";
import "./Auth.css";

/**
 * Login
 * Simple email/password form for both roles (admin and doctor).
 * On success it stores the JWT (via api.js) and calls onLoggedIn(role).
 */
export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [role, setRole] = useState("doctor");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (mode === "login") {
        result = await api.login({ email, password });
      } else {
        result = await api.register({ name, email, password, role, clinicName });
      }
      onLoggedIn && onLoggedIn(result.role);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Doctors Atlas</h1>
        <p className="auth-tagline">Navigate your practice. Grow with confidence.</p>
        <p className="auth-sub">
          {mode === "login" ? "Log in to your practice dashboard" : "Create your account"}
        </p>

        {mode === "register" && (
          <>
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />

            <label>I am a</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>

            {role === "doctor" && (
              <>
                <label>Clinic name</label>
                <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Optional" />
              </>
            )}
          </>
        )}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
