import React, { useCallback, useEffect, useState } from "react";
import { Video, Copy, Check, Phone, AlertCircle, ExternalLink, Pencil, Send } from "lucide-react";
import { api } from "../../api";

/**
 * Telemedicine
 * The doctor's side of online consultations.
 *
 * The page has two lives. Before setup it is a three-step walkthrough
 * with exactly one button, because the hard part is not the form - it
 * is knowing that you need a Meet room at all. After setup the room
 * stops being interesting, so it collapses to a single line and the
 * day's patients take the top of the page, which is what she actually
 * opens this page to see.
 *
 * The Join button is not a plain link to her Meet room: it only lights
 * up inside the appointment's window, the same rule the patient's page
 * follows. If she can click it, the patient can be there too.
 */

const TEAL = "#1a9e8f";
const NAVY = "#15213b";
const INK = "#1f2937";
const MUTED = "#5b6b85";
const LINE = "#e4e9f1";

const OPENS_MIN_BEFORE = 15;
const GRACE_MIN_AFTER = 30;

function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>{children}</h3>
      {right}
    </div>
  );
}

/**
 * A click-to-chat link. India has no free SMS route worth relying on -
 * a gateway needs DLT registration and costs per message - so WhatsApp
 * is how the link actually reaches a patient's phone.
 */
