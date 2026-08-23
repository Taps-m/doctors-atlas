import React, { useEffect, useState } from "react";
import { CalendarClock, Sunrise, Users, Clock3 } from "lucide-react";
import { api } from "../../api";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMoney(v) {
  return `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const STATUS_COLOR = {
  scheduled: { bg: "#eaf1ff", fg: "#2158c8" },
  completed: { bg: "#eafaf1", fg: "#17824c" },
  no_show: { bg: "#fdecec", fg: "#b3272c" },
  cancelled: { bg: "#eef1f4", fg: "#6b7a90" },
};

/**
 * TodaySnapshot
 * Real, live data - not mock. Shows what's actually been logged for
 * today so far (new/returning patients, consultations, no-shows,
 * revenue), pulled from the same Daily Log entries that power every
 * other page. If nothing's been logged yet today, says so honestly
 * instead of showing a fake number.
 */
function TodaySnapshot() {
  const [state, setState] = useState({ loading: true, log: null, error: "" });

  useEffect(() => {
    api
      .listDailyLogs(1)
      .then((rows) => {
        const latest = rows && rows[0];
        const isToday = latest && latest.log_date === todayStr();
        setState({ loading: false, log: isToday ? latest : null, error: "" });
      })
      .catch((err) => setState({ loading: false, log: null, error: err.message || "Could not load today's log" }));
  }, []);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="panel">
      <div className="panel__head">
        <span className="panel__head-icon">
          <Sunrise size={13} />
        </span>
        <span>TODAY'S SNAPSHOT</span>
      </div>
      <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#6b7a90" }}>{today}</h3>

      {state.loading ? (
        <p style={{ color: "#6b7a90", fontSize: 13 }}>Loading...</p>
      ) : state.error ? (
        <p style={{ color: "#b3272c", fontSize: 13 }}>{state.error}</p>
      ) : !state.log ? (
        <p style={{ color: "#6b7a90", fontSize: 13.5, lineHeight: 1.6 }}>
          Nothing logged for today yet. Add today's numbers from Daily Log and this card fills in - it takes under a minute.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7a90" }}>Patients seen</div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>
              {state.log.new_patients + state.log.returning_patients}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7a90" }}>Revenue</div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{formatMoney(state.log.revenue)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7a90" }}>Consultations</div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{state.log.total_consultations}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7a90" }}>No-shows</div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{state.log.no_shows}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * TodayAppointments
 * Real, live data - today's bookings from the Appointments page,
 * filtered client-side to today's date and sorted by time.
 */
function TodayAppointments() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });

  useEffect(() => {
    api
      .listAppointments()
      .then((rows) => {
        const items = (rows || [])
          .filter((a) => a.scheduled_at && a.scheduled_at.slice(0, 10) === todayStr())
          .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
        setState({ loading: false, items, error: "" });
      })
      .catch((err) => setState({ loading: false, items: [], error: err.message || "Could not load today's appointments" }));
  }, []);

  return (
    <div className="panel">
      <div className="panel__head">
        <span className="panel__head-icon">
          <CalendarClock size={13} />
        </span>
        <span>TODAY'S APPOINTMENTS</span>
      </div>

      {state.loading ? (
        <p style={{ color: "#6b7a90", fontSize: 13 }}>Loading...</p>
      ) : state.error ? (
        <p style={{ color: "#b3272c", fontSize: 13 }}>{state.error}</p>
      ) : state.items.length === 0 ? (
        <p style={{ color: "#6b7a90", fontSize: 13.5, lineHeight: 1.6 }}>
          No appointments booked for today. Book one from the Appointments page.
        </p>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
            <Users size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            {state.items.length} appointment{state.items.length === 1 ? "" : "s"} today
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 190, overflowY: "auto" }}>
            {state.items.map((a) => {
              const color = STATUS_COLOR[a.status] || STATUS_COLOR.scheduled;
              return (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <Clock3 size={12} color="#6b7a90" />
                    <span style={{ color: "#6b7a90", flexShrink: 0 }}>{formatTime(a.scheduled_at)}</span>
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.patient_name}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: color.bg,
                      color: color.fg,
                      flexShrink: 0,
                    }}
                  >
                    {a.status.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * InsightPanels
 * Two real, live cards - what's actually happened today, and what's
 * actually on the schedule today. Replaces the old hardcoded mockup
 * cards (fixed fake numbers, plus a "Current Experiment" card for a
 * feature that was deliberately dropped from the build).
 */
export default function InsightPanels() {
  return (
    <div className="panels" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
      <TodaySnapshot />
      <TodayAppointments />
    </div>
  );
}
