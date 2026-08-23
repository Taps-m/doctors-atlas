import React, { useEffect, useState } from "react";
import { Mail, ArrowDown, ArrowUp } from "lucide-react";
import { getIcon } from "./iconMap";
import { testimonial, howItWorksSteps } from "./data";
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#fff",
        borderRadius: 16,
        padding: "24px 16px 18px",
        boxShadow: "0 6px 20px rgba(15,27,48,0.08)",
      }}
    >
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: "50%",
          padding: 3,
          background: "linear-gradient(135deg, #1a9e8f 0%, #6a5cf0 100%)",
          boxShadow: "0 6px 16px rgba(26,158,143,0.3)",
        }}
      >
        <img
          src={avatarUrl || testimonial.imageUrl}
          alt={name || "Your profile photo"}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            border: "3px solid #fff",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 15,
          fontWeight: 800,
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

function HowItWorks() {
  return (
    <div className="howit">
      <h4>How It Works</h4>
      <p>A continuous cycle of improvement</p>

      {howItWorksSteps.map((step) => {
        const Icon = getIcon(step.icon);
        return (
          <div className="howit-step" key={step.step}>
            <div className="howit-step__line" />
            <span className="howit-step__icon" style={{ background: step.color }}>
              <Icon size={14} />
            </span>
            <div>
              <div className="howit-step__title">{step.title}</div>
              <div className="howit-step__desc">{step.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * RightColumn
 * Profile photo, a real New Enquiries stat, and the How-It-Works
 * explainer.
 */
export default function RightColumn({ userAvatar, userName }) {
  return (
    <div className="right-col">
      <ProfileCard avatarUrl={userAvatar} name={userName} />
      <NewEnquiriesCard />
      <HowItWorks />
    </div>
  );
}
