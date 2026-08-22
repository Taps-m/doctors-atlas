import React from "react";
import { Sparkles, Target, X } from "lucide-react";
import { getIcon } from "./iconMap";
import { navItems } from "./data";

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
 * Primary navigation + AI Advisor call-to-action.
 * `activeItem` / `onNavigate` let the parent app control routing.
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

  return (
    <>
      {/* Overlay only rendered/visible on mobile when drawer is open */}
      <div
        className={`sidebar-overlay ${isOpen ? "sidebar-overlay--visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand__mark">
            <Target size={18} strokeWidth={2.4} />
          </div>
          <div className="brand__text">
            <div className="brand__eyebrow">DOCTORS</div>
            <div className="brand__name">ATLAS</div>
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

        <div className="nav-spacer" />

        <div className="advisor-cta" role="button" tabIndex={0}>
          <div className="advisor-cta__icon">
            <Sparkles size={15} />
          </div>
          <div>
            <div className="advisor-cta__title">AI Advisor</div>
            <div className="advisor-cta__sub">Ask anything about your practice</div>
          </div>
        </div>
      </aside>
    </>
  );
}
