import React from "react";
import { Calendar, Filter, Bell, ChevronDown, Menu } from "lucide-react";
import { currentUser } from "./data";

/**
 * TopBar
 * Page greeting on the left, date range / filter / notifications /
 * account switcher on the right. Wraps and compacts itself down to
 * phone widths; `onMenuClick` (wired by <Dashboard>) shows a hamburger
 * button below the tablet breakpoint to open the off-canvas sidebar.
 */

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
export default function TopBar({ userName = "Dr. Ananya", onMenuClick }) {
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

      <div className="topbar__right">
        <div className="date-pill">
          <Calendar size={15} color="#6b7a90" />
          <span className="date-pill__text">{currentUser.dateRange}</span>
        </div>

        <button className="filter-btn" type="button">
          <Filter size={14} /> <span className="filter-btn__text">Filter</span>
        </button>

        <button className="bell" type="button" aria-label="Notifications">
          <Bell size={16} />
          <span className="bell__dot" />
        </button>

        <div className="doc-pill">
          <img src={currentUser.avatarUrl} alt={userName} />
          <span className="doc-pill__name">{userName}</span>
          <ChevronDown size={14} color="#6b7a90" />
        </div>
      </div>
    </div>
  );
}
