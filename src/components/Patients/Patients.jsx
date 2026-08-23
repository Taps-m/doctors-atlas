import React, { useEffect, useState } from "react";
import { UserPlus, Phone, Calendar, Trash2 } from "lucide-react";
import { api } from "../../api";
import "./Patients.css";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Patients
 * Standalone page (same treatment as Daily Log) listing every patient
 * saved for the doctor's clinic, with a simple add-patient form.
 * Backed by GET/POST/DELETE /patients on the FastAPI backend.
 */
export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [firstVisit, setFirstVisit] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api.listPatients();
      setPatients(data);
    } catch (err) {
      setError(err.message || "Could not load patients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openForm() {
    setName("");
    setPhone("");
    setFirstVisit("");
    setFormError("");
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Please enter the patient's name");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.addPatient({
        name: name.trim(),
        phone: phone.trim() || null,
        firstVisitAt: firstVisit ? new Date(firstVisit).toISOString() : null,
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err.message || "Could not save this patient");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this patient?")) return;
    try {
      await api.deletePatient(id);
      setPatients((list) => list.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message || "Could not remove this patient");
    }
  }

  return (
    <div className="patients-page">
      <div className="patients-page__head">
        <div>
          <h2>Patients</h2>
          <p>Everyone you've added for your clinic.</p>
        </div>
        <button
          className="patients-page__add-btn"
          type="button"
          onClick={() => (showForm ? setShowForm(false) : openForm())}
        >
          <UserPlus size={16} /> Add Patient
        </button>
      </div>

      {showForm && (
        <form className="patients-page__form" onSubmit={handleSave}>
          <div className="patients-page__form-row">
            <input
              type="text"
              placeholder="Patient name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Phone number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              type="date"
              placeholder="First visit date"
              value={firstVisit}
              onChange={(e) => setFirstVisit(e.target.value)}
            />
          </div>

          {formError && <div className="patients-page__error">{formError}</div>}

          <div className="patients-page__form-actions">
            <button
              type="button"
              className="patients-page__cancel"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="patients-page__save" disabled={saving}>
              {saving ? "Saving..." : "Save Patient"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="patients-page__error">{error}</div>}

      <div className="patients-page__list">
        {loading ? (
          <div className="patients-page__loading">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="patients-page__empty">
            No patients yet. Click "Add Patient" to add your first one.
          </div>
        ) : (
          patients.map((p) => (
            <div className="patients-page__row" key={p.id}>
              <div className="patients-page__avatar">{initials(p.name)}</div>
              <div className="patients-page__row-main">
                <div className="patients-page__row-name">{p.name}</div>
                <div className="patients-page__row-sub">
                  {p.phone && (
                    <span>
                      <Phone size={11} /> {p.phone}
                    </span>
                  )}
                  {p.first_visit_at && (
                    <span>
                      <Calendar size={11} /> First visit {formatDate(p.first_visit_at)}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="patients-page__delete"
                type="button"
                aria-label="Remove patient"
                onClick={() => handleDelete(p.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
