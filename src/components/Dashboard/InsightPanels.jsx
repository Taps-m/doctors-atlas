import React, { useEffect, useState } from "react";
import { CalendarClock, Sunrise, Users, Clock3, AlertTriangle, TrendingUp, Sparkles, Send } from "lucide-react";
import { api } from "../../api";

const METRIC_LABEL = {
  patients: "Patient volume",
  revenue: "Revenue",
  repeat_visits: "Repeat visits",
  no_show_rate: "No-show rate",
  practice_health: "Practice health",
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
  if (key === "practice_health") return `${Math.round(value)} out of 100`;
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
/**
 * Levels that deserve attention regardless of which way they moved.
 * Without these the card only noticed CHANGE, so a clinic losing one
 * patient in three to no-shows was told "nothing's trending the wrong
 * way" - true, and useless. Thresholds are deliberately conservative:
 * this should flag real problems, not nag.
 */
/**
 * Severity is expressed as "how far past the line, relative to the
 * line" so different metrics can be compared. Raw distances can't be:
 * a no-show rate of 33% is 33 points from zero while repeat visits of
 * 17% is 83 points from 100, which would rank a mildly low return rate
 * above one patient in three not turning up.
 */
const LEVEL_ALERTS = {
  no_show_rate: {
    threshold: 15,
    isBad: (v) => v >= 15,
    severity: (v) => (v - 15) / 15,
    // Only meaningful once there's history: a brand-new clinic has a
    // low repeat rate because nobody has had time to return yet.
    needsBaseline: false,
    say: (v) =>
      `Your no-show rate is ${Math.round(v)}% - roughly one in ${Math.max(2, Math.round(100 / v))} booked patients isn't arriving.`,
  },
  repeat_visits: {
    threshold: 20,
    isBad: (v) => v < 20,
    severity: (v) => (20 - v) / 20,
    needsBaseline: true,
    say: (v) =>
      `Only ${Math.round(v)}% of your consultations are repeat visits - most patients aren't coming back.`,
  },
};

const HEALTH_ALERT_BELOW = 50;

function WhatNeedsAttention({ onFlag }) {
  const [state, setState] = useState({ loading: true, flagged: null, error: "" });

  useEffect(() => {
    api
      .getStats({})
      .then((stats) => {
        // 1. Something bad in absolute terms, today, regardless of trend.
        const hasBaseline = stats.has_baseline !== false;

        let levelIssue = null;
        for (const key of Object.keys(LEVEL_ALERTS)) {
          const rule = LEVEL_ALERTS[key];
          const stat = stats[key];
          if (!stat || typeof stat.value !== "number") continue;
          if (rule.needsBaseline && !hasBaseline) continue;
          if (!rule.isBad(stat.value)) continue;

          const severity = rule.severity(stat.value);
          if (!levelIssue || severity > levelIssue.severity) {
            levelIssue = {
              key,
              severity,
              value: stat.value,
              change_pct: stat.change_pct,
              headline: rule.say(stat.value),
              kind: "level",
            };
          }
        }

        const health = stats.practice_health;
        if (!levelIssue && health && health.value < HEALTH_ALERT_BELOW) {
          levelIssue = {
            key: "practice_health",
            severity: (HEALTH_ALERT_BELOW - health.value) / HEALTH_ALERT_BELOW,
            value: health.value,
            change_pct: null,
            headline: `Your practice health score is ${health.value} out of 100.`,
            kind: "level",
          };
        }

        // 2. Otherwise, whichever metric moved the wrong way. Skipped
        //    entirely when there's no baseline - a null change is not
        //    a trend, and treating it as one produced false calm.
        let worst = null;
        if (hasBaseline) {
          for (const key of Object.keys(HIGHER_IS_BETTER)) {
            const stat = stats[key];
            if (!stat || stat.change_pct === null || stat.change_pct === undefined) continue;
            const badness = HIGHER_IS_BETTER[key] ? -stat.change_pct : stat.change_pct;
            if (!worst || badness > worst.badness) {
              worst = {
                key,
                badness,
                value: stat.value,
                change_pct: stat.change_pct,
                kind: "trend",
              };
            }
          }
          if (worst && worst.badness <= 0) worst = null;
        }

        // A bad level beats a bad trend: it's true right now, and it's
        // the thing a doctor can act on today.
        const flagged = levelIssue || worst;
        setState({ loading: false, flagged, error: "" });
        // null here means "checked, nothing's wrong" - distinct from
        // the SuggestedFocus panel's not-ready-yet state (undefined).
        onFlag && onFlag(flagged);
      })
      .catch((err) => {
        setState({ loading: false, flagged: null, error: err.message || "Could not load your stats" });
        onFlag && onFlag(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const f = state.flagged;
  // Level severity is a ratio (1.0 = twice the acceptable threshold);
  // trend badness is a percentage move. Scored on their own scales.
  const priority = !f
    ? null
    : f.kind === "level"
    ? f.severity >= 1 ? "HIGH" : f.severity >= 0.4 ? "MODERATE" : "LOW"
    : f.badness >= 15 ? "HIGH" : f.badness >= 5 ? "MODERATE" : "LOW";

  return (
    <div className="panel">
      <PanelHead icon={AlertTriangle} label="What Needs Attention?" color="#dc2626" />

      {state.loading ? (
        <p style={{ color: "#6b7a90", fontSize: 13 }}>Loading...</p>
      ) : state.error ? (
        <p style={{ color: "#b3272c", fontSize: 13 }}>{state.error}</p>
      ) : !f ? (
        <>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>
            Nothing needs your attention right now.
          </h3>
          <p style={{ color: "#6b7a90", fontSize: 13, margin: 0 }}>
            No metric is at a concerning level, and none is moving the wrong way.
          </p>
        </>
      ) : f.kind === "level" ? (
        <>
          {/* A problem that's true today, whether or not it moved. */}
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>{f.headline}</h3>
          <p style={{ color: "#6b7a90", fontSize: 13, margin: "0 0 14px" }}>
            This is worth looking at regardless of which way it's trending.
          </p>
          {priority && (
            <div className="priority-pill">
              <AlertTriangle size={13} /> PRIORITY: {priority}
            </div>
          )}
        </>
      ) : (
        <>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>
            {METRIC_LABEL[f.key]} is {f.change_pct < 0 ? "down" : "up"}{" "}
            {Math.abs(f.change_pct)}% compared to the previous period.
          </h3>
          <p style={{ color: "#6b7a90", fontSize: 13, margin: "0 0 14px" }}>
            Currently at {formatMetricValue(f.key, f.value)}.
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
    const PREFIX =
      "Answer in at most 2 short sentences (35 words max) - no preamble, don't restate the numbers.";
    const label = (METRIC_LABEL[flagged?.key] || "the practice").toLowerCase();

    let question;
    if (!flagged) {
      question = `${PREFIX} Suggest one or two concrete things worth trying this week to strengthen the practice.`;
    } else if (flagged.kind === "level") {
      // Describe the level, not a change - there may not be one, and
      // Math.abs(null) would have claimed a confident "up 0%".
      question = `${PREFIX} Suggest one or two concrete things worth trying this week to improve ${label}, which is currently at ${formatMetricValue(flagged.key, flagged.value)}.`;
    } else {
      question = `${PREFIX} Suggest one or two concrete things worth trying this week to improve ${label} (it's ${flagged.change_pct < 0 ? "down" : "up"} ${Math.abs(flagged.change_pct)}% vs the previous period).`;
    }
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