function whatsappHref(v) {
  const digits = (v.patient_phone || "").replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;
  const url = `${window.location.origin}/consult/${v.consult_token}`;
  const text = `Your video consultation is ready. Join here: ${url}`;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** "3 min" / "just now" - how long someone has been sitting there. */
function waitedFor(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "a moment";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "less than a minute";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} hr${h === 1 ? "" : "s"} ${mins % 60} min`;
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

/** meet.google.com/abc-defg-hij -> abc-defg-hij, for a tidy one-line summary. */
function prettyRoom(url) {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/^www\./, "").replace(/\/$/, "");
  } catch {
    return url;
  }
}

export default function Telemedicine() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [enabled, setEnabled] = useState(false);
  const [savedRoom, setSavedRoom] = useState("");
  const [savedReg, setSavedReg] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(30);

  // Draft values for the form. Kept apart from the saved ones so
  // Cancel really does cancel.
  const [roomUrl, setRoomUrl] = useState("");
  const [regNo, setRegNo] = useState("");
  const [editing, setEditing] = useState(false);

  const [visits, setVisits] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // The walk-in queue.
  const [waitingList, setWaitingList] = useState([]);
  const [admitting, setAdmitting] = useState(null);
  const [slug, setSlug] = useState("");
  const [roomCopied, setRoomCopied] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [s, appts, waitingRows] = await Promise.all([
        api.getBookingSettings(),
        api.listAppointments(),
        api.listWaiting().catch(() => []),
      ]);
      setWaitingList(Array.isArray(waitingRows) ? waitingRows : []);
      setSlug(s.booking_slug || "");
      setEnabled(!!s.online_consult_enabled);
      setSavedRoom(s.consult_room_url || "");
      setSavedReg(s.doctor_reg_no || "");
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

  const refreshQueue = useCallback(async () => {
    try {
      const rows = await api.listWaiting();
      setWaitingList(Array.isArray(rows) ? rows : []);
    } catch {
      /* a failed poll is not worth shouting about; the next one retries */
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

  // Someone arriving in the waiting room has to show up without her
  // reloading, or she will never know they are there.
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(refreshQueue, 15000);
    return () => clearInterval(t);
  }, [enabled, refreshQueue]);

  async function save(patch = {}) {
    setSaving(true);
    setErr("");
    try {
      const s = await api.updateBookingSettings({
        consultRoomUrl: roomUrl.trim(),
        doctorRegNo: regNo.trim(),
        ...patch,
      });
      setEnabled(!!s.online_consult_enabled);
      setSavedRoom(s.consult_room_url || "");
      setSavedReg(s.doctor_reg_no || "");
      setRoomUrl(s.consult_room_url || "");
      setRegNo(s.doctor_reg_no || "");
      setEditing(false);
    } catch (e) {
      setErr(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function admit(w) {
    setAdmitting(w.id);
    setErr("");
    try {
      await api.admitPatient(w.id);
      setWaitingList((prev) => prev.filter((x) => x.id !== w.id));
      if (savedRoom) window.open(savedRoom, "_blank", "noopener");
    } catch (e) {
      setErr(e.message || "Could not call that patient in");
    } finally {
      setAdmitting(null);
    }
  }

  async function copyRoomLink() {
    const url = roomLink;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Your walk-in link:", url);
    }
    setRoomCopied(true);
    setTimeout(() => setRoomCopied(false), 2000);
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

  if (loading) return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;

  const now = new Date();
  const upcoming = visits
    .filter((v) => v.status !== "cancelled")
    .filter((v) => new Date(v.scheduled_at).getTime() + (slotMinutes + GRACE_MIN_AFTER) * 60000 > now.getTime())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const roomLink = `${window.location.origin}/room/${slug}`;

  const today = upcoming.filter((v) => sameDay(new Date(v.scheduled_at), now));
  const later = upcoming.filter((v) => !sameDay(new Date(v.scheduled_at), now));

  const errorBanner = err ? (
    <div style={{ display: "flex", gap: 8, background: "#fdecec", color: "#b3272c", borderRadius: 10, padding: "11px 14px", fontSize: 13.5, marginBottom: 14 }}>
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{err}</span>
    </div>
  ) : null;

  /* ---------- not set up yet: a walkthrough, one button ---------- */

  if (!enabled) {
    return (
      <div style={{ maxWidth: 680 }}>
        <Header />
        {errorBanner}

        <Card style={{ padding: "26px 22px" }}>
          <p style={{ margin: "0 0 22px", fontSize: 14.5, color: INK, lineHeight: 1.6 }}>
            Two steps, once. After this, patients can pick a video appointment
            when they book, and they appear on this page each morning.
          </p>

          <Step n={1} title="Create your video room">
            <p style={{ ...stepBody, marginBottom: 12 }}>
              Google Meet gives you a permanent room, free. Open it once and
              leave the call straight away — you only need the address.
            </p>
            <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, textDecoration: "none" }}>
              <ExternalLink size={15} /> Open Google Meet
            </a>
          </Step>

          <Step n={2} title="Paste the link here" last>
            <p style={{ ...stepBody, marginBottom: 10 }}>
              Copy the address from your browser's address bar — it looks like
              meet.google.com/abc-defg-hij.
            </p>
            <input
              value={roomUrl}
              onChange={(e) => setRoomUrl(e.target.value)}
              style={{ ...inputStyle, width: "100%", maxWidth: 420 }}
              maxLength={500}
              placeholder="https://meet.google.com/abc-defg-hij"
            />
          </Step>


          <button
            type="button"
            onClick={() => save({ onlineConsultEnabled: true })}
            disabled={saving || !roomUrl.trim()}
            style={{
              ...btnPrimary,
              marginTop: 24,
              width: "100%",
              maxWidth: 320,
              opacity: saving || !roomUrl.trim() ? 0.45 : 1,
              cursor: saving || !roomUrl.trim() ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Turning on…" : "Turn telemedicine on"}
          </button>
          {!roomUrl.trim() && (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: MUTED }}>
              Paste your meeting link above to continue.
            </p>
          )}
        </Card>
      </div>
    );
  }

  /* ---------- running: the day leads, settings get out of the way ---------- */

  return (
    <div style={{ maxWidth: 860 }}>
      <Header />
      {errorBanner}

      <Card style={{ borderColor: "#cfe9e4", background: "#fbfefd" }}>
        <CardTitle
          right={
            <button type="button" onClick={copyRoomLink} style={btnGhost}>
              {roomCopied ? <Check size={15} /> : <Copy size={15} />} {roomCopied ? "Copied" : "Copy walk-in link"}
            </button>
          }
        >
          Waiting now{waitingList.length > 0 ? ` (${waitingList.length})` : ""}
        </CardTitle>

        {waitingList.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            Nobody waiting. Anyone who opens your walk-in link appears here —
            put it on your website, your card, or your WhatsApp status.
          </p>
        ) : (
          waitingList.map((w, i) => (
            <div key={w.id} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "14px 0", borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
              <span style={codeChip}>{w.queue_code || "—"}</span>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{w.patient_name}</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  waiting {waitedFor(w.waiting_since)}
                  {w.patient_phone ? ` · ${w.patient_phone}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => admit(w)}
                disabled={admitting === w.id}
                style={{ ...btnPrimary, opacity: admitting === w.id ? 0.5 : 1 }}
              >
                {admitting === w.id ? "Calling in…" : "Call in"}
              </button>
            </div>
          ))
        )}

        <p style={{ margin: "14px 0 0", fontSize: 12.5, color: MUTED, lineHeight: 1.55 }}>
          Ask the patient to read out their code before you begin. It's on their
          screen and shown here, so you both know you have the right person.
        </p>
      </Card>

      <Card>
        <CardTitle>Today's video consultations</CardTitle>
        {today.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
            Nothing booked for today. Patients who choose a video appointment
            will show up here.
          </p>
        ) : (
          today.map((v) => (
            <Row key={v.id} v={v} now={now} slotMinutes={slotMinutes} roomUrl={savedRoom}
                 copied={copiedId === v.id} onCopy={() => copyLink(v)} showDay={false} />
          ))
        )}
      </Card>

      {later.length > 0 && (
        <Card>
          <CardTitle>Coming up ({later.length})</CardTitle>
          {later.map((v) => (
            <Row key={v.id} v={v} now={now} slotMinutes={slotMinutes} roomUrl={savedRoom}
                 copied={copiedId === v.id} onCopy={() => copyLink(v)} showDay />
          ))}
        </Card>
      )}

      <Card>
        {!editing ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={dot} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: NAVY }}>
                Telemedicine is on
              </div>
              <div style={{ fontSize: 13, color: MUTED, overflowWrap: "anywhere" }}>
                {prettyRoom(savedRoom)}
              </div>
            </div>
            <button type="button" onClick={() => setEditing(true)} style={btnGhost}>
              <Pencil size={14} /> Change
            </button>
          </div>
        ) : (
          <>
            <CardTitle>Your video room</CardTitle>
            <label style={labelStyle}>Meeting link</label>
            <input
              value={roomUrl}
              onChange={(e) => setRoomUrl(e.target.value)}
              style={{ ...inputStyle, width: "100%", maxWidth: 420, marginBottom: 16 }}
              maxLength={500}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => save()}
                disabled={saving || !roomUrl.trim()}
                style={{ ...btnPrimary, opacity: saving || !roomUrl.trim() ? 0.45 : 1 }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoomUrl(savedRoom);
                  setRegNo(savedReg);
                  setEditing(false);
                  setErr("");
                }}
                style={btnGhost}
              >
                Cancel
              </button>
            </div>

            <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 22, paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => save({ onlineConsultEnabled: false })}
                disabled={saving}
                style={linkDanger}
              >
                Turn telemedicine off
              </button>
              <p style={{ margin: "6px 0 0", fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>
                Patients go back to booking clinic visits only. Appointments
                already booked keep working.
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ---------------- bits ---------------- */

function Header() {
  return (
    <>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: NAVY }}>Telemedicine</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: MUTED, lineHeight: 1.55 }}>
        See patients over video. They book the same way as a clinic visit and get
        their own consultation page — your meeting link is never sent out.
      </p>
    </>
  );
}

