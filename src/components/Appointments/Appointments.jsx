import React, { useEffect, useState } from "react";
import { CalendarPlus, Clock, Trash2, Check } from "lucide-react";
import { api } from "../../api";
import "./Appointments.css";

const STATUS_OPTIONS = ["scheduled", "completed", "no_show", "cancelled"];

function formatWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Just the time - the date is already in the section heading. */
function formatTimeOnly(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function statusLabel(status) {
  return status.replace("_", " ");
}

function localDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * This page is deliberately TODAY ONLY. The API returns every
 * appointment ever booked; showing all of it meant the top of the page
 * was months-old history while today's clinic sat below the fold.
 *
 * Today splits in two: still to come (the reason to open this page)
 * and earlier today (which still needs marking off as completed or a
 * no-show).
 *
 * Later dates are collected separately and kept COLLAPSED behind a
 * one-line summary. Patients booking themselves online changed the
 * picture: appointments now arrive for dates the doctor never typed
 * in, and the notification email tells her it is "on your
 * Appointments page" - so it has to actually be reachable here. The
 * collapse keeps today the default view, which is the whole point of
 * the page.
 */
function groupToday(all) {
  const now = new Date();
  const todayKey = localDayKey(now);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcoming = [];
  const earlier = [];
  const later = [];

  (all || []).forEach((a) => {
    if (!a.scheduled_at) return;
    const when = new Date(a.scheduled_at);
    if (localDayKey(when) === todayKey) {
      (when >= now ? upcoming : earlier).push(a);
    } else if (when > startOfToday) {
      later.push(a);
    }
    // Anything before today is history and stays off this page.
  });

  const byTime = (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at);
  upcoming.sort(byTime);
  earlier.sort(byTime);
  later.sort(byTime);

  return { upcoming, earlier, later };
}

/** "Tue 1 Sep" - the heading for one future day. */
function dayHeading(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short",
  });
}

/** Later appointments as [{ key, label, items }], in date order. */
function byDay(items) {
  const days = [];
  const seen = new Map();
  items.forEach((a) => {
    const key = localDayKey(new Date(a.scheduled_at));
    if (!seen.has(key)) {
      const group = { key, label: dayHeading(a.scheduled_at), items: [] };
      seen.set(key, group);
      days.push(group);
    }
    seen.get(key).items.push(a);
  });
  return days;
}

/**
 * Appointments
 * Standalone page (same treatment as Daily Log / Patients) for booking
 * and tracking upcoming and past appointments. Backed by the /appointments
 * endpoints, which store appointments as "visits" against a patient.
 */
