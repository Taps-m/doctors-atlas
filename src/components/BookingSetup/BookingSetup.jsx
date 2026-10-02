import React, { useEffect, useState } from "react";
import { Copy, Check, Plus, X, Trash2, ExternalLink } from "lucide-react";
import { api } from "../../api";

/**
 * BookingSetup
 * Where the doctor turns online booking on: which days she works, what
 * hours, how long an appointment is, any dates she's away - and the
 * link she hands to patients.
 *
 * The switch is deliberately at the bottom and refuses to turn on until
 * there are hours to offer, so a link can never be shared that shows
 * patients an empty calendar.
 */

const TEAL = "#1a9e8f";
const NAVY = "#15213b";
const INK = "#1f2937";
const MUTED = "#5b6b85";
const LINE = "#e4e9f1";

// Python weekday numbering: 0 = Monday .. 6 = Sunday.
const DAYS = [
  { key: "0", label: "Monday" },
  { key: "1", label: "Tuesday" },
  { key: "2", label: "Wednesday" },
  { key: "3", label: "Thursday" },
  { key: "4", label: "Friday" },
  { key: "5", label: "Saturday" },
  { key: "6", label: "Sunday" },
];

const SLOT_CHOICES = [10, 15, 20, 30, 45, 60];

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

// Part-day blocking. The doctor thinks in "morning" and "afternoon",
// not in 24-hour boundaries, so the presets do that translation and
// Custom is there for the days that don't fit either.
// End is exclusive, so an afternoon block ending 23:59 covers every
// remaining slot (the latest a slot can start is 23:30).
const BLOCK_RANGES = {
  all: () => ({ start: null, end: null }),
  morning: () => ({ start: "00:00", end: "13:00" }),
  afternoon: () => ({ start: "13:00", end: "23:59" }),
  custom: (from, to) => ({ start: from, end: to }),
};

const BLOCK_CHOICES = [
  { id: "all", label: "All day" },
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "custom", label: "Custom" },
];

