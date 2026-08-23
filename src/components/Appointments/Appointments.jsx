import React, { useEffect, useState } from "react";
import { CalendarPlus, Clock, Trash2 } from "lucide-react";
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

function statusLabel(status) {
  return status.replace("_", " ");
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
  const [patientId, setPatientId] = useState("");
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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
      await api.addAppointment({
        patientId: Number(patientId),
        scheduledAt: new Date(when).toISOString(),
      });
      setShowForm(false);
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
          <p>Everything booked for your clinic.</p>
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

      <div className="appts-page__list">
        {loading ? (
          <div className="appts-page__loading">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="appts-page__empty">
            No appointments yet. Click "Book Appointment" to add one.
          </div>
        ) : (
          appointments.map((a) => (
            <div className="appts-page__row" key={a.id}>
              <div className="appts-page__row-main">
                <div className="appts-page__row-name">{a.patient_name}</div>
                <div className="appts-page__row-sub">
                  <Clock size={11} /> {formatWhen(a.scheduled_at)}
                </div>
              </div>

              <span className={`appts-page__status appts-page__status--${a.status}`}>
                {statusLabel(a.status)}
              </span>

              <div className="appts-page__row-actions">
                <select
                  value={a.status}
                  onChange={(e) => handleStatusChange(a.id, e.target.value)}
                >
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
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
