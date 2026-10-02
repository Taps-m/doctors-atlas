import React, { useEffect, useState } from "react";
import { api } from "../../api";

/**
 * PublicBooking
 * The page a patient sees. No login, no navigation, nothing to do here
 * except pick a free time and book it.
 *
 * Design goal beyond correctness: it has to look unmistakably like the
 * clinic's own page. A stranger receiving this link over WhatsApp
 * decides in about two seconds whether it's legitimate, so the clinic's
 * real logo and name lead, the layout is plain and calm, and there are
 * no dead controls or stock filler anywhere on it.
 *
 * Self-contained by design: it imports no shared dashboard CSS, so
 * nothing we change inside the app can alter what patients see.
 */

const TEAL = "#1a9e8f";
const NAVY = "#15213b";
const INK = "#1f2937";
const MUTED = "#5b6b85";
const LINE = "#e4e9f1";
const BG = "#f4f6fa";

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function prettyDay(iso) {
  const d = parseDay(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";
  return `${DAY_LABEL[d.getDay()]} ${d.getDate()} ${MONTH_LABEL[d.getMonth()]}`;
}

function prettyFull(iso, time) {
  const d = parseDay(iso);
  return `${DAY_LABEL[d.getDay()]} ${d.getDate()} ${MONTH_LABEL[d.getMonth()]} ${d.getFullYear()}, ${prettyTime(time)}`;
}

/** "14:30" -> "2:30 PM" */
function prettyTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * Remember the clinic's name and phone from any successful visit.
 *
 * The error state is exactly when we CANNOT fetch them - the backend is
 * unreachable - so without this a patient hitting a down page gets
 * "contact the clinic" with no way to do it. Cached from a previous
 * visit, we can still hand them a number. Wrapped because private
 * browsing can make storage throw.
 */
const CACHE_KEY = (slug) => `atlas_clinic_${slug}`;

function rememberClinic(slug, clinic) {
  try {
    localStorage.setItem(CACHE_KEY(slug), JSON.stringify({ name: clinic.name, phone: clinic.phone || "" }));
  } catch (_) { /* storage unavailable - not important enough to handle */ }
}

function recallClinic(slug) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(slug));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function CallLink({ phone, style }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone.replace(/\s+/g, "")}`}
       style={{ color: TEAL, fontWeight: 700, textDecoration: "none", ...style }}>
      {phone}
    </a>
  );
}

function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        padding: "24px 16px 48px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
        color: INK,
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: 16,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function PublicBooking({ slug }) {
  const [clinic, setClinic] = useState(null);
  const [days, setDays] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [activeDay, setActiveDay] = useState(null);
  const [slot, setSlot] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  // "in_person" | "online". Only ever shown when the clinic offers it.
  const [mode, setMode] = useState("in_person");
  const [consent, setConsent] = useState(false);

  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [c, avail] = await Promise.all([
        api.publicClinic(slug),
        api.publicAvailability(slug, 21),
      ]);
      setClinic(c);
      rememberClinic(slug, c);
      setDays(avail);
      const firstOpen = avail.find((d) => d.slots.length > 0);
      setActiveDay(firstOpen ? firstOpen.date : avail[0]?.date || null);
    } catch (err) {
      setLoadError(err.message || "This booking page isn't available.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleBook(e) {
    e.preventDefault();
    if (!slot || !activeDay) return;

    if (!name.trim()) return setBookError("Please enter the patient's name.");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) return setBookError("Please enter a valid phone number.");
    if (mode === "online") {
      // Checked here as well as on the server so the patient is told
      // before the request, not after it bounces.
      if (!email.trim()) {
        return setBookError("Please add your email — that's where your video link is sent.");
      }
      if (!consent) {
        return setBookError("Please confirm you agree to a video consultation.");
      }
    }

    setBooking(true);
    setBookError("");
    try {
      const res = await api.publicBook(slug, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        message: message.trim(),
        // Sent without a timezone so the clinic's own local time is
        // taken literally, matching how it books internally.
        scheduledAt: `${activeDay}T${slot}:00`,
        mode,
        consent,
      });
      setConfirmed({
        when: prettyFull(activeDay, slot),
        clinic: res.clinic_name,
        phone: clinic?.phone || "",
        mode: res.mode || mode,
        consultToken: res.consult_token || null,
        email: email.trim(),
      });
    } catch (err) {
      setBookError(err.message || "Could not book that time. Please try another.");
      // Someone may have taken the slot - refresh what's actually free.
      load();
      setSlot(null);
    } finally {
      setBooking(false);
    }
  }

  /* ---------------- states ---------------- */

  if (loading) {
    return (
      <Shell>
        <Card style={{ textAlign: "center", color: MUTED }}>Loading…</Card>
      </Shell>
    );
  }

  if (loadError) {
    const known = recallClinic(slug);
    return (
      <Shell>
        <Card style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 18, margin: "0 0 8px", color: INK }}>
            {known?.name ? `${known.name} — booking unavailable` : "This booking page isn't available"}
          </h1>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            We couldn't load the appointment times just now. Please try again in
            a moment{known?.phone ? ", or call the clinic" : ", or contact the clinic directly"}.
          </p>
          {known?.phone && (
            <p style={{ margin: "0 0 16px", fontSize: 19 }}>
              <CallLink phone={known.phone} />
            </p>
          )}
          <button type="button" onClick={load}
                  style={{ padding: "12px 22px", borderRadius: 10, border: `1px solid ${LINE}`,
                           background: "#fff", color: INK, fontSize: 14, fontWeight: 700,
                           cursor: "pointer", fontFamily: "inherit" }}>
            Try again
          </button>
        </Card>
      </Shell>
    );
  }

  if (confirmed) {
    return (
      <Shell>
        <Card style={{ textAlign: "center", padding: "34px 22px" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "#e6f5f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#14746a"
                 strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>
            {confirmed.mode === "online" ? "Video consultation confirmed" : "Appointment confirmed"}
          </h1>
          <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: NAVY }}>
            {confirmed.when}
          </p>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: MUTED }}>{confirmed.clinic}</p>
          {confirmed.mode === "online" && confirmed.consultToken ? (
            <>
              <a
                href={`/consult/${confirmed.consultToken}`}
                style={{
                  display: "block", background: "#1a9e8f", color: "#fff",
                  textDecoration: "none", fontWeight: 800, fontSize: 15,
                  padding: "13px 16px", borderRadius: 10, marginBottom: 14,
                }}
              >
                Open your consultation page
              </a>
              <p style={{ margin: "0 0 14px", fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>
                Save this page or use the link we've emailed to{" "}
                <strong>{confirmed.email}</strong>. The Join button appears
                15 minutes before your appointment.
              </p>
            </>
          ) : null}
          <p style={{ margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>
            {confirmed.mode === "online"
              ? "To change or cancel, "
              : "Please arrive a few minutes early. To change or cancel, "}
            {confirmed.phone ? "call " : "contact the clinic directly."}
            {confirmed.phone && <CallLink phone={confirmed.phone} />}
          </p>
        </Card>
      </Shell>
    );
  }

  const dayObj = days.find((d) => d.date === activeDay);
  const openDays = days.filter((d) => d.slots.length > 0);

  return (
    <Shell>
      {/* Identity first - this is what makes the link feel legitimate. */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        {clinic.logo_url ? (
          <img
            src={clinic.logo_url}
            alt=""
            style={{ maxWidth: 96, maxHeight: 96, width: "auto", height: "auto", objectFit: "contain", display: "block", margin: "0 auto 12px" }}
          />
        ) : null}
        <h1 style={{ fontSize: 22, margin: "0 0 4px", color: NAVY }}>{clinic.name}</h1>
        <p style={{ margin: 0, fontSize: 14, color: MUTED }}>Book an appointment</p>
        {clinic.phone && (
          <p style={{ margin: "8px 0 0", fontSize: 13.5, color: MUTED }}>
            Prefer to call? <CallLink phone={clinic.phone} />
          </p>
        )}
      </div>

      {openDays.length === 0 ? (
        <Card style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            No appointment times are available in the next three weeks. Please
            contact the clinic directly.
          </p>
        </Card>
      ) : (
        <>
          {/* Day picker */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: MUTED, textTransform: "uppercase", marginBottom: 12 }}>
              Choose a day
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {openDays.map((d) => {
                const on = d.date === activeDay;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => { setActiveDay(d.date); setSlot(null); }}
                    style={{
                      flex: "0 0 auto",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${on ? TEAL : LINE}`,
                      background: on ? TEAL : "#fff",
                      color: on ? "#fff" : INK,
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      font: "inherit",
                      fontFamily: "inherit",
                    }}
                  >
                    {prettyDay(d.date)}
                    <span style={{ display: "block", fontSize: 11, fontWeight: 500, opacity: 0.8, marginTop: 2 }}>
                      {d.slots.length} free
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Slot picker */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: MUTED, textTransform: "uppercase", marginBottom: 12 }}>
              Choose a time
            </div>
            {!dayObj || dayObj.slots.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
                Nothing free on this day — please pick another.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
                {dayObj.slots.map((t) => {
                  const on = t === slot;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSlot(t)}
                      style={{
                        padding: "12px 6px",
                        borderRadius: 10,
                        border: `1px solid ${on ? TEAL : LINE}`,
                        background: on ? TEAL : "#fff",
                        color: on ? "#fff" : INK,
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        minHeight: 44,
                      }}
                    >
                      {prettyTime(t)}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Details */}
          <Card>
            <form onSubmit={handleBook}>
              {clinic?.online_consult_enabled && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: MUTED, textTransform: "uppercase", marginBottom: 10 }}>
                    How would you like to be seen?
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { id: "in_person", label: "At the clinic" },
                      { id: "online", label: "Video call" },
                    ].map((opt) => {
                      const on = mode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setMode(opt.id)}
                          aria-pressed={on}
                          style={{
                            flex: 1,
                            border: on ? "1.5px solid #1a9e8f" : "1.5px solid #dfe4ee",
                            background: on ? "#e6f5f2" : "#fff",
                            color: on ? "#0f5d55" : MUTED,
                            fontWeight: 700,
                            fontSize: 14.5,
                            borderRadius: 10,
                            padding: "12px 10px",
                            cursor: "pointer",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: MUTED, textTransform: "uppercase", marginBottom: 14 }}>
                Your details
              </div>

              <Field label="Patient's name" required>
                <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)}
                       placeholder="Full name" maxLength={80} autoComplete="name" />
              </Field>

              <Field label="Phone number" required>
                <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)}
                       placeholder="10-digit mobile number" maxLength={20}
                       inputMode="tel" autoComplete="tel" />
              </Field>

              <Field
                label="Email"
                hint={mode === "online" ? undefined : "optional"}
                required={mode === "online"}
              >
                <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)}
                       placeholder="you@example.com" maxLength={120}
                       inputMode="email" autoComplete="email" />
                {mode === "online" && (
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 5, lineHeight: 1.45 }}>
                    We send your video consultation link here.
                  </div>
                )}
              </Field>

              <Field label="Anything the doctor should know" hint="optional">
                <textarea
                  style={{ ...inputStyle, minHeight: 74, resize: "vertical", lineHeight: 1.5 }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={300}
                  placeholder="A short note — symptoms, or anything useful before the visit."
                />
                <div style={{ fontSize: 11.5, color: "#9aa5b5", marginTop: 4, textAlign: "right" }}>
                  {message.length}/300
                </div>
              </Field>

              {mode === "online" && (
                <label
                  style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    background: "#f4f6fa", borderRadius: 10, padding: "12px 14px",
                    marginBottom: 14, cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13.5, color: "#2c3d57", lineHeight: 1.5 }}>
                    I agree to be seen by video, and understand the doctor may ask
                    me to come to the clinic if an examination is needed.
                  </span>
                </label>
              )}

              {slot && (
                <div style={{ background: "#e6f5f2", border: "1px solid #c9e8e2", borderRadius: 10,
                              padding: "12px 14px", fontSize: 13.5, color: "#2c4a45", marginBottom: 14 }}>
                  Booking <strong>{prettyFull(activeDay, slot)}</strong>
                </div>
              )}

              {bookError && (
                <div style={{ background: "#fdecec", border: "1px solid #f6cdcd", borderRadius: 10,
                              padding: "12px 14px", fontSize: 13.5, color: "#b3272c", marginBottom: 14 }}>
                  {bookError}
                </div>
              )}

              <button
                type="submit"
                disabled={!slot || booking}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: !slot || booking ? "#a8c6c1" : TEAL,
                  color: "#fff",
                  fontSize: 15.5,
                  fontWeight: 800,
                  cursor: !slot || booking ? "default" : "pointer",
                  fontFamily: "inherit",
                  minHeight: 48,
                }}
              >
                {booking ? "Booking…" : slot ? "Confirm appointment" : "Pick a time above"}
              </button>
            </form>
          </Card>
        </>
      )}

      <p style={{ textAlign: "center", fontSize: 11.5, color: "#98a2b5", marginTop: 18 }}>
        {clinic.name} · appointments powered by Doctors Atlas
      </p>
    </Shell>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  fontSize: 15, // 15px+ stops iOS Safari zooming the page on focus
  fontFamily: "inherit",
  color: INK,
  background: "#fff",
  boxSizing: "border-box",
  outline: "none",
};

function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: "#e5484d" }}> *</span>}
        {hint && <span style={{ fontWeight: 400, color: "#9aa5b5" }}> — {hint}</span>}
      </label>
      {children}
    </div>
  );
}
