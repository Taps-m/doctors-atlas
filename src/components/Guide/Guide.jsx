import React, { useState } from "react";
import {
  ChevronDown,
  Rocket,
  ClipboardList,
  Users,
  Calendar,
  Home,
  Sparkles,
  BarChart2,
  FileBarChart,
  Settings as SettingsIcon,
  CheckCircle2,
} from "lucide-react";
import { SHOT_SIDEBAR, SHOT_SETTINGS } from "./screenshots";

/**
 * Guide
 * A plain-language walkthrough of Atlas for a doctor who has just
 * signed in for the first time - written for someone who runs a
 * clinic, not someone who builds software.
 *
 * Deliberately self-contained: all styling is inline and it fetches
 * nothing, so it can never break because of an API change or a
 * stylesheet clash, and it works on a slow connection.
 */

const TEAL = "#1a9e8f";
const NAVY = "#15213b";
const PURPLE = "#6a5cf0";
const AMBER = "#e8871e";
const MUTED = "#5b6b85";
const LINE = "#e4e9f1";

const QUICK_START = [
  {
    n: 1,
    title: "Put your clinic's name in",
    where: "Settings",
    body: "Open Settings from the menu and type your clinic's name. Add your logo too if you have one - it's optional, and everything works fine without it.",
    shots: [
      { src: SHOT_SIDEBAR, alt: "The Settings link in the side menu", cap: "Settings is near the bottom of the side menu", w: 220 },
      { src: SHOT_SETTINGS, alt: "The Clinic & Team section on the Settings page", cap: "Scroll down to Clinic & Team and type your name here", w: 460 },
    ],
  },
  {
    n: 2,
    title: "Add a few patients",
    where: "Patients",
    body: "You don't need to add everyone at once. Start with the patients you're seeing this week - name and phone number is enough.",
  },
  {
    n: 3,
    title: "Log today's numbers",
    where: "Daily Log",
    body: "At the end of the day, enter how many patients you saw, how much you earned, and how many didn't turn up. It takes under a minute.",
  },
];

const SECTIONS = [
  {
    id: "daily-log",
    icon: ClipboardList,
    color: AMBER,
    title: "Daily Log - the one habit that matters",
    body: [
      "This is the most important page in Atlas. Everything else - your charts, your trends, the advice you get - is built from what you enter here.",
      "Once a day, at closing time, fill in six quick numbers: new patients, returning patients, total consultations, no-shows, revenue, and new enquiries.",
      "If you miss a day, nothing breaks. Just carry on the next day. But the more days you log, the more Atlas can actually tell you.",
    ],
  },
  {
    id: "dashboard",
    icon: Home,
    color: TEAL,
    title: "Dashboard - your practice at a glance",
    body: [
      "This is what you see when you sign in. The five boxes across the top are your key numbers, each compared against the previous period so you can see which way things are moving.",
      "Below them, 'Today's Snapshot' and 'Today's Appointments' show what's happening right now. 'What Needs Attention' points at whichever number is moving the wrong way - and says so plainly when nothing is.",
    ],
  },
  {
    id: "numbers",
    icon: BarChart2,
    color: "#2f6fed",
    title: "What the five numbers mean",
    body: [
      "Patients - how many people you saw in the period.",
      "Revenue - what you earned in the period.",
      "Repeat Visits - the share of your patients who came back rather than being first-timers. A healthy practice keeps people coming back.",
      "No-show Rate - the share of booked appointments where the patient didn't arrive. Lower is better; this is usually the easiest thing to improve.",
      "Practice Health - a single score out of 100 combining the four above, so you can tell at a glance whether things are broadly improving.",
    ],
  },
  {
    id: "patients",
    icon: Users,
    color: PURPLE,
    title: "Patients - your records",
    body: [
      "Add and look up the people you treat. Name and phone number are all that's needed.",
      "Atlas uses this list to spot patients you haven't seen in a while, so you can follow up before they drift away.",
    ],
  },
  {
    id: "appointments",
    icon: Calendar,
    color: "#2f6fed",
    title: "Appointments - your schedule",
    body: [
      "Book appointments against a patient, and mark each one afterwards as completed, cancelled, or a no-show.",
      "Marking them honestly is what makes your no-show rate real. It's tempting to skip, but it's the number most worth knowing.",
    ],
  },
  {
    id: "advisor",
    icon: Sparkles,
    color: PURPLE,
    title: "AI Advisor - ask it anything",
    body: [
      "The purple bar at the bottom of your dashboard. Ask it business questions in plain English: 'Why are my patients declining?', 'Should I extend my clinic hours?'",
      "It answers using your own numbers, and it will tell you honestly when there isn't enough data yet rather than guessing.",
      "One thing it will never do is give clinical advice. It won't diagnose, prescribe, or say anything about how to treat a patient - that's your job, and it stays that way.",
    ],
  },
  {
    id: "insights-reports",
    icon: FileBarChart,
    color: TEAL,
    title: "Insights & Reports",
    body: [
      "Insights shows your trends over longer stretches of time - useful once you have a few weeks of daily logs behind you.",
      "Reports gives you something you can download or print, for your records or your accountant.",
    ],
  },
  {
    id: "settings",
    icon: SettingsIcon,
    color: MUTED,
    title: "Settings - your account and your team",
    body: [
      "Change your name, photo and password here.",
      "If you run the clinic, you can also rename it, add a logo, and manage your team. Your invite code is here too - share it with staff and they can join your clinic when they sign up.",
    ],
  },
];

