// data.js
// All static/mock data for the Dashboard lives here, separate from
// component and presentation logic. In a real app this would instead
// be fetched from an API layer (e.g. services/dashboardService.js).

export const patientsData = [4, 6, 5, 8, 7, 9, 8, 10, 9, 12, 11, 13].map(
  (v, i) => ({ i, v })
);

export const revenueData = [10, 12, 11, 14, 13, 16, 15, 18, 17, 20, 19, 22].map(
  (v, i) => ({ i, v })
);

export const repeatData = [30, 34, 32, 38, 35, 39, 36, 34, 32, 30, 28, 26].map(
  (v, i) => ({ i, v })
);

export const noShowData = [8, 10, 9, 13, 11, 15, 13, 16, 14, 12, 13, 11].map(
  (v, i) => ({ i, v })
);

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "Home", active: true },
  { id: "daily-log", label: "Daily Log", icon: "ClipboardList" },
  { id: "patients", label: "Patients", icon: "Users" },
  { id: "appointments", label: "Appointments", icon: "Calendar" },
  { id: "insights", label: "Insights", icon: "BarChart2" },
  { id: "reports", label: "Reports", icon: "FileBarChart" },
  { id: "settings", label: "Settings", icon: "Settings" },
];

export const statCards = [
  {
    id: "patients",
    label: "Patients",
    value: "52",
    delta: "12%",
    deltaUp: true,
    icon: "Users",
    iconBg: "#2f6fed",
    sparkColor: "#2f6fed",
    data: patientsData,
  },
  {
    id: "revenue",
    label: "Revenue",
    value: "₹31,200",
    delta: "9%",
    deltaUp: true,
    icon: "Rupee",
    iconBg: "#1f9d5a",
    sparkColor: "#1f9d5a",
    data: revenueData,
  },
  {
    id: "repeat-visits",
    label: "Repeat Visits",
    value: "34%",
    delta: "3%",
    deltaUp: false,
    icon: "Sparkles",
    iconBg: "#6a5cf0",
    sparkColor: "#6a5cf0",
    data: repeatData,
  },
  {
    id: "no-show",
    label: "No-show Rate",
    value: "11%",
    delta: "2%",
    deltaUp: false,
    icon: "Clock",
    iconBg: "#e8871e",
    sparkColor: "#e8871e",
    data: noShowData,
  },
];

export const practiceHealth = {
  score: 72,
  max: 100,
  deltaLabel: "8 pts",
  deltaSub: "vs last month",
};

export const advisorPrompts = [
  "Why are my patients declining?",
  "Should I extend my clinic hours?",
  "Should I hire a receptionist?",
  "How can I increase repeat visits?",
];

export const testimonial = {
  quote:
    "Atlas shows me what to focus on next. I focus on my patients.",
  author: "Dr. Rohan S.",
  // crop=faces lets Unsplash auto-detect and center the face server-side,
  // so the photo always shows a confident, smiling doctor front-and-center
  // (never cropped to a headless torso) no matter what size box it's
  // placed in on the page.
  imageUrl:
    "https://images.unsplash.com/photo-1758691463582-11aea602cd4a?q=80&w=800&auto=format&fit=crop&crop=faces",
};

export const howItWorksSteps = [
  {
    step: 1,
    title: "1. Understand",
    desc: "We collect and organize your practice data",
    icon: "Building2",
    color: "#1a9e8f",
  },
  {
    step: 2,
    title: "2. Analyze",
    desc: "AI finds patterns and identifies what matters",
    icon: "Search",
    color: "#6a5cf0",
  },
  {
    step: 3,
    title: "3. Advise",
    desc: "Get clear recommendations on what to do next",
    icon: "Lightbulb",
    color: "#e8871e",
  },
  {
    step: 4,
    title: "4. Act & Test",
    desc: "Try the action with our built-in experiment tools",
    icon: "Beaker",
    color: "#2f6fed",
  },
  {
    step: 5,
    title: "5. Measure & Improve",
    desc: "Track results and keep improving, every week",
    icon: "Target",
    color: "#1f9d5a",
  },
];

export const currentUser = {
  name: "Dr. Ananya",
  avatarUrl: "https://i.pravatar.cc/80?img=47",
  dateRange: "1 – 17 Aug, 2026",
};
