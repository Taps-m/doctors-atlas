import React, { useCallback, useEffect, useRef, useState } from "react";
import { Video, Clock, Phone, ShieldCheck, AlertCircle } from "lucide-react";
import { api } from "../../api";

/**
 * ConsultPage
 * What the patient sees at /consult/<token>.
 *
 * The meeting link is never in this page's URL or its HTML until the
 * backend decides the window is open, so forwarding this page to
 * someone does not hand them a way into the doctor's room.
 *
 * It re-checks on a timer rather than making the patient reload: the
 * common case is someone opening the link ten minutes early and
 * leaving it on screen, and the Join button simply appearing is a far
 * better experience than "refresh the page".
 */

const INK = "#15213b";
const MUTED = "#6b7a90";
const TEAL = "#1a9e8f";
const RULE = "#e4e8f0";

const POLL_MS = 20000;

function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "in 12 minutes" / "in 2 hours 5 minutes" / null once it's passed. */
function countdown(toIso) {
  const target = new Date(toIso).getTime();
  const diff = target - Date.now();
  if (Number.isNaN(target) || diff <= 0) return null;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} minute${mins === 1 ? "" : "s"}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `in ${h} hour${h === 1 ? "" : "s"}${m ? ` ${m} min` : ""}`;
  const days = Math.round(h / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

export default function ConsultPage({ token }) {
  // undefined = still loading, null = not found
  const [data, setData] = useState(undefined);
  const [error, setError] = useState("");
  const [, forceTick] = useState(0);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api.publicConsult(token);
      setData(d);
      setError("");
    } catch (err) {
      setData(null);
      setError(err.message || "This consultation link isn't valid");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-check while we're waiting, so the Join button appears on its
  // own. Stops once the room is open - no reason to keep polling.
  useEffect(() => {
    if (!data || data.join_open) return undefined;
    timerRef.current = setInterval(load, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [data, load]);

  // Ticks the "in 12 minutes" text once a minute between polls.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (data === undefined) {
    return (
      <Shell>
        <div style={card}>
          <p style={{ margin: 0, color: MUTED, textAlign: "center" }}>Loading…</p>
        </div>
      </Shell>
    );
  }

  if (data === null) {
    return (
      <Shell>
        <div style={card}>
          <AlertCircle size={22} style={{ color: "#b3272c" }} />
          <h1 style={h1}>This link isn't valid</h1>
          <p style={body}>
            {error ||
              "It may have expired, or the appointment may have been cancelled. Please contact the clinic."}
          </p>
        </div>
      </Shell>
    );
  }

  const cancelled = data.status === "cancelled";
  const over = !data.join_open && new Date(data.closes_at).getTime() < Date.now();
  const until = countdown(data.opens_at);

  return (
    <Shell>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        {data.logo_url && (
          <img
            src={data.logo_url}
            alt=""
            style={{ maxWidth: "100%", maxHeight: 76, objectFit: "contain", marginBottom: 10 }}
          />
        )}
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: INK }}>
          {data.clinic_name}
        </h1>
        {(data.doctor_name || data.doctor_reg_no) && (
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: MUTED }}>
            {data.doctor_name ? `Dr ${data.doctor_name}` : ""}
            {data.doctor_name && data.doctor_reg_no ? " · " : ""}
            {data.doctor_reg_no ? `Reg. ${data.doctor_reg_no}` : ""}
          </p>
        )}
      </div>

      <div style={card}>
        <span style={eyebrow}>Telemedicine consultation</span>
        <p style={{ margin: "0 0 2px", fontSize: 15, color: MUTED }}>{data.patient_name}</p>
        <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: INK }}>
          {formatWhen(data.scheduled_at)}
        </p>

        {cancelled ? (
          <Notice tone="warn">
            This appointment was cancelled. Please contact the clinic if that's unexpected.
          </Notice>
        ) : over ? (
          <Notice tone="quiet">
            This consultation has finished. If you still need to be seen, please
            book again or call the clinic.
          </Notice>
        ) : data.join_open ? (
          <>
            <a href={data.room_url} target="_blank" rel="noopener noreferrer" style={joinBtn}>
              <Video size={18} /> Join the consultation
            </a>
            <p style={{ ...body, marginTop: 12 }}>
              Opens in a new tab. You may be asked to wait a moment — the doctor
              lets each patient in one at a time.
            </p>
          </>
        ) : (
          <>
            <div style={waitBox}>
              <Clock size={17} style={{ color: TEAL, flexShrink: 0 }} />
              <span>
                The Join button appears 15 minutes before your appointment
                {until ? ` — ${until}` : ""}.
              </span>
            </div>
            <p style={{ ...body, marginTop: 10 }}>
              You can keep this page open. It will update on its own.
            </p>
          </>
        )}
      </div>

      {!cancelled && !over && (
        <div style={{ ...card, marginTop: 14 }}>
          <span style={eyebrow}>Before you join</span>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: INK, fontSize: 14.5, lineHeight: 1.6 }}>
            <li>A phone or computer with a camera and microphone.</li>
            <li>Somewhere quiet with a steady internet connection.</li>
            <li>Any medicines you're taking, and earlier reports, to hand.</li>
          </ul>
        </div>
      )}

      {data.clinic_phone && (
        <a href={`tel:${data.clinic_phone}`} style={callLink}>
          <Phone size={15} /> Trouble joining? Call {data.clinic_phone}
        </a>
      )}

      <p style={footNote}>
        <ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        This consultation is not recorded.
      </p>
    </Shell>
  );
}

/* ---------------- bits ---------------- */

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fa", padding: "32px 16px 56px" }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function Notice({ tone, children }) {
  const tones = {
    warn: { bg: "#fdf1e2", fg: "#8a4a09" },
    quiet: { bg: "#f4f6fa", fg: "#55627c" },
  };
  const t = tones[tone] || tones.quiet;
  return (
    <p
      style={{
        margin: "16px 0 0",
        background: t.bg,
        color: t.fg,
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {children}
    </p>
  );
}

const card = {
  background: "#fff",
  border: `1px solid ${RULE}`,
  borderRadius: 14,
  padding: "22px 20px",
  boxShadow: "0 1px 2px rgba(21,33,59,.04), 0 10px 26px rgba(21,33,59,.06)",
};

const eyebrow = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: TEAL,
  marginBottom: 8,
};

const h1 = { margin: "10px 0 6px", fontSize: 19, fontWeight: 800, color: INK };
const body = { margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.55 };

const joinBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  marginTop: 18,
  background: `linear-gradient(135deg, ${TEAL} 0%, #14746a 100%)`,
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 16,
  padding: "15px 18px",
  borderRadius: 12,
  boxShadow: "0 8px 20px rgba(26,158,143,.3)",
};

const waitBox = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginTop: 18,
  background: "#e4f3f0",
  color: "#0f5d55",
  borderRadius: 10,
  padding: "13px 14px",
  fontSize: 14.5,
  lineHeight: 1.5,
};

const callLink = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  marginTop: 16,
  color: MUTED,
  fontSize: 14,
  textDecoration: "none",
};

const footNote = {
  margin: "22px 0 0",
  textAlign: "center",
  fontSize: 12.5,
  color: "#9aa5b5",
};
