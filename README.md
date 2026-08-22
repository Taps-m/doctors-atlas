# Doctors Atlas — Practice Dashboard

A responsive React (Vite) dashboard UI: patients, revenue, repeat visits,
no-show rate, practice health score, AI-driven recommendations, and an
experiment tracker. Fully responsive — phone, tablet, and desktop.

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # locally preview the production build
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Doctors Atlas dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Deploy

This project is pre-configured for all three of the options below —
pick whichever you use, no extra setup needed.

**Vercel**
Import the repo at vercel.com/new. `vercel.json` already sets the
build command and output directory — it will just work.

**Netlify**
Import the repo at app.netlify.com/start. `netlify.toml` already sets
the build command and publish directory.

**GitHub Pages**
Already wired up via `.github/workflows/deploy.yml`. In your repo:
Settings → Pages → Source → "GitHub Actions". Every push to `main`
rebuilds and redeploys automatically.

## Folder structure

```
.
├── .github/workflows/deploy.yml   # CI: build + deploy to GitHub Pages on push
├── index.html                     # Vite entry HTML
├── vite.config.js
├── vercel.json                    # Vercel build config
├── netlify.toml                   # Netlify build config
├── .eslintrc.cjs
├── .gitignore
├── package.json
└── src/
    ├── main.jsx                   # mounts <App /> to #root
    ├── index.css                  # global reset only
    ├── App.jsx                    # wires up <Dashboard /> with handlers
    └── components/
        └── Dashboard/
            ├── index.js            # barrel export
            ├── Dashboard.jsx       # top-level layout, composes all sections
            ├── Dashboard.css       # all styles (namespaced under .atlas)
            ├── data.js             # static/mock data (swap for an API call later)
            ├── iconMap.js          # string -> lucide-react icon lookup
            ├── Sparkline.jsx       # shared mini trend-line chart
            ├── Sidebar.jsx         # left nav + AI Advisor CTA
            ├── TopBar.jsx          # greeting, date range, filter, notifications, user
            ├── StatsRow.jsx        # 4 KPI cards + Practice Health ring
            ├── InsightPanels.jsx   # "Needs attention" / "Do this" / "Experiment" panels
            ├── AdvisorBar.jsx      # AI advisor quick-ask chips + input
            └── RightColumn.jsx     # testimonial, repeat-visits card, how-it-works
```

## Customizing

- **Content** — edit `src/components/Dashboard/data.js`. All copy and
  numbers live there; no component code changes needed.
- **Theme** — edit the CSS custom properties at the top of
  `src/components/Dashboard/Dashboard.css` (`--atlas-navy`,
  `--atlas-teal`, etc.).
- **Wiring real data / actions** — `Dashboard` accepts `onNavigate`,
  `onStartAction`, `onDismissAction`, and `onAskAdvisor` callback
  props; hook these up in `src/App.jsx` to your router, API, or
  analytics.

## Responsive behavior

Mobile-first CSS with three breakpoints:

| Width | Layout |
|---|---|
| `< 768px` (phone) | Single column. Sidebar becomes an off-canvas drawer, opened via the hamburger button in `TopBar`, closed by tapping the overlay, the ✕, or picking a nav item. Stat cards: 2-across grid (1-across below 380px). Insight panels stack. Right column stacks below main content. |
| `768px – 1179px` (tablet) | Sidebar is a static, always-visible column again (hamburger hides). Stat cards: 4-across. Insight panels: 2-across (experiment panel spans full width). Right column sits below main content in a wrapping row. |
| `>= 1180px` (desktop) | Full two-column layout: main content + fixed 300px right rail side-by-side. Stat cards: 4 + health ring, 5-across. Insight panels: 3-across. |

No JS media-query logic is needed — layout changes are pure CSS
(`Dashboard.css`), and only the sidebar's open/closed *state* is
tracked in React (`Dashboard.jsx`, via `useState`), since a drawer
needs to know whether it's open regardless of screen size.

## Tech stack

- React 18 + Vite 5
- [lucide-react](https://lucide.dev/) for icons
- [recharts](https://recharts.org/) for sparklines
- Plain CSS (no framework) — namespaced under `.atlas`
