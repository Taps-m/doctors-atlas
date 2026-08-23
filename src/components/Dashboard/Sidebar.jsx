import React from "react";
import { Compass, X, LogOut } from "lucide-react";
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
            paddingBottom: 18,
            marginBottom: 8,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="brand__mark"
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(135deg, #1a9e8f 0%, #14746a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(26,158,143,0.45)",
              flexShrink: 0,
            }}
          >
            <Compass size={19} strokeWidth={2.2} color="#fff" />
          </div>
          <div className="brand__text">
            <div
              className="brand__eyebrow"
              style={{ letterSpacing: "0.16em", opacity: 0.6, fontSize: 10.5 }}
            >
              DOCTORS
            </div>
            <div className="brand__name" style={{ display: "flex", alignItems: "baseline" }}>
              ATLAS
              <sup style={{ fontSize: "0.4em", fontWeight: 600, marginLeft: 2, opacity: 0.7 }}>
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
      </aside>
    </>
  );
}
