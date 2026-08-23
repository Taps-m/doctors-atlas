import React, { useEffect, useState } from "react";
import { Calendar, Filter, Bell, Menu, Quote } from "lucide-react";
import { api } from "../../api";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Real, live label for the default (no custom filter applied) date
 * pill - a genuine rolling window ending today, instead of the old
 * fixed "1 - 17 Aug, 2026" string that never changed no matter what
 * day it actually was.
 */
function formatDefaultRange(days = 17) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));

  const startMonth = start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  const year = end.getFullYear();

  return startMonth === endMonth
    ? `${start.getDate()} – ${end.getDate()} ${endMonth}, ${year}`
    : `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}, ${year}`;
}

/**
 * A small, verified pool of real quotes from famous physicians,
 * scientists and thinkers in medicine - meant to counter the
 * demotivation/burnout doctors can feel during a hard day. Rotates by
 * calendar day (not on every page load, so it doesn't feel jittery,
 * but genuinely changes rather than staying frozen on one line
 * forever) via a deterministic day-of-year pick.
 */
const DOCTOR_QUOTES = [
  { text: "To cure sometimes, to relieve often, to comfort always.", author: "Edward Livingston Trudeau" },
  { text: "The art of medicine consists of amusing the patient while nature cures the disease.", author: "Voltaire" },
  { text: "The good physician treats the disease; the great physician treats the patient who has the disease.", author: "William Osler" },
  { text: "Medicine is a social science, and politics is nothing but medicine on a larger scale.", author: "Rudolf Virchow" },
  { text: "Nothing in life is to be feared, it is only to be understood.", author: "Marie Curie" },
  { text: "The secret of the care of the patient is in caring for the patient.", author: "Francis W. Peabody" },
  { text: "Wherever the art of medicine is loved, there is also a love of humanity.", author: "Hippocrates" },
  { text: "Fortune favors the prepared mind.", author: "Louis Pasteur" },
];

function todaysQuote() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000);
  return DOCTOR_QUOTES[dayOfYear % DOCTOR_QUOTES.length];
}

function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const LAPSED_DAYS = 90;

/**
 * Builds the real notification list from data the app already has -
 * no new backend, no invented alerts. Each item is only produced when
 * the underlying condition is genuinely true, so the bell's red dot
 * means something instead of being permanently lit decoration.
 */
async function loadNotifications() {
  const items = [];

  const [logs, appts, patients] = await Promise.all([
    api.listDailyLogs(1).catch(() => null),
    api.listAppointments().catch(() => null),
    api.listPatients().catch(() => null),
  ]);

  const today = isoDay(new Date());

  // 1. Today's numbers not logged yet.
  if (logs) {
    const latest = logs[0];
    if (!latest || latest.log_date !== today) {
      items.push({
        id: "no-log",
        tone: "#e8871e",
        title: "Today's numbers aren't logged yet",
        body: "Add them from the Daily Log page - it takes under a minute.",
      });
    }
  }

  // 2. Appointments booked for today.
  if (appts) {
    const todays = appts.filter(
      (a) => a.scheduled_at && a.scheduled_at.slice(0, 10) === today
    );
    if (todays.length > 0) {
      items.push({
        id: "todays-appts",
        tone: "#2f6fed",
        title: `${todays.length} appointment${todays.length === 1 ? "" : "s"} scheduled today`,
        body: "See the full list on the Appointments page.",
      });
    }
  }

  // 3. Patients who haven't been seen in a long time. "Last seen" is
  //    the most recent past appointment, falling back to their first
  //    visit / record date when they've never had one booked.
  if (patients && appts) {
    const lastSeen = {};
    appts.forEach((a) => {
      const when = new Date(a.scheduled_at);
      if (when > new Date()) return; // ignore future bookings
      if (!lastSeen[a.patient_id] || when > lastSeen[a.patient_id]) {
        lastSeen[a.patient_id] = when;
      }
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LAPSED_DAYS);

    const lapsed = patients.filter((p) => {
      const seen = lastSeen[p.id] || new Date(p.first_visit_at || p.created_at);
      return seen < cutoff;
    });

    if (lapsed.length > 0) {
      items.push({
        id: "lapsed",
        tone: "#6a5cf0",
        title: `${lapsed.length} patient${lapsed.length === 1 ? "" : "s"} not seen in ${LAPSED_DAYS}+ days`,
        body: "Worth a follow-up call - the list is on the Patients page.",
      });
    }
  }

  return items;
}

/**
 * TopBar
 * Page greeting on the left, date range / filter / notifications on
 * the right. Wraps and compacts itself down to phone widths;
 * `onMenuClick` (wired by <Dashboard>) shows a hamburger button below
 * the tablet breakpoint to open the off-canvas sidebar.
 *
 * `dateRange` is either null (meaning "the default rolling window") or
 * { start, end } as "YYYY-MM-DD" strings. `onDateRangeChange` is called
 * with the new value (or null to reset) when the doctor applies a
 * custom range from the Filter popover.
 */
export default function TopBar({
  userName = "Dr. Ananya",
  userAvatar,
  onMenuClick,
  dateRange,
  onDateRangeChange,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftStart, setDraftStart] = useState(dateRange?.start || "");
  const [draftEnd, setDraftEnd] = useState(dateRange?.end || "");
  const [notes, setNotes] = useState(null); // null = still loading
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    let alive = true;
    loadNotifications()
      .then((items) => alive && setNotes(items))
      .catch(() => alive && setNotes([]));
    return () => {
      alive = false;
    };
  }, []);

  const rangeLabel = dateRange
    ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
    : formatDefaultRange();

  const quote = todaysQuote();

  function openPicker() {
    setDraftStart(dateRange?.start || "");
    setDraftEnd(dateRange?.end || "");
    setShowPicker(true);
  }

  function applyFilter() {
    if (draftStart && draftEnd) {
      onDateRangeChange && onDateRangeChange({ start: draftStart, end: draftEnd });
    }
    setShowPicker(false);
  }

  function resetFilter() {
    setDraftStart("");
    setDraftEnd("");
    onDateRangeChange && onDateRangeChange(null);
    setShowPicker(false);
  }

  return (
    <div className="topbar">
      <div className="topbar__left">
        <button
          className="menu-btn"
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="greeting">
          <h1>{greeting()}, {userName} 👋</h1>
          <p>Here's what's happening in your practice.</p>
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 12.5,
              lineHeight: 1.45,
              color: "#5b6b85",
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              maxWidth: 460,
            }}
          >
            <Quote size={13} style={{ flexShrink: 0, marginTop: 2, color: "#a9b3c7" }} />
            <span>
              <span style={{ fontStyle: "italic" }}>{quote.text}</span>{" "}
              <span style={{ fontWeight: 700, color: "#39466a" }}>&mdash; {quote.author}</span>
            </span>
          </p>
        </div>
      </div>

      <div className="topbar__right" style={{ position: "relative" }}>
        <div className="date-pill">
          <Calendar size={15} color="#6b7a90" />
          <span className="date-pill__text">{rangeLabel}</span>
        </div>

        <button
          className="filter-btn"
          type="button"
          onClick={() => (showPicker ? setShowPicker(false) : openPicker())}
        >
          <Filter size={14} /> <span className="filter-btn__text">Filter</span>
        </button>

        {showPicker && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              right: 90,
              background: "#fff",
              border: "1px solid #e2e6ee",
              borderRadius: 10,
              padding: 14,
              boxShadow: "0 8px 24px rgba(20,30,50,0.14)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 200,
            }}
          >
            <label style={{ fontSize: 12, color: "#6b7a90" }}>
              From
              <input
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              />
            </label>
            <label style={{ fontSize: 12, color: "#6b7a90" }}>
              To
              <input
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="button" onClick={applyFilter} style={{ flex: 1 }}>
                Apply
              </button>
              <button type="button" onClick={resetFilter} style={{ flex: 1 }}>
                Reset
              </button>
            </div>
          </div>
        )}

        <button
          className="bell"
          type="button"
          aria-label="Notifications"
          onClick={() => setShowNotes((v) => !v)}
        >
          <Bell size={16} />
          {/* Dot only when something is genuinely waiting - not decoration. */}
          {notes && notes.length > 0 && <span className="bell__dot" />}
        </button>

        {showNotes && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              right: 0,
              width: 290,
              background: "#fff",
              border: "1px solid #e2e6ee",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(20,30,50,0.16)",
              zIndex: 40,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "11px 14px",
                borderBottom: "1px solid #eef1f7",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.07em",
                color: "#6b7a90",
                textTransform: "uppercase",
              }}
            >
              Notifications
            </div>

            {notes === null ? (
              <div style={{ padding: "16px 14px", fontSize: 13, color: "#6b7a90" }}>
                Checking...
              </div>
            ) : notes.length === 0 ? (
              <div style={{ padding: "16px 14px", fontSize: 13, color: "#6b7a90", lineHeight: 1.5 }}>
                Nothing needs your attention right now.
              </div>
            ) : (
              notes.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 14px",
                    borderTop: i === 0 ? "none" : "1px solid #f2f4f9",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: n.tone,
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#172033", lineHeight: 1.35 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#6b7a90", marginTop: 2, lineHeight: 1.4 }}>
                      {n.body}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
