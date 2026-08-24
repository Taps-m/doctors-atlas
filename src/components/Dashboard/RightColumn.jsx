import React, { useEffect, useState } from "react";
import { Mail, ArrowDown, ArrowUp } from "lucide-react";
import { testimonial } from "./data";
import { api } from "../../api";

/**
 * ProfileCard
 * A circular portrait instead of the old rectangular photo tile - reads
 * as an actual profile/business-card treatment rather than a cropped
 * photo banner. Fully self-contained (inline styles) so it doesn't
 * depend on whatever ".hero-card"/".quote-card" mean elsewhere.
 */
function ProfileCard({ avatarUrl, name }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: "0 4px 14px rgba(15,27,48,0.14)",
        }}
      >
        <img
          src={avatarUrl || testimonial.imageUrl}
          alt={name || "Your profile photo"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "#9aa5ba",
          textTransform: "uppercase",
        }}
      >
        Signed in as
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 14.5,
          fontWeight: 700,
          color: "#172033",
          textAlign: "center",
        }}
      >
        {name || "Your Profile"}
      </div>
    </div>
  );
}

function pctChange(next, prev) {
  if (!prev) return 0;
  return Math.round(((next - prev) / prev) * 100);
}

/**
 * NewEnquiriesCard
 * Real, live data - not the old hardcoded "Repeat Visits 34%" card,
 * which just duplicated a number already shown live at the top of the
 * dashboard. New Enquiries is logged every day on the Daily Log form
 * but wasn't surfaced anywhere else, so it earns this spot: total
 * enquiries in the last 17 days (matching the dashboard's default
 * window) vs the 17 days before that.
 */
function NewEnquiriesCard() {
  const [state, setState] = useState({ loading: true, total: 0, delta: null, error: "" });

  useEffect(() => {
    api
      .listDailyLogs(60)
      .then((rows) => {
        const now = new Date();
        const cutoff17 = new Date(now);
        cutoff17.setDate(cutoff17.getDate() - 17);
        const cutoff34 = new Date(now);
        cutoff34.setDate(cutoff34.getDate() - 34);

        let current = 0;
        let previous = 0;
        (rows || []).forEach((l) => {
          const d = new Date(l.log_date);
          if (d >= cutoff17) current += Number(l.new_enquiries || 0);
          else if (d >= cutoff34) previous += Number(l.new_enquiries || 0);
        });

        setState({ loading: false, total: current, delta: pctChange(current, previous), error: "" });
      })
      .catch((err) => setState({ loading: false, total: 0, delta: null, error: err.message || "Could not load" }));
  }, []);

  const deltaUp = (state.delta || 0) >= 0;
  const DeltaIcon = deltaUp ? ArrowUp : ArrowDown;

  return (
    <div className="repeat-card">
      <div>
        <div className="repeat-card__label">New Enquiries</div>
        <div className="repeat-card__row">
          <span className="repeat-card__val">
            {state.loading ? "..." : state.error ? "-" : state.total}
          </span>
          {!state.loading && !state.error && state.delta !== null && (
            <span className={`repeat-card__delta ${deltaUp ? "up" : ""}`}>
              <DeltaIcon size={12} />
              {Math.abs(state.delta)}%
            </span>
          )}
        </div>
      </div>
      <Mail size={18} color="#6b7a90" />
    </div>
  );
}

/**
 * RightColumn
 * Who's signed in, and one real live number.
 *
 * The "How It Works" explainer that used to sit here has been removed.
 * It was a five-step product pitch occupying permanent space on every
 * page load, and its fourth step advertised "our built-in experiment
 * tools" - a feature that was dropped and does not exist. The real
 * walkthrough now lives on the "How to use Atlas" page in the sidebar,
 * where someone can go when they actually want it.
 */
export default function RightColumn({ userAvatar, userName }) {
  return (
    <div className="right-col">
      <ProfileCard avatarUrl={userAvatar} name={userName} />
      <NewEnquiriesCard />
    </div>
  );
}