export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  // Later bookings stay hidden until asked for, so today keeps the page.
  const [showLater, setShowLater] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  // Shown after booking something that isn't today, so a future
  // booking doesn't look like it silently failed.
  const [bookedElsewhere, setBookedElsewhere] = useState("");

  const groups = groupToday(appointments);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [appts, pts] = await Promise.all([api.listAppointments(), api.listPatients()]);
      setAppointments(appts);
      setPatients(pts);
    } catch (err) {
      setError(err.message || "Could not load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openForm() {
    setPatientId(patients[0]?.id ? String(patients[0].id) : "");
    setWhen("");
    setFormError("");
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!patientId) {
      setFormError("Please add a patient first, then book their appointment.");
      return;
    }
    if (!when) {
      setFormError("Please choose a date and time");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const chosen = new Date(when);
      await api.addAppointment({
        patientId: Number(patientId),
        scheduledAt: chosen.toISOString(),
      });
      setShowForm(false);

      // This page only lists today, so a booking for any other date
      // would otherwise appear to have done nothing. Say where it went.
      if (localDayKey(chosen) !== localDayKey(new Date())) {
        const name = patients.find((p) => String(p.id) === String(patientId))?.name || "Appointment";
        setBookedElsewhere(`${name} is booked for ${formatWhen(chosen.toISOString())}.`);
      } else {
        setBookedElsewhere("");
      }

      await load();
    } catch (err) {
      setFormError(err.message || "Could not book this appointment");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      const updated = await api.updateAppointmentStatus(id, status);
      setAppointments((list) => list.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setError(err.message || "Could not update this appointment");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Cancel and remove this appointment?")) return;
    try {
      await api.deleteAppointment(id);
      setAppointments((list) => list.filter((a) => a.id !== id));
    } catch (err) {
      setError(err.message || "Could not remove this appointment");
    }
  }

  return (
    <div className="appts-page">
      <div className="appts-page__head">
        <div>
          <h2>Appointments</h2>
          <p>Today's clinic.</p>
        </div>
        <button
          className="appts-page__add-btn"
          type="button"
          onClick={() => (showForm ? setShowForm(false) : openForm())}
        >
          <CalendarPlus size={16} /> Book Appointment
        </button>
      </div>

      {showForm && (
        <form className="appts-page__form" onSubmit={handleSave}>
          <div className="appts-page__form-row">
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              {patients.length === 0 && <option value="">No patients yet</option>}
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
          </div>

          {formError && <div className="appts-page__error">{formError}</div>}

          <div className="appts-page__form-actions">
            <button
              type="button"
              className="appts-page__cancel"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="appts-page__save" disabled={saving}>
              {saving ? "Saving..." : "Book Appointment"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="appts-page__error">{error}</div>}

      {bookedElsewhere && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "#e6f5f2",
            border: "1px solid #c9e8e2",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 13.5,
            color: "#2c4a45",
            marginTop: 12,
          }}
        >
          <Check size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {bookedElsewhere} It's under "booked later" below.
          </span>
        </div>
      )}

      {loading ? (
        <div className="appts-page__list">
          <div className="appts-page__loading">Loading appointments...</div>
        </div>
      ) : (
        <>
          {/* Today, still to come - the reason to open this page. */}
          <Section
            title="Today"
            count={groups.upcoming.length}
            subtitle={
              groups.upcoming.length === 0
                ? groups.earlier.length > 0
                  ? "Nothing left today."
                  : "No appointments booked for today."
                : null
            }
          >
            {groups.upcoming.map((a) => (
              <Row key={a.id} a={a} timeOnly onStatus={handleStatusChange} onDelete={handleDelete} />
            ))}
          </Section>

          {/* Earlier today, dimmed - still needs marking off. */}
          {groups.earlier.length > 0 && (
            <Section title="Earlier today" count={groups.earlier.length} muted>
              {groups.earlier.map((a) => (
                <Row key={a.id} a={a} timeOnly dim onStatus={handleStatusChange} onDelete={handleDelete} />
              ))}
            </Section>
          )}

          {/* Everything after today, collapsed by default. */}
          {groups.later.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setShowLater((v) => !v)}
                aria-expanded={showLater}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  background: "#f4f6fa",
                  border: "1px solid #e4e8f0",
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: "pointer",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#15213b",
                  textAlign: "left",
                }}
              >
                <CalendarPlus size={16} style={{ color: "#2f6fed", flexShrink: 0 }} />
                <span>
                  {groups.later.length} booked later
                </span>
                <span style={{ marginLeft: "auto", fontWeight: 700, color: "#2f6fed" }}>
                  {showLater ? "Hide" : "View"}
                </span>
              </button>

              {showLater &&
                byDay(groups.later).map((day) => (
                  <Section key={day.key} title={day.label} count={day.items.length}>
                    {day.items.map((a) => (
                      <Row
                        key={a.id}
                        a={a}
                        timeOnly
                        onStatus={handleStatusChange}
                        onDelete={handleDelete}
                      />
                    ))}
                  </Section>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, count, subtitle, muted, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: muted ? "#9aa5b5" : "#15213b",
          }}
        >
          {title}
        </span>
        {count > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9aa5b5" }}>{count}</span>
        )}
      </div>
      {subtitle ? (
        <div className="appts-page__list">
          <div className="appts-page__empty">{subtitle}</div>
        </div>
      ) : (
        <div className="appts-page__list">{children}</div>
      )}
    </div>
  );
}

function Row({ a, timeOnly, dim, onStatus, onDelete }) {
  return (
    <div className="appts-page__row" style={dim ? { opacity: 0.6 } : undefined}>
      <div className="appts-page__row-main">
        <div className="appts-page__row-name">{a.patient_name}</div>
        <div className="appts-page__row-sub">
          <Clock size={11} /> {timeOnly ? formatTimeOnly(a.scheduled_at) : formatWhen(a.scheduled_at)}
        </div>
      </div>

      <span className={`appts-page__status appts-page__status--${a.status}`}>
        {statusLabel(a.status)}
      </span>

      <div className="appts-page__row-actions">
        <select value={a.status} onChange={(e) => onStatus(a.id, e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <button
          className="appts-page__delete"
          type="button"
          aria-label="Remove appointment"
          onClick={() => onDelete(a.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
