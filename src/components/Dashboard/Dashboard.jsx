import React, { useState } from "react";
import { Calendar, Filter, Bell, ChevronDown, Menu } from "lucide-react";
import { currentUser } from "./data";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * TopBar
 * Page greeting on the left, date range / filter / notifications /
 * account switcher on the right. Wraps and compacts itself down to
 * phone widths; `onMenuClick` (wired by <Dashboard>) shows a hamburger
 * button below the tablet breakpoint to open the off-canvas sidebar.
 *
 * `dateRange` is either null (meaning "the default rolling window") or
 * { start, end } as "YYYY-MM-DD" strings. `onDateRangeChange` is called
 * with the new value (or null to reset) when the doctor applies a
 * custom range from the Filter popover.
 */
export default function TopBar({
  userName = "Dr. Ananya",
  userAvatar,
  onMenuClick,
  dateRange,
  onDateRangeChange,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftStart, setDraftStart] = useState(dateRange?.start || "");
  const [draftEnd, setDraftEnd] = useState(dateRange?.end || "");

  const rangeLabel = dateRange
    ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
    : currentUser.dateRange;

  function openPicker() {
    setDraftStart(dateRange?.start || "");
    setDraftEnd(dateRange?.end || "");
    setShowPicker(true);
  }

  function applyFilter() {
    if (draftStart && draftEnd) {
      onDateRangeChange && onDateRangeChange({ start: draftStart, end: draftEnd });
    }
    setShowPicker(false);
  }

  function resetFilter() {
    setDraftStart("");
    setDraftEnd("");
    onDateRangeChange && onDateRangeChange(null);
    setShowPicker(false);
  }

  return (
    <div className="topbar">
      <div className="topbar__left">
        <button
          className="menu-btn"
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="greeting">
          <h1>{greeting()}, {userName} 👋</h1>
          <p>Here's what's happening in your practice.</p>
        </div>
      </div>

      <div className="topbar__right" style={{ position: "relative" }}>
        <div className="date-pill">
          <Calendar size={15} color="#6b7a90" />
          <span className="date-pill__text">{rangeLabel}</span>
        </div>

        <button
          className="filter-btn"
          type="button"
          onClick={() => (showPicker ? setShowPicker(false) : openPicker())}
        >
          <Filter size={14} /> <span className="filter-btn__text">Filter</span>
        </button>

        {showPicker && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              right: 90,
              background: "#fff",
              border: "1px solid #e2e6ee",
              borderRadius: 10,
              padding: 14,
              boxShadow: "0 8px 24px rgba(20,30,50,0.14)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 200,
            }}
          >
            <label style={{ fontSize: 12, color: "#6b7a90" }}>
              From
              <input
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              />
            </label>
            <label style={{ fontSize: 12, color: "#6b7a90" }}>
              To
              <input
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="button" onClick={applyFilter} style={{ flex: 1 }}>
                Apply
              </button>
              <button type="button" onClick={resetFilter} style={{ flex: 1 }}>
                Reset
              </button>
            </div>
          </div>
        )}

        <button className="bell" type="button" aria-label="Notifications">
          <Bell size={16} />
          <span className="bell__dot" />
        </button>

        <div className="doc-pill">
          <img src={userAvatar || currentUser.avatarUrl} alt={userName} />
          <span className="doc-pill__name">{userName}</span>
          <ChevronDown size={14} color="#6b7a90" />
        </div>
      </div>
    </div>
  );
}