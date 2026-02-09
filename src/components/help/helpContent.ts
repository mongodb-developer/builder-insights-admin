// Help content for DevRel Insights Admin Portal
// Single source of truth for all help topics

export interface HelpTopic {
  id: string;
  title: string;
  icon?: string;
  summary: string;
  content: string;
  tips?: string[];
  relatedTopics?: string[];
  screenshots?: { src: string; alt: string; caption?: string }[];
}

export interface PageHelpContent {
  title: string;
  description: string;
  quickActions?: { label: string; description: string }[];
}

// Contextual help topics - used by HelpButton and HelpDrawer
export const helpTopics: Record<string, HelpTopic> = {
  // Core Concepts
  insights: {
    id: 'insights',
    title: 'Developer Insights',
    icon: '💡',
    summary: 'Feedback and ideas captured from developer interactions',
    content: `
Insights are the core unit of feedback in DevRel Insights. They capture developer 
pain points, feature requests, praise, and ideas gathered during conferences, 
meetings, and community interactions.

Each insight includes:
- **Sentiment** — Positive, negative, or neutral
- **Priority** — P0 (critical) to P3 (nice-to-have)  
- **Product Area** — Which MongoDB product/service it relates to
- **Event** — Where the insight was captured
- **Advocate** — Who recorded it
    `,
    tips: [
      'Use voice recording in the mobile app for faster capture',
      'Add context like use case or company size when relevant',
      'High priority insights (P0/P1) appear on the dashboard',
    ],
    relatedTopics: ['events', 'mobile-app', 'sentiment'],
  },

  events: {
    id: 'events',
    title: 'Events & Conferences',
    icon: '📅',
    summary: 'Conferences and meetups where insights are captured',
    content: `
Events represent conferences, meetups, workshops, or any gathering where 
your team captures developer insights.

**Creating Events:**
Events can be created in the admin portal or synced from your PMO spreadsheet.
Each event has a date range, location, and can be marked as active.

**Active Events:**
When an event is marked "active," it appears in the mobile app's event picker,
making it easy for advocates to tag their insights to the right event.
    `,
    tips: [
      'Mark events as active before they start',
      'Use the world map to see event coverage',
      'PMO import can bulk-create events from spreadsheets',
    ],
    relatedTopics: ['insights', 'pmo-import', 'world-map'],
  },

  advocates: {
    id: 'advocates',
    title: 'Advocates & Team Members',
    icon: '👥',
    summary: 'DevRel team members who capture insights',
    content: `
Advocates are the team members who capture insights at events. The Advocates 
page shows contribution metrics for each team member.

**Metrics tracked:**
- Total insights captured
- Breakdown by sentiment
- Activity over time
- Events attended
    `,
    tips: [
      'Check the Leaderboard for gamified recognition',
      'Each advocate can use the mobile app independently',
    ],
    relatedTopics: ['leaderboard', 'mobile-app'],
  },

  leaderboard: {
    id: 'leaderboard',
    title: 'Leaderboard',
    icon: '🏆',
    summary: 'Recognition and gamification for top contributors',
    content: `
The Leaderboard celebrates your most active advocates! It ranks team members 
by their insight contributions.

**Scoring:**
- Each insight counts toward your score
- High-priority insights may have bonus weight
- Consistent contribution matters

Use the leaderboard to recognize top performers and encourage friendly competition.
    `,
    tips: [
      'Share leaderboard highlights in team meetings',
      'Celebrate milestone achievements',
    ],
    relatedTopics: ['advocates', 'insights'],
  },

  sentiment: {
    id: 'sentiment',
    title: 'Sentiment Analysis',
    icon: '😊',
    summary: 'How developers feel about their experience',
    content: `
Sentiment indicates the emotional tone of an insight:

- **Positive** 😊 — Praise, excitement, success stories
- **Neutral** 😐 — Questions, clarifications, general feedback  
- **Negative** 😞 — Frustrations, pain points, complaints

**Why it matters:**
Tracking sentiment over time helps you understand developer satisfaction 
and identify areas needing attention.
    `,
    tips: [
      'Dashboard charts show sentiment trends over time',
      'Filter insights by sentiment to focus on issues',
      'AI can auto-detect sentiment from voice recordings',
    ],
    relatedTopics: ['insights', 'priority'],
  },

  priority: {
    id: 'priority',
    title: 'Priority Levels',
    icon: '🚨',
    summary: 'How urgent or important an insight is',
    content: `
Priority helps triage insights for product teams:

- **P0 — Critical** 🔴 — Blocking issues, major bugs, urgent feedback
- **P1 — High** 🟠 — Important problems or highly requested features
- **P2 — Medium** 🟡 — Notable feedback worth tracking
- **P3 — Low** 🟢 — Nice-to-have suggestions

**Setting Priority:**
Consider impact (how many developers affected) and severity 
(how much it blocks their work).
    `,
    tips: [
      'P0/P1 items appear in the Dashboard "Critical Items" section',
      'Review and adjust priority as you learn more',
    ],
    relatedTopics: ['insights', 'sentiment'],
  },

  'mobile-app': {
    id: 'mobile-app',
    title: 'Mobile App',
    icon: '📱',
    summary: 'iOS app for capturing insights on the go',
    content: `
The DevRel Insights mobile app lets advocates capture insights anywhere — 
at conference booths, during hallway conversations, or at after-parties.

**Key Features:**
- Voice recording with AI transcription
- Quick sentiment/priority selection
- Offline capture with background sync
- Event picker for active conferences

**Getting the App:**
Join the TestFlight beta from the sidebar link, or wait for the 
App Store release.
    `,
    tips: [
      'Use voice recording — it\'s 10x faster than typing',
      'Capture insights immediately while details are fresh',
      'Review pending drafts before they sync',
    ],
    relatedTopics: ['insights', 'events', 'voice-recording'],
    screenshots: [
      { src: '/help/screenshots/01-home-capture-starting.png', alt: 'Home Screen', caption: 'Quick access to voice and form capture' },
      { src: '/help/screenshots/02-home-main.png', alt: 'Home Dashboard', caption: 'Your insights at a glance' },
      { src: '/help/screenshots/03-voice-recording.png', alt: 'Voice Recording', caption: 'Tap to record — AI handles transcription' },
      { src: '/help/screenshots/04-capture-form.png', alt: 'Capture Form', caption: 'Add sentiment, priority, and details' },
    ],
  },

  'voice-recording': {
    id: 'voice-recording',
    title: 'Voice Recording',
    icon: '🎙️',
    summary: 'Capture insights with your voice',
    content: `
Voice recording is the fastest way to capture insights. Just tap record, 
speak your observation, and AI handles the rest.

**How it works:**
1. Tap the microphone button
2. Speak naturally about what you heard
3. AI transcribes and extracts key details
4. Review and edit before submitting

**Tips for good recordings:**
- Speak clearly, even in noisy environments
- Include context: "A developer from a fintech startup said..."
- Mention the product area if relevant
    `,
    tips: [
      'Failed transcriptions go to "Review Drafts" for retry',
      'You can edit AI transcriptions before submitting',
    ],
    relatedTopics: ['mobile-app', 'insights'],
  },

  'pmo-import': {
    id: 'pmo-import',
    title: 'PMO Import',
    icon: '📤',
    summary: 'Import events from PMO spreadsheets',
    content: `
The PMO Import feature lets you bulk-create events from your project 
management spreadsheets.

**How it works:**
1. Export your PMO data as CSV or Excel
2. Upload to the Import page
3. Map columns to event fields
4. Review and confirm the import

**Smart Mapping:**
The importer uses fuzzy matching to auto-detect columns, and learns 
from your corrections to improve over time.
    `,
    tips: [
      'The mapper remembers your column preferences',
      'Preview all rows before confirming import',
    ],
    relatedTopics: ['events'],
  },

  'world-map': {
    id: 'world-map',
    title: 'World Map',
    icon: '🌍',
    summary: 'Geographic visualization of events and insights',
    content: `
The World Map shows where your team is capturing insights globally.

**What you see:**
- Event locations with insight counts
- Real-time activity indicators
- Geographic coverage gaps

Use it to understand your global reach and plan future event coverage.
    `,
    tips: [
      'Click markers to see event details',
      'Look for regions without coverage',
    ],
    relatedTopics: ['events', 'insights'],
  },

  'user-management': {
    id: 'user-management',
    title: 'User Management',
    icon: '🔐',
    summary: 'Control who can access the admin portal',
    content: `
User Management lets admins control access to the DevRel Insights portal.

**Features:**
- Add new users via email invitation
- Set user roles (admin vs regular user)
- Deactivate accounts when people leave

**Authentication:**
Users sign in with magic links — no passwords to remember or manage.
    `,
    tips: [
      'Only @mongodb.com emails can access by default',
      'Admins can add users with any email domain',
    ],
    relatedTopics: ['advocates'],
  },

  operations: {
    id: 'operations',
    title: 'Operations',
    icon: '🔧',
    summary: 'Database management and backups',
    content: `
The Operations page lets admins manage the database and perform maintenance tasks.

**Available Actions:**
- **Full Backup** — Download all data as JSON
- **Export CSV** — Export insights to spreadsheet format
- **Database Stats** — View collection sizes and document counts

**Why backup?**
Regular backups protect against accidental deletions and let you restore 
data if something goes wrong.
    `,
    tips: [
      'Run backups before major imports or changes',
      'Store backup files in a secure location',
      'JSON backups can be used for full data restore',
    ],
    relatedTopics: ['user-management'],
  },

  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '📊',
    summary: 'Your command center for insights',
    content: `
The Dashboard gives you an at-a-glance view of your team's DevRel activity.

**What you'll find:**
- AI-generated executive summary
- Key metrics (total insights, events, sentiment)
- Trend charts over time
- Top contributors
- Critical items requiring attention
- Geographic activity map

**Pro tip:** Use the PDF export to share with stakeholders.
    `,
    tips: [
      'AI summary refreshes when you load the page',
      'Click chart segments to drill down',
      'Export to PDF for executive reports',
    ],
    relatedTopics: ['insights', 'leaderboard', 'world-map'],
  },
};

