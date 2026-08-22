import React from "react";
import { ChevronRight, ArrowDown, ArrowUp } from "lucide-react";
import { getIcon } from "./iconMap";
import { testimonial, repeatVisitsSummary, howItWorksSteps } from "./data";

function ProfileCard({ avatarUrl, name }) {
  return (
    <div>
      <div className="hero-card">
        <img src={avatarUrl || testimonial.imageUrl} alt={name || "Your profile photo"} />
      </div>
      <div className="quote-card" style={{ textAlign: "center" }}>
        {name || "Your Profile"}
      </div>
    </div>
  );
}

function RepeatVisitsCard() {
  const DeltaIcon = repeatVisitsSummary.deltaUp ? ArrowUp : ArrowDown;
  return (
    <div className="repeat-card">
      <div>
        <div className="repeat-card__label">{repeatVisitsSummary.label}</div>
        <div className="repeat-card__row">
          <span className="repeat-card__val">{repeatVisitsSummary.value}</span>
          <span
            className={`repeat-card__delta ${repeatVisitsSummary.deltaUp ? "up" : ""}`}
          >
            <DeltaIcon size={12} />
            {repeatVisitsSummary.delta}
          </span>
        </div>
      </div>
      <ChevronRight size={18} color="#6b7a90" />
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
 * Profile photo, repeat-visits shortcut, and the How-It-Works explainer.
 */
export default function RightColumn({ userAvatar, userName }) {
  return (
    <div className="right-col">
      <ProfileCard avatarUrl={userAvatar} name={userName} />
      <RepeatVisitsCard />
      <HowItWorks />
    </div>
  );
}