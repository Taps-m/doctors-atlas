import React, { useEffect, useState } from "react";
import { Compass, TrendingUp, CalendarCheck, Sparkles, Video } from "lucide-react";
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

      <ConsultNowButton />
    </div>
  );
}

/**
 * A patient who lands on doctorsatlas.in sees a doctor's login page,
 * which is no use to them at all. This strip runs across the bottom,
 * right to left, and takes them straight into the waiting room.
 *
 * It only appears once the backend confirms a clinic is actually
 * taking video consultations, so it can never be a dead link. The
 * scroll pauses on hover so it can be clicked without chasing it.
 */
function ConsultNowButton() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .publicWaitingRoom("_default")
      .then((r) => {
        if (alive && r && r.open) setReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <style>{CONSULT_FAB_CSS}</style>
      <a href="/room" className="atlas-ticker" aria-label="See a doctor now by video">
        <span className="atlas-ticker__track">
          <span className="atlas-ticker__item">
            <Video size={17} />
            See a doctor now — start a video consultation
            <span className="atlas-ticker__cta">Click here</span>
          </span>
          <span className="atlas-ticker__item" aria-hidden="true">
            <Video size={17} />
            See a doctor now — start a video consultation
            <span className="atlas-ticker__cta">Click here</span>
          </span>
        </span>
      </a>
    </>
  );
}

const CONSULT_FAB_CSS = `
.atlas-ticker {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: block;
  overflow: hidden;
  text-decoration: none;
  padding: 11px 0;
  background: linear-gradient(90deg, #0f5d55 0%, #1a9e8f 50%, #0f5d55 100%);
  box-shadow: 0 -6px 22px rgba(21,33,59,.18);
}
.atlas-ticker__track {
  display: inline-flex;
  white-space: nowrap;
  will-change: transform;
  animation: atlasTicker 18s linear infinite;
}
.atlas-ticker:hover .atlas-ticker__track { animation-play-state: paused; }
.atlas-ticker__item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 44px;
  color: #fff;
  font-weight: 800;
  font-size: 15.5px;
  letter-spacing: .01em;
}
.atlas-ticker__cta {
  background: #fff;
  color: #0f5d55;
  border-radius: 999px;
  padding: 3px 13px;
  font-size: 13.5px;
  font-weight: 800;
}
@keyframes atlasTicker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .atlas-ticker__track { animation: none; }
  .atlas-ticker { text-align: center; }
}
`;