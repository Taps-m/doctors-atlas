import React, { useEffect, useState } from "react";
import { CalendarClock, Sunrise, Users, Clock3, AlertTriangle, TrendingUp, Sparkles, Send } from "lucide-react";
import { api } from "../../api";

const METRIC_LABEL = {
  patients: "Patient volume",
  revenue: "Revenue",
  repeat_visits: "Repeat visits",
  no_show_rate: "No-show rate",
};

// Whether a rising number is good news for this metric - used to work
// out which real stat most deserves attention (no_show_rate is the
// one metric where "up" is bad news, not good).
const HIGHER_IS_BETTER = {
  patients: true,
  revenue: true,
  repeat_visits: true,
  no_show_rate: false,
};

function formatMetricValue(key, value) {
  if (key === "revenue") return formatMoney(value);
  if (key === "repeat_visits" || key === "no_show_rate") return `${Math.round(value)}%`;
  return `${Math.round(value)}`;
}

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

/**
 * PanelHead
 * A more eye-catching heading treatment for each insight card - a
 * solid-color icon badge with a soft shadow plus a bold, spaced-out
 * label - instead of a flat grey icon and plain caps text. Fully
 * self-contained (inline styles) so it doesn't depend on whatever
 * ".panel__head" happens to look like in the shared stylesheet.
 */
function PanelHead({ icon: Icon, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 8,
          background: color,
          color: "#fff",
          flexShrink: 0,
          boxShadow: `0 4px 10px ${color}59`,
        }}
      >
        <Icon size={14} strokeWidth={2.4} />
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: "#1f2937",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
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
      <PanelHead icon={Sunrise} label="Today's Snapshot" color="#e8871e" />
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
      <PanelHead icon={CalendarClock} label="Today's Appointments" color="#2f6fed" />

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
 * WhatNeedsAttention
 * Real, live data - not a fixed sentence. Pulls the same /stats numbers
 * shown in the cards up top (current period vs the previous one) and
 * picks out whichever metric moved the least favorably. If nothing is
 * actually trending badly, it says so honestly rather than inventing
 * a problem to display.
 */
