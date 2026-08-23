import React, { useEffect, useMemo, useState } from "react";
import { Printer, FileBarChart } from "lucide-react";
import { api } from "../../api";
import "./Reports.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function formatMoney(v) {
  return `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Reports
 * Standalone page (same treatment as Daily Log / Patients / Appointments /
 * Insights / Experiments) that turns the daily logs already being saved
 * into a permanent, month-by-month archive. Unlike the Dashboard and
 * Insights pages - which always show a live, moving window - each month
 * here is a fixed record that stays the same forever, so a doctor can look
 * back and compare month to month. Entirely computed client-side from
 * GET /daily-log; no new backend endpoint needed.
 */
export default function Reports() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    api
      .listDailyLogs(3650) // effectively "all of it" - a decade of daily logs
      .then((data) => setLogs(data))
      .catch((err) => setError(err.message || "Could not load your logs"));
  }, []);

  const months = useMemo(() => {
    if (!logs) return [];
    const byMonth = {};
    logs.forEach((l) => {
      const key = monthKey(l.log_date);
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(l);
    });
    return Object.entries(byMonth)
      .map(([key, entries]) => {
        const sorted = entries.slice().sort((a, b) => new Date(a.log_date) - new Date(b.log_date));
        const sum = (k) => sorted.reduce((s, l) => s + Number(l[k] || 0), 0);
        const newPatients = sum("new_patients");
        const returningPatients = sum("returning_patients");
        const totalPatients = newPatients + returningPatients;
        const totalConsultations = sum("total_consultations");
        const noShows = sum("no_shows");
        const revenue = sum("revenue");
        const enquiries = sum("new_enquiries");
        const noShowRate = totalConsultations ? Math.round((noShows / totalConsultations) * 100) : 0;
        const repeatRate = totalPatients ? Math.round((returningPatients / totalPatients) * 100) : 0;
        return {
          key,
          label: monthLabel(key),
          days: sorted,
          daysLogged: sorted.length,
          newPatients,
          returningPatients,
          totalPatients,
          totalConsultations,
          noShows,
          noShowRate,
          revenue,
          enquiries,
          repeatRate,
        };
      })
      .sort((a, b) => (a.key < b.key ? 1 : -1)); // newest first
  }, [logs]);

  useEffect(() => {
    if (months.length && !selectedKey) setSelectedKey(months[0].key);
  }, [months, selectedKey]);

  const selected = months.find((m) => m.key === selectedKey) || null;

  function handlePrint() {
    window.print();
  }

  if (error) {
    return (
      <div className="rep-page">
        <div className="rep-page__head">
          <h2>Reports</h2>
          <p>Your practice, archived month by month.</p>
        </div>
        <div className="rep-page__error">{error}</div>
      </div>
    );
  }

  if (logs === null) {
    return (
      <div className="rep-page">
        <div className="rep-page__head">
          <h2>Reports</h2>
          <p>Your practice, archived month by month.</p>
        </div>
        <div className="rep-page__loading">Loading your archive...</div>
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <div className="rep-page">
        <div className="rep-page__head">
          <h2>Reports</h2>
          <p>Your practice, archived month by month.</p>
        </div>
        <div className="rep-page__empty">
          No daily logs yet. Once you've saved a few days on the Daily Log
          page, this month will show up here as your first report.
        </div>
      </div>
    );
  }

  return (
    <div className="rep-page">
      <div className="rep-page__head">
        <h2>Reports</h2>
        <p>Your practice, archived month by month - a fixed record you can look back on anytime.</p>
      </div>

      <div className="rep-layout">
        <div className="rep-months">
          {months.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`rep-month ${m.key === selectedKey ? "rep-month--active" : ""}`}
              onClick={() => setSelectedKey(m.key)}
            >
              <div className="rep-month__label">{m.label}</div>
              <div className="rep-month__sub">
                {formatMoney(m.revenue)} &middot; {m.totalPatients} patients
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rep-detail">
            <div className="rep-detail__toolbar">
              <button type="button" className="rep-print-btn" onClick={handlePrint}>
                <Printer size={14} /> Print / Save as PDF
              </button>
            </div>

            <div className="rep-print-area">
              <div className="rep-report__head">
                <div className="rep-report__brand">
                  <FileBarChart size={16} /> Doctors Atlas &middot; Practice Report
                </div>
                <h3>{selected.label}</h3>
                <p>{selected.daysLogged} day{selected.daysLogged === 1 ? "" : "s"} logged this month</p>
              </div>

              <div className="rep-kpis">
                <div className="rep-kpi">
                  <div className="rep-kpi__label">Total Patients</div>
                  <div className="rep-kpi__value">{selected.totalPatients}</div>
                  <div className="rep-kpi__sub">{selected.newPatients} new &middot; {selected.returningPatients} returning</div>
                </div>
                <div className="rep-kpi">
                  <div className="rep-kpi__label">Total Revenue</div>
                  <div className="rep-kpi__value">{formatMoney(selected.revenue)}</div>
                </div>
                <div className="rep-kpi">
                  <div className="rep-kpi__label">Consultations</div>
                  <div className="rep-kpi__value">{selected.totalConsultations}</div>
                </div>
                <div className="rep-kpi">
                  <div className="rep-kpi__label">No-show Rate</div>
                  <div className="rep-kpi__value">{selected.noShowRate}%</div>
                  <div className="rep-kpi__sub">{selected.noShows} no-shows</div>
                </div>
                <div className="rep-kpi">
                  <div className="rep-kpi__label">Repeat Visit Rate</div>
                  <div className="rep-kpi__value">{selected.repeatRate}%</div>
                </div>
                <div className="rep-kpi">
                  <div className="rep-kpi__label">New Enquiries</div>
                  <div className="rep-kpi__value">{selected.enquiries}</div>
                </div>
              </div>

              <div className="rep-table-wrap">
                <table className="rep-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>New</th>
                      <th>Returning</th>
                      <th>Consults</th>
                      <th>No-shows</th>
                      <th>Revenue</th>
                      <th>Enquiries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.days.map((d) => (
                      <tr key={d.id}>
                        <td>{formatDate(d.log_date)}</td>
                        <td>{d.new_patients}</td>
                        <td>{d.returning_patients}</td>
                        <td>{d.total_consultations}</td>
                        <td>{d.no_shows}</td>
                        <td>{formatMoney(d.revenue)}</td>
                        <td>{d.new_enquiries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
