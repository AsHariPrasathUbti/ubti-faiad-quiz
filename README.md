# Fabric Analyst in a Day — Interactive Quiz & Audience Engagement Platform
**UB Technology Innovations Inc.**

A modern, responsive, Kahoot-inspired interactive web application designed for live client presentations, discovery workshops, and training sessions for **Fabric Analyst in a Day**.

---

## 1. Project Overview & Features

- **Energetic Kahoot-Style Participant Experience**:
  - Clean, modern light theme with Microsoft Fabric brand color accents (`#008272`, `#0078D4`, `#5C2D91`).
  - Engaging colorful answer cards with distinct geometric symbols.
  - Native browser Web Audio API synthesizer for clicks, countdown ticks, celebration chimes, error buzzes, and podium fanfares (zero external MP3 dependencies).
  - Real-time circular SVG countdown timer with pulsing warning animations in the final 5 seconds.
  - Speed bonus calculation for knowledge checks.
  - Dynamic interactive feedback overlay with celebratory canvas confetti.
  - 3-tier podium (1st, 2nd, 3rd) and local leaderboard.
  - Session recovery on browser refresh.
  - Personal result summary download (JSON).

- **16 Curated Event Questions across Strategic Sections**:
  - **Section A**: Current Data Landscape (Existing warehouses, source counts, cloud storage, BI tools, pipeline challenges).
  - **Section B**: Fabric Awareness & Knowledge Checks (Experience level, explored workloads, OneLake architecture, SQL Warehouse, Lakehouse).
  - **Section C**: Licensing & Readiness (Capacity F-SKUs, Power BI maturity, data governance).
  - **Section D**: Priorities & Hands-on Workloads (Strategic priorities, desired workloads).
  - **Section E**: Business Challenges & Support (Paragraph feedback on current business hurdles and support required from UB Technology Innovations).

- **Presenter / Admin Dashboard (`ubtiadmin` / `admin.html`)**:
  - Protected by presenter authentication:
    - **URL**: `ubtiadmin` (e.g. `https://ashariprasathubti.github.io/ubti-faiad-quiz/ubtiadmin`)
    - **Username**: `ubtiadmin`
    - **Password**: `FAIAD@2026`
  - 6 Real-time KPI summary cards (Total participants, completed, in-progress, completion rate, average score, total answers).
  - 6 Chart.js dynamic visualizations with live filtering.
  - Multidimensional drill-down filters (Search, company, completion status, score bracket, specific question & answer option).
  - Sortable participants table with question-by-question answer inspector modal.
  - One-click exports:
    - **CSV Summary**: High-level attendee metrics, scores, and completion statuses.
    - **CSV Detailed Matrix**: Full attendee-by-question response breakdown.
    - **JSON Full Dataset**: Complete session backup for cross-device analysis.
  - Rehearsal sample data generator (pre-loads realistic participant records for rehearsals).
  - "Delete All Responses" button to wipe data cleanly for live sessions.
  - Session-based logout to protect dashboard visibility.

- **Zero-Backend Architecture & GitHub Pages Ready**:
  - 100% client-side HTML5, CSS3, and Vanilla JavaScript (ES6+).
  - LocalStorage persistence with defensive fallback handling.
  - Formula injection mitigation for CSV downloads (escapes `=`, `+`, `-`, `@`, `\t`, `\r`).
  - Offline capable with native Web Audio oscillator synthesis.
  - Fully responsive across desktop, tablet, and mobile browsers.

---

## 2. Directory Structure

```text
FAIAD/
├── .gitignore               # Ignored system & IDE files
├── .nojekyll                # GitHub Pages static asset routing
├── README.md                # Project documentation
├── index.html               # Participant welcome, quiz engine, & results screen
├── ubtiadmin.html           # Presenter analytics portal & sign-in dashboard (URL: /ubtiadmin)
├── ubtiadmin/               # Fallback directory redirect for /ubtiadmin/
│   └── index.html
├── admin.html               # Presenter analytics console mirror & redirect
├── assets/                  # Brand logos and vector graphics
│   ├── fabric-icon.svg      # Official Microsoft Fabric vector icon
│   ├── logo.png             # UB Technology Innovations Inc. square avatar
│   ├── ubti-logo.png        # Official high-resolution corporate logo in deep navy
│   ├── ubti-logo.svg        # Scalable corporate logo
│   └── README.md            # Asset catalog
├── css/
│   └── style.css            # Clean Light Fabric design system & components
└── js/
    ├── questions.js         # 16 curated event questions & category taxonomy
    ├── storage.js           # LocalStorage persistence, formula sanitization & export engine
    ├── app.js               # Quiz gameplay, audio synthesis, timer, podium & leaderboard
    └── admin.js             # KPI aggregations, Chart.js graphs, inspector modal & data controls
```

---

## 3. Deployment to GitHub Pages

1. In your GitHub repository (`AsHariPrasathUbti/FAIAD-Quiz`), navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Branch**, select `main` and root (`/`).
3. Click **Save**.
4. GitHub Pages will build and deploy the application to your production URL.

---

## 4. Security & Sanitization

- **XSS Prevention**: All dynamic HTML injections are sanitized with an entity-escaping utility (`escapeHTML`).
- **CSV Formula Injection Mitigation**: CSV export functions in `js/storage.js` sanitize every cell value. Any string beginning with formula-triggering characters (`=`, `+`, `-`, `@`, `\t`, `\r`) is automatically prefixed with a single quote (`'`), preventing malicious formula execution when opened in Microsoft Excel.

---

## 5. License & Copyright

&copy; 2026 [UB Technology Innovations Inc.](https://ubtiinc.com/) All rights reserved.