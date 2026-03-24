/**
 * Builder Insights Admin - Type Definitions
 * 
 * Normalized schema for PMO data and insights.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type EventStatus = 
  | 'COMPLETED'
  | 'ASSIGNED'
  | 'CONFIRMING'
  | 'CANCELLED'
  | 'NEEDS_STAFFING'
  | 'NEW'
  | 'SA_LED'
  | 'FYI';

export type EventType =
  | 'DEV_DAY_1_1'
  | 'DEV_DAY_REGIONAL'
  | 'WEBINAR'
  | 'BUILD_LEARN'
  | 'OFFICE_HOURS'
  | 'HACKATHON'
  | 'ARCHITECT_DAY'
  | 'VIRTUAL_PRIMER'
  | 'OTHER';

export type Region = 'AMER' | 'EMEA' | 'APAC' | 'LATAM';

export type AccountSegment =
  | 'POD'
  | 'ANCHOR'
  | 'ASPIRE_POD'
  | 'KEY_GROWTH'
  | 'ALL';

export type TravelStatus =
  | 'READY_TO_BOOK'
  | 'VIRTUAL_CONFIRMED'
  | 'DONT_BOOK_YET'
  | 'NOT_NEEDED'
  | 'CANCELLED';

export type AssignmentType = 'ON_SITE' | 'REMOTE' | 'VOLUNTEER_TRAVEL';

// ============================================================================
// EVENT
// ============================================================================

export interface Assignment {
  advocateId?: string;
  advocateName: string;
  assignmentType: AssignmentType;
}

export interface Champion {
  name?: string;
  title?: string;
  motivation?: string;
}

export interface Account {
  name: string;
  segment?: AccountSegment;
  region?: Region;
}

export interface Event {
  _id: string;
  
  // Core
  name: string;
  quarter: string;
  status: EventStatus;
  
  // Dates
  startDate?: string;
  endDate?: string;
  
  // Location
  location: string;
  isVirtual: boolean;
  timezone?: string;
  
  // Type
  eventType: EventType;
  
  // Account
  account?: Account;
  isRegional: boolean;
  
  // Contacts
  marketer?: string;
  champion?: Champion;
  
  // Planning
  calendarEventId?: string;
  eventPageUrl?: string;
  agendaDetails?: string;
  wrikeTicket?: string;
  sfdcLink?: string;
  projectTrackerUrl?: string;
  
  // Badges
  badgeJiraTickets?: string[];
  badgeLinks?: string[];
  
  // Logistics
  language: string;
  slackChannel?: string;
  customerTechStack?: string[];
  travelStatus: TravelStatus;
  dasNeeded: number;
  
  // Assignments
  assignments: Assignment[];
  
  // Notes
  notes?: string;
  
  // Insights (from mobile app)
  insightCount: number;
  
  // Meta
  createdAt: string;
  updatedAt: string;
  importedFrom?: string;
}

// ============================================================================
// INSIGHT (from mobile app)
// ============================================================================

export type InsightType = 
  | 'Pain Point'
  | 'Feature Request'
  | 'Praise'
  | 'Question'
  | 'Use Case'
  | 'Competition'
  | 'Documentation'
  | 'Other';

export type ProductArea =
  | 'Atlas'
  | 'Atlas Search'
  | 'Atlas Vector Search'
  | 'Atlas Stream Processing'
  | 'Atlas Data Federation'
  | 'Atlas Device Sync'
  | 'Charts'
  | 'Compass'
  | 'Driver'
  | 'Server'
  | 'Aggregation'
  | 'Atlas Triggers'
  | 'Atlas Functions'
  | 'Data API'
  | 'App Services'
  | 'Other';

export type Sentiment = 'Positive' | 'Neutral' | 'Negative';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type InsightSource = 'mobile' | 'web' | 'api' | 'feedback_form';

export interface Insight {
  _id: string;
  
  // Core
  type: InsightType;
  productAreas: ProductArea[];
  text: string;
  sentiment: Sentiment;
  priority: Priority;
  tags: string[];
  
  // Context
  eventId?: string;
  sessionId?: string;
  eventName?: string;
  sessionTitle?: string;
  
  eventContext?: {
    region?: Region;
    accountSegment?: string;
    engagementType?: EventType;
    technicalTheme?: string;
  };
  
  developerProfile?: Record<string, any>;
  
  // Attachments
  attachments: Array<{
    _id: string;
    uri: string;
    type: 'image' | 'file';
    caption?: string;
    uploadedAt: string;
    synced: boolean;
  }>;
  
  // Attribution
  advocateId: string;
  advocateName: string;
  
  // Source tracking
  source?: InsightSource;
  feedbackFormId?: string;
  respondent?: {
    name?: string;
    email?: string;
  };
  
  // Social
  upvotes: string[];
  annotations: Array<{
    _id: string;
    advocateId: string;
    advocateName: string;
    text: string;
    createdAt: string;
  }>;
  
  // Timestamps
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  
  // AI Analysis (optional, populated by /api/insights/[id]/analyze)
  aiAnalysis?: InsightAIAnalysis;

  // AI Distillation (from mobile app, generated client-side after capture)
  title?: string;
  aiDistillation?: {
    title?: string;
    summary?: string;
    bullets?: string[];
    actionItems?: string[];
    keyPhrases?: string[];
    generatedAt?: string;
    source?: 'heuristic' | 'openai';
    model?: string;
  };

  // Audio Intelligence (from voice recordings on mobile)
  audioIntelligence?: {
    durationMs?: number;
    language?: string;
    generatedAt?: string;
    source?: string;
    speakerStrategy?: string;
    speakers?: Array<{ id: string; label: string; segmentCount: number; durationMs: number }>;
    segments?: Array<{ id: string; text: string; startMs: number; endMs: number; speakerId: string; speakerLabel: string; confidence?: number }>;
    waveform?: number[];
  };

  // Transcription lifecycle
  pendingTranscription?: string | null;
  transcriptionError?: string;
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

export interface InsightAIAnalysis {
  summary: string;              // Concise 1-2 sentence summary
  interpretation: string;       // What this insight really means
  suggestedActions: string[];   // Recommended next steps
  themes: string[];             // Extracted themes/topics
  prioritySuggestion: Priority; // AI-recommended priority
  sentimentReason: string;      // Why this sentiment was detected
  relatedProductAreas: string[]; // Additional product areas mentioned
  confidence: number;           // 0-1 confidence score
  analyzedAt: string;           // ISO timestamp
  model: string;                // Which model was used
}

// ============================================================================
// ADVOCATE
// ============================================================================

export interface Advocate {
  _id: string;
  name: string;
  email: string;
  title?: string;
  role: string;           // 'viewer' | 'advocate' | 'manager' | 'admin'
  region?: Region;
  isAdmin: boolean;
  isActive: boolean;
  avatarUrl?: string;

  // Profile / contact fields
  linkedinUrl?: string;         // LinkedIn profile URL
  phone?: string;               // Contact phone number
  bio?: string;                 // Short bio / about me
  location?: string;            // City, State or City, Country
  timezone?: string;            // e.g. "America/New_York"
  github?: string;              // GitHub username or URL
  twitter?: string;             // Twitter/X handle or URL

  // Provisioning
  autoProvisioned?: boolean;    // True if auto-created on first login
  profileCompletedAt?: string;  // ISO timestamp when profile was first completed

  // Stats (may be stored or computed)
  insightCount?: number;
  eventCount?: number;

  // Activity tracking
  lastAccessAt?: string;
  lastLoginAt?: string;
  lastLoginSource?: 'web' | 'mobile' | 'api' | null;
  totalLogins?: number;
  last30DaysLogins?: number;

  // Meta
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// USER (for auth)
// ============================================================================

export interface User {
  _id: string;
  email: string;
  name: string;
  password?: string; // hashed
  role: 'admin' | 'advocate' | 'user';
  isAdmin: boolean;
  advocateId?: string;
  createdAt: string;
}

// ============================================================================
// FEEDBACK FORMS
// ============================================================================

export type FeedbackFormStatus = 'draft' | 'active' | 'closed';

export type FeedbackFormTemplate = 'session_feedback' | 'product_feedback' | 'general_feedback';

export type FeedbackQuestionType =
  | 'rating'
  | 'free_text'
  | 'single_choice'
  | 'multi_choice'
  | 'insight_type'
  | 'product_area'
  | 'sentiment'
  | 'priority';

export interface FeedbackQuestion {
  _id: string;
  order: number;
  type: FeedbackQuestionType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  mapsToInsightField?: string;
}

export interface FeedbackFormSettings {
  collectName: boolean;
  collectEmail: boolean;
  maxResponses?: number | null;
  closesAt?: string | null;
  thankYouMessage?: string;
}

export interface FeedbackForm {
  _id: string;
  title: string;
  description?: string;
  status: FeedbackFormStatus;
  template: FeedbackFormTemplate;

  // Context
  eventId?: string;
  sessionId?: string;
  eventName?: string;
  sessionTitle?: string;
  advocateId: string;
  advocateName: string;

  // Form definition
  questions: FeedbackQuestion[];

  // Settings
  settings: FeedbackFormSettings;

  // Sharing
  slug: string;

  // Stats (denormalized)
  responseCount: number;
  lastResponseAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackResponseAnswer {
  questionId: string;
  value: string | string[] | number;
}

export interface FeedbackResponse {
  _id: string;
  formId: string;

  respondentName?: string;
  respondentEmail?: string;

  answers: FeedbackResponseAnswer[];

  insightId: string;

  submittedAt: string;
  ipHash?: string;
}
