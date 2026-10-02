// iconMap.jsx
// Maps plain string keys (used in data.js) to actual lucide-react icon
// components. Keeping this separate means data.js stays framework-agnostic
// (plain serializable data only - safe to fetch from an API later).

import {
  Home,
  Users,
  Calendar,
  BarChart2,
  FlaskConical,
  FileBarChart,
  Sparkles,
  Settings,
  Clock,
  Beaker,
  Building2,
  Search,
  Lightbulb,
  Target,
  ClipboardList,
  Video,
} from "lucide-react";

const Rupee = (props) => (
  <span style={{ fontWeight: 800, fontSize: 13, lineHeight: 1 }} {...props}>
    ₹
  </span>
);

export const ICONS = {
  Home,
  Users,
  Calendar,
  BarChart2,
  FlaskConical,
  FileBarChart,
  Sparkles,
  Settings,
  Clock,
  Beaker,
  Building2,
  Search,
  Lightbulb,
  Target,
  Rupee,
  ClipboardList,
  Video,
};

export function getIcon(name) {
  return ICONS[name] || Sparkles;
}

export default ICONS;
