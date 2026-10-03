import React, { lazy, Suspense, useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Auth/Login";
import { api } from "./api";

/**
 * Everything below the dashboard is CODE-SPLIT with React.lazy: the
 * browser downloads a page's code the first time it's opened, and not
 * before. Previously all of these were imported at the top, so signing
 * in meant downloading Patients, Reports, Settings and the illustrated
 * guide (screenshots included) before the dashboard could show a single
 * number - on a clinic's mobile connection that is a real wait for code
 * most visits never run.
 *
 * Dashboard and Login stay eagerly imported: one of them is always the
 * first thing rendered, so deferring them would only add a round trip.
 */
const PublicBooking = lazy(() => import("./components/PublicBooking/PublicBooking"));
const ConsultPage = lazy(() => import("./components/Consult/ConsultPage"));
const WaitingRoom = lazy(() => import("./components/Consult/WaitingRoom"));
const BookingSetup = lazy(() => import("./components/BookingSetup/BookingSetup"));
const Telemedicine = lazy(() => import("./components/Telemedicine/Telemedicine"));
const DailyLog = lazy(() => import("./components/DailyLog/DailyLog"));
const Patients = lazy(() => import("./components/Patients/Patients"));
const Appointments = lazy(() => import("./components/Appointments/Appointments"));
const Insights = lazy(() => import("./components/Insights/Insights"));
const Reports = lazy(() => import("./components/Reports/Reports"));
const Settings = lazy(() => import("./components/Settings/Settings"));
const Guide = lazy(() => import("./components/Guide/Guide"));

const STANDALONE_VIEWS = ["daily-log", "patients", "appointments", "insights", "reports", "settings", "guide", "booking-setup", "telemedicine"];

/**
 * Works out whether this page load is a PATIENT arriving on a public
 * booking link rather than the doctor opening her dashboard.
 *
 *   /booking            -> the short link she shares
 *   /book/<slug>        -> the permanent per-clinic form
 *
 * Returns the slug to look up, or null for the normal app. This is
 * checked before any authentication, because a patient has no account
 * and must never be shown a login screen.
 */
function publicBookingSlug() {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  if (path === "/booking") return "_default";
  const m = path.match(/^\/book\/([a-z0-9-]+)$/);
  return m ? m[1] : null;
}

/**
 * /consult/<token> - the patient's video appointment page. Case is
 * preserved here, unlike the slug above: the token is base64url and
 * lowercasing it would break every link.
 */
/**
 * The clinic's permanent walk-in address: /room/<slug>. Lowercased
 * like the booking slug, unlike the consult token.
 */
function publicRoomSlug() {
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  // A bare /room is the front-page shortcut: the backend resolves it
  // to the clinic that owns this address.
  if (path === "/room") return "_default";
  const m = path.match(/^\/room\/([a-z0-9-]{1,60})$/);
  return m ? m[1] : null;
}

function publicConsultToken() {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname.replace(/\/+$/, "");
  const m = path.match(/^\/consult\/([A-Za-z0-9_-]{8,128})$/);
  return m ? m[1] : null;
}

/** Shown for the moment a lazily-loaded page is being fetched. */
function PageLoading() {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "#6b7a90", fontSize: 14 }}>
      Loading...
    </div>
  );
}