function QuickStartCard({ step }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        background: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: TEAL,
          color: "#fff",
          fontSize: 17,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {step.n}
      </span>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{step.title}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: TEAL,
              background: "#e6f5f2",
              borderRadius: 999,
              padding: "3px 9px",
              textTransform: "uppercase",
            }}
          >
            {step.where}
          </span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: MUTED, marginTop: 5 }}>
          {step.body}
        </div>

        {/* Pictures only where "where do I click?" is the actual
            difficulty - the orange outline marks the thing to tap. */}
        {step.shots && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginTop: 14,
              alignItems: "flex-start",
            }}
          >
            {step.shots.map((shot, i) => (
              <figure key={i} style={{ margin: 0, maxWidth: shot.w, flex: "0 1 auto" }}>
                <img
                  src={shot.src}
                  alt={shot.alt}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    borderRadius: 10,
                    border: `1px solid ${LINE}`,
                  }}
                />
                <figcaption style={{ fontSize: 11.5, lineHeight: 1.45, color: MUTED, marginTop: 6 }}>
                  {shot.cap}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ section, open, onToggle }) {
  const Icon = section.icon;
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "16px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: section.color,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} strokeWidth={2.3} />
        </span>
        <span style={{ flex: 1, fontSize: 15.5, fontWeight: 700, color: NAVY }}>
          {section.title}
        </span>
        <ChevronDown
          size={18}
          color={MUTED}
          style={{
            flexShrink: 0,
            transition: "transform 0.18s ease",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px 63px", display: "flex", flexDirection: "column", gap: 10 }}>
          {section.body.map((para, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: MUTED }}>
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Guide() {
  // First section open so the page doesn't look like a wall of closed boxes.
  const [openId, setOpenId] = useState(SECTIONS[0].id);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", fontFamily: "inherit" }}>
      {/* Header */}
      <div
        style={{
          background: NAVY,
          borderRadius: 18,
          padding: "28px 28px 26px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: TEAL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Rocket size={17} color="#fff" strokeWidth={2.2} />
          </span>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: "0.16em",
              color: "#8fa3c4",
              textTransform: "uppercase",
            }}
          >
            How to use Atlas
          </span>
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
          Everything you need, in plain English
        </h2>
        <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: "#b9c6dc", maxWidth: "56ch" }}>
          You don't have to read this end to end. Do the three quick-start steps
          below, then come back to any section whenever you need it.
        </p>
      </div>

      {/* Quick start */}
      <div style={{ marginBottom: 26 }}>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: MUTED,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Start here - about ten minutes
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {QUICK_START.map((s) => (
            <QuickStartCard key={s.n} step={s} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 11,
            alignItems: "flex-start",
            background: "#e6f5f2",
            border: "1px solid #c9e8e2",
            borderRadius: 12,
            padding: "14px 16px",
            marginTop: 12,
          }}
        >
          <CheckCircle2 size={17} color="#14746a" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#2c4a45" }}>
            That's genuinely all you need to get going. Atlas gets more useful the
            more days you log - after a couple of weeks it can start spotting
            patterns worth acting on.
          </div>
        </div>
      </div>

      {/* Reference sections */}
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: "0.12em",
          color: MUTED,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Every page, explained
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
        {SECTIONS.map((s) => (
          <Section
            key={s.id}
            section={s}
            open={openId === s.id}
            onToggle={() => setOpenId(openId === s.id ? null : s.id)}
          />
        ))}
      </div>
    </div>
  );
}
