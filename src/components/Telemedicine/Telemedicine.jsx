import React, { useCallback, useEffect, useState } from "react";
import { Video, Copy, Check, Phone, AlertCircle } from "lucide-react";
import { api } from "../../api";

/**
 * Telemedicine
 * The doctor's side of online consultations, on its own page.
 *
 * Two jobs, in the order she needs them: set the room up once, then
 * every day see who is waiting and get into the call in one click.
 *
 * The Join button is deliberately not a plain link to her Meet room.
 * It only lights up inside the appointment's window, which is the same
 * rule the patient's page follows - so if she clicks it, the patient
 * can be there too.
 */

const TEAL = "#1a9e8f";
const NAVY = "#15213b";
const INK = "#1f2937";
const MUTED = "#5b6b85";
const LINE = "#e4e9f1";

const OPENS_MIN_BEFORE = 15;
const GRACE_MIN_AFTER = 30;

function Card({ title, subtitle, children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
      {title && (
        <>
          <h3 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 800, color: NAVY }}>{title}</h3>
          {subtitle && <p style={{ margin: "0 0 16px", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{subtitle}</p>}
        </>
      )}
      {children}
    </div>
  );
}

function timeLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

function dayLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function Telemedicine() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const [enabled, setEnabled] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [regNo, setRegNo] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(30);

  const [visits, setVisits] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [s, appts] = await Promise.all([api.getBookingSettings(), api.listAppointments()]);
      setEnabled(!!s.online_consult_enabled);
      setRoomUrl(s.consult_room_url || "");
      setRegNo(s.doctor_reg_no || "");
      setSlotMinutes(s.slot_minutes || 30);
      setVisits((appts || []).filter((v) => v.mode === "online"));
      setErr("");
    } catch (e) {
      setErr(e.message || "Could not load your telemedicine settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-render every half minute so a Join button becomes clickable
  // without her reloading the page mid-clinic.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  async function save(patch) {
    setSaving(true);
    setErr("");
    setNote("");
    try {
      const s = await api.updateBookingSettings({
        consultRoomUrl: roomUrl.trim(),
        doctorRegNo: regNo.trim(),
        ...patch,
      });
      setEnabled(!!s.online_consult_enabled);
      setRoomUrl(s.consult_room_url || "");
      setRegNo(s.doctor_reg_no || "");
      setNote("Saved");
      setTimeout(() => setNote(""), 2500);
    } catch (e) {
      setErr(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(v) {
    const url = `${window.location.origin}/consult/${v.consult_token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link for the patient:", url);
    }
    setCopiedId(v.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;
  }

  const now = new Date();
  const upcoming = visits
    .filter((v) => v.status !== "cancelled")
    .filter((v) => {
      const start = new Date(v.scheduled_at);
      return start.getTime() + (slotMinutes + GRACE_MIN_AFTER) * 60000 > now.getTime();
    })
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const today = upcoming.filter((v) => sameDay(new Date(v.scheduled_at), now));
  const later = upcoming.filter((v) => !sameDay(new Date(v.scheduled_at), now));

  return (
    <div style={{ maxWidth: 860 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: NAVY }}>Telemedicine</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: MUTED, lineHeight: 1.55 }}>
        See patients over video. They book the same way as a clinic visit and
        get their own consultation page — your meeting link is never sent out.
      </p>

      {err && (
        <div style={{ display: "flex", gap: 8, background: "#fdecec", color: "#b3272c", borderRadius: 10, padding: "11px 14px", fontSize: 13.5, marginBottom: 14 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{err}</span>
        </div>
      )}

      <Card
        title={enabled ? "Telemedicine is on" : "Telemedicine is off"}
        subtitle={
          enabled
            ? "Patients can choose a video appointment on your booking page."
            : "Add your meeting link below, then turn it on. Until then patients can only book in person."
        }
      >
        <label style={labelStyle}>Your meeting link</label>
        <input
          value={roomUrl}
          onChange={(e) => setRoomUrl(e.target.value)}
          style={{ ...inputStyle, width: "100%", maxWidth: 460 }}
          maxLength={500}
          placeholder="https://meet.google.com/abc-defg-hij"
        />
        <p style={{ margin: "8px 0 20px", fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
          Open <strong>meet.google.com/new</strong> once, copy the link, and paste
          it here. It stays the same for every consultation — patients only ever
          see it in the fifteen minutes around their own appointment.
        </p>

        <label style={labelStyle}>Registration number</label>
        <input
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          style={{ ...inputStyle, width: "100%", maxWidth: 260 }}
          maxLength={60}
          placeholder="e.g. WB-12345"
        />
        <p style={{ margin: "8px 0 20px", fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
          Shown to the patient on their consultation page. It's expected of a
          remote consultation, and it reassures people they're seeing a real doctor.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => save({})}
            disabled={saving}
            style={{ ...btnGhost, opacity: saving ? 0.6 : 1 }}
          >
            Save details
          </button>
          <button
            type="button"
            onClick={() => save({ onlineConsultEnabled: !enabled })}
            disabled={saving || (!enabled && !roomUrl.trim())}
            style={{
              ...btnPrimary,
              background: enabled ? "#fff" : TEAL,
              color: enabled ? "#b3272c" : "#fff",
              border: enabled ? "1px solid #f6cdcd" : "none",
              maxWidth: "100%",
              whiteSpace: "normal",
              opacity: !enabled && !roomUrl.trim() ? 0.5 : 1,
              cursor: !enabled && !roomUrl.trim() ? "not-allowed" : "pointer",
            }}
          >
            {enabled ? "Turn telemedicine off" : "Turn telemedicine on"}
          </button>
          {note && <span style={{ fontSize: 13.5, fontWeight: 700, color: TEAL }}>{note}</span>}
        </div>
      </Card>

      <Card title="Today's video consultations">
        {today.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
            Nothing booked for today.
          </p>
        ) : (
          today.map((v) => (
            <Row
              key={v.id}
              v={v}
              now={now}
              slotMinutes={slotMinutes}
              roomUrl={roomUrl}
              copied={copiedId === v.id}
              onCopy={() => copyLink(v)}
              showDay={false}
            />
          ))
        )}
      </Card>

      {later.length > 0 && (
        <Card title={`Coming up (${later.length})`}>
          {later.map((v) => (
            <Row
              key={v.id}
              v={v}
              now={now}
              slotMinutes={slotMinutes}
              roomUrl={roomUrl}
              copied={copiedId === v.id}
              onCopy={() => copyLink(v)}
              showDay
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function Row({ v, now, slotMinutes, roomUrl, copied, onCopy, showDay }) {
  const start = new Date(v.scheduled_at);
  const opens = start.getTime() - OPENS_MIN_BEFORE * 60000;
  const closes = start.getTime() + (slotMinutes + GRACE_MIN_AFTER) * 60000;
  const open = now.getTime() >= opens && now.getTime() <= closes && !!roomUrl.trim();

  const minsAway = Math.round((opens - now.getTime()) / 60000);

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        flexWrap: "wrap",
        padding: "14px 0",
        borderTop: `1px solid ${LINE}`,
      }}
    >
      <div style={{ minWidth: 92 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: NAVY, fontVariantNumeric: "tabular-nums" }}>
          {timeLabel(v.scheduled_at)}
        </div>
        {showDay && <div style={{ fontSize: 12.5, color: MUTED }}>{dayLabel(v.scheduled_at)}</div>}
      </div>

      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{v.patient_name}</div>
        {v.patient_phone && (
          <a
            href={`tel:${v.patient_phone}`}
            style={{ fontSize: 13, color: MUTED, textDecoration: "none", display: "inline-flex", gap: 5, alignItems: "center" }}
          >
            <Phone size={12} /> {v.patient_phone}
          </a>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={onCopy} style={btnGhost}>
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Patient's link"}
        </button>

        {open ? (
          <a
            href={roomUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...btnPrimary,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              textDecoration: "none",
            }}
          >
            <Video size={16} /> Join
          </a>
        ) : (
          <span style={{ fontSize: 13, color: MUTED, whiteSpace: "nowrap" }}>
            {minsAway > 0 ? `Opens in ${minsAway} min` : "Window closed"}
          </span>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  fontSize: 14,
  fontFamily: "inherit",
  color: INK,
  background: "#fff",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: MUTED,
  marginBottom: 6,
};

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 14px",
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  background: "#fff",
  color: INK,
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnPrimary = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: TEAL,
  color: "#fff",
  fontSize: 14.5,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
};