// Page-specific help content - shown at top of each page
export const pageHelp: Record<string, PageHelpContent> = {
  dashboard: {
    title: 'Welcome to your Dashboard',
    description: 'Your command center for DevRel insights. See trends, top contributors, and critical items at a glance.',
    quickActions: [
      { label: 'Export PDF', description: 'Share a report with stakeholders' },
      { label: 'View Insights', description: 'Drill into the details' },
    ],
  },
  events: {
    title: 'Events & Conferences',
    description: 'Manage the events where your team captures insights. Mark events as "active" to make them available in the mobile app.',
    quickActions: [
      { label: 'Add Event', description: 'Create a new event manually' },
      { label: 'PMO Import', description: 'Bulk import from spreadsheet' },
    ],
  },
  insights: {
    title: 'Developer Insights',
    description: 'Browse, filter, and manage all captured insights. Use filters to find specific feedback.',
    quickActions: [
      { label: 'Add Insight', description: 'Manually enter feedback' },
      { label: 'Export CSV', description: 'Download for analysis' },
    ],
  },
  advocates: {
    title: 'Your DevRel Team',
    description: 'See contribution metrics for each team member. Click an advocate to see their insights.',
  },
  leaderboard: {
    title: 'Leaderboard',
    description: 'Celebrate your top contributors! Rankings update as new insights come in.',
  },
  world: {
    title: 'Global Activity Map',
    description: 'Visualize where insights are being captured around the world.',
  },
  import: {
    title: 'PMO Import',
    description: 'Import events from your PMO spreadsheet. The smart mapper learns your column preferences.',
  },
  settings: {
    title: 'Settings',
    description: 'Configure product areas, customize the portal, and manage integrations.',
  },
  'admin/users': {
    title: 'User Management',
    description: 'Add, edit, or deactivate user accounts. Users sign in with magic links.',
  },
  bugs: {
    title: 'Bug Reports',
    description: 'View bug reports submitted from the mobile app. Triage and track issues here.',
  },
  operations: {
    title: 'Operations',
    description: 'Database management, backups, and system maintenance. Download backups before making major changes.',
    quickActions: [
      { label: 'Download Backup', description: 'Save a full JSON backup' },
      { label: 'Export CSV', description: 'Export insights for reporting' },
    ],
  },
};

// Search index - for HelpDrawer search functionality
export function searchHelp(query: string): HelpTopic[] {
  const q = query.toLowerCase().trim();
  if (!q) return Object.values(helpTopics);

  return Object.values(helpTopics).filter(
    (topic) =>
      topic.title.toLowerCase().includes(q) ||
      topic.summary.toLowerCase().includes(q) ||
      topic.content.toLowerCase().includes(q) ||
      topic.tips?.some((tip) => tip.toLowerCase().includes(q))
  );
}
