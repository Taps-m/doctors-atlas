import React, { useCallback, useEffect, useState } from "react";
import { Video, ShieldCheck, Phone, AlertCircle } from "lucide-react";
import { api } from "../../api";

/**
 * WaitingRoom
 * The clinic's permanent walk-in address: /room/<slug>.
 *
 * Unlike a booking link this one never changes and is meant to be
 * printed - on a card, a signboard, a WhatsApp status. The patient
 * arrives whenever, gives a name, and is handed straight to their own
 * consultation page, where their four-digit code and their place in
 * the queue are on screen. Nothing has to be sent to anybody.
 */

const INK = "#15213b";
const MUTED = "#6b7a90";
const TEAL = "#1a9e8f";
const RULE = "#e4e8f0";

export default function WaitingRoom({ slug }) {
  const [clinic, setClinic] = useState(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setClinic(await api.publicWaitingRoom(slug));
    } catch {
      setClinic(null);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function join(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const { token } = await api.joinWaitingRoom(slug, { name: name.trim(), phone: phone.trim() });
      window.location.href = `/consult/${token}`;
    } catch (e2) {
      setErr(e2.message || "Could not join right now. Please try again.");
      setBusy(false);
    }
  }

  if (clinic === undefined) {
    return (
      <Shell>
        <div style={card}>
          <p style={{ margin: 0, color: MUTED, textAlign: "center" }}>Loading…</p>
        </div>
      </Shell>
    );
  }

  if (clinic === null) {
    return (
      <Shell>
        <div style={card}>
          <AlertCircle size={22} style={{ color: "#b3272c" }} />
          <h1 style={h1}>This page isn't available</h1>
          <p style={body}>
            The clinic may not be offering video consultations at the moment.
            Please call them instead.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        {clinic.logo_url && (
          <img
            src={clinic.logo_url}
            alt=""
            style={{ maxWidth: "100%", maxHeight: 76, objectFit: "contain", marginBottom: 10 }}
          />
        )}
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: INK }}>{clinic.clinic_name}</h1>
        {(clinic.doctor_name || clinic.doctor_reg_no) && (
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: MUTED }}>
            {clinic.doctor_name ? `Dr ${clinic.doctor_name}` : ""}
            {clinic.doctor_name && clinic.doctor_reg_no ? " · " : ""}
            {clinic.doctor_reg_no ? `Reg. ${clinic.doctor_reg_no}` : ""}
          </p>
        )}
      </div>

      <div style={card}>
        <span style={eyebrow}>Video consultation</span>

        {!clinic.open ? (
          <>
            <h2 style={h1}>Not available right now</h2>
            <p style={body}>
              The doctor isn't taking video consultations at the moment. Please
              call the clinic or book an appointment.
            </p>
          </>
        ) : (
          <>
            <h2 style={h1}>Join the queue</h2>
            <p style={{ ...body, marginBottom: 18 }}>
              {clinic.waiting_count === 0
                ? "Nobody is waiting. The doctor will see you shortly."
                : `${clinic.waiting_count} ${clinic.waiting_count === 1 ? "person is" : "people are"} waiting ahead of you.`}
            </p>

            <form onSubmit={join}>
              <label style={label}>Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={input}
                maxLength={80}
                placeholder="Full name"
                autoComplete="name"
              />

              <label style={{ ...label, marginTop: 14 }}>
                Mobile number <span style={{ fontWeight: 400, color: MUTED }}>(optional)</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={input}
                maxLength={20}
                inputMode="tel"
                placeholder="10-digit mobile number"
                autoComplete="tel"
              />

              {err && (
                <p style={{ margin: "14px 0 0", color: "#b3272c", fontSize: 13.5 }}>{err}</p>
              )}

              <button
                type="submit"
                disabled={busy || !name.trim()}
                style={{
                  ...joinBtn,
                  opacity: busy || !name.trim() ? 0.5 : 1,
                  cursor: busy || !name.trim() ? "not-allowed" : "pointer",
                }}
              >
                <Video size={18} /> {busy ? "Joining…" : "Wait to see the doctor"}
              </button>
            </form>

            <p style={{ ...body, marginTop: 14 }}>
              You'll get a four-digit code on the next screen. The doctor will
              ask for it before starting, so you both know you have the right
              person.
            </p>
          </>
        )}
      </div>

      {clinic.clinic_phone && (
        <a href={`tel:${clinic.clinic_phone}`} style={callLink}>
          <Phone size={15} /> Call the clinic on {clinic.clinic_phone}
        </a>
      )}

      <p style={footNote}>
        <ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        Consultations are not recorded.
      </p>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fa", padding: "32px 16px 56px" }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>{children}</div>
    </div>
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

const h1 = { margin: "4px 0 6px", fontSize: 19, fontWeight: 800, color: INK };
const body = { margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.55 };

const label = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: INK,
  marginBottom: 6,
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: 10,
  border: `1px solid ${RULE}`,
  fontSize: 15,
  fontFamily: "inherit",
  color: INK,
  outline: "none",
};

const joinBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  width: "100%",
  marginTop: 20,
  background: `linear-gradient(135deg, ${TEAL} 0%, #14746a 100%)`,
  color: "#fff",
  border: "none",
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: 16,
  padding: "15px 18px",
  borderRadius: 12,
  boxShadow: "0 8px 20px rgba(26,158,143,.3)",
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
