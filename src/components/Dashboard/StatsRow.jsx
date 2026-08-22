import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import Sparkline from "./Sparkline";
import { getIcon } from "./iconMap";
import { statCards, practiceHealth } from "./data";

function StatCard({ icon, iconBg, label, value, delta, deltaUp, sparkColor, data }) {
  const Icon = getIcon(icon);
  return (
    <div className="stat-card">
      <div className="stat-card__head">
        <span className="stat-card__icon" style={{ background: iconBg }}>
          <Icon size={15} strokeWidth={2.2} />
        </span>
        <span className="stat-card__label">{label}</span>
      </div>
      <div className="stat-card__value">{value}</div>
      <div className={`stat-card__delta ${deltaUp ? "up" : "down"}`}>
        {deltaUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        {delta}
        <span className="stat-card__vs">vs Jul 1 – 17</span>
      </div>
      <div className="stat-card__spark">
        <Sparkline data={data} color={sparkColor} />
      </div>
    </div>
  );
}

function PracticeHealthRing({ score, max }) {
  const RADIUS = 46;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = (score / max) * CIRC;

  return (
    <div className="stat-card health-card">
      <div className="health-card__title">Practice Health</div>
      <div className="health-ring">
        <svg width="100" height="100" viewBox="0 0 100 100">
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
          <span className="health-ring__num">{score}</span>
          <span className="health-ring__of">/{max}</span>
        </div>
      </div>
      <div className="health-card__delta">
        <ArrowUp size={12} /> {practiceHealth.deltaLabel}{" "}
        <span className="health-card__vs">{practiceHealth.deltaSub}</span>
      </div>
    </div>
  );
}

/**
 * StatsRow
 * Renders the four KPI sparkline cards plus the Practice Health ring,
 * all driven by the `statCards` / `practiceHealth` data.
 */
export default function StatsRow() {
  return (
    <div className="stats-row">
      {statCards.map((card) => (
        <StatCard key={card.id} {...card} />
      ))}
      <PracticeHealthRing score={practiceHealth.score} max={practiceHealth.max} />
    </div>
  );
}