function Step({ n, title, children, last }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#e4f3f0",
            color: "#0f5d55",
            fontSize: 14,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {n}
        </span>
        {!last && <span style={{ flex: 1, width: 2, background: LINE, marginTop: 6 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: last ? 0 : 26, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{title}</div>
        {children}
      </div>
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
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "14px 0", borderTop: `1px solid ${LINE}` }}>
      <div style={{ minWidth: 92 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: NAVY, fontVariantNumeric: "tabular-nums" }}>
          {timeLabel(v.scheduled_at)}
        </div>
        {showDay && <div style={{ fontSize: 12.5, color: MUTED }}>{dayLabel(v.scheduled_at)}</div>}
      </div>

      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{v.patient_name}</div>
        {v.patient_phone && (
          <a href={`tel:${v.patient_phone}`} style={{ fontSize: 13, color: MUTED, textDecoration: "none", display: "inline-flex", gap: 5, alignItems: "center" }}>
            <Phone size={12} /> {v.patient_phone}
          </a>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={onCopy} style={btnGhost}>
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Patient's link"}
        </button>
        {v.patient_phone && (
          <a href={whatsappHref(v)} target="_blank" rel="noopener noreferrer"
             style={{ ...btnGhost, textDecoration: "none" }} title="Send the link on WhatsApp">
            <Send size={15} /> Send
          </a>
        )}
        {open ? (
          <a href={roomUrl} target="_blank" rel="noopener noreferrer"
             style={{ ...btnPrimary, display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
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

/* ---------------- styles ---------------- */

const stepBody = { margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.6 };

const dot = {
  width: 9,
  height: 9,
  borderRadius: "50%",
  background: TEAL,
  flexShrink: 0,
  boxShadow: "0 0 0 4px rgba(26,158,143,.15)",
};

const codeChip = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 62,
  padding: "7px 10px",
  borderRadius: 9,
  background: "#fff",
  border: "1px dashed #c8d2e2",
  color: NAVY,
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: ".1em",
  fontVariantNumeric: "tabular-nums",
};

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

const linkDanger = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#b3272c",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "underline",
};
