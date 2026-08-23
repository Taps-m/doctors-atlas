import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import Sparkline from "./Sparkline";
import { getIcon } from "./iconMap";
// Only `statCards` is imported, and only for each card's label, icon,
// colour and sparkline shape - never for a value. The old
// `practiceHealth` placeholder is deliberately not imported any more.
import { statCards } from "./data";

function StatCard({ icon, iconBg, label, value, delta, deltaUp, sparkColor, data, vsLabel, hasLive }) {
  const Icon = getIcon(icon);
  return (
    <div className="stat-card">
      <div className="stat-card__head">
        <span className="stat-card__icon" style={{ background: iconBg }}>
          <Icon size={15} strokeWidth={2.2} />
        </span>
        <span className="stat-card__label">{label}</span>
      </div>
      <div className="stat-card__value" style={!hasLive ? { color: "#c2cad6" } : undefined}>
        {value}
      </div>

      {delta ? (
        <div className={`stat-card__delta ${deltaUp ? "up" : "down"}`}>
          {deltaUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {delta}
          <span className="stat-card__vs">{vsLabel}</span>
        </div>
      ) : (
        <div className="stat-card__delta" style={{ color: "#9aa5b5", fontWeight: 500 }}>
          Loading…
        </div>
      )}

      {/* The sparkline is a fixed decorative shape, not this clinic's
          real trend, so it stays hidden until live numbers arrive
          rather than implying a history that isn't there. */}
      <div className="stat-card__spark">
        {hasLive && <Sparkline data={data} color={sparkColor} />}
      </div>
    </div>
  );
}

function PracticeHealthRing({ score, max, deltaLabel, deltaSub }) {
  const RADIUS = 46;
  const CIRC = 2 * Math.PI * RADIUS;
  // No score yet = an empty ring and a dash, never a stand-in number.
  const hasScore = score !== null && score !== undefined;
  const dash = hasScore ? (score / max) * CIRC : 0;

  return (
    <div className="stat-card health-card">
      <div className="health-card__title">Practice Health</div>
      <div className="health-ring">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#e7ebf1" strokeWidth="9" />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="#1a9e8f"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="health-ring__value">
          <span className="health-ring__num" style={!hasScore ? { color: "#c2cad6" } : undefined}>
            {hasScore ? score : "—"}
          </span>
          {hasScore && <span className="health-ring__of">/{max}</span>}
        </div>
      </div>
      {deltaLabel ? (
        <div className="health-card__delta">
          <ArrowUp size={12} /> {deltaLabel}{" "}
          <span className="health-card__vs">{deltaSub}</span>
        </div>
      ) : (
        <div className="health-card__delta" style={{ color: "#9aa5b5", fontWeight: 500 }}>
          Loading…
        </div>
      )}
    </div>
  );
}

// Maps a stat card's id to the matching key in the /stats API response.
const LIVE_KEY = {
  patients: "patients",
  revenue: "revenue",
  "repeat-visits": "repeat_visits",
  "no-show": "no_show_rate",
};

function formatValue(id, value) {
  if (id === "revenue") return `₹${Math.round(value).toLocaleString("en-IN")}`;
  if (id === "repeat-visits" || id === "no-show") return `${Math.round(value)}%`;
  return `${Math.round(value)}`;
}

function formatShortDate(d) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Works out the real "vs <dates>" label from the /stats response's
 * period, instead of the fixed "vs Jul 1 - 17" text this used to show
 * no matter what date range was actually being compared against. The
 * previous-period window is the same length as the current one,
 * immediately before it - matching the backend's own comparison logic.
 */
function comparisonLabel(period) {
  if (!period?.start || !period?.end) return "vs previous period";
  const start = new Date(period.start);
  const end = new Date(period.end);
  const lengthDays = Math.max(Math.round((end - start) / 86400000), 1);
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(start.getTime() - lengthDays * 86400000);
  return `vs ${formatShortDate(prevStart)} – ${formatShortDate(prevEnd)}`;
}

/**
 * StatsRow
 * The four KPI cards plus the Practice Health ring.
 *
 * IMPORTANT: when the backend hasn't answered yet - a cold start, a
 * dropped connection - these cards show a dash, NOT a number. They
 * used to fall back to the placeholder figures in `statCards` (52
 * patients, Rs 31,200, health 72), which meant a doctor could open her
 * dashboard during an outage and read invented numbers as if they were
 * her own. A blank is honest; a plausible wrong number is not.
 *
 * `statCards` is still the source of each card's label, icon and colour
 * - presentation only, never a value.
 */
export default function StatsRow({ liveStats }) {
  const hasLive = !!liveStats;
  const vsLabel = liveStats?.period ? comparisonLabel(liveStats.period) : "";

  const cards = statCards.map((card) => {
    const liveKey = LIVE_KEY[card.id];
    const live = liveStats && liveKey ? liveStats[liveKey] : null;

    if (!live) {
      return { ...card, value: "—", delta: null, deltaUp: true };
    }

    return {
      ...card,
      value: formatValue(card.id, live.value),
      delta: `${Math.abs(live.change_pct)}%`,
      deltaUp: live.change_pct >= 0,
    };
  });

  const ph = liveStats?.practice_health;
  const health = ph
    ? {
        score: ph.value,
        max: 100,
        deltaLabel: `${Math.abs(ph.change_pts)} pts`,
        deltaSub: vsLabel,
      }
    : { score: null, max: 100, deltaLabel: null, deltaSub: "" };

  return (
    <div className="stats-row">
      {cards.map((card) => (
        <StatCard key={card.id} {...card} vsLabel={vsLabel} hasLive={hasLive} />
      ))}
      <PracticeHealthRing
        score={health.score}
        max={health.max}
        deltaLabel={health.deltaLabel}
        deltaSub={health.deltaSub}
      />
    </div>
  );
}
