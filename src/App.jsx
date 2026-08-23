import React, { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Auth/Login";
import DailyLog from "./components/DailyLog/DailyLog";
import Patients from "./components/Patients/Patients";
import Appointments from "./components/Appointments/Appointments";
import { api } from "./api";

const STANDALONE_VIEWS = ["daily-log", "patients", "appointments"];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(api.isLoggedIn());
  const [view, setView] = useState("dashboard"); // "dashboard" | "daily-log" | "patients" | "appointments"
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
        {view === "daily-log" && <DailyLog doctorName={user?.name || "Doctor"} onSaved={refresh} />}
        {view === "patients" && <Patients />}
        {view === "appointments" && <Appointments />}

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
      <div style={{ textAlign: "center", padding: 12 }}>
        <button onClick={handleLogout} style={backLinkStyle}>
          Log out
        </button>
      </div>
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
