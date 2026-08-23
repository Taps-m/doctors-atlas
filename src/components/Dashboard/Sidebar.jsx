import React, { useEffect, useState } from "react";
import { Compass, X, LogOut, Building2, Copy, Check } from "lucide-react";
import { getIcon } from "./iconMap";
import { navItems } from "./data";
import { api } from "../../api";

function NavItem({ icon, label, active, onClick }) {
  const Icon = getIcon(icon);
  return (
    <button
      className={`nav-item ${active ? "nav-item--active" : ""}`}
      type="button"
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}

/**
 * ClinicCard
 * Real, live clinic identity at the foot of the sidebar - the doctor's
 * own clinic name plus the invite code they hand to staff, both pulled
 * from the Settings API rather than hardcoded. Earns the space it
 * fills: it saves a trip into Settings every time someone needs the
 * code, and keeps the clinic's own name in view.
 *
 * The /settings/clinic endpoint is restricted to doctor and admin
 * accounts, so for staff the request fails and this renders nothing -
 * no empty shell, no error message in the nav.
 */
/** How long ago the most recent daily log was, in plain words. */
function lastLogLabel(rows) {
  if (!rows || rows.length === 0) return { text: "Never", stale: true };
  const last = new Date(rows[0].log_date);
  const today = new Date();
  const days = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()) -
      new Date(last.getFullYear(), last.getMonth(), last.getDate())) /
      86400000
  );
  if (days <= 0) return { text: "Today", stale: false };
  if (days === 1) return { text: "Yesterday", stale: false };
  return { text: `${days} days ago`, stale: days >= 3 };
}

function ClinicCard() {
  const [clinic, setClinic] = useState(null);
  const [lastLog, setLastLog] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getClinic()
      .then((c) => alive && setClinic(c))
      .catch(() => {
        /* staff account, or no clinic attached - show nothing */
      });
    // Real data, and the one habit the whole product depends on -
    // worth a glance every time the sidebar is on screen.
    api
      .listDailyLogs(1)
      .then((rows) => alive && setLastLog(lastLogLabel(rows)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function copyCode() {
    const code = String(clinic.id);
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => {});
    } else {
      done();
    }
  }

  if (!clinic) return null;

  return (
    <div
      style={{
        margin: "0 6px 20px",
        padding: "18px 16px 16px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Stacked, not side-by-side: the logo reads as a proper mark
          and the clinic name gets the card's full width instead of
          being squeezed into a truncating column beside it. */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        {/* Her own logo when she's uploaded one, shown bare and large -
            no plate or frame around it, so the mark itself is what
            reads. A neutral icon otherwise; she is never required to
            provide anything. */}
        {clinic.logo_url ? (
          <img
            src={clinic.logo_url}
            alt=""
            style={{
              // Shape-agnostic: the image keeps its own aspect ratio and
              // is bounded on both axes, so a round emblem, a square
              // badge and a wide wordmark all render correctly - a tall
              // logo is capped by the height, a wide one by the width,
              // and neither is ever cropped or distorted. No fixed box,
              // no circular clip: both assumed a logo shape we don't
              // control.
              maxWidth: "100%",
              maxHeight: 112,
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
              flexShrink: 0,
            }}
          />
        ) : (
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(26,158,143,0.22)",
              color: "#5fd6c4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Building2 size={28} />
          </span>
        )}

        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "rgba(230,236,247,0.4)",
            textTransform: "uppercase",
            marginTop: 12,
          }}
        >
          Your clinic
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#f2f6fc",
            lineHeight: 1.3,
            marginTop: 3,
            overflowWrap: "anywhere",
          }}
        >
          {clinic.name}
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.09)", margin: "14px 0 12px" }} />

      {/* Real, live: how long since the daily numbers were entered -
          the habit the rest of the dashboard depends on. */}
      {lastLog && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "0 2px 10px",
          }}
        >
          <span style={{ fontSize: 11.5, color: "rgba(230,236,247,0.55)", fontWeight: 600 }}>
            Last log
          </span>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: lastLog.stale ? "#f0a868" : "#5fd6c4",
            }}
          >
            {lastLog.text}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={copyCode}
        title="Copy invite code"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#e6ecf7",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        <span style={{ fontSize: 11.5, color: "rgba(230,236,247,0.55)", fontWeight: 600 }}>
          Invite code
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.04em" }}>
            {clinic.id}
          </span>
          {copied ? <Check size={14} color="#5fd6c4" /> : <Copy size={14} opacity={0.6} />}
        </span>
      </button>
    </div>
  );
}

/**
 * Sidebar
 * Primary navigation. `activeItem` / `onNavigate` let the parent app
 * control routing.
 *
 * Log out lives here too (rather than at the bottom of the page
 * content) so it's always on screen without scrolling, on any page.
 * It calls the API directly and reloads - simplest way to reset all
 * app state without threading a logout handler through every page.
 *
 * The brand mark gets its own gradient badge + divider (fully inline
 * styled, self-contained here) rather than leaning on the shared
 * stylesheet's plain ".brand__mark" look.
 *
 * Responsive behavior:
 * - Desktop/tablet (>= 768px): fixed-width column, always visible.
 * - Mobile (< 768px): becomes an off-canvas drawer. Pass `isOpen` and
 *   `onClose` (both wired automatically by <Dashboard>) to control it.
 */
export default function Sidebar({
  activeItem = "dashboard",
  onNavigate,
  isOpen = false,
  onClose,
}) {
  function handleNavigate(id) {
    onNavigate && onNavigate(id);
    onClose && onClose(); // auto-close drawer on mobile after choosing a page
  }

  function handleLogout() {
    api.logout();
    window.location.reload();
  }

  return (
    <>
      {/* Overlay only rendered/visible on mobile when drawer is open */}
      <div
        className={`sidebar-overlay ${isOpen ? "sidebar-overlay--visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <div
          className="brand"
          style={{
            paddingBottom: 22,
            marginBottom: 10,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            gap: 14,
          }}
        >
          <div
            className="brand__mark"
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #1a9e8f 0%, #14746a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(26,158,143,0.5)",
              flexShrink: 0,
            }}
          >
            <Compass size={27} strokeWidth={2.2} color="#fff" />
          </div>
          <div className="brand__text">
            <div
              className="brand__eyebrow"
              style={{ letterSpacing: "0.18em", opacity: 0.6, fontSize: 11.5 }}
            >
              DOCTORS
            </div>
            <div className="brand__name" style={{ fontSize: 24, lineHeight: 1.1 }}>
              ATLAS
              <sup
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  marginLeft: 3,
                  opacity: 0.7,
                  verticalAlign: "top",
                  position: "relative",
                  top: 2,
                }}
              >
                TM
              </sup>
            </div>
          </div>

          <button
            className="sidebar-close"
            type="button"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={item.id === activeItem}
            onClick={() => handleNavigate(item.id)}
          />
        ))}

        <button
          className="nav-item"
          type="button"
          onClick={handleLogout}
          style={{
            marginTop: 6,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 14,
          }}
        >
          <LogOut size={18} strokeWidth={2} />
          <span>Log out</span>
        </button>

        <div className="nav-spacer" />

        <ClinicCard />
      </aside>
    </>
  );
}
