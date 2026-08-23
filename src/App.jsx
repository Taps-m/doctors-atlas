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
const DailyLog = lazy(() => import("./components/DailyLog/DailyLog"));
const Patients = lazy(() => import("./components/Patients/Patients"));
const Appointments = lazy(() => import("./components/Appointments/Appointments"));
const Insights = lazy(() => import("./components/Insights/Insights"));
const Reports = lazy(() => import("./components/Reports/Reports"));
const Settings = lazy(() => import("./components/Settings/Settings"));
const Guide = lazy(() => import("./components/Guide/Guide"));

const STANDALONE_VIEWS = ["daily-log", "patients", "appointments", "insights", "reports", "settings", "guide"];

/** Shown for the moment a lazily-loaded page is being fetched. */
function PageLoading() {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "#6b7a90", fontSize: 14 }}>
      Loading...
    </div>
  );
}

export default function App() {
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
    if (loggedIn) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

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

  if (!loggedIn) {
    return <Login onLoggedIn={handleLoggedIn} />;
  }

  if (STANDALONE_VIEWS.includes(view)) {
    return (
      <div style={{ padding: 24, background: "#f4f6fa", minHeight: "100vh" }}>
        <Suspense fallback={<PageLoading />}>
          {view === "daily-log" && <DailyLog doctorName={user?.name || "Doctor"} onSaved={refresh} />}
          {view === "patients" && <Patients />}
          {view === "appointments" && <Appointments />}
          {view === "insights" && <Insights />}
          {view === "reports" && <Reports />}
          {view === "settings" && <Settings />}
          {view === "guide" && <Guide />}
        </Suspense>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          {!(view === "daily-log" && user?.role === "staff") && (
            <button onClick={() => setView("dashboard")} style={backLinkStyle}>
              ← Back to Dashboard
            </button>
          )}
          <button onClick={handleLogout} style={backLinkStyle}>
            Log out
          </button>
        </div>
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

const backLinkStyle = {
  background: "transparent",
  border: "none",
  color: "#6b7a90",
  fontSize: 12.5,
  textDecoration: "underline",
  cursor: "pointer",
  margin: "0 8px",
};
