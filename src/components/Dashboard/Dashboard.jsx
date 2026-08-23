import React, { useState } from "react";
import "./Dashboard.css";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import StatsRow from "./StatsRow";
import InsightPanels from "./InsightPanels";
import AdvisorBar from "./AdvisorBar";
import RightColumn from "./RightColumn";

/**
 * Dashboard
 * Top-level page component for the Doctors Atlas practice dashboard.
 * Purely presentational — wire the callback props to real handlers
 * (routing, API calls, analytics) at the app level.
 *
 * Fully responsive: renders as a fixed two-column layout on desktop,
 * a stacked single column on tablet, and collapses the sidebar into
 * an off-canvas drawer (opened via the TopBar hamburger) on phone.
 */
export default function Dashboard({
  activeNavItem = "dashboard",
  onNavigate,
  onStartAction,
  onDismissAction,
  onAskAdvisor,
  liveStats,
  advisorAnswer,
  userName,
  userAvatar,
  dateRange,
  onDateRangeChange,
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="atlas">
      <Sidebar
        activeItem={activeNavItem}
        onNavigate={onNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main">
        <div className="main-col">
          <TopBar
            userName={userName || "Doctor"}
            userAvatar={userAvatar}
            onMenuClick={() => setSidebarOpen(true)}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
          <StatsRow liveStats={liveStats} />
          <InsightPanels
            onStartAction={onStartAction}
            onDismissAction={onDismissAction}
          />
          <AdvisorBar onAsk={onAskAdvisor} />
          {advisorAnswer && (
            <div className="advisor-answer">
              <strong>AI Advisor:</strong> {advisorAnswer}
            </div>
          )}

          <footer className="atlas-footer">
            © {new Date().getFullYear()} Doctors Atlas · Built by{" "}
            
              href="https://twitter.com/Tapomoy-M"
              target="_blank"
              rel="noreferrer"
            >
              @Tapomoy-M
            </a>
          </footer>
        </div>

        <RightColumn userAvatar={userAvatar} userName={userName} />
      </main>
    </div>
  );
}