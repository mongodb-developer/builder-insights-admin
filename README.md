# Builder Insights Admin

**Admin backend for Builder Insights — manage events, insights, and team analytics.**

Built with Next.js 16 + Material UI 6 + MongoDB native driver.

---

## Quick Start

```bash
# Install dependencies (already done)
npm install

# Configure MongoDB
cp .env.example .env.local
# Edit .env.local with your MongoDB connection string

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

### Dashboard
- Overview stats (events, insights, advocates)
- Recent insights feed
- Weekly activity

### Events Management
- List all events with filtering
- Create/edit/delete events
- PMO-aligned fields (region, engagement type, account, etc.)

### PMO Import
- Upload CSV exports from PMO spreadsheet
- Preview and validate before import
- Auto-map columns to schema

### Insights (coming soon)
- View all captured insights
- Filter by event, type, sentiment, priority
- Analytics and aggregations

### Advocates (coming soon)
- Team member management
- Assignment tracking
- Activity reports

---

## Architecture

```
Mobile App (React Native + Expo)
      │
      │ MongoDB Atlas Data API
      │
      ▼
┌─────────────────────────────┐
│       MongoDB Atlas         │
│   (builder-insights db)     │
└─────────────────────────────┘
      ▲
      │ Native MongoDB Driver
      │
Admin Backend (Next.js + MUI)
```

Both apps share the same MongoDB database:
- **Mobile**: Captures insights at events (offline-first)
- **Admin**: Manages events, imports data, runs analytics

---

## Environment Variables

```bash
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=builder-insights
```

---

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events (with filters) |
| POST | `/api/events` | Create event |
| GET | `/api/events/[id]` | Get event by ID |
| PUT | `/api/events/[id]` | Update event |
| DELETE | `/api/events/[id]` | Delete event |
| GET | `/api/insights` | List insights |
| POST | `/api/insights` | Get aggregated stats |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | Material UI 6 |
| Database | MongoDB (native driver) |
| Styling | Emotion (MUI default) |
| Icons | MUI Icons |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Dashboard
│   ├── events/           # Events management
│   ├── import/           # PMO import
│   └── api/              # REST endpoints
├── components/
│   └── AdminLayout.tsx   # Sidebar layout
├── lib/
│   └── mongodb.ts        # Database connection
└── theme/
    └── index.ts          # MUI theme (MongoDB colors)
```

---

## License

MIT - Built for MongoDB Developer Advocacy
