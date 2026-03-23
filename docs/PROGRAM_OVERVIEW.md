# Builder Insights — Program Overview & Strategy

**Transforming lost developer feedback into structured, actionable intelligence for MongoDB.**

*Prepared for Leadership Review — March 2026*

---

## Executive Summary

Builder Insights is a managed program delivering a complete developer feedback intelligence system for MongoDB Builder Relations. The program addresses a fundamental gap: every quarter, DevRel teams attend dozens of events — conferences, workshops, hackathons, customer engagements — where developers share pain points, feature requests, competitive intelligence, and use cases. Historically, this intelligence gets lost in notebooks, Slack threads, sticky notes, and peoples' heads. None of it reaches product or engineering teams in a structured, timely way.

Builder Insights fixes this with a three-pillar system: a **mobile app** for rapid field capture, an **admin portal** for analysis and reporting, and a **documentation site** for onboarding and operational support. Together, they form a closed loop — capture in the field, analyze at the desk, act on the insights.

The program is targeting **Q3 2026** for full launch readiness.

---

## The Problem

- DevRel teams are MongoDB's most direct line to developers in the field, yet there is no systematic way to capture, organize, or report what developers tell us.
- Feedback is scattered across personal notes, Slack messages, email threads, and memory — much of it is never recorded at all.
- Product and engineering teams lack a structured signal from the field to inform roadmap decisions, prioritize pain points, or validate direction.
- There is no visibility into which product areas generate the most friction, which regions have the highest engagement, or which events yield the most valuable intelligence.
- Post-event reporting, when it happens, is manual, inconsistent, and delayed.

**The cost:** MongoDB's richest source of unfiltered developer sentiment goes largely untapped.

---

## The Solution: Three Pillars

Builder Insights is organized around three pillars, each delivered as a distinct application within a unified program.

| Pillar | Application | Purpose |
|--------|------------|---------|
| **1. Mobile App** | Field Capture | Zero-friction insight capture at events using voice AI and quick-entry forms |
| **2. Admin Portal** | Command Center | Management, analysis, reporting, and program coordination for the team |
| **3. Documentation Site** | Enablement | Onboarding guides, support playbooks, release notes, and troubleshooting |

All three pillars share a single MongoDB Atlas database and authenticate through a common passwordless identity system.

---

## Pillar 1: Mobile App — Field Capture

**Purpose:** Enable advocates to capture developer feedback in 5 seconds or less, directly from the event floor.

### Key Capabilities

- **Voice Capture with AI Transcription** — Tap, speak, done. AI transcribes and extracts key details automatically. This is the signature capability — zero typing required at a busy booth.
- **Quick Capture Forms** — Structured entry with sentiment, priority, product area, and event tagging for advocates who prefer typed input.
- **Offline Support** — Capture insights without connectivity. The app queues locally and auto-syncs when back online.
- **Event Integration** — Active events sync from the admin portal so every insight is tagged to its source event.
- **Pending Recordings** — Review, retry, or correct failed transcriptions before they sync.
- **Secure Authentication** — Passwordless magic link login, optional PIN lock for device security.

### Platform Status

| Platform | Completion | Health | Target Date |
|----------|-----------|--------|-------------|
| iOS | 68% | Watch | July 15, 2026 |
| Android | 44% | At Risk | August 5, 2026 |

**iOS** is in beta via TestFlight and approaching App Store submission readiness. **Android** is in active development with feature parity as the primary risk factor (see Risks section).

The app delivers 17 screens covering capture, event browsing, session management, a field-level executive dashboard, and in-app help.

---

## Pillar 2: Admin Portal — Command Center

**Purpose:** Serve as the operational hub where leadership and the team manage events, analyze insights, generate reports, and coordinate the program.

### Key Capabilities

- **AI Executive Summaries** — GPT-powered narrative summaries that synthesize hundreds of insights into a one-paragraph brief with key themes and action items. Configurable by period (week, month, quarter).
- **Real-Time Dashboard** — Metric cards, 90-day trend charts, sentiment distribution, product area breakdown, top contributors, and critical items — all updating live.
- **Executive Reports** — Detailed analytics with CSV and PDF export for leadership distribution.
- **Event Management** — Full lifecycle management of conferences, workshops, and customer engagements. Includes geocoding, regional tracking, and assignment management.
- **PMO Import** — Smart spreadsheet import with fuzzy column mapping that learns from corrections. Bridges the gap between existing PMO workflows and the insights system.
- **Insight Browser** — Filter, search, and drill into individual insights by type, sentiment, priority, product area, or advocate. Each insight supports AI analysis, threaded annotations, and reactions.
- **World Map** — Geographic visualization of event coverage across AMER, EMEA, APAC, and LATAM.
- **Leaderboard** — Gamified contribution rankings that drive healthy competition and data quality across the team.
- **Program Management Workspace** — Full rollout tracking with workstreams, tasks, stakeholders, decisions, risks, threaded comments, and audit trails. This is where the launch is coordinated.
- **Slack Integration** — Automated weekly digest delivered to the team channel every Monday, summarizing the prior week's insights, top contributors, and priority items.
- **Monitoring & Operations** — App health observability, database statistics, and backup utilities for administrators.
- **Role-Based Access** — Four-tier access control (Admin, Manager, Advocate, Viewer) enforced across all pages and endpoints.

### Platform Status

| Completion | Health | Target Date |
|-----------|--------|-------------|
| 72% | On Track | July 8, 2026 |

The admin portal is the most mature pillar and is already in active use by the team.

---

## Pillar 3: Documentation Site — Enablement

**Purpose:** Provide onboarding, operational support, release communications, and troubleshooting content for internal teams and users.

### Key Capabilities

- **Onboarding Guides** — Step-by-step walkthroughs for the mobile app and admin portal.
- **Support Playbooks** — Troubleshooting guides, escalation paths, and known issue documentation.
- **Release Notes** — Structured release communication for each pillar.
- **FAQ & Self-Service** — Common questions and self-service resolution paths.

Built on Docusaurus for fast authoring and easy maintenance by the team.

### Platform Status

| Completion | Health | Target Date |
|-----------|--------|-------------|
| 61% | Watch | July 18, 2026 |

The documentation site's information architecture is complete. Content authoring is in progress, with the support escalation handbook blocked on pending leadership decisions (see Outstanding Decisions).

---

## Current State Summary

### Program Health at a Glance

| Workstream | Completion | Health | Stage | Target |
|-----------|-----------|--------|-------|--------|
| Admin Platform Rollout | 72% | On Track | Build | July 8, 2026 |
| iOS Launch Readiness | 68% | Watch | Validate | July 15, 2026 |
| Documentation Rollout | 61% | Watch | Validate | July 18, 2026 |
| Android Launch Readiness | 44% | **At Risk** | Build | August 5, 2026 |

**Overall Program Health: Watch**

### Key Metrics (to date)

| Metric | Value |
|--------|-------|
| Insights captured | 200+ |
| Events covered | 12 |
| Team members active | 11 |
| Time to capture (voice) | ~5 seconds |
| Insight types tracked | 7 (Pain Point, Feature Request, Praise, Question, Use Case, Competition, Documentation) |
| Product areas tracked | 16 (Atlas, Atlas Vector Search, Drivers, Charts, Compass, Server, and more) |
| Regions covered | 4 (AMER, EMEA, APAC, LATAM) |

### Operating Cadence

- **Weekly program review** — Cross-workstream status, risk escalation, decision tracking
- **Twice-weekly workstream standup** — Tactical progress within each pillar
- **Friday launch readiness review** — Go/no-go confidence assessment

---

## Program Plan & Timeline

### Launch Window: Q3 2026

```
                        June               July               August
                    ┌──────────────┬──────────────────┬──────────────────┐
  Admin Portal      ████████████████████░░░░░░░░       │                  │
                                        ▲ July 8       │                  │
  iOS App           █████████████████████████░░░░░░    │                  │
                                             ▲ July 15 │                  │
  Documentation     ██████████████████████████████░░░░░│                  │
                                                  ▲ July 18              │
  Android App       █████████████████████████████████████████████░░░░░░░░ │
                                                                ▲ Aug 5  │
                    └──────────────┴──────────────────┴──────────────────┘
```

### Phase Model

The program follows a five-phase lifecycle. Each workstream progresses independently through these phases.

| Phase | Purpose | Exit Criteria |
|-------|---------|--------------|
| **Strategy** | Align scope, objectives, stakeholders, and release model | Owners, launch window, success measures, and go/no-go inputs defined |
| **Build** | Ship core deliverables for end-to-end readiness | Critical launch features implemented with clear owners |
| **Validate** | QA, beta testing, analytics, and operational readiness | Test gaps, instrumentation gaps, and support gaps closed |
| **Launch** | Submission, communications, enablement, and launch-day coordination | Distribution, communications, and stakeholder approvals complete |
| **Post-Launch** | Monitor adoption, resolve hot issues, operationalize learnings | Stabilization metrics healthy; ownership transitioned to steady-state |

**Current phase positions:** Admin and Android are in **Build**. iOS and Docs are in **Validate**.

---

## Capabilities Delivered to Date

The following capabilities are built, functional, and in use today:

- Passwordless magic link authentication across web and mobile
- Voice recording with AI transcription and automatic insight extraction
- Real-time executive dashboard with trend analysis and sentiment tracking
- AI-powered executive summaries with period selection and PDF export
- AI analysis of individual insights (themes, suggested actions, priority recommendations)
- Full event management with geocoding and PMO spreadsheet import
- Interactive world map showing global event coverage
- Gamified leaderboard with weighted impact scoring
- Automated weekly Slack digest delivered to the team channel
- Program management workspace with workstreams, tasks, risks, decisions, and audit trails
- Four-tier role-based access control (Admin, Manager, Advocate, Viewer)
- In-app help system with searchable documentation, contextual tooltips, and guided onboarding
- Bug reporting from mobile with admin triage workflow
- Monitoring dashboard for app health and usage telemetry

---

## Open Risks

| Risk | Severity | Status | Owner | Mitigation |
|------|---------|--------|-------|------------|
| Android feature parity slips beyond launch window | **HIGH** | Open | Android Engineering Lead | Establish parity cutoff; prepare contingency plan for phased mobile rollout (iOS first, Android fast-follow) |
| Launch support process is undefined | **MEDIUM** | Open | Support Manager | Draft RACI and publish support handbook in docs site; requires leadership input on escalation model |
| Store submission assets lag final product changes | **MEDIUM** | Mitigated | Product Marketing | UI frozen for submission flows; assets reviewed weekly against build candidate |

---

## Outstanding Decisions Requiring Leadership Input

These decisions are blocking downstream work and require resolution in the coming weeks.

| # | Decision | Owner | Due | Impact |
|---|----------|-------|-----|--------|
| 1 | **Define Android parity bar for launch** — What is the minimum feature set for Android to ship alongside iOS vs. as a fast-follow? | Product Manager | June 18, 2026 | Determines whether Android is day-one or phased. Directly affects QA scope, marketing, and launch communications. |
| 2 | **Choose launch support model and escalation rotation** — Who covers launch-day issues? What is the after-hours plan? | Support Manager | June 21, 2026 | Affects documentation content, team scheduling, and the ability to publish the support escalation handbook. Currently blocking the docs workstream. |
| 3 | **Lock 30-day success metrics** — What does success look like in the first month post-launch? | Leadership Sponsor | June 25, 2026 | Required for the post-launch scorecard and stakeholder reporting. Currently deferred pending baseline analytics confidence. |

---

## Outstanding Actions by Workstream

### iOS Launch Readiness
- Close beta-critical bugs (in progress, due March 24)
- Prepare App Store metadata and screenshots (blocked — waiting on final approved build)
- Verify crash and product analytics instrumentation (in progress, due April 22)
- Publish iOS troubleshooting runbook (not started, due April 29)
- Complete App Store submission packet (blocked — needs final UI assets and privacy review)

### Android Launch Readiness
- Reach feature parity for capture and sync flows (in progress, due July 1)
- Complete device matrix validation (not started, due July 4)
- Prepare Play Store listing and policies (not started, due July 7)
- Recruit closed beta cohort (blocked, due July 3)

### Admin Platform Rollout
- Finalize program tracking workspace (in progress, due June 20)
- Define launch health reporting views (in progress, due June 23)
- Draft operational handoff checklist (not started, due June 28)
- Publish weekly launch readiness scorecard (in progress, due June 20)

### Documentation Rollout
- Write admin and mobile onboarding guides (in progress, due June 25)
- Draft release notes and FAQ (not started, due June 27)
- Create support escalation handbook (blocked — needs support model decision, due June 30)

---

## Call to Action

To keep the program on track for Q3 2026 launch, we need the following from leadership:

1. **Resolve the three outstanding decisions** listed above — particularly the Android parity bar (Decision 1), which is the single largest variable in the launch timeline. A clear answer this month allows the team to plan with confidence rather than hedge.

2. **Designate an executive sponsor** who will attend the weekly program review and own the go/no-go call. The program workspace in the admin portal provides full visibility into workstream health, risks, and decisions — the sponsor should have access.

3. **Commit to the weekly launch readiness review cadence.** The Friday reviews are designed to surface blockers early. Leadership presence ensures decisions are made in-meeting rather than deferred.

4. **Approve the phased rollout contingency.** If Android parity slips, the team recommends launching iOS first with Android as a fast-follow (2-3 weeks behind). This requires a pre-approved decision so the team can execute without delay if the trigger is hit.

5. **Validate the 30-day success metrics** so the team can instrument the post-launch scorecard before launch, not after.

---

## Success Measures

The program will be considered successful when:

- iOS and Android launch checklists are complete with no critical blockers
- The admin portal supports program oversight, rollout reporting, and operational handoff
- Documentation is complete for internal teams, beta users, and production release paths
- Owners, stakeholders, risks, and decisions are visible in one shared workspace
- The team is capturing developer insights at every event with less than 5 seconds of friction
- Product and engineering teams receive structured, actionable field intelligence on a regular cadence

---

## Resources

| Resource | Location |
|----------|----------|
| Admin Portal (live) | https://admin.builderinsights.app |
| iOS TestFlight | https://testflight.apple.com/join/rAqHXs1Y |
| Admin Repository | github.com/mongodb-developer/builder-insights-admin |
| Mobile Repository | github.com/mongodb-developer/builder-insights |
| Documentation Repository | github.com/mongodb-developer/builder-insights-docs |

---

*Program Owner: Michael Lynn, Principal Staff Developer Advocate*
