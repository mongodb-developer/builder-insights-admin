/**
 * Demo Seed & Reset Script for DevRel Insights
 *
 * Creates compelling, realistic demo data optimized for leadership presentations.
 * Data is designed to show upward trends, diverse insights, and an active team.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts          # Seed (additive, skips if data exists)
 *   npx tsx scripts/seed-demo.ts --reset   # Wipe all collections and re-seed
 *   npx tsx scripts/seed-demo.ts --dry-run  # Preview without writing to DB
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'devrel-insights';
const isReset = process.argv.includes('--reset');
const isDryRun = process.argv.includes('--dry-run');

if (!uri) {
  console.error('❌ MONGODB_URI not set in .env.local');
  process.exit(1);
}

// ============================================================
// DEMO DATA: Advocates (your team)
// ============================================================
const advocates = [
  { id: 'advocate_mike_lynn', name: 'Mike Lynn', email: 'michael.lynn@mongodb.com', role: 'Principal Staff DA', region: 'AMER' as const, isAdmin: true },
  { id: 'adv_001', name: 'Sarah Chen', email: 'sarah.chen@mongodb.com', role: 'Senior DA', region: 'AMER' as const, isAdmin: false },
  { id: 'adv_002', name: 'Marcus Johnson', email: 'marcus.johnson@mongodb.com', role: 'Staff DA', region: 'AMER' as const, isAdmin: false },
  { id: 'adv_003', name: 'Priya Sharma', email: 'priya.sharma@mongodb.com', role: 'Senior DA', region: 'APAC' as const, isAdmin: false },
  { id: 'adv_004', name: 'Alex Rivera', email: 'alex.rivera@mongodb.com', role: 'DA', region: 'LATAM' as const, isAdmin: false },
  { id: 'adv_005', name: 'Wen Jie Teo', email: 'wenjie.teo@mongodb.com', role: 'Senior DA', region: 'APAC' as const, isAdmin: false },
  { id: 'adv_006', name: 'Nestor Daza', email: 'nestor.daza@mongodb.com', role: 'Staff DA', region: 'EMEA' as const, isAdmin: false },
  { id: 'adv_007', name: 'Tim Kelly', email: 'tim.kelly@mongodb.com', role: 'DA', region: 'AMER' as const, isAdmin: false },
  { id: 'adv_008', name: 'Erik Hatcher', email: 'erik.hatcher@mongodb.com', role: 'Principal DA', region: 'AMER' as const, isAdmin: false },
  { id: 'adv_009', name: 'Justin LaBreck', email: 'justin.labreck@mongodb.com', role: 'Senior DA', region: 'AMER' as const, isAdmin: false },
  { id: 'adv_010', name: 'Jordan Kim', email: 'jordan.kim@mongodb.com', role: 'DA', region: 'EMEA' as const, isAdmin: false },
];

// ============================================================
// DEMO DATA: Events (realistic schedule spanning 90 days)
// ============================================================
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

const events = [
  // COMPLETED events (past)
  {
    _id: 'evt_001', name: 'MongoDB.local NYC 2026', location: 'New York, NY', isVirtual: false,
    startDate: daysAgo(75), endDate: daysAgo(74), status: 'COMPLETED' as const,
    eventType: 'DEV_DAY_REGIONAL' as const, language: 'English', dasNeeded: 4,
    account: { name: 'MongoDB Inc.', segment: 'ALL' as const, region: 'AMER' as const },
    travelStatus: 'NOT_NEEDED' as const, insightCount: 0, quarter: 'Q4 FY26',
    coordinates: { lat: 40.7128, lng: -74.006 },
  },
  {
    _id: 'evt_002', name: 'AWS re:Invent 2025', location: 'Las Vegas, NV', isVirtual: false,
    startDate: daysAgo(62), endDate: daysAgo(58), status: 'COMPLETED' as const,
    eventType: 'OTHER' as const, language: 'English', dasNeeded: 6,
    account: { name: 'Amazon Web Services', segment: 'ANCHOR' as const, region: 'AMER' as const },
    travelStatus: 'NOT_NEEDED' as const, insightCount: 0, quarter: 'Q4 FY26',
    coordinates: { lat: 36.1699, lng: -115.1398 },
  },
  {
    _id: 'evt_003', name: 'KubeCon NA', location: 'Chicago, IL', isVirtual: false,
    startDate: daysAgo(48), endDate: daysAgo(46), status: 'COMPLETED' as const,
    eventType: 'OTHER' as const, language: 'English', dasNeeded: 3,
    account: { name: 'CNCF', segment: 'ALL' as const, region: 'AMER' as const },
    travelStatus: 'NOT_NEEDED' as const, insightCount: 0, quarter: 'Q4 FY26',
    coordinates: { lat: 41.8781, lng: -87.6298 },
  },
  {
    _id: 'evt_004', name: 'MongoDB.local London', location: 'London, UK', isVirtual: false,
    startDate: daysAgo(35), endDate: daysAgo(34), status: 'COMPLETED' as const,
    eventType: 'DEV_DAY_REGIONAL' as const, language: 'English', dasNeeded: 3,
    account: { name: 'MongoDB Inc.', segment: 'ALL' as const, region: 'EMEA' as const },
    travelStatus: 'NOT_NEEDED' as const, insightCount: 0, quarter: 'Q1 FY27',
    coordinates: { lat: 51.5074, lng: -0.1278 },
  },
  {
    _id: 'evt_005', name: 'PyCon US', location: 'Pittsburgh, PA', isVirtual: false,
    startDate: daysAgo(21), endDate: daysAgo(18), status: 'COMPLETED' as const,
    eventType: 'OTHER' as const, language: 'English', dasNeeded: 2,
    account: { name: 'Python Software Foundation', segment: 'ALL' as const, region: 'AMER' as const },
    travelStatus: 'NOT_NEEDED' as const, insightCount: 0, quarter: 'Q1 FY27',
    coordinates: { lat: 40.4406, lng: -79.9959 },
  },
  {
    _id: 'evt_006', name: 'Developer Week SF', location: 'San Francisco, CA', isVirtual: false,
    startDate: daysAgo(10), endDate: daysAgo(8), status: 'COMPLETED' as const,
    eventType: 'OTHER' as const, language: 'English', dasNeeded: 4,
    account: { name: 'DeveloperWeek', segment: 'ALL' as const, region: 'AMER' as const },
    travelStatus: 'NOT_NEEDED' as const, insightCount: 0, quarter: 'Q1 FY27',
    coordinates: { lat: 37.7749, lng: -122.4194 },
  },
  // RECENT — just happened (lots of fresh insights)
  {
    _id: 'evt_007', name: 'MongoDB for AI Builders Workshop', location: 'Austin, TX', isVirtual: false,
    startDate: daysAgo(3), endDate: daysAgo(2), status: 'COMPLETED' as const,
    eventType: 'BUILD_LEARN' as const, language: 'English', dasNeeded: 2,
    account: { name: 'MongoDB Inc.', segment: 'ALL' as const, region: 'AMER' as const },
    travelStatus: 'NOT_NEEDED' as const, insightCount: 0, quarter: 'Q1 FY27',
    coordinates: { lat: 30.2672, lng: -97.7431 },
  },
  // UPCOMING — gives the app a forward-looking feel
  {
    _id: 'evt_008', name: 'NodeConf EU', location: 'Dublin, Ireland', isVirtual: false,
    startDate: daysFromNow(5), endDate: daysFromNow(7), status: 'ASSIGNED' as const,
    eventType: 'OTHER' as const, language: 'English', dasNeeded: 2,
    account: { name: 'NodeConf', segment: 'ALL' as const, region: 'EMEA' as const },
    travelStatus: 'READY_TO_BOOK' as const, insightCount: 0, quarter: 'Q1 FY27',
    coordinates: { lat: 53.3498, lng: -6.2603 },
  },
  {
    _id: 'evt_009', name: 'MongoDB World 2026', location: 'New York, NY', isVirtual: false,
    startDate: daysFromNow(21), endDate: daysFromNow(23), status: 'CONFIRMING' as const,
    eventType: 'DEV_DAY_REGIONAL' as const, language: 'English', dasNeeded: 10,
    account: { name: 'MongoDB Inc.', segment: 'ALL' as const, region: 'AMER' as const },
    travelStatus: 'DONT_BOOK_YET' as const, insightCount: 0, quarter: 'Q1 FY27',
    coordinates: { lat: 40.7128, lng: -74.006 },
  },
  {
    _id: 'evt_010', name: 'MongoDB.local Singapore', location: 'Singapore', isVirtual: false,
    startDate: daysFromNow(35), endDate: daysFromNow(36), status: 'NEW' as const,
    eventType: 'DEV_DAY_REGIONAL' as const, language: 'English', dasNeeded: 3,
    account: { name: 'MongoDB Inc.', segment: 'ALL' as const, region: 'APAC' as const },
    travelStatus: 'DONT_BOOK_YET' as const, insightCount: 0, quarter: 'Q1 FY27',
    coordinates: { lat: 1.3521, lng: 103.8198 },
  },
  // VIRTUAL events
  {
    _id: 'evt_011', name: 'Atlas Vector Search Deep Dive', location: 'Virtual', isVirtual: true,
    startDate: daysAgo(14), endDate: daysAgo(14), status: 'COMPLETED' as const,
    eventType: 'WEBINAR' as const, language: 'English', dasNeeded: 1,
    account: { name: 'MongoDB Inc.', segment: 'ALL' as const, region: 'AMER' as const },
    travelStatus: 'VIRTUAL_CONFIRMED' as const, insightCount: 0, quarter: 'Q1 FY27',
  },
  {
    _id: 'evt_012', name: 'Beginner Office Hours', location: 'Virtual', isVirtual: true,
    startDate: daysFromNow(3), endDate: daysFromNow(3), status: 'ASSIGNED' as const,
    eventType: 'OFFICE_HOURS' as const, language: 'English', dasNeeded: 1,
    account: { name: 'MongoDB Inc.', segment: 'ALL' as const, region: 'AMER' as const },
    travelStatus: 'VIRTUAL_CONFIRMED' as const, insightCount: 0, quarter: 'Q1 FY27',
  },
];

// ============================================================
// INSIGHT TEMPLATES — Realistic, varied, demo-worthy
// Now includes both typed (brief) and voice-transcribed (conversational) variants
// ============================================================

// Voice-style insights: longer, conversational, include filler words and context
const voiceInsightTemplates: Record<string, string[]> = {
  'Pain Point': [
    `So I was talking to this developer from a fintech startup, and she was really frustrated. She said "Look, we love MongoDB, but the aggregation pipeline syntax is just... it's a lot for our team. Most of our devs came from SQL backgrounds, and they keep asking why there isn't some kind of visual builder or drag-and-drop interface. We've actually had to create internal training just for aggregations because the learning curve is so steep."`,
    
    `Had a really interesting conversation with a platform engineer from a healthcare company. He pulled me aside and was like "Hey, can I be honest with you? The cost visibility in Atlas is killing us internally. Our finance team is constantly asking why the bill varies so much month to month, and I can't give them a straight answer. We need better forecasting tools or at least some way to predict what we're going to spend. Right now it feels like a black box."`,
    
    `This developer from a Series B startup stopped by the booth and he was visibly frustrated. He said they spent three weeks — three weeks! — trying to set up VPC peering for their compliance requirements. The documentation was scattered across like five different pages, and some of it was outdated. He said "I'm a senior engineer and even I struggled. I can't imagine what a junior dev would go through."`,
    
    `Okay so this one was interesting. A DevOps lead from a retail company said their biggest pain point is index builds blocking writes. She said "We're trying to do zero-downtime deployments, but every time we need to add an index on a large collection, we basically have to schedule maintenance windows. In 2026, that feels unacceptable. Our competitors don't have this problem."`,
    
    `Had a long chat with a tech lead from a gaming company. He was really candid about the challenges his team faces. He said understanding read preferences and write concerns is way too confusing — there are just too many options and the defaults don't always make sense. His exact words were "It feels like I need a PhD in distributed systems just to configure my database correctly."`,
    
    `So there was this architect from a Fortune 500 company who migrated from self-hosted MongoDB to Atlas last year. She said the migration process had way too many manual steps. She told me "The documentation made it seem straightforward, but in practice we hit gap after gap. Things that should have been automated weren't. We ended up hiring a consultant just to get through it."`,
    
    `This machine learning engineer came up to me really excited to talk about Atlas Vector Search, but then his tone shifted. He said their queries are running about 10x slower than expected on collections over 50 million documents. He's been digging through docs trying to find tuning guidance but there's just not much there. He said "The feature is great in theory but we can't actually use it at our scale without more help."`,
  ],
  
  'Feature Request': [
    `Had a great conversation with a platform team lead from a cloud-native startup. She was super enthusiastic about Atlas but had one major ask: she really wants a native Terraform provider that covers ALL Atlas resources, not just the basic cluster stuff. She said "Right now we're mixing Terraform with the Atlas Admin API and it's a mess. Everything else in our infrastructure is Terraform-managed except MongoDB, and it's becoming a real friction point."`,
    
    `So this CTO of a seed-stage startup pulled me into a really interesting discussion about costs. He said "Look, we have like eight dev and staging clusters that just sit idle at night and on weekends. If we could pause them on a schedule, we'd cut our Atlas bill by 70%. That savings would actually let us use Atlas for production instead of going self-hosted." He was basically saying this feature could be the difference between MongoDB and the competition for early-stage companies.`,
    
    `This senior engineer from an e-commerce company had a really compelling feature request. She said they're currently running a separate GraphQL gateway just to sit in front of MongoDB, and it's a maintenance burden. Her ask was: "Why can't Atlas just give us native GraphQL support? You already have the schema, you have the data, and now with the Data API you're almost there. Just... complete the picture."`,
    
    `Talked to an IoT platform architect who's dealing with massive data volumes — like 500 gigabytes per month of time-series data from industrial sensors. His big ask was automatic time-series rollups. He said "Right now we're writing custom jobs to downsample old data, and it's error-prone and expensive to maintain. Other time-series databases do this automatically. MongoDB should too."`,
    
    `Had a developer show me their workflow on their laptop. She uses Compass for building aggregation pipelines, which she loves, but her complaint is that it's desktop-only. She said "I want to do this in the Atlas UI directly. When I'm troubleshooting in production, I don't have time to install Compass or VPN into my machine. Just give me a visual aggregation builder in the browser."`,
    
    `This was a really insightful one — a developer from a mid-size SaaS company talked about schema management. He said their biggest gap is the lack of schema versioning and migration tooling in Atlas. He said "Every other database we've used has this. We're currently using a homegrown solution with a migrations folder in our repo, but it feels hacky. This should be a first-class feature."`,
    
    `So there's a staff engineer who manages all their alerting infrastructure. Her request was pretty specific: she wants Atlas alerts to have better webhook support that integrates directly with PagerDuty and OpsGenie without needing to run middleware. She said "It's 2026, these integrations should just work out of the box. I shouldn't need a Lambda function to forward an alert."`,
  ],
  
  'Praise': [
    `Oh man, this one made my day. A machine learning engineer came up to me absolutely beaming. She said her team had Atlas Vector Search working with a RAG application in under an hour. Under an hour! She said "I've set up vector databases before — Pinecone, Weaviate, you name it — and this was by far the easiest. The fact that it's just MongoDB means we didn't have to learn a new query language or manage another service. It's all just... there."`,
    
    `Had a really positive conversation with a developer who'd been using MongoDB for about three years. He said the recent Atlas UI redesign is, in his words, "finally what it should have been from the start." He was specifically excited about the navigation improvements and said finding things is so much more intuitive now. He even pulled out his phone to show me a screenshot of the old UI and compared it to the new one.`,
    
    `This was a great one — a backend engineer from a data analytics company told me they benchmarked their most complex aggregation pipelines against their old PostgreSQL setup. MongoDB was 10x faster. Ten times! He said "We were skeptical at first because the SQL was so optimized, but the document model plus the aggregation framework just blew it away. We're full believers now."`,
    
    `Talked to a team lead who just got three of her engineers certified through MongoDB University. She was genuinely impressed with the quality of the content. She said "I've made my team go through a lot of vendor certifications and most of them are just checkbox exercises. This actually taught them things. They came back and immediately improved our data model."`,
    
    `Here's one that really stood out: a senior SRE told me their team had a P1 incident at 2 AM, and Atlas support resolved it in 47 minutes. He said "I've been in this industry for 15 years and that's the best vendor support experience I've ever had. Period. The engineer actually understood our setup and didn't just read from a script."`,
    
    `So this developer was showing off an app they built using Change Streams. She said it completely transformed how they handle real-time notifications. Her exact words were "Change Streams are a game changer. We used to poll the database every few seconds and it was terrible for performance. Now we just react to changes instantly. I don't know why everyone isn't using this."`,
  ],
  
  'Competition': [
    `Interesting competitive intel here — this architect said his team evaluated DynamoDB pretty seriously before going with MongoDB. What won them over was the flexible schema and, his words, "the developer experience isn't even close." He said with DynamoDB they felt like they were fighting the database, but MongoDB just worked the way they expected.`,
    
    `So I talked to a company that actually migrated from Couchbase to Atlas last quarter. The decision came down to tooling and managed service quality. The tech lead said "Couchbase is fine for what it is, but Atlas is just a more polished product. The UI, the support, the ecosystem — everything feels more mature. We haven't looked back."`,
    
    `Had a developer mention Fauna as a potential alternative they'd been evaluating. But then he said his team has real concerns about vendor lock-in with Fauna because the query language is so proprietary. He said "With MongoDB, at least I know the skills transfer. If we ever need to leave, we can. With Fauna, we'd be starting from scratch."`,
    
    `Really interesting data point: a team benchmarked PostgreSQL with JSONB against MongoDB for their document-heavy workload. The aggregation performance difference was staggering — MongoDB was 8x faster. The developer said "We wanted to stay in the Postgres ecosystem but the numbers don't lie. For this use case, MongoDB is just better."`,
    
    `This one comes up a lot — a company is using Redis alongside MongoDB for caching. The developer asked if Atlas has an in-memory tier or something similar. He said "We'd love to consolidate. Managing two databases is overhead we don't need. If MongoDB could handle our caching layer too, we'd drop Redis tomorrow."`,
  ],
  
  'Use Case': [
    `Spoke with a retail technology director about their implementation. They're building real-time inventory management for 50,000 SKUs across 200 physical store locations. She explained how they need sub-second updates when someone buys something in-store so the website inventory stays accurate. She said MongoDB's change streams and the flexible document model made it possible in a way that would have been really complex with a relational database.`,
    
    `This was fascinating — an IoT platform architect described their pipeline from 10,000 industrial sensors. They're collecting temperature, pressure, vibration data every second, so the volume is massive. What's interesting is they need both time-series analysis for trending AND vector search for anomaly detection. He said "We looked at purpose-built time-series databases but none of them had vector search. MongoDB lets us do both in one place."`,
    
    `Had a deep conversation with a SaaS founder building a multi-tenant platform. They currently serve 2,000 customers and need really strong per-tenant data isolation. She walked me through their schema design and how they're using database-level isolation for enterprise customers and collection-level for smaller ones. She said the flexibility of MongoDB's multi-tenancy patterns was a major selling point over PostgreSQL schemas.`,
    
    `Talked to a backend lead at a major news publisher — like one of the big ones you'd recognize. They have 50 million documents in their content management system and need sub-100ms query times for their editorial staff. She said they evaluated Elasticsearch for the search component but ended up going all-in on Atlas Search. Her quote was "Why run two systems when one does both?"`,
    
    `This one was really cool — a fintech engineer building the transaction ledger for a neobank. The requirements are intense: strong consistency guarantees, complete audit trails, and the ability to handle thousands of transactions per second. He said they specifically chose MongoDB for ACID transactions across documents and the flexibility to model complex financial products without schema changes.`,
  ],
  
  'Question': [
    `A solutions architect asked me a really detailed question about Atlas failover. He said "We're looking at a multi-region setup and I need to understand exactly how automatic failover works. What's the actual RPO and RTO we can expect? Our compliance team is asking and I need real numbers, not marketing numbers."`,
    
    `Developer pulled me aside with a data modeling question. She's building a social platform and needs to model many-to-many relationships — users following users, users in groups, that kind of thing. She asked "What's the recommended approach here? Do I embed, do I reference, do I do both? The docs show examples but they're too simple for my use case."`,
    
    `This ML engineer had a scale question about Atlas Vector Search. He said "Look, we currently have about 20 million embeddings but we're projecting to hit 100 million by end of year. Can Atlas Vector Search actually handle that? What are the index size limits? I can't find straight answers in the documentation."`,
    
    `Had a DBA ask a really technical question about $lookup performance. She's doing joins across sharded collections and the performance is terrible. She said "I know this isn't the ideal pattern but we inherited this data model. How do I optimize a $lookup when both collections are sharded? Are there indexes I should be adding?"`,
  ],
  
  'Documentation': [
    `This one was frustrating to hear — a Java developer told me the Spring Data MongoDB documentation still shows deprecated methods as the primary examples. He said "I copy-pasted code from your docs and got deprecation warnings everywhere. Then when I deployed to production, some of it actually broke because the deprecated methods were removed in the latest driver version. That's really not okay."`,
    
    `A developer made a really good point about the aggregation documentation. She said "All your examples use the restaurants dataset or these trivial examples. What I need are real-world patterns — how do I do rolling averages, how do I handle hierarchical data, how do I do efficient pagination with facets. Intermediate to advanced examples, not just the basics."`,
    
    `The Kubernetes Operator came up with a DevOps engineer. He said the docs are missing common troubleshooting scenarios for EKS specifically. He said "I hit three different issues during setup and none of them were in the docs. I had to piece together solutions from GitHub issues and Stack Overflow. The troubleshooting section needs way more content."`,
    
    `This architect had a documentation feature request that I thought was brilliant. She said "What I really want are Architecture Decision Records — ADRs — for schema design patterns. Tell me WHY to use embedding versus referencing, not just HOW. Document the tradeoffs, the decision criteria, the cases where you'd choose one over the other. That's what senior engineers actually need."`,
  ],
};

// Shorter typed/form-submitted insights (original style but slightly enhanced)
const typedInsightTemplates: Record<string, string[]> = {
  'Pain Point': [
    'Aggregation pipeline syntax is a steep learning curve for our SQL developers — they keep asking for a visual builder. We\'ve had to create internal training sessions just for this.',
    'Cost visibility in Atlas is confusing — we can\'t predict our monthly bill and finance keeps pushing back on renewals without better forecasting.',
    'Setting up VPC peering for our compliance needs took three weeks — documentation was scattered across multiple pages and some was outdated.',
    'Index builds blocking writes is killing our zero-downtime deployment strategy. Had to schedule 2AM maintenance windows twice this quarter.',
    'Understanding read preferences and write concerns is confusing for the team — too many knobs, unclear defaults, had 2 incidents from misconfiguration.',
    'Migrating from self-hosted MongoDB to Atlas had too many manual steps. Ended up hiring a consultant to fill documentation gaps.',
    'Atlas Search queries are 10x slower than expected on collections over 50M docs — tuning guidance in docs is minimal.',
    'Connection string management across 6 environments is a pain — need better secrets integration with Vault/AWS Secrets Manager.',
    'Atlas backup restore to a different cluster is not intuitive — our DBA spent days on it, almost missed compliance deadline.',
  ],
  
  'Feature Request': [
    'Need native Terraform provider for Atlas that covers ALL resources, not just clusters. Currently mixing Terraform with Admin API calls.',
    'Requesting ability to pause Atlas clusters on a schedule to reduce dev environment costs — would save us ~70% on non-prod.',
    'Want server-side GraphQL support directly in Atlas — currently running a separate gateway which is maintenance overhead.',
    'Need automatic time-series rollups — our IoT data grows 500GB/month and manual downsampling is expensive to maintain.',
    'Requesting visual aggregation pipeline builder in Atlas UI — Compass is great but desktop-only, need browser access for prod debugging.',
    'Need schema versioning and migration tooling natively in Atlas. Running homegrown solution with migrations folder, feels hacky.',
    'Want Atlas alerts to integrate directly with PagerDuty/OpsGenie without custom Lambda middleware.',
    'Requesting local Atlas Search emulator for development — can\'t test Search locally today, slows down dev cycle significantly.',
    'Need multi-region active-active writes for our global fintech platform — current architecture requires complex conflict resolution.',
    'Want per-collection encryption with customer-managed keys for healthcare compliance. Field-level encryption is close but not quite there.',
  ],
  
  'Praise': [
    'Atlas Vector Search was incredibly easy to set up — we had RAG working in under an hour. Fastest vector DB setup I\'ve experienced.',
    'The Atlas UI redesign is fantastic — navigation is so much more intuitive now. Finally feels like a modern cloud console.',
    'Aggregation pipeline performance blew us away — benchmarked at 10x faster than our PostgreSQL equivalent for complex analytics.',
    'MongoDB University is excellent — just got three team members certified this quarter and they immediately improved our data model.',
    'Atlas support resolved our P1 in 47 minutes at 2AM — best vendor support experience we\'ve had in 15 years.',
    'Change Streams are a game changer — rebuilt our entire notification system with them, eliminated polling overhead entirely.',
    'Atlas Device Sync made our mobile offline-first architecture trivial to implement. Would have taken months otherwise.',
    'Atlas Charts saved us from building a custom analytics dashboard — shipped embedded analytics 3 months early.',
    'Migration from DynamoDB to Atlas cut our query latency by 60% and reduced monthly cost by 40%. No regrets.',
  ],
  
  'Competition': [
    'Team evaluated DynamoDB but chose MongoDB for flexible schema and developer experience — "not even close" per our engineers.',
    'Customer migrated from Couchbase to Atlas — cited better tooling and managed service quality as deciding factors.',
    'Fauna mentioned as alternative but developer expressed concerns about vendor lock-in due to proprietary query language.',
    'PostgreSQL with JSONB was benchmarked — MongoDB aggregation was 8x faster for our document-heavy workload.',
    'Redis used alongside MongoDB for caching — team asked if Atlas has in-memory tier to consolidate to one database.',
    'Compared Atlas Search vs Elasticsearch — loved the unified platform approach, one less service to manage.',
    'CockroachDB considered for global distribution but MongoDB\'s document model was a better fit for our product catalog.',
  ],
  
  'Use Case': [
    'Building real-time inventory management for 50K SKUs across 200 retail locations — need sub-second sync between stores and website.',
    'IoT sensor data pipeline from 10K industrial devices — requires time-series analysis AND vector search for anomaly detection.',
    'Multi-tenant SaaS platform serving 2,000 customers — using database-level isolation for enterprise, collection-level for SMB.',
    'Content management system for major news publisher — 50M documents, sub-100ms queries required for editorial workflows.',
    'Financial transaction ledger for neobank — need strong consistency, complete audit trail, thousands of TPS.',
    'Multiplayer gaming platform with player profiles, matchmaking, and real-time leaderboards — low-latency requirements.',
    'Healthcare records system with HIPAA compliance — using field-level encryption for PHI, need per-collection customer keys.',
  ],
  
  'Question': [
    'How does Atlas handle automatic failover in multi-region setup? Need actual RPO/RTO numbers for compliance documentation.',
    'What\'s the recommended approach for many-to-many relationships? Building social platform with users-following-users pattern.',
    'Can Atlas Vector Search handle 100M embeddings? Projecting to hit that by EOY, need to understand index size limits.',
    'How to optimize $lookup across sharded collections? Inherited data model, performance is poor, need indexing guidance.',
    'Best approach for migrating 5TB PostgreSQL database to Atlas? Need to minimize downtime, currently scoping the project.',
    'Does MongoDB support transactions across sharded collections? Architecture review next week, need to confirm this.',
  ],
  
  'Documentation': [
    'Spring Data MongoDB docs still show deprecated methods — copied code from docs and got deprecation warnings everywhere.',
    'Need more real-world aggregation examples — restaurants dataset is trivial. Show rolling averages, hierarchical data, efficient pagination.',
    'Atlas Kubernetes Operator docs missing EKS troubleshooting — hit 3 issues during setup, had to piece solutions from GitHub issues.',
    'Architecture decision records (ADRs) for schema design patterns would be incredibly valuable. Tell us WHY not just HOW.',
    'Migration guide from MySQL needs detailed schema mapping examples with benchmarks. Current guide is too high-level.',
  ],
};

const productAreas = [
  'Atlas', 'Atlas Search', 'Atlas Vector Search', 'Atlas Stream Processing',
  'Atlas Data Federation', 'Atlas Device Sync', 'Charts', 'Compass',
  'Driver', 'Server', 'Aggregation', 'Atlas Triggers', 'Atlas Functions',
  'Data API', 'App Services', 'Other',
];

const tags = [
  'enterprise', 'startup', 'migration', 'performance', 'security',
  'ai-ml', 'mobile', 'iot', 'fintech', 'healthcare', 'gaming',
  'developer-experience', 'pricing', 'compliance', 'scale',
];

// ============================================================
// HELPERS
// ============================================================
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Generate a date within a range (daysAgo)
function randomDateInRange(fromDaysAgo: number, toDaysAgo: number): Date {
  const now = Date.now();
  const from = now - fromDaysAgo * 86400000;
  const to = now - toDaysAgo * 86400000;
  return new Date(from + Math.random() * (to - from));
}

// Weighted random selection
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Sentiment mapping by type
const sentimentConfig: Record<string, { bias: string, weights: number[] }> = {
  'Pain Point': { bias: 'Negative', weights: [5, 25, 70] },    // Pos, Neutral, Neg
  'Feature Request': { bias: 'Neutral', weights: [20, 60, 20] },
  'Praise': { bias: 'Positive', weights: [85, 10, 5] },
  'Competition': { bias: 'Neutral', weights: [25, 55, 20] },
  'Use Case': { bias: 'Positive', weights: [60, 35, 5] },
  'Question': { bias: 'Neutral', weights: [15, 70, 15] },
  'Documentation': { bias: 'Negative', weights: [10, 30, 60] },
};

// Priority mapping by type
const priorityConfig: Record<string, string[]> = {
  'Pain Point': ['High', 'High', 'Medium', 'Critical', 'High'],
  'Feature Request': ['High', 'Medium', 'Medium', 'High', 'Low'],
  'Praise': ['Low', 'Medium', 'Low', 'Low', 'Medium'],
  'Competition': ['Medium', 'High', 'Medium', 'Low', 'Medium'],
  'Use Case': ['Medium', 'Low', 'Medium', 'High', 'Medium'],
  'Question': ['Low', 'Medium', 'Low', 'Medium', 'Low'],
  'Documentation': ['Medium', 'High', 'Medium', 'Low', 'Medium'],
};

// ============================================================
// INSIGHT GENERATOR — Optimized for demo impact
// ============================================================
function generateInsight(
  advocate: typeof advocates[0],
  event: typeof events[0],
  capturedAt: Date,
) {
  const types = Object.keys(voiceInsightTemplates);
  const type = weightedPick(
    types,
    // Weight toward high-impact types for demo
    [18, 22, 18, 10, 15, 8, 9], // Pain, Feature, Praise, Competition, UseCase, Question, Docs
  );

  // 60% voice, 40% typed — shows the app supports both capture methods
  const isVoice = Math.random() < 0.6;
  const templateSource = isVoice ? voiceInsightTemplates : typedInsightTemplates;
  const availableTexts = templateSource[type] || [];
  const text = availableTexts.length > 0 ? pick(availableTexts) : `Sample ${type} insight`;

  // Sentiment based on type
  const sentCfg = sentimentConfig[type] || { weights: [33, 34, 33] };
  const sentiment = weightedPick(['Positive', 'Neutral', 'Negative'], sentCfg.weights);

  // Priority based on type
  const priorityOptions = priorityConfig[type] || ['Medium', 'Medium', 'Low'];
  const priority = pick(priorityOptions);

  // Voice insights may include audio metadata
  const voiceMetadata = isVoice ? {
    captureMethod: 'voice' as const,
    transcriptionConfidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
    audioDurationSeconds: Math.floor(15 + Math.random() * 90), // 15-105 seconds
  } : {
    captureMethod: 'typed' as const,
  };

  return {
    _id: new ObjectId().toString(),
    text,
    type,
    sentiment,
    priority,
    productAreas: pickN(productAreas, 1, 3),
    tags: pickN(tags, 1, 3),
    eventId: event._id,
    eventName: event.name,
    sessionId: null,
    sessionTitle: null,
    eventContext: {
      region: event.account?.region || 'AMER',
      accountSegment: event.account?.segment || 'ALL',
      engagementType: event.eventType,
    },
    developerProfile: {
      role: pick(['Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'Data Engineer', 'Tech Lead', 'Solutions Architect', 'ML Engineer', 'Platform Engineer', 'Staff Engineer', 'VP Engineering']),
      experience: pick(['Mid-Level', 'Senior', 'Senior', 'Staff+', 'Staff+']), // Weighted toward senior
      companySize: pick(['Startup (1-50)', 'SMB (51-500)', 'Mid-Market (501-2000)', 'Enterprise (2000+)', 'Enterprise (2000+)']),
      industry: pick(['Fintech', 'Healthcare', 'E-commerce', 'Gaming', 'SaaS', 'Media', 'IoT', 'Logistics', 'Education', 'Government']),
    },
    ...voiceMetadata,
    attachments: [],
    advocateId: advocate.id,
    advocateName: advocate.name,
    upvotes: [],
    annotations: [],
    capturedAt: capturedAt.toISOString(),
    createdAt: capturedAt.toISOString(),
    updatedAt: capturedAt.toISOString(),
    synced: true,
  };
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================
async function seed() {
  console.log('\n🎬 DevRel Insights — Demo Data Seed Script');
  console.log('━'.repeat(50));

  if (isDryRun) console.log('🔍 DRY RUN — no data will be written\n');
  if (isReset) console.log('⚠️  RESET MODE — all collections will be cleared\n');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas\n');
    const db = client.db(dbName);

    // ----------------------------------------------------------
    // RESET if requested
    // ----------------------------------------------------------
    if (isReset && !isDryRun) {
      console.log('🗑️  Clearing all collections...');
      for (const col of ['insights', 'events', 'advocates', 'sessions', 'reactions', 'bugs']) {
        const result = await db.collection(col).deleteMany({});
        console.log(`   ${col}: deleted ${result.deletedCount} documents`);
      }
      console.log('');
    }

    // ----------------------------------------------------------
    // SEED ADVOCATES
    // ----------------------------------------------------------
    console.log('👥 Seeding advocates...');
    const advCol = db.collection('advocates');
    let advCount = 0;
    for (const a of advocates) {
      const doc = {
        _id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        region: a.region,
        isAdmin: a.isAdmin,
        insightCount: 0,
        eventCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!isDryRun) {
        await advCol.updateOne({ _id: a.id }, { $set: doc }, { upsert: true });
      }
      advCount++;
    }
    console.log(`   ✓ ${advCount} advocates upserted\n`);

    // ----------------------------------------------------------
    // SEED EVENTS
    // ----------------------------------------------------------
    console.log('📅 Seeding events...');
    const evtCol = db.collection('events');
    let evtCount = 0;
    for (const e of events) {
      const { coordinates, ...eventDoc } = e;
      const doc = {
        ...eventDoc,
        isRegional: e.eventType.includes('REGIONAL') || e.eventType.includes('DEV_DAY'),
        assignments: generateAssignments(e),
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(coordinates ? { coordinates } : {}),
      };
      if (!isDryRun) {
        await evtCol.updateOne({ _id: e._id }, { $set: doc }, { upsert: true });
      }
      evtCount++;
    }
    console.log(`   ✓ ${evtCount} events upserted\n`);

    // ----------------------------------------------------------
    // SEED INSIGHTS — The heart of the demo
    // ----------------------------------------------------------
    console.log('💡 Generating insights...');
    const insCol = db.collection('insights');

    if (isReset || (await insCol.countDocuments()) === 0) {
      const allInsights: ReturnType<typeof generateInsight>[] = [];

      // Completed events with date-appropriate insights
      // More recent events = more insights (shows growth trend)
      const completedEvents = events.filter(e => e.status === 'COMPLETED');

      const insightDistribution: Record<string, number> = {
        'evt_001': 18,  // 75 days ago — steady baseline
        'evt_002': 28,  // 62 days ago — big conference
        'evt_003': 15,  // 48 days ago
        'evt_004': 22,  // 35 days ago — growth!
        'evt_005': 25,  // 21 days ago — momentum
        'evt_006': 35,  // 10 days ago — big surge!
        'evt_007': 42,  // 3 days ago — MOST RECENT, highest count!
        'evt_011': 12,  // 14 days ago — virtual event
      };

      // Advocate activity weights (who captures the most)
      const advocateWeights = [
        { adv: advocates[0], weight: 15 },  // Mike Lynn — lead by example
        { adv: advocates[1], weight: 22 },  // Sarah — top performer
        { adv: advocates[2], weight: 18 },  // Marcus
        { adv: advocates[3], weight: 12 },  // Priya
        { adv: advocates[4], weight: 10 },  // Alex
        { adv: advocates[5], weight: 14 },  // Wen Jie
        { adv: advocates[6], weight: 16 },  // Nestor
        { adv: advocates[7], weight: 8 },   // Tim
        { adv: advocates[8], weight: 11 },  // Erik
        { adv: advocates[9], weight: 20 },  // Justin
        { adv: advocates[10], weight: 6 },  // Jordan
      ];
      const advWeightTotal = advocateWeights.reduce((s, a) => s + a.weight, 0);

      for (const evt of completedEvents) {
        const targetCount = insightDistribution[evt._id] || 10;
        const evtStart = new Date(evt.startDate);
        const evtEnd = new Date(evt.endDate);

        for (let i = 0; i < targetCount; i++) {
          // Pick advocate weighted by activity
          const advEntry = weightedPick(
            advocateWeights.map(a => a.adv),
            advocateWeights.map(a => a.weight),
          );

          // Insights captured during or shortly after the event
          const capturedAt = new Date(
            evtStart.getTime() + Math.random() * (evtEnd.getTime() - evtStart.getTime() + 86400000)
          );

          allInsights.push(generateInsight(advEntry, evt, capturedAt));
        }
      }

      // Add a few insights from TODAY for "live demo" feel
      const todayEvent = events.find(e => e._id === 'evt_007')!;
      for (let i = 0; i < 5; i++) {
        const recentAdv = pick(advocates.slice(0, 5));
        const capturedAt = randomDateInRange(0, 0); // today
        allInsights.push(generateInsight(recentAdv, todayEvent, capturedAt));
      }

      console.log(`   Generated ${allInsights.length} insights`);

      if (!isDryRun) {
        // Insert in batches
        const batchSize = 100;
        for (let i = 0; i < allInsights.length; i += batchSize) {
          const batch = allInsights.slice(i, i + batchSize);
          await insCol.insertMany(batch as any[]);
        }
        console.log(`   ✓ Inserted ${allInsights.length} insights\n`);
      }

      // ----------------------------------------------------------
      // UPDATE EVENT INSIGHT COUNTS
      // ----------------------------------------------------------
      console.log('📊 Updating event insight counts...');
      if (!isDryRun) {
        for (const evt of events) {
          const count = await insCol.countDocuments({ eventId: evt._id });
          await evtCol.updateOne({ _id: evt._id }, { $set: { insightCount: count } });
        }
      }
      console.log('   ✓ Counts updated\n');

      // ----------------------------------------------------------
      // UPDATE ADVOCATE STATS
      // ----------------------------------------------------------
      console.log('📈 Updating advocate stats...');
      if (!isDryRun) {
        for (const adv of advocates) {
          const insightCount = await insCol.countDocuments({ advocateId: adv.id });
          const eventIds = await insCol.distinct('eventId', { advocateId: adv.id });
          await advCol.updateOne(
            { _id: adv.id },
            { $set: { insightCount, eventCount: eventIds.length, updatedAt: new Date().toISOString() } },
          );
        }
      }
      console.log('   ✓ Stats updated\n');

      // ----------------------------------------------------------
      // ADD SOME REACTIONS for social proof
      // ----------------------------------------------------------
      console.log('❤️  Adding reactions...');
      if (!isDryRun) {
        const reactionCol = db.collection('reactions');
        const topInsights = await insCol.find({ priority: { $in: ['Critical', 'High'] } }).limit(30).toArray();
        let reactionCount = 0;
        for (const insight of topInsights) {
          const reactors = pickN(advocates.filter(a => a.id !== insight.advocateId), 1, 4);
          for (const reactor of reactors) {
            await reactionCol.updateOne(
              { insightId: insight._id, advocateId: reactor.id },
              {
                $set: {
                  insightId: insight._id,
                  advocateId: reactor.id,
                  advocateName: reactor.name,
                  type: pick(['like', 'insightful', 'fire', 'celebrate']),
                  createdAt: new Date().toISOString(),
                },
              },
              { upsert: true },
            );
            reactionCount++;
          }
        }
        console.log(`   ✓ ${reactionCount} reactions added\n`);
      }

      // ----------------------------------------------------------
      // ADD ANNOTATIONS on key insights
      // ----------------------------------------------------------
      console.log('💬 Adding annotations...');
      if (!isDryRun) {
        const criticalInsights = await insCol.find({ priority: 'Critical' }).limit(8).toArray();
        for (const insight of criticalInsights) {
          const annotator = pick(advocates.filter(a => a.id !== insight.advocateId));
          const annotationTexts = [
            'I heard the same feedback at three other events this quarter — this is a trend.',
            'Product team is already aware — linking to JIRA ticket.',
            'This aligns with our Q2 roadmap priorities. Flagging for PM review.',
            'Enterprise customers keep raising this. High revenue impact.',
            'We should create a workaround guide while the fix is in progress.',
            'Discussed with engineering — ETA is next quarter.',
            'This came up in the last customer advisory board too.',
            '+1 — multiple customers at Developer Week mentioned the same thing.',
          ];
          await insCol.updateOne(
            { _id: insight._id },
            {
              $push: {
                annotations: {
                  _id: new ObjectId().toString(),
                  advocateId: annotator.id,
                  advocateName: annotator.name,
                  text: pick(annotationTexts),
                  createdAt: new Date().toISOString(),
                },
              } as any,
            },
          );
        }
        console.log(`   ✓ Annotations added to ${criticalInsights.length} critical insights\n`);
      }

    } else {
      console.log('   ℹ️  Insights already exist. Use --reset to regenerate.\n');
    }

    // ----------------------------------------------------------
    // CREATE INDEXES
    // ----------------------------------------------------------
    console.log('🔧 Ensuring indexes...');
    if (!isDryRun) {
      await advCol.createIndex({ email: 1 }, { unique: true });
      await evtCol.createIndex({ startDate: -1 });
      await insCol.createIndex({ capturedAt: -1 });
      await insCol.createIndex({ eventId: 1 });
      await insCol.createIndex({ advocateId: 1 });
      await insCol.createIndex({ sentiment: 1, capturedAt: -1 });
      await insCol.createIndex({ type: 1 });
      await insCol.createIndex({ priority: 1 });
      await db.collection('magic_links').createIndex({ token: 1 }, { unique: true });
      await db.collection('magic_links').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }
    console.log('   ✓ Indexes created\n');

    // ----------------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------------
    console.log('━'.repeat(50));
    console.log('📋 DEMO DATA SUMMARY');
    console.log('━'.repeat(50));

    if (!isDryRun) {
      const stats = {
        advocates: await advCol.countDocuments(),
        events: await evtCol.countDocuments(),
        insights: await insCol.countDocuments(),
        reactions: await db.collection('reactions').countDocuments(),
      };

      const sentimentDist = await insCol.aggregate([
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();

      const typeDist = await insCol.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();

      const recentCount = await insCol.countDocuments({
        capturedAt: { $gte: new Date(Date.now() - 7 * 86400000).toISOString() },
      });

      console.log(`   Advocates:  ${stats.advocates}`);
      console.log(`   Events:     ${stats.events} (${events.filter(e => e.status === 'COMPLETED').length} completed, ${events.filter(e => ['ASSIGNED', 'CONFIRMING', 'NEW'].includes(e.status)).length} upcoming)`);
      console.log(`   Insights:   ${stats.insights} total (${recentCount} this week)`);
      console.log(`   Reactions:  ${stats.reactions}`);
      console.log('');
      console.log('   Sentiment Distribution:');
      for (const s of sentimentDist) {
        const pct = ((s.count / stats.insights) * 100).toFixed(0);
        console.log(`      ${s._id}: ${s.count} (${pct}%)`);
      }
      console.log('');
      console.log('   Insight Types:');
      for (const t of typeDist) {
        console.log(`      ${t._id}: ${t.count}`);
      }
    }

    console.log('\n✅ Demo data ready! Go crush that presentation. 🚀\n');

  } finally {
    await client.close();
  }
}

// ============================================================
// ASSIGNMENT GENERATOR
// ============================================================
function generateAssignments(event: typeof events[0]) {
  const count = Math.min(event.dasNeeded, advocates.length);
  const selected = pickN(advocates, 1, count);
  return selected.map(a => ({
    advocateId: a.id,
    advocateName: a.name,
    assignmentType: event.isVirtual ? 'REMOTE' : (Math.random() > 0.3 ? 'ON_SITE' : 'REMOTE'),
  }));
}

seed().catch(console.error);
