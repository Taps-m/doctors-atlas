import React, { useState } from "react";
import "./Dashboard.css";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import StatsRow from "./StatsRow";
import InsightPanels from "./InsightPanels";
import AdvisorBar from "./AdvisorBar";
import RightColumn from "./RightColumn";

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
            © {new Date().getFullYear()} Doctors Atlas · Built by @Tapomoy-M
          </footer>
        </div>

        <RightColumn userAvatar={userAvatar} userName={userName} />
      </main>
    </div>
  );
}