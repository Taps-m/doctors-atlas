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
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <StatsRow />
          <InsightPanels
            onStartAction={onStartAction}
            onDismissAction={onDismissAction}
          />
          <AdvisorBar onAsk={onAskAdvisor} />

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

        <RightColumn />
      </main>
    </div>
  );
}