# Builder Insights Admin

**The operational command center for the Builder Insights program — manage events, analyze developer feedback, generate executive reports, and coordinate program rollout.**

Part of the [Builder Insights](docs/PROGRAM_OVERVIEW.md) suite: a three-pillar system for capturing, analyzing, and acting on developer feedback from the field.

---

## About Builder Insights

Builder Relations teams attend dozens of events every quarter — conferences, workshops, hackathons, customer engagements — where developers share pain points, feature requests, competitive intelligence, and use cases. Historically, this intelligence gets lost in notebooks, Slack threads, sticky notes, and memory. Builder Insights fixes this.

The program delivers three pillars:

| Pillar | Application | Purpose |
|--------|------------|---------|
| **Mobile App** | Field Capture | Zero-friction insight capture at events using voice AI and quick-entry forms |
| **Admin Portal** | Command Center | Management, analysis, reporting, and program coordination (this repo) |
| **Documentation Site** | Enablement | Onboarding guides, support playbooks, release notes, and troubleshooting |

All three share a single MongoDB Atlas database and a common passwordless authentication system.

### Related Repositories

| Repository | Description |
|-----------|-------------|
| [builder-insights](https://github.com/mongodb-developer/builder-insights) | React Native mobile app for iOS and Android field capture |
| **builder-insights-admin** | This repository — Next.js admin portal |
| [builder-insights-docs](https://github.com/mongodb-developer/builder-insights-docs) | Docusaurus documentation site |

---

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB connection string and other config

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB` | Yes | Database name (default: `builder-insights`) |
| `AUTH_SECRET` | Production | JWT signing secret |
| `OPENAI_API_KEY` | For AI features | OpenAI API key for executive summaries and insight analysis |
| `SLACK_WEBHOOK_URL` | For Slack | Incoming webhook URL for weekly digest |
| `SMTP_USER` | For email auth | Gmail SMTP username |
| `SMTP_PASS` | For email auth | Gmail SMTP app password |
| `FROM_EMAIL` | Optional | Sender email address |
| `APP_URL` | Optional | Application base URL |
| `CRON_SECRET` | For cron | Vercel cron authentication |
| `ALLOWED_ORIGINS` | Optional | CORS allowed origins (comma-separated) |
| `ENABLE_TEST_ACCOUNTS` | Optional | Enable tester/demo accounts |

---

## Features

### Dashboard and Executive Reporting

- Real-time metric cards: events, insights, advocates, and trend indicators
- 90-day trend chart with sentiment overlay
- Sentiment distribution, product area breakdown, and top contributors
- AI-powered executive summaries (GPT) with period selection (week, month, quarter)
- Executive reports tab with CSV and PDF export
- Critical items and top events surfaced automatically

### Event Management

- Full CRUD with table and card views
- PMO-aligned fields: region, engagement type, account segment, assignment tracking
- Geocoding via OpenStreetMap Nominatim with batch streaming support
- Event-to-insight linkage for measuring capture coverage

### PMO Import

- CSV upload from PMO spreadsheet exports
- Smart column mapping with fuzzy matching (Levenshtein distance)
- Learned mappings stored in the database for reuse across imports
- Preview and validation before committing changes
- Handles emoji statuses, DA assignments, and complex date formats

### Insight Browser

- Filter by type, sentiment, priority, product area, event, or advocate
- AI analysis per insight: summary, interpretation, suggested actions, themes, priority recommendation, and confidence score
- LinkedIn-style reactions (like, love, insightful, celebrate, fire)
- Threaded annotations and comments
- Detail drawer for deep-dive review

### World Map

- Interactive Leaflet map with event markers
- Geographic visualization of event coverage across AMER, EMEA, APAC, and LATAM

### Leaderboard

- Gamified advocate contribution rankings
- Weighted impact scoring: critical insights (3x), high priority (2x), use cases (2x), feature requests (1.5x)
- Drives healthy competition and data quality across the team

### Program Management Workspace

- Full rollout tracking: workstreams, tasks, stakeholders, decisions, and risks
- Threaded comments with @-mention notifications
- Audit trails on all entities
- Program snapshots for point-in-time reporting
- Reference linking to GitHub issues, PRs, docs, Figma, and Slack
- Phase-gated lifecycle: Strategy, Build, Validate, Launch, Post-Launch

### Slack Integration

- Automated weekly digest via Vercel cron (Mondays at 14:00 UTC)
- Rich Block Kit messages with sentiment breakdown, top contributors, and priority items
- Manual digest trigger and individual insight posting

### Monitoring and Operations (Admin only)

- Four-tab observability dashboard: overview KPIs, user map, feature usage, API health
- Database collection statistics and index management
- Full database backup export

### User Management (Admin only)

- Passwordless magic link authentication (6-digit code via email)
- Four-tier RBAC: Admin, Manager, Advocate, Viewer
- User provisioning, role changes, and activity logging
- Domain-restricted to `@mongodb.com` and `@builderinsights.app`

### Help System

- Searchable help drawer with categorized articles
- Contextual per-page help
- Guided onboarding tour (React Joyride)
- Bug reporting from any page with floating action button

---

## Architecture

```
Mobile App (React Native + Expo)
      |
      | MongoDB Atlas Data API + Bearer JWT
      |
      v
+-----------------------------------------+
|           MongoDB Atlas                  |
|       Database: builder-insights         |
|                                          |
|  Collections:                            |
|    insights, events, advocates,          |
|    sessions, reactions, bugs,            |
|    programs, activity_log,               |
|    users, auth_codes, summaries,         |
|    schema_mappings, telemetry_events     |
+-----------------------------------------+
      ^
      | Native MongoDB Driver (v7)
      |
Admin Portal (Next.js 16 + MUI 7)
      |
      +-- OpenAI (executive summaries, insight analysis)
      +-- Slack (weekly digest via webhook)
      +-- Gmail SMTP (magic link auth)
      +-- OpenStreetMap Nominatim (geocoding)
      +-- Vercel Blob (file attachments)
      +-- Vercel Cron (scheduled digest)
```

---

## Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | Overview metrics + Executive Reports tabs |
| Search | `/search` | Unified search across all collections |
| Events | `/events` | Table/card views with status and region filters |
| Event Detail | `/events/[id]` | Event info, sessions, linked insights |
| New Event | `/events/new` | Event creation form |
| Insights | `/insights` | Full insight management with filters and AI analysis |
| Advocates | `/advocates` | Team member profiles |
| Leaderboard | `/leaderboard` | Gamified contribution rankings |
| World Map | `/world` | Geographic visualization of events |
| Program | `/program` | Program management workspace |
| Bug Reports | `/bugs` | Mobile app issue triage |
| PMO Import | `/import` | CSV upload with smart column mapping |
| Settings | `/settings` | Schema mappings, Slack config, help settings |
| Monitoring | `/monitoring` | App health and telemetry (admin only) |
| Operations | `/operations` | Database stats and backup (admin only) |
| User Management | `/admin/users` | User provisioning and role management (admin only) |

---

## API Routes

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/magic-link` | Request magic link email with 6-digit code |
| GET | `/api/auth/magic-link/[token]` | Validate magic link and create session |
| POST | `/api/auth/verify-code` | Verify 6-digit code and create session |
| GET | `/api/auth/me` | Get current authenticated user |
| POST | `/api/auth/logout` | Clear session |

### Dashboard and Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Aggregated metrics, trends, distributions |
| GET | `/api/stats/team` | Team stats with period filtering and advocate breakdown |
| GET | `/api/analytics/dashboard` | Mobile app monitoring KPIs |
| POST | `/api/analytics/events` | Telemetry event ingestion |
| POST/GET | `/api/analytics/ping` | App launch pings with geolocation |

### Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/insights` | List with filters; create or get stats |
| GET/PUT/DELETE | `/api/insights/[id]` | CRUD with ownership checks |
| GET/POST | `/api/insights/[id]/analyze` | AI analysis per insight |
| GET/POST/DELETE | `/api/insights/[id]/react` | Reactions (like, love, insightful, celebrate, fire) |
| GET/POST | `/api/insights/summary` | AI executive summary with caching |
| GET | `/api/insights/leaderboard` | Advocate rankings with impact scores |
| GET/POST | `/api/insights/popular` | Popular insights by reaction count |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/events` | List with filters; create events |
| GET/PUT/DELETE | `/api/events/[id]` | CRUD for individual events |
| GET/POST | `/api/events/upsert` | Bulk upsert with duplicate detection |
| GET/POST/DELETE | `/api/events/geocode` | Geocoding management |
| GET | `/api/events/geocode/stream` | SSE streaming geocoding with progress |

### Sessions, Advocates, Bugs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/sessions` | List and create sessions |
| GET/PUT/DELETE/POST | `/api/sessions/[id]` | CRUD + actions (questions, demos, attendance) |
| GET/POST | `/api/advocates` | List and create advocates |
| GET/PUT/DELETE | `/api/advocates/[id]` | Advocate CRUD (manager+ required) |
| GET/POST | `/api/bugs` | List and create bug reports |
| GET/PUT/DELETE | `/api/bugs/[id]` | Bug triage |

### Admin and Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PATCH | `/api/admin/users` | User management with bulk operations |
| GET/PUT/DELETE | `/api/admin/users/[id]` | Single user CRUD |
| GET | `/api/admin/users/[id]/activity` | User activity and login stats |
| GET | `/api/operations/backup` | Full database export (admin only) |
| GET | `/api/operations/stats` | Collection statistics |

### Program, Slack, and Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH/PUT | `/api/program` | Program management CRUD with audit trail |
| POST | `/api/program/comments` | Threaded comments with @-mention parsing |
| GET/POST | `/api/slack/digest` | Weekly digest preview and send |
| GET/POST | `/api/slack/post` | Post individual insight to Slack |
| GET | `/api/cron/slack-digest` | Vercel cron endpoint (Monday 14:00 UTC) |
| GET | `/api/search` | Unified cross-collection search |
| GET/POST/DELETE | `/api/schema` | Learned column mappings for PMO import |
| GET/POST/DELETE | `/api/attachments` | File uploads to Vercel Blob |
| GET | `/api/health` | Health check with DB connectivity test |

---

## Data Model

**Database:** `builder-insights` (MongoDB Atlas)

| Collection | Purpose |
|-----------|---------|
| `insights` | Developer feedback captured at events |
| `events` | Conferences, workshops, hackathons, and customer engagements |
| `advocates` | DevRel team members |
| `sessions` | Capture sessions within events |
| `reactions` | Reactions on insights |
| `bugs` | Bug reports from mobile and web |
| `programs` | Program management workspace |
| `activity_log` | Audit trail (TTL: 1 year) |
| `users` | User accounts and authentication |
| `auth_codes` | Verification codes (TTL) |
| `summaries` | Cached AI-generated executive summaries |
| `schema_mappings` | Learned column aliases for PMO import |
| `telemetry_events` | Mobile app usage telemetry |

### Insight Schema

```
insights
  text            -- The feedback content
  type            -- Pain Point, Feature Request, Praise, Question, Use Case,
                     Competition, Documentation, Other
  sentiment       -- Positive, Neutral, Negative
  priority        -- Critical, High, Medium, Low
  productArea     -- Atlas, Atlas Vector Search, Drivers, Charts, Compass,
                     Server, Aggregation, and 9 more
  eventId         -- Reference to source event
  advocateId      -- Who captured it
  source          -- mobile, web, import
  aiAnalysis      -- GPT-generated summary, interpretation, actions, themes
  aiDistillation  -- Mobile-side AI extraction (title, bullets, action items)
  reactionCounts  -- Aggregated reaction tallies
  annotations     -- Threaded comments
  createdAt       -- Timestamp
```

### Event Schema

```
events
  name            -- Event name
  quarter         -- Fiscal quarter
  status          -- COMPLETED, ASSIGNED, CONFIRMING, CANCELLED, etc.
  type            -- DEV_DAY, WEBINAR, HACKATHON, OFFICE_HOURS, etc.
  region          -- AMER, EMEA, APAC, LATAM
  accountName     -- Customer account name
  accountSegment  -- POD, ANCHOR, ASPIRE_POD, KEY_GROWTH, ALL
  assignments     -- Array of advocate assignments (on-site, remote, volunteer)
  geo             -- GeoJSON Point for map placement
  startDate       -- Event start
  endDate         -- Event end
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | Material UI | 7.3.7 |
| Runtime | React | 19.2.3 |
| Database | MongoDB (native driver) | 7.1.0 |
| AI | OpenAI | 6.18.0 |
| Auth | jose (JWT) + bcryptjs | 6.1.3 / 3.0.3 |
| Email | Nodemailer | 8.0.0 |
| Charts | Recharts | 3.7.0 |
| Maps | Leaflet + react-leaflet | 1.9.4 / 5.0.0 |
| PDF | jsPDF + html2canvas | 4.1.0 / 1.4.1 |
| Onboarding | React Joyride | 2.9.3 |
| File Storage | Vercel Blob | 2.2.0 |
| Styling | Emotion (MUI default) | 11.14.x |
| Testing | Jest + mongodb-memory-server + Playwright | 30.x |

---

## Project Structure

```
src/
  app/
    page.tsx                        -- Landing page
    layout.tsx                      -- Root layout
    login/                          -- Magic link login
    guide/                          -- Public guide page
    (authenticated)/                -- Protected route group
      dashboard/                    -- Dashboard + executive reports
      events/                       -- Event management (list, detail, new, edit)
      insights/                     -- Insight browser with filters and AI
      advocates/                    -- Team member profiles
      leaderboard/                  -- Gamified contribution rankings
      world/                        -- Interactive world map
      program/                      -- Program management workspace
      bugs/                         -- Bug report triage
      import/                       -- PMO spreadsheet import
      search/                       -- Global search
      settings/                     -- App settings and Slack config
      monitoring/                   -- App health and telemetry (admin)
      operations/                   -- Database stats and backup (admin)
      admin/users/                  -- User management (admin)
    api/                            -- 42 API route files across 18 endpoint groups
  components/
    AdminLayout.tsx                 -- Sidebar navigation and layout
    EventMap.tsx                    -- Leaflet map component
    InsightAIAnalysis.tsx           -- AI analysis display
    InsightDetailDrawer.tsx         -- Insight detail side panel
    InsightFormDialog.tsx           -- Create/edit insight form
    BugReportFab.tsx                -- Floating bug report button
    help/                           -- Help system (provider, drawer, tour, content)
    program/                        -- Program workspace (audit trail, comments, references)
  lib/
    mongodb.ts                      -- Database connection and collection names
    auth.ts                         -- JWT auth, session management, user CRUD
    roles.ts                        -- RBAC with 4-tier role hierarchy
    activity.ts                     -- Audit and activity logging
    mailer.ts                       -- Nodemailer for magic link emails
    slack.ts                        -- Slack webhook utilities
    geocoder.ts                     -- OpenStreetMap Nominatim geocoding
    schema-mapper.ts                -- PMO CSV column mapping with fuzzy matching
    program-rollout.ts              -- Program management data model and defaults
    program-utils.ts                -- ID generation, @mentions, comment utilities
  types/
    index.ts                        -- Core type definitions
    program.ts                      -- Program management types
  theme/
    index.ts                        -- MUI theme with MongoDB brand colors
scripts/
  seed-demo.ts                      -- Demo data seeder
  seed-admin.ts                     -- Admin user seeder
  DEMO-SCRIPT.md                    -- 8-10 minute presentation script
docs/
  PRODUCT_OVERVIEW.md               -- Full product overview
  PROGRAM_OVERVIEW.md               -- Program strategy and leadership brief
  TESTER-GUIDE.md                   -- Mobile app testing guide
__tests__/
  api/                              -- API route tests (events, insights)
```

---

## Authentication and Roles

### Authentication Flow

1. User enters their email address
2. System sends a 6-digit verification code via email (also generates a clickable magic link)
3. User enters the code or clicks the link
4. JWT session is created (7-day expiry) via secure httpOnly cookie (web) or Bearer token (mobile)

Domain-restricted to `@mongodb.com` and `@builderinsights.app`. New `@mongodb.com` users are auto-provisioned as viewers.

### Role Hierarchy

| Role | Level | Capabilities |
|------|-------|-------------|
| Admin | 100 | Full access: user management, settings, operations, monitoring, all data |
| Manager | 75 | Team lead: view all data, manage team insights, import data, program management |
| Advocate | 50 | Team member: create/edit own insights, view team data, submit bugs |
| Viewer | 25 | Read-only: view insights and events |

### Test Accounts

When `ENABLE_TEST_ACCOUNTS` is set, the following accounts are available with verification code `999999`:

| Account | Role |
|---------|------|
| `demo@builderinsights.app` | admin |
| `manager@builderinsights.app` | manager |
| `advocate@builderinsights.app` | advocate |
| `viewer@builderinsights.app` | viewer |

---

## Program Status

Builder Insights is targeting Q3 2026 for full launch. See [Program Overview](docs/PROGRAM_OVERVIEW.md) for the complete leadership brief.

| Workstream | Completion | Health | Target |
|-----------|-----------|--------|--------|
| Admin Platform | 72% | On Track | July 8, 2026 |
| iOS App | 68% | Watch | July 15, 2026 |
| Documentation | 61% | Watch | July 18, 2026 |
| Android App | 44% | At Risk | August 5, 2026 |

### Key Metrics

- 200+ insights captured across 12 events
- 11 active team members
- 16 product areas tracked across 4 global regions
- ~5 seconds to capture a voice insight on mobile

---

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests (requires running dev server)
npx playwright test
```

See [TESTING.md](TESTING.md) for role-based test accounts and testing workflows.

---

## Scripts

```bash
# Seed demo data (resets and populates with sample data)
npx tsx scripts/seed-demo.ts --reset

# Seed admin user
npx tsx scripts/seed-admin.ts

# Take screenshots for documentation
npx tsx scripts/take-screenshots.ts
```

---

## Deployment

Deployed on Vercel with:

- Automatic deployments from the main branch
- Vercel Cron for the weekly Slack digest (Mondays at 14:00 UTC)
- Vercel Blob for file attachment storage
- Environment variables configured in the Vercel dashboard

---

## Documentation

| Document | Description |
|----------|-------------|
| [Product Overview](docs/PRODUCT_OVERVIEW.md) | Full product capabilities across mobile and admin |
| [Program Overview](docs/PROGRAM_OVERVIEW.md) | Program strategy, timeline, risks, and leadership brief |
| [Tester Guide](docs/TESTER-GUIDE.md) | Mobile app testing instructions |
| [Testing](TESTING.md) | Role-based test accounts and workflows |
| [Demo Script](scripts/DEMO-SCRIPT.md) | 8-10 minute presentation script |

---

## Links

| Resource | URL |
|----------|-----|
| Admin Portal | https://admin.builderinsights.app |
| iOS TestFlight | https://testflight.apple.com/join/rAqHXs1Y |
| Mobile Repo | github.com/mongodb-developer/builder-insights |
| Docs Repo | github.com/mongodb-developer/builder-insights-docs |

---

## License

MIT

---

*Built for MongoDB Developer Relations by Michael Lynn*
