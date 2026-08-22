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
            <a href="https://twitter.com/Tapomoy-M" target="_blank" rel="noreferrer">
              @Tapomoy-M
            </a>
          </footer>
        </div>

        <RightColumn />
      </main>
    </div>
  );
}