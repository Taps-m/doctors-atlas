import React, { useState } from "react";
import { Users, RotateCw, Calendar, X, IndianRupee, Phone, Save, Sparkles } from "lucide-react";
import { api } from "../../api";
import "./DailyLog.css";

const FIELDS = [
  {
    key: "new_patients",
    label: "New Patients",
    sub: "First-time patients today",
    icon: Users,
    color: "#6a5cf0",
    bg: "#efeeff",
  },
  {
    key: "returning_patients",
    label: "Returning Patients",
    sub: "Patients who visited before",
    icon: RotateCw,
    color: "#1f9d5a",
    bg: "#e8f8ee",
  },
  {
    key: "total_consultations",
    label: "Total Consultations",
    sub: "Total patients seen today",
    icon: Calendar,
    color: "#2f6fed",
    bg: "#eaf1ff",
  },
  {
    key: "no_shows",
    label: "No-shows / Cancellations",
    sub: "Did not show up or cancelled",
    icon: X,
    color: "#e5484d",
    bg: "#fdecec",
  },
  {
    key: "revenue",
    label: "Consultation Revenue",
    sub: "Total revenue from consultations",
    icon: IndianRupee,
    color: "#e8871e",
    bg: "#fdf1e3",
  },
  {
    key: "new_enquiries",
    label: "New Enquiries (Calls/Walk-ins)",
    sub: "New enquiries received today",
    icon: Phone,
    color: "#1a9e8f",
    bg: "#e3f6f3",
  },
];

const EMPTY = {
  new_patients: "",
  returning_patients: "",
  total_consultations: "",
  no_shows: "",
  revenue: "",
  new_enquiries: "",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * DailyLog
 * The end-of-day form doctors/staff use to log the day's numbers in
 * under a minute. Saves via POST /daily-log, which upserts by
 * (clinic, today's date) so re-saving the same day just updates it.
 */
export default function DailyLog({ doctorName = "Doctor", onSaved }) {
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const weekdayLabel = today.toLocaleDateString(undefined, { weekday: "long" });

  function update(key, val) {
    setValues((v) => ({ ...v, [key]: val }));
    setSavedAt(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, Number(v) || 0])
      );
      await api.saveDailyLog(payload);
      setSavedAt(new Date());
      onSaved && onSaved();
    } catch (err) {
      setError(err.message || "Could not save today's data");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dlog">
      <div className="dlog__greeting">
        <h2>
          {greeting()}, {doctorName}! 👋
        </h2>
        <p>Let's log today's clinic numbers.</p>
      </div>

      <div className="dlog__date">
        <Calendar size={16} />
        <div>
          <div className="dlog__date-main">{dateLabel}</div>
          <div className="dlog__date-sub">{weekdayLabel}</div>
        </div>
      </div>

      <form className="dlog__card" onSubmit={handleSave}>
        <div className="dlog__card-head">
          <div>
            <h3>Today's Clinic Log</h3>
            <p>Takes less than 1 minute!</p>
          </div>
          <span className="dlog__timer">⏱ ~60 sec</span>
        </div>

        {FIELDS.map((f) => {
          const Icon = f.icon;
          return (
            <label className="dlog__row" key={f.key}>
              <span className="dlog__row-icon" style={{ background: f.bg, color: f.color }}>
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <span className="dlog__row-text">
                <span className="dlog__row-label">{f.label}</span>
                <span className="dlog__row-sub">{f.sub}</span>
              </span>
              <input
                type="number"
                min="0"
                step={f.key === "revenue" ? "0.01" : "1"}
                value={values[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                required
              />
            </label>
          );
        })}

        {error && <div className="dlog__error">{error}</div>}

        <button type="submit" disabled={saving}>
          <Save size={16} />
          {saving ? "Saving..." : "Save Today's Data"}
        </button>

        {savedAt ? (
          <div className="dlog__done">
            <Sparkles size={14} /> That's it! You're done for today. 💜
          </div>
        ) : null}
      </form>
    </div>
  );
}
