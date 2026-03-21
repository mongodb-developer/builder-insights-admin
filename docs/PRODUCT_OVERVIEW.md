# DevRel Insights — Product Overview

*A complete system for capturing, analyzing, and reporting developer feedback from the field.*

---

## 🎯 What It Does

DevRel Insights helps Developer Relations teams capture developer feedback at conferences, meetups, and customer interactions — then transforms that raw feedback into actionable insights for product teams.

**The Problem:** DevRel teams gather invaluable feedback at events, but it often gets lost in notebooks, Slack threads, or forgotten entirely.

**The Solution:** A mobile app for rapid capture + an admin portal for analysis, reporting, and team coordination.

---

## 📱 Mobile App (iOS)

- **Stack:** React Native + Expo + React Native Paper
- **Version:** 1.0.8
- **Distribution:** TestFlight (App Store submission ready)

### Features

| Feature | Description |
|---------|-------------|
| **Voice Recording** | Tap to record insights verbally — AI transcribes and extracts key details |
| **Quick Capture** | Form-based entry with sentiment, priority, product area, and event tagging |
| **Event Selection** | Active events sync from admin portal for easy tagging |
| **Offline Support** | Capture insights without connectivity; auto-sync when online |
| **Pending Recordings** | Review and retry failed transcriptions |
| **Executive Dashboard** | Field-level metrics for team leads |
| **Secure Auth** | Magic link authentication (no passwords) |
| **PIN Lock** | Optional app-level security |

### Screens (17 total)

- **Home** — Quick capture + voice recording
- **Events** — Browse and select active events
- **Event Detail** — View event info and related insights
- **Insight Capture** — Full form for detailed feedback
- **Edit Insight** — Modify before submission
- **Pending Recordings** — Manage failed transcriptions
- **Executive Dashboard** — Team metrics and summaries
- **Sessions** — Manage capture sessions
- **Profile** — User info and logout
- **Settings** — Preferences and security
- **Help** — In-app documentation

---

## 💻 Admin Portal (Web)

- **Stack:** Next.js 16 + Material UI + MongoDB
- **URL:** https://devrel-insights-admin.vercel.app

### Features

| Feature | Description |
|---------|-------------|
| **AI Executive Summary** | GPT-powered narrative summaries with key themes |
| **Dashboard** | Real-time metrics, charts, top contributors, critical items |
| **Executive Reports** | Detailed breakdowns with CSV/PDF export |
| **Event Management** | Create, edit, geocode, and activate events |
| **Insight Browser** | Filter by sentiment, priority, product area, advocate |
| **Leaderboard** | Gamified recognition for top contributors |
| **World Map** | Geographic visualization of event coverage |
| **PMO Import** | Smart spreadsheet import with learned column mappings |
| **User Management** | Add/remove team members, role-based access |
| **Bug Reports** | Triage issues submitted from mobile app |
| **Slack Integration** | Weekly digest posts to team channel |
| **In-App Help** | Searchable docs, contextual tooltips, onboarding tour |

### Pages (16 total)

- **Dashboard** — Overview + Executive Reports tabs
- **Events** — Table/card views, search, filters
- **Insights** — Full insight management
- **Advocates** — Team member profiles
- **Leaderboard** — Contribution rankings
- **World Map** — Geographic activity
- **Bug Reports** — Mobile app issue triage
- **PMO Import** — Spreadsheet upload + smart mapping
- **Settings** — Schema mappings, Slack config, help settings
- **User Management** — Admin controls

### API Endpoints (30+)

- `/api/dashboard` — Aggregated metrics
- `/api/insights` — CRUD + filtering
- `/api/insights/summary` — AI-powered summaries
- `/api/insights/leaderboard` — Contribution rankings
- `/api/events` — Event management + geocoding
- `/api/advocates` — Team member data
- `/api/bugs` — Bug report management
- `/api/auth/*` — Magic link authentication
- `/api/slack/digest` — Weekly summary posts
- `/api/stats/team` — Executive metrics
- `/api/schema` — Learned column mappings

---

## 🔐 Authentication

Both apps use **passwordless magic link authentication**:

1. User enters email
2. System sends 6-digit code
3. Code verified → JWT session created
4. Session persists via secure cookie (web) or SecureStore (mobile)

- **Domain restrictions:** `@mongodb.com` emails by default
- **Tester account:** `demo@devrelinsights.app` / code `999999`

---

## 📊 Data Model

```
insights
├── text (string) — The feedback content
├── type (string) — Feature Request, Bug, Praise, Question, etc.
├── sentiment (string) — Positive, Neutral, Negative
├── priority (string) — Critical, High, Medium, Low
├── productArea (string) — Atlas, Drivers, Charts, etc.
├── eventId (ObjectId) — Reference to event
├── advocateId (ObjectId) — Who captured it
├── source (string) — mobile, web, import
├── createdAt (Date)
└── attachments (array)

events
├── name (string)
├── status (string) — Scheduled, In Progress, Completed
├── region (string) — AMER, EMEA, APAC, LATAM
├── location (string)
├── coordinates (object) — lat, lng for map
├── startDate, endDate (Date)
└── isActive (boolean) — Shows in mobile app picker

advocates
├── name (string)
├── email (string)
├── role (string)
└── insightCount (number)
```

---

## 🚀 Recent Development (Feb 2026)

**64 commits** this month including:

- ✅ AI Executive Summary with period selection (week/month/quarter)
- ✅ PDF export with AI narrative included
- ✅ Interactive world map with event markers
- ✅ Voice recording with AI transcription
- ✅ Offline capture + background sync
- ✅ In-app help system (drawer, tooltips, onboarding tour)
- ✅ Executive dashboard for field leads
- ✅ Pending recordings management
- ✅ Tester account for App Store review
- ✅ Banner images and responsive layouts

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| Admin Portal | https://devrel-insights-admin.vercel.app |
| TestFlight | https://testflight.apple.com/join/rAqHXs1Y |
| Admin Repo | github.com/mrlynn/devrel-insights-admin |
| Mobile Repo | github.com/mrlynn/devrel-insights |

---

## 📈 Metrics & Health

- **Admin pages:** 16
- **Mobile screens:** 17
- **API endpoints:** 30+
- **Test coverage:** 41 tests (mobile)
- **Accessibility:** Screen reader support, keyboard navigation

---

*Built for MongoDB Developer Relations by Mike Lynn + Butter 🧈*
