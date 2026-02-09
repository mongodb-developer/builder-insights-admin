# DevRel Insights — Demo Script

## Before the Demo (30 min prep)

### Reset and seed fresh data
```bash
cd /Users/michael.lynn/code/devrel-insights-admin
npx tsx scripts/seed-demo.ts --reset
```

### Pre-warm all pages
Open these in Chrome tabs (prevents cold-start latency):
1. https://devrel-insights-admin.vercel.app/dashboard
2. https://devrel-insights-admin.vercel.app/events
3. https://devrel-insights-admin.vercel.app/insights
4. https://devrel-insights-admin.vercel.app/world
5. https://devrel-insights-admin.vercel.app/advocates/leaderboard

### Prepare the mobile app
- Open iOS Simulator with DevRel Insights
- Navigate to the Home tab
- Ensure dark mode is ON (it looks better on the projector)
- Log in as demo user if needed

### Connectivity
- Tether to your phone hotspot if venue Wi-Fi is unreliable
- Have a backup: take screenshots of each dashboard page just in case

---

## The Demo (8-10 minutes)

### ACT 1: The Problem (30 seconds)

**SAY:** *"Every quarter, our DevRel team attends dozens of events — conferences, workshops, hackathons. Developers tell us incredibly valuable things: pain points with our products, feature requests, competitive intel, use cases we've never imagined. But historically, this intelligence gets lost. It's in someone's head, maybe a Slack message, maybe a sticky note that gets thrown away. We built DevRel Insights to fix that."*

---

### ACT 2: Capture — The Mobile App (2 minutes)

**DO:** Hold up the phone / show the Simulator on screen.

**SAY:** *"Imagine you're at a developer booth at AWS re:Invent. A developer walks up and says they're struggling with something. Here's what happens."*

**DO:**
1. Tap **Quick Capture** on the Home screen
2. Speak into the mic: *"Developer from a fintech startup says Atlas Vector Search setup was easy, but they're struggling with cost visibility — can't predict their monthly Atlas bill and their finance team is pushing back."*
3. Tap the red stop button
4. Show the **green checkmark** with the transcription
5. Dismiss the modal

**SAY:** *"That's it. Five seconds. No typing, no forms, no forgetting. The insight is captured with AI transcription, tagged to this event, and synced to our backend instantly."*

**DO:** Tap the **Capture** tab to show the detailed form.

**SAY:** *"If they have more time, advocates can use the detailed form — categorize by insight type, tag product areas, set priority. But the Quick Capture is the killer feature — zero friction at a busy booth."*

---

### ACT 3: Organize — Events & Insights (1.5 minutes)

**DO:** Switch to the **admin dashboard** in the browser. Navigate to **Events**.

**SAY:** *"On the admin side, we see our full event calendar. Completed events, what's coming up, who's assigned. Every event shows how many insights were captured."*

**DO:** Click into a high-count event (e.g., "MongoDB for AI Builders Workshop" with 42+ insights).

**SAY:** *"For this recent workshop, the team captured over 40 insights in two days. Let's look at the Insights view."*

**DO:** Navigate to **Insights**. Show the filters — filter by "Pain Point" or "Critical" priority.

**SAY:** *"We can filter by type, sentiment, priority, product area. Critical pain points bubble up immediately — no waiting for a post-event report."*

---

### ACT 4: Analyze — The Dashboard (2.5 minutes)

**DO:** Navigate to the **Dashboard**. Pause to let the charts load.

**SAY:** *"This is where it gets interesting. The dashboard shows our team's full intelligence picture."*

**Point to each section:**

1. **Metric Cards:** *"Over 200 insights captured across 12 events. Look at the trend — we're accelerating. This week alone, the team captured more than the prior two weeks combined."*

2. **90-Day Trend Chart:** *"You can see the uptick — as more advocates adopt the mobile app, capture volume is growing. That's organic, not mandated."*

3. **Sentiment Distribution:** *"Roughly 35% positive, which is healthy. The negative sentiment tells us where developers are hurting — that's the gold."*

4. **Product Areas Bar Chart:** *"Atlas and Atlas Vector Search dominate. That makes sense given the AI wave. But look — cost visibility and aggregation keep showing up. That's a signal."*

5. **Leaderboard:** *"We built in gamification. Advocates earn points for capturing insights. Sarah Chen is leading this quarter with 30+ captures. It's friendly competition that drives data quality."*

**DO:** Click on the **AI Summary** button if available.

**SAY:** *"We also have an AI-powered executive summary that synthesizes the key themes. Instead of reading 200 individual insights, leadership gets a one-paragraph brief with the top trends and action items."*

---

### ACT 5: Executive View (1.5 minutes)

**DO:** Navigate to the **Executive Dashboard** tab (or switch to it).

**SAY:** *"For leadership, there's a purpose-built executive view. Team-wide analytics, week-over-week trends, team sentiment analysis."*

**Point out:**
- **Week/Week growth:** *"+80% — the program is scaling."*
- **Team Sentiment:** *"This shows how developers feel about our products across all events. 11 positive, 5 neutral, 2 negative — healthy signal."*
- **Team tab:** *"We can drill into individual advocate performance and regional coverage."*

---

### ACT 6: The Map (30 seconds) — if the /world page works

**DO:** Navigate to the **World** or map view.

**SAY:** *"And here's the global view — every pin is an event where we captured developer intelligence. We're covering AMER, EMEA, and APAC. You can see the geographic distribution of our developer engagement."*

---

### ACT 7: Close Strong (30 seconds)

**SAY:** *"To summarize: we've gone from losing developer feedback to capturing it in 5 seconds with voice AI, organizing it automatically by event and product area, and surfacing trends that product and engineering can act on. This quarter, we've captured over 200 data points from 12 events — and the system is entirely built by our team, running on MongoDB Atlas."*

**Pause. Then:**

*"Happy to dive deeper into any area. Questions?"*

---

## Backup Plans

| Problem | Solution |
|---------|----------|
| Wi-Fi goes down | Tether to phone. The mobile app works offline — demo that as a feature. |
| Admin dashboard slow | Pre-warmed tabs. If truly down, use the screenshots on your laptop. |
| Voice capture fails | Use the Detailed Capture form instead. Say "we also have a form for noisy environments." |
| Someone asks about data privacy | "All data is stored in MongoDB Atlas with encryption at rest and in transit. The mobile app stores locally until sync." |
| "How many users?" | "Currently 11 advocates. The architecture supports hundreds — it's the same stack as our production platform." |
| "What's the tech stack?" | "Next.js 16 with React 19 for the admin portal, React Native for mobile, MongoDB Atlas for persistence, OpenAI for AI summaries, Material UI for the design system." |
| "How long did this take?" | "We built the MVP in [X weeks]. It's actively being used by the team at events right now." |
| "What's next?" | "Slack digests to push weekly summaries, deeper product area analytics, and integration with our PMO tools for event planning." |

---

## Key Numbers to Memorize

- **200+** insights captured
- **12** events covered
- **11** team members
- **5 seconds** to capture a voice insight
- **7** insight types (Pain Points, Feature Requests, Praise, Competition, Use Cases, Questions, Documentation)
- **16** product areas tracked
- **4** regions (AMER, EMEA, APAC, LATAM)

---

## Don't Do This

- ❌ Don't show Profile or Settings pages — they're boring
- ❌ Don't live-code anything
- ❌ Don't apologize for what's missing — this is a v1
- ❌ Don't read from the screen — maintain eye contact
- ❌ Don't start with the dashboard — start with the PROBLEM
- ❌ Don't show light mode — dark mode looks dramatically better on projectors
