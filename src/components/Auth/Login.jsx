import React, { useState } from "react";
import { Compass, TrendingUp, CalendarCheck, Sparkles } from "lucide-react";
import { api } from "../../api";
import "./Auth.css";

/**
 * Login
 * Email/password for both roles (admin and doctor), plus registration.
 * On success it stores the JWT (via api.js) and calls onLoggedIn(role).
 *
 * Laid out as a split screen: a brand panel that says what Atlas is
 * for, and the form itself. The single centred card it replaced gave
 * a doctor arriving at doctorsatlas.in for the first time nothing to
 * recognise and no reason to trust the page. On phones the panel
 * collapses to a compact header so the form stays above the fold.
 */

const VALUE_POINTS = [
  {
    icon: TrendingUp,
    title: "See your practice clearly",
    body: "Patients, revenue and return rates, from one short daily log.",
  },
  {
    icon: CalendarCheck,
    title: "Let patients book themselves",
    body: "Share a link. Appointments arrive in your dashboard and your inbox.",
  },
  {
    icon: Sparkles,
    title: "Know what to do next",
    body: "Plain-language advice on what needs attention this week.",
  },
];

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

  const isLogin = mode === "login";

  return (
    <div className="auth">
      {/* ---------- Brand side ---------- */}
      <aside className="auth__brandside">
        <div className="auth__brandinner">
          <div className="auth__lockup">
            <span className="auth__mark" aria-hidden="true">
              <Compass size={26} strokeWidth={2.2} />
            </span>
            <span className="auth__wordmark">
              <span className="auth__eyebrow">DOCTORS</span>
              <span className="auth__name">
                ATLAS<sup>TM</sup>
              </span>
            </span>
          </div>

          <h1 className="auth__headline">
            The business side of your practice, handled.
          </h1>

          <ul className="auth__points">
            {VALUE_POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                <div>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </div>
              </li>
            ))}
          </ul>

          <p className="auth__footnote">
            Your clinical decisions stay yours. Atlas never touches them.
          </p>
        </div>
      </aside>

      {/* ---------- Form side ---------- */}
      <main className="auth__formside">
        <form className="auth__form" onSubmit={handleSubmit}>
          {/* Repeated for phones, where the brand panel is collapsed. */}
          <div className="auth__lockup auth__lockup--compact">
            <span className="auth__mark" aria-hidden="true">
              <Compass size={22} strokeWidth={2.2} />
            </span>
            <span className="auth__wordmark">
              <span className="auth__eyebrow">DOCTORS</span>
              <span className="auth__name">
                ATLAS<sup>TM</sup>
              </span>
            </span>
          </div>

          <h2 className="auth__title">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="auth__subtitle">
            {isLogin
              ? "Sign in to your practice dashboard."
              : "A few details and your clinic is set up."}
          </p>

          {!isLogin && (
            <>
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />

              <label htmlFor="auth-role">I am a</label>
              <select
                id="auth-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>

              {role === "doctor" && (
                <>
                  <label htmlFor="auth-clinic">Clinic name</label>
                  <input
                    id="auth-clinic"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Optional — you can add it later"
                  />
                </>
              )}
            </>
          )}

          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
          />

          {error && (
            <div className="auth__error" role="alert">
              {error}
            </div>
          )}

          <button className="auth__submit" type="submit" disabled={loading}>
            {loading ? "Please wait…" : isLogin ? "Log in" : "Create account"}
          </button>

          <button
            type="button"
            className="auth__switch"
            onClick={() => {
              setMode(isLogin ? "register" : "login");
              setError("");
            }}
          >
            {isLogin
              ? "New here? Create an account"
              : "Already have an account? Log in"}
          </button>
        </form>

        <p className="auth__legal">
          Doctors Atlas™ · doctorsatlas.in
        </p>
      </main>
    </div>
  );
}