function WhatNeedsAttention({ onFlag }) {
  const [state, setState] = useState({ loading: true, flagged: null, error: "" });

  useEffect(() => {
    api
      .getStats({})
      .then((stats) => {
        let worst = null;
        for (const key of Object.keys(HIGHER_IS_BETTER)) {
          const stat = stats[key];
          if (!stat) continue;
          const higherIsBetter = HIGHER_IS_BETTER[key];
          // "badness" > 0 means this metric moved the wrong way.
          const badness = higherIsBetter ? -stat.change_pct : stat.change_pct;
          if (!worst || badness > worst.badness) {
            worst = { key, badness, value: stat.value, change_pct: stat.change_pct };
          }
        }
        const flagged = worst && worst.badness > 0 ? worst : null;
        setState({ loading: false, flagged, error: "" });
        // null here means "checked, nothing's wrong" - distinct from
        // the AskAboutIt panel's own not-ready-yet state (undefined).
        onFlag && onFlag(flagged);
      })
      .catch((err) => {
        setState({ loading: false, flagged: null, error: err.message || "Could not load your stats" });
        onFlag && onFlag(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priority = !state.flagged ? null : state.flagged.badness >= 15 ? "HIGH" : state.flagged.badness >= 5 ? "MODERATE" : "LOW";

  return (
    <div className="panel">
      <PanelHead icon={AlertTriangle} label="What Needs Attention?" color="#dc2626" />

      {state.loading ? (
        <p style={{ color: "#6b7a90", fontSize: 13 }}>Loading...</p>
      ) : state.error ? (
        <p style={{ color: "#b3272c", fontSize: 13 }}>{state.error}</p>
      ) : !state.flagged ? (
        <>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>
            Nothing's trending the wrong way right now.
          </h3>
          <p style={{ color: "#6b7a90", fontSize: 13, margin: 0 }}>
            Every tracked metric is flat or improving compared to the previous period.
          </p>
        </>
      ) : (
        <>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>
            {METRIC_LABEL[state.flagged.key]} is {state.flagged.change_pct < 0 ? "down" : "up"}{" "}
            {Math.abs(state.flagged.change_pct)}% compared to the previous period.
          </h3>
          <p style={{ color: "#6b7a90", fontSize: 13, margin: "0 0 14px" }}>
            Currently at {formatMetricValue(state.flagged.key, state.flagged.value)}.
          </p>
          {priority && (
            <div className="priority-pill">
              <AlertTriangle size={13} /> PRIORITY: {priority}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * SuggestedFocus
 * The real, guardrailed follow-through on "what should you do" -
 * automatically asks your actual AI Advisor for one or two concrete
 * things worth trying, based on whatever WhatNeedsAttention flagged
 * (or a general check-in if nothing was flagged), and shows the real
 * answer as soon as it loads. No button to click through first - that
 * was just a redundant doorway to the AI Advisor bar already on this
 * page. This card is the proactive nudge; the bar below is for the
 * doctor's own open-ended questions.
 */
function SuggestedFocus({ flagged }) {
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    // flagged is undefined until WhatNeedsAttention finishes its own
    // check - wait for that first real value (object or null) before
    // asking, and only ever auto-ask once.
    if (flagged === undefined || asked) return;
    setAsked(true);
    askNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagged]);

  async function askNow() {
    setAsking(true);
    setError("");
    const question = flagged
      ? `Answer in at most 2 short sentences (35 words max) - no preamble, don't restate the numbers. Suggest one or two concrete things worth trying this week to improve ${METRIC_LABEL[flagged.key].toLowerCase()} (it's ${flagged.change_pct < 0 ? "down" : "up"} ${Math.abs(flagged.change_pct)}% vs the previous period).`
      : "Answer in at most 2 short sentences (35 words max) - no preamble, no welcome message. Suggest one or two concrete things worth trying this week to strengthen the practice.";
    try {
      const res = await api.askAdvisor(question);
      setAnswer(res.answer);
    } catch (err) {
      setError(err.message || "Couldn't reach the AI Advisor");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="panel">
      <PanelHead icon={TrendingUp} label="What Should You Do?" color="#6a5cf0" />

      {(flagged === undefined || asking) && (
        <p style={{ color: "#6b7a90", fontSize: 13 }}>Thinking...</p>
      )}
      {error && <p style={{ color: "#b3272c", fontSize: 13 }}>{error}</p>}
      {answer && !asking && (
        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.6,
            margin: "0 0 12px",
            // Safety net: even if the AI ever ignores the length
            // instruction above, the card still clips to 2 lines
            // instead of growing tall and pushing the layout around.
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {answer}
        </p>
      )}

      {!asking && flagged !== undefined && (
        <button
          type="button"
          className="btn-secondary"
          onClick={askNow}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
        >
          <Sparkles size={13} /> Suggest again <Send size={11} />
        </button>
      )}
    </div>
  );
}

/**
 * InsightPanels
 * Two rows of real, live cards. Row one: what's actually happened
 * today, and what's actually on today's schedule. Row two: which real
 * metric most needs attention (computed from your actual stats, not a
 * fixed sentence), and a genuine, guardrailed AI Advisor answer about
 * it. Replaces the old hardcoded mockup cards, including a "Current
 * Experiment" card for a feature that was deliberately dropped.
 */
export default function InsightPanels() {
  // undefined = WhatNeedsAttention hasn't reported in yet; null = it
  // checked and nothing's flagged; object = a specific metric flagged.
  const [flagged, setFlagged] = useState(undefined);

  return (
    <>
      <div className="panels" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <TodaySnapshot />
        <TodayAppointments />
      </div>
      <div className="panels" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 16 }}>
        <WhatNeedsAttention onFlag={setFlagged} />
        <SuggestedFocus flagged={flagged} />
      </div>
    </>
  );
}