export default function App() {
  // Fixed for this page load; a patient's link never changes underneath
  // them, and this must be known before anything auth-related runs.
  const [bookingSlug] = useState(publicBookingSlug);
  const [consultToken] = useState(publicConsultToken);
  const [roomSlug] = useState(publicRoomSlug);
  const [loggedIn, setLoggedIn] = useState(api.isLoggedIn());
  const [view, setView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [advisorAnswer, setAdvisorAnswer] = useState("");
  const [loadError, setLoadError] = useState("");
  // null = default rolling window (last 17 days); otherwise { start, end }
  // as "YYYY-MM-DD" strings, set from the dashboard's date-range filter.
  const [dateRange, setDateRange] = useState(null);

  async function loadStats(range) {
    const stats = await api.getStats(range ? { start: range.start, end: range.end } : {});
    setLiveStats(stats);
  }

  // Load the current user + stats once logged in (and again after
  // saving a new daily log, so the dashboard reflects it immediately).
  async function refresh() {
    try {
      const me = await api.me();
      setUser(me);
      if (me.role !== "staff") {
        await loadStats(dateRange);
      }
      setLoadError("");
    } catch (err) {
      setLoadError(err.message || "Could not load your data");
    }
  }

  useEffect(() => {
    // Skip entirely on a public booking link, even if a token happens to
    // be in this browser (a shared clinic phone, say) - a patient should
    // trigger no dashboard requests at all.
    if (bookingSlug || consultToken || roomSlug) return;
    if (loggedIn) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, bookingSlug, consultToken, roomSlug]);

  function handleLoggedIn(role) {
    setLoggedIn(true);
    // Staff only need the daily log screen; doctors/admins land on the dashboard.
    setView(role === "staff" ? "daily-log" : "dashboard");
  }

  function handleLogout() {
    api.logout();
    setLoggedIn(false);
    setUser(null);
    setLiveStats(null);
    setDateRange(null);
  }

  function handleNavigate(id) {
    if (STANDALONE_VIEWS.includes(id)) {
      setView(id);
    } else {
      setView("dashboard");
    }
  }

  function handleDateRangeChange(range) {
    setDateRange(range);
    loadStats(range).catch((err) => setLoadError(err.message || "Could not load your data"));
  }

  async function handleAskAdvisor(question) {
    setAdvisorAnswer("Thinking...");
    try {
      const res = await api.askAdvisor(question);
      setAdvisorAnswer(res.answer);
    } catch (err) {
      setAdvisorAnswer(`Couldn't reach the AI Advisor: ${err.message}`);
    }
  }

  function handleStartAction() {
    console.log("Action started: post-visit follow-up workflow");
  }

  function handleDismissAction() {
    console.log("Action dismissed");
  }

  // Same reasoning as the booking page: a patient holding a consult
  // link has no account and must never meet a login screen.
  if (consultToken) {
    return (
      <Suspense fallback={<PageLoading />}>
        <ConsultPage token={consultToken} />
      </Suspense>
    );
  }

  // The clinic's permanent walk-in room. Public, like the two above.
  if (roomSlug) {
    return (
      <Suspense fallback={<PageLoading />}>
        <WaitingRoom slug={roomSlug} />
      </Suspense>
    );
  }

  // A patient on a booking link gets the booking page and nothing else -
  // checked before the login gate, since they have no account.
  if (bookingSlug) {
    return (
      <Suspense fallback={<PageLoading />}>
        <PublicBooking slug={bookingSlug} />
      </Suspense>
    );
  }

  if (!loggedIn) {
    return <Login onLoggedIn={handleLoggedIn} />;
  }

  if (STANDALONE_VIEWS.includes(view)) {
    return (
      <div style={{ padding: 24, background: "#f4f6fa", minHeight: "100vh" }}>
        {/*
          Sticky, and at the TOP. It used to sit only below the page
          content, which meant scrolling past a full day's
          appointments to get out - and on a long list the way back
          was effectively hidden. Sticky costs nothing and means the
          exit is always one tap away.
        */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "-24px -24px 16px",
            padding: "12px 24px",
            background: "rgba(244,246,250,0.92)",
            backdropFilter: "blur(6px)",
            borderBottom: "1px solid #e4e8f0",
          }}
        >
          {!(view === "daily-log" && user?.role === "staff") && (
            <button onClick={() => setView("dashboard")} style={topLinkStyle}>
              ← Back to Dashboard
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{ ...topLinkStyle, marginLeft: "auto", color: "#8794a8" }}
          >
            Log out
          </button>
        </div>

        <Suspense fallback={<PageLoading />}>
          {view === "daily-log" && <DailyLog doctorName={user?.name || "Doctor"} onSaved={refresh} />}
          {view === "patients" && <Patients />}
          {view === "appointments" && <Appointments />}
          {view === "insights" && <Insights />}
          {view === "reports" && <Reports />}
          {view === "settings" && <Settings />}
          {view === "guide" && <Guide />}
          {view === "booking-setup" && <BookingSetup />}
          {view === "telemedicine" && <Telemedicine />}
        </Suspense>
      </div>
    );
  }

  return (
    <>
      {loadError && (
        <div style={{ background: "#fdecec", color: "#b3272c", padding: 10, textAlign: "center", fontSize: 13 }}>
          {loadError}
        </div>
      )}
      <Dashboard
        activeNavItem={view}
        onNavigate={handleNavigate}
        onStartAction={handleStartAction}
        onDismissAction={handleDismissAction}
        onAskAdvisor={handleAskAdvisor}
        liveStats={liveStats}
        advisorAnswer={advisorAnswer}
        userName={user?.name || "Doctor"}
        userAvatar={user?.avatar_url}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
    </>
  );
}

// The sticky header links: a real control rather than the small
// underlined text this used to be, so it reads as tappable on a phone.
const topLinkStyle = {
  background: "transparent",
  border: "none",
  color: "#2f6fed",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  padding: "6px 4px",
};

