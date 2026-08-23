import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Award, CalendarDays } from "lucide-react";
import { api } from "../../api";
import "./Insights.css";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pctChange(next, prev) {
  if (!prev) return 0;
  return Math.round(((next - prev) / prev) * 100);
}

function formatMoney(v) {
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Insights
 * Standalone page (same treatment as Daily Log / Patients / Appointments)
 * that turns the raw daily logs already being saved into a few concrete
 * observations: revenue trend, a 30-day bar chart, best day, and busiest
 * weekday. Entirely computed client-side from GET /daily-log — no new
 * backend endpoint needed.
 */
export default function Insights() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listDailyLogs(60)
      .then((data) => setLogs(data.slice().reverse())) // oldest -> newest
      .catch((err) => setError(err.message || "Could not load your logs"));
  }, []);

  if (error) {
    return (
      <div className="insights-page">
        <div className="insights-page__head">
          <h2>Insights</h2>
          <p>What your last two months of daily logs are telling you.</p>
        </div>
        <div className="insights-page__error">{error}</div>
      </div>
    );
  }

  if (logs === null) {
    return (
      <div className="insights-page">
        <div className="insights-page__head">
          <h2>Insights</h2>
          <p>What your last two months of daily logs are telling you.</p>
        </div>
        <div className="insights-page__loading">Loading insights...</div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="insights-page">
        <div className="insights-page__head">
          <h2>Insights</h2>
          <p>What your last two months of daily logs are telling you.</p>
        </div>
        <div className="insights-page__empty">
          No daily logs yet. Save a few days on the Daily Log page and
          insights will start showing up here.
        </div>
      </div>
    );
  }

  const half = Math.ceil(logs.length / 2);
  const firstHalf = logs.slice(0, half);
  const secondHalf = logs.slice(half);

  const sum = (list, key) => list.reduce((s, l) => s + Number(l[key] || 0), 0);
  const avg = (list, key) => (list.length ? sum(list, key) / list.length : 0);

  const totalRevenue = sum(logs, "revenue");
  const totalPatients = sum(logs, "new_patients") + sum(logs, "returning_patients");
  const totalConsultations = sum(logs, "total_consultations");
  const totalNoShows = sum(logs, "no_shows");
  const noShowRate = totalConsultations ? Math.round((totalNoShows / totalConsultations) * 100) : 0;

  const revenueDelta = pctChange(avg(secondHalf, "revenue"), avg(firstHalf, "revenue"));
  const patientsDelta = pctChange(
    avg(secondHalf, "new_patients") + avg(secondHalf, "returning_patients"),
    avg(firstHalf, "new_patients") + avg(firstHalf, "returning_patients")
  );

  const bestDay = logs.reduce((best, l) => (Number(l.revenue) > Number(best.revenue) ? l : best), logs[0]);

  const byWeekday = {};
  logs.forEach((l) => {
    const day = WEEKDAYS[new Date(l.log_date).getDay()];
    byWeekday[day] = (byWeekday[day] || 0) + Number(l.total_consultations || 0);
  });
  const busiestWeekday = Object.entries(byWeekday).sort((a, b) => b[1] - a[1])[0];

  const maxRevenue = Math.max(...logs.map((l) => Number(l.revenue || 0)), 1);

  // Comparing two halves of the period only means something once both
  // halves actually have a day in them — with 1-2 logged days there's
  // no real "earlier half" yet, so skip the delta rather than show a
  // misleading "100% down".
  const hasTrend = firstHalf.length > 0 && secondHalf.length > 0;

  function deltaClass(v) {
    if (v > 0) return "up";
    if (v < 0) return "down";
    return "flat";
  }

  function Delta({ value }) {
    if (!hasTrend) {
      return <div className="insights-kpi__delta flat">Log more days to see a trend</div>;
    }
    const cls = deltaClass(value);
    const Icon = value < 0 ? TrendingDown : TrendingUp;
    return (
      <div className={`insights-kpi__delta ${cls}`}>
        <Icon size={12} /> {value === 0 ? "No change" : `${Math.abs(value)}% vs earlier half`}
      </div>
    );
  }

  return (
    <div className="insights-page">
      <div className="insights-page__head">
        <h2>Insights</h2>
        <p>What your last {logs.length} logged day{logs.length === 1 ? "" : "s"} are telling you.</p>
      </div>

      <div className="insights-page__kpis">
        <div className="insights-kpi">
          <div className="insights-kpi__label">Total Revenue</div>
          <div className="insights-kpi__value">{formatMoney(totalRevenue)}</div>
          <Delta value={revenueDelta} />
        </div>
        <div className="insights-kpi">
          <div className="insights-kpi__label">Total Patients</div>
          <div className="insights-kpi__value">{totalPatients}</div>
          <Delta value={patientsDelta} />
        </div>
        <div className="insights-kpi">
          <div className="insights-kpi__label">No-show Rate</div>
          <div className="insights-kpi__value">{noShowRate}%</div>
        </div>
      </div>

      <div className="insights-card">
        <div className="insights-card__title">Daily revenue</div>
        <div className="insights-card__sub">
          {formatDate(logs[0].log_date)} – {formatDate(logs[logs.length - 1].log_date)}
        </div>
        <div className="insights-chart">
          {logs.map((l) => (
            <div
              key={l.id}
              className={`insights-bar ${l.id === bestDay.id ? "insights-bar--peak" : ""}`}
              style={{ height: `${Math.max((Number(l.revenue || 0) / maxRevenue) * 100, 3)}%` }}
              title={`${formatDate(l.log_date)}: ${formatMoney(l.revenue)}`}
            />
          ))}
        </div>
        <div className="insights-chart__axis">
          <span>{formatDate(logs[0].log_date)}</span>
          <span>{formatDate(logs[logs.length - 1].log_date)}</span>
        </div>
      </div>

      <div className="insights-page__callouts">
        <div className="insights-callout">
          <div className="insights-callout__icon">
            <Award size={14} />
          </div>
          <div>
            <div className="insights-callout__title">Best day: {formatDate(bestDay.log_date)}</div>
            <div className="insights-callout__sub">{formatMoney(bestDay.revenue)} in revenue, {bestDay.total_consultations} consultations</div>
          </div>
        </div>
        {busiestWeekday && (
          <div className="insights-callout">
            <div className="insights-callout__icon">
              <CalendarDays size={14} />
            </div>
            <div>
              <div className="insights-callout__title">Busiest day: {busiestWeekday[0]}s</div>
              <div className="insights-callout__sub">{busiestWeekday[1]} total consultations on {busiestWeekday[0]}s</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}