import React from "react";
import Dashboard from "./components/Dashboard";

export default function App() {
  const handleNavigate = (id) => {
    console.log("Navigate to:", id);
  };

  const handleStartAction = () => {
    console.log("Action started: post-visit follow-up workflow");
  };

  const handleDismissAction = () => {
    console.log("Action dismissed");
  };

  const handleAskAdvisor = (question) => {
    console.log("Advisor asked:", question);
  };

  return (
    <Dashboard
      onNavigate={handleNavigate}
      onStartAction={handleStartAction}
      onDismissAction={handleDismissAction}
      onAskAdvisor={handleAskAdvisor}
    />
  );
}