// "13:30" -> "1:30 PM". Written out rather than using toLocaleTimeString
// so the result is the same on every phone regardless of its locale.
function to12h(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

// What one blocked row should read as in the list.
function blockLabel(b) {
  if (!b.start_time) return "All day";
  if (!b.end_time) return to12h(b.start_time) + " only";
  if (b.start_time === "00:00" && b.end_time === "13:00") return "Morning";
  if (b.start_time === "13:00" && b.end_time === "23:59") return "Afternoon";
  return `${to12h(b.start_time)} – ${to12h(b.end_time)}`;
}

// "2026-08-30" -> "Sun 30 Aug" - friendlier than the raw ISO date.
function prettyDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function BookingSetup() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [slug, setSlug] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [hours, setHours] = useState({});
  const [blocked, setBlocked] = useState([]);
  const [phone, setPhone] = useState("");
  // Telemedicine
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [regNo, setRegNo] = useState("");
  const [copied, setCopied] = useState(false);

  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  // "all" | "morning" | "afternoon" | "custom"
  const [blockWhen, setBlockWhen] = useState("all");
  const [blockFrom, setBlockFrom] = useState("09:00");
  const [blockTo, setBlockTo] = useState("13:00");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shortUrl = `${origin}/booking`;
  const slugUrl = `${origin}/book/${slug}`;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const s = await api.getBookingSettings();
      setSlug(s.booking_slug || "");
      setEnabled(!!s.booking_enabled);
      setSlotMinutes(s.slot_minutes || 30);
      setHours(s.booking_hours || {});
      setBlocked(s.blocked || []);
      setPhone(s.phone || "");
      setOnlineEnabled(!!s.online_consult_enabled);
      setRoomUrl(s.consult_room_url || "");
      setRegNo(s.doctor_reg_no || "");
    } catch (err) {
      setError(err.message || "Could not load your booking settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hasAnyHours = Object.values(hours).some((w) => w && w.length > 0);

  function setDayWindows(dayKey, windows) {
    setHours((h) => ({ ...h, [dayKey]: windows }));
  }

  function toggleDay(dayKey) {
    const current = hours[dayKey] || [];
    if (current.length > 0) {
      setDayWindows(dayKey, []);
    } else {
      setDayWindows(dayKey, [{ start: "10:00", end: "13:00" }]);
    }
  }

  function updateWindow(dayKey, i, field, value) {
    const list = [...(hours[dayKey] || [])];
    list[i] = { ...list[i], [field]: value };
    setDayWindows(dayKey, list);
  }

  function addWindow(dayKey) {
    setDayWindows(dayKey, [...(hours[dayKey] || []), { start: "17:00", end: "20:00" }]);
  }

  function removeWindow(dayKey, i) {
    setDayWindows(dayKey, (hours[dayKey] || []).filter((_, idx) => idx !== i));
  }

  async function save(extra = {}) {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const s = await api.updateBookingSettings({
        slug: slug.trim(),
        slotMinutes,
        hours,
        phone,
        consultRoomUrl: roomUrl.trim(),
        doctorRegNo: regNo.trim(),
        ...extra,
      });
      setSlug(s.booking_slug || "");
      setEnabled(!!s.booking_enabled);
      setSlotMinutes(s.slot_minutes || 30);
      setHours(s.booking_hours || {});
      setBlocked(s.blocked || []);
      setPhone(s.phone || "");
      setOnlineEnabled(!!s.online_consult_enabled);
      setRoomUrl(s.consult_room_url || "");
      setRegNo(s.doctor_reg_no || "");
      setSavedMsg("Saved.");
      setTimeout(() => setSavedMsg(""), 2500);
      return true;
    } catch (err) {
      setError(err.message || "Could not save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled() {
    // Save the hours in the same call that flips the switch, so she
    // can't enable against settings she hasn't saved yet.
    await save({ enabled: !enabled });
  }

  async function handleAddBlock(e) {
    e.preventDefault();
    if (!blockDate) return;
    const range = BLOCK_RANGES[blockWhen] || (() => ({ start: null, end: null }));
    const { start, end } = range(blockFrom, blockTo);
    if (start && end && end <= start) {
      setError("The end time has to be after the start time");
      return;
    }
    try {
      setError("");
      await api.addBlockedDate({
        date: blockDate,
        startTime: start,
        endTime: end,
        reason: blockReason,
      });
      setBlockDate("");
      setBlockReason("");
      setBlockWhen("all");
      await load();
    } catch (err) {
      setError(err.message || "Could not block that date");
    }
  }

  async function handleRemoveBlock(id) {
    try {
      await api.removeBlockedDate(id);
      setBlocked((b) => b.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message || "Could not remove that");
    }
  }

  function copy(text) {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {});
    } else {
      done();
    }
  }

  if (loading) {
    return <div style={{ maxWidth: 720, margin: "0 auto", color: MUTED }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: NAVY }}>
          Online booking
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
          Let patients book their own appointments from a link.
        </p>
      </div>

      {error && (
        <div style={{ background: "#fdecec", border: "1px solid #f6cdcd", borderRadius: 10,
                      padding: "12px 14px", fontSize: 13.5, color: "#b3272c", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ---- The link ---- */}
      <Card
        title="Your booking link"
        subtitle={
          enabled
            ? "Share this with patients. It works on any phone, and they don't need an account."
            : "This link goes live once you switch booking on at the bottom of this page."
        }
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <code
            style={{
              flex: "1 1 240px",
              background: "#f4f6fa",
              border: `1px solid ${LINE}`,
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 14.5,
              fontWeight: 700,
              color: enabled ? NAVY : "#9aa5b5",
              overflowWrap: "anywhere",
            }}
          >
            {shortUrl}
          </code>
          <button type="button" onClick={() => copy(shortUrl)} style={btnGhost}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
          </button>
          {enabled && (
            <a href={shortUrl} target="_blank" rel="noreferrer" style={{ ...btnGhost, textDecoration: "none" }}>
              <ExternalLink size={15} /> Preview
            </a>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Or a named link</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, color: MUTED }}>{origin}/book/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              style={{ ...inputStyle, width: 200 }}
              maxLength={40}
              placeholder="clinic-name"
            />
            <button type="button" onClick={() => copy(slugUrl)} style={btnGhost}>
              <Copy size={15} /> Copy
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#9aa5b5", margin: "6px 0 0", lineHeight: 1.5 }}>
            Lowercase letters, numbers and hyphens. Changing this breaks any link
            you've already shared, so pick one and keep it.
          </p>
        </div>
      </Card>

      {/* ---- Hours ---- */}
      <Card
        title="When are you available?"
        subtitle="Switch on the days you see patients and set your hours. Everything inside these hours can be booked."
      >
        {DAYS.map((d) => {
          const windows = hours[d.key] || [];
          const on = windows.length > 0;
          return (
            <div key={d.key} style={{ borderTop: `1px solid ${LINE}`, padding: "12px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  aria-pressed={on}
                  style={{
                    width: 42, height: 24, borderRadius: 999, border: "none", flexShrink: 0,
                    background: on ? TEAL : "#d7dee9", position: "relative", cursor: "pointer",
                    transition: "background .15s ease",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18,
                    borderRadius: "50%", background: "#fff", transition: "left .15s ease",
                  }} />
                </button>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: on ? INK : "#9aa5b5", flex: 1 }}>
                  {d.label}
                </span>
                {on && (
                  <button type="button" onClick={() => addWindow(d.key)} style={{ ...btnGhost, padding: "6px 10px", fontSize: 12.5 }}>
                    <Plus size={13} /> Add hours
                  </button>
                )}
              </div>

              {on && (
                <div style={{ marginTop: 10, marginLeft: 54, display: "flex", flexDirection: "column", gap: 8 }}>
                  {windows.map((w, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <input type="time" value={w.start}
                             onChange={(e) => updateWindow(d.key, i, "start", e.target.value)}
                             style={{ ...inputStyle, width: 130 }} />
                      <span style={{ color: MUTED, fontSize: 13 }}>to</span>
                      <input type="time" value={w.end}
                             onChange={(e) => updateWindow(d.key, i, "end", e.target.value)}
                             style={{ ...inputStyle, width: 130 }} />
                      {windows.length > 1 && (
                        <button type="button" onClick={() => removeWindow(d.key, i)}
                                aria-label="Remove this time range"
                                style={{ ...btnGhost, padding: 8, color: "#b3272c" }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* ---- Slot length ---- */}
      <Card title="How long is an appointment?" subtitle="Patients are offered slots of this length.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SLOT_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSlotMinutes(m)}
              style={{
                padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                fontSize: 13.5, fontWeight: 700,
                border: `1px solid ${slotMinutes === m ? TEAL : LINE}`,
                background: slotMinutes === m ? TEAL : "#fff",
                color: slotMinutes === m ? "#fff" : INK,
              }}
            >
              {m} min
            </button>
          ))}
        </div>
      </Card>

      {/* ---- Clinic phone ---- */}
      <Card
        title="Clinic phone number"
        subtitle="Shown on your booking page so patients can call instead - and shown if the page ever fails to load, so nobody is left stuck."
      >
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ ...inputStyle, width: 260 }}
          maxLength={30}
          inputMode="tel"
          placeholder="+91 98765 43210"
        />
      </Card>

      {/* ---- Telemedicine ---- */}
      <Card
        title="Telemedicine"
        subtitle="Let patients choose a video appointment instead of coming in. They get their own consultation page; your meeting link is never shared directly."
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
          style={{ ...inputStyle, width: 260 }}
          maxLength={60}
          placeholder="e.g. WB-12345"
        />
        <p style={{ margin: "8px 0 20px", fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
          Shown to the patient on the consultation page. It's expected of a
          remote consultation, and it reassures people they're seeing a real
          doctor.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => save({ onlineConsultEnabled: !onlineEnabled })}
            disabled={saving || (!onlineEnabled && !roomUrl.trim())}
            style={{
              ...btnPrimary,
              background: onlineEnabled ? "#fff" : btnPrimary.background,
              color: onlineEnabled ? "#b3272c" : "#fff",
              border: onlineEnabled ? "1px solid #f6cdcd" : "none",
              opacity: !onlineEnabled && !roomUrl.trim() ? 0.5 : 1,
              cursor: !onlineEnabled && !roomUrl.trim() ? "not-allowed" : "pointer",
            }}
          >
            {onlineEnabled ? "Turn telemedicine off" : "Turn telemedicine on"}
          </button>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: onlineEnabled ? "#1a9e8f" : MUTED }}>
            {onlineEnabled
              ? "● Patients can choose a video appointment"
              : "Off — patients can only book in person"}
          </span>
        </div>
      </Card>

      {/* ---- Days off ---- */}
      <Card title="Time you're away" subtitle="Block a whole day or just part of one — a holiday, a conference, an afternoon off.">
        <form onSubmit={handleAddBlock} style={{ marginBottom: blocked.length ? 16 : 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)}
                   style={{ ...inputStyle, width: 170 }} required />
            <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                   placeholder="Reason (optional)" maxLength={60}
                   style={{ ...inputStyle, flex: "1 1 160px" }} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {BLOCK_CHOICES.map((c) => {
              const on = blockWhen === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setBlockWhen(c.id)}
                  aria-pressed={on}
                  style={{
                    border: on ? "1.5px solid #2f6fed" : "1.5px solid #dfe4ee",
                    background: on ? "#eaf1ff" : "#fff",
                    color: on ? "#1b4fbf" : MUTED,
                    fontWeight: 700,
                    fontSize: 13.5,
                    borderRadius: 999,
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {blockWhen === "custom" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
              <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>From</span>
              <input type="time" value={blockFrom} onChange={(e) => setBlockFrom(e.target.value)}
                     style={{ ...inputStyle, width: 130 }} required />
              <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>to</span>
              <input type="time" value={blockTo} onChange={(e) => setBlockTo(e.target.value)}
                     style={{ ...inputStyle, width: 130 }} required />
            </div>
          )}

          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: MUTED }}>
            {blockWhen === "all" && "No one can book anything on this date."}
            {blockWhen === "morning" && "Bookings stop until 1:00 PM. Your afternoon stays open."}
            {blockWhen === "afternoon" && "Bookings stop from 1:00 PM. Your morning stays open."}
            {blockWhen === "custom" && `No bookings between ${to12h(blockFrom)} and ${to12h(blockTo)}.`}
          </p>

          <button type="submit" style={{ ...btnGhost, marginTop: 12 }}>
            <Plus size={15} /> Block this time
          </button>
        </form>

        {blocked.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {blocked.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10,
                                        background: "#f4f6fa", borderRadius: 10, padding: "10px 12px" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{prettyDate(b.block_date)}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: "#1b4fbf", background: "#eaf1ff",
                  borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap",
                }}>
                  {blockLabel(b)}
                </span>
                {b.reason && <span style={{ fontSize: 13, color: MUTED, flex: 1 }}>{b.reason}</span>}
                <button type="button" onClick={() => handleRemoveBlock(b.id)}
                        aria-label="Unblock this date"
                        style={{ ...btnGhost, marginLeft: "auto", padding: 8, color: "#b3272c" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ---- Save + go live ---- */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 40 }}>
        <button type="button" onClick={() => save()} disabled={saving} style={btnPrimary}>
          {saving ? "Saving…" : "Save settings"}
        </button>

        <button
          type="button"
          onClick={handleToggleEnabled}
          disabled={saving || (!enabled && !hasAnyHours)}
          title={!enabled && !hasAnyHours ? "Set at least one day's hours first" : ""}
          style={{
            ...btnPrimary,
            background: enabled ? "#fff" : "#15213b",
            color: enabled ? "#b3272c" : "#fff",
            border: enabled ? "1px solid #f6cdcd" : "none",
            opacity: !enabled && !hasAnyHours ? 0.5 : 1,
            cursor: !enabled && !hasAnyHours ? "not-allowed" : "pointer",
          }}
        >
          {enabled ? "Turn booking off" : "Turn booking on"}
        </button>

        {savedMsg && <span style={{ fontSize: 13.5, color: "#17824c", fontWeight: 700 }}>{savedMsg}</span>}

        <span style={{ fontSize: 13, color: enabled ? "#17824c" : MUTED, fontWeight: 600 }}>
          {enabled ? "● Live — patients can book now" : "○ Not live yet"}
        </span>
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
