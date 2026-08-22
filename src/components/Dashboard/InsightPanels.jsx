import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Star,
  ArrowUp,
} from "lucide-react";
import Sparkline from "./Sparkline";
import { getIcon } from "./iconMap";
import { attentionPanel, actionPanel, experimentPanel } from "./data";

function AttentionPanel() {
  return (
    <div className="panel panel--attention">
      <div className="panel__head">
        <span className="panel__head-icon">
          <AlertCircle size={13} />
        </span>
        <span>WHAT NEEDS ATTENTION?</span>
      </div>
      <h3>{attentionPanel.title}</h3>
      <p>{attentionPanel.description}</p>
      <div className="chart-wrap">
        <Sparkline data={attentionPanel.chartData} color="#e5484d" />
      </div>
      <div className="priority-pill">
        <AlertCircle size={13} /> PRIORITY: {attentionPanel.priority}
      </div>
    </div>
  );
}

function ActionPanel({ onStart, onDismiss }) {
  return (
    <div className="panel panel--do">
      <div className="panel__head">
        <span className="panel__head-icon">
          <CheckCircle2 size={13} />
        </span>
        <span>WHAT SHOULD YOU DO?</span>
      </div>
      <div className="do-row">
        <span className="do-row__icon">
          <CheckCircle2 size={16} />
        </span>
        <h4>{actionPanel.title}</h4>
      </div>
      <div className="impact-label">Expected impact:</div>
      <ul className="impact-list">
        {actionPanel.impact.map((line) => (
          <li key={line}>
            <ArrowUp size={13} /> {line}
          </li>
        ))}
      </ul>
      <div className="panel-actions">
        <button className="btn-primary" type="button" onClick={onStart}>
          Start This Action
        </button>
        <button className="btn-secondary" type="button" onClick={onDismiss}>
          Not Now
        </button>
      </div>
    </div>
  );
}

function ExperimentPanel() {
  return (
    <div className="panel panel--exp">
      <div className="panel__head">
        <span className="panel__head-icon">
          <Star size={12} />
        </span>
        <span>CURRENT EXPERIMENT</span>
      </div>
      <h3>{experimentPanel.title}</h3>
      <span className="running-pill">Running since {experimentPanel.runningSince}</span>

      {experimentPanel.stats.map((stat) => {
        const Icon = getIcon(stat.icon);
        return (
          <div className="exp-stat" key={stat.label}>
            <Icon size={15} />
            <b>{stat.value}</b>
            <span>{stat.label}</span>
          </div>
        );
      })}

      <div className="promising">
        <span className="promising__icon">
          <CheckCircle2 size={14} />
        </span>
        <div>
          <b>{experimentPanel.status.title}</b>
          <span>{experimentPanel.status.subtitle}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * InsightPanels
 * The three-column "what needs attention / what to do / current experiment"
 * row. Accepts optional handlers so the parent can wire up real actions.
 */
export default function InsightPanels({ onStartAction, onDismissAction }) {
  return (
    <div className="panels">
      <AttentionPanel />
      <ActionPanel onStart={onStartAction} onDismiss={onDismissAction} />
      <ExperimentPanel />
    </div>
  );
}
