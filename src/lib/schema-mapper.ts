/**
 * PMO Spreadsheet Schema Mapper
 * 
 * Maps real PMO spreadsheet columns to normalized database schema.
 * Handles emoji statuses, date formats, location parsing, and DA assignments.
 */

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export type EventStatus = 
  | 'Completed'
  | 'Delivered'
  | 'Confirmed'
  | 'Scheduled'
  | 'In Progress'
  | 'Cancelled'
  | 'Postponed'
  | 'In Queue'
  | 'In Hack Queue'
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

export interface Assignment {
  advocateName: string;
  assignmentType: AssignmentType;
}

export interface ParsedEvent {
  // Core
  name: string;
  quarter: string;
  status: EventStatus;
  
  // Dates
  startDate: string | null;
  endDate: string | null;
  
  // Location
  location: string;
  isVirtual: boolean;
  timezone?: string;
  
  // Type
  eventType: EventType;
  engagementType?: string;
  
  // Region (top-level for display/filtering)
  region?: Region;
  
  // Account
  account?: {
    name: string;
    segment?: AccountSegment;
    region?: Region;
  };
  isRegional: boolean;
  
  // Contacts
  marketer?: string;
  champion?: {
    name?: string;
    title?: string;
    motivation?: string;
  };
  
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
  
  // Validation
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// KNOWN DA NAMES (for column detection)
// ============================================================================

export const KNOWN_DAS = [
  'Afi Gbadago',
  'Anant Srivastava',
  'Andrew Morgan',
  'Bohyun Jung',
  'Daniel Coupal',
  'Diana Esteves',
  'Diego Freniche Brito',
  'Franck Pachot',
  'Erik Hatcher',
  'Graeme Robinson',
  'Hubert Nguyen',
  'Justin LaBreck',
  'Lauren Schaefer',
  'Luce Carter',
  'Mike LaSpina',
  'Michael Lynn',
  'Nestor Daza',
  'Nic Raboy',
  'Ricardo Silva de Mello',
  'Stanimira Vlaeva',
  'Steffan Mejia',
  'Tim Kelly',
  'Wen Jie Teo',
];

// ============================================================================
// STATUS NORMALIZATION
// ============================================================================

const STATUS_MAP: Record<string, EventStatus> = {
  '🥳 completed': 'Completed',
  'completed': 'Completed',
  'delivered': 'Delivered',
  '✔️ all assigned!': 'Confirmed',
  'all assigned': 'Confirmed',
  'assigned': 'Confirmed',
  'confirmed': 'Confirmed',
  '🤯 confirming dates': 'Scheduled',
  'confirming dates': 'Scheduled',
  'confirming': 'Scheduled',
  'scheduled': 'Scheduled',
  'in progress': 'In Progress',
  '😫 cancelled': 'Cancelled',
  'cancelled': 'Cancelled',
  'canceled': 'Cancelled',
  'postponed': 'Postponed',
  '🔝 needs staffing': 'In Queue',
  'needs staffing': 'In Queue',
  'in queue': 'In Queue',
  'in hack queue': 'In Hack Queue',
  '⭐new': 'In Queue',
  'new': 'In Queue',
  'sa-led': 'SA_LED',
  'sa led': 'SA_LED',
  '😎 fyi - no assignment needed': 'FYI',
  '😎 fyi': 'FYI',
  'fyi': 'FYI',
};

export function normalizeStatus(raw: string | undefined | null): EventStatus {
  if (!raw) return 'In Queue';
  const normalized = raw.toLowerCase().trim();
  return STATUS_MAP[normalized] || 'In Queue';
}

// ============================================================================
// EVENT TYPE NORMALIZATION
// ============================================================================

const EVENT_TYPE_MAP: Record<string, EventType> = {
  '1:1 dev day': 'DEV_DAY_1_1',
  '1:1 developer day': 'DEV_DAY_1_1',
  'dev day': 'DEV_DAY_1_1',
  'developer day': 'DEV_DAY_1_1',
  'regional dev day': 'DEV_DAY_REGIONAL',
  'regional developer day': 'DEV_DAY_REGIONAL',
  'workshop/webinar': 'WEBINAR',
  'workshop': 'WEBINAR',
  'webinar': 'WEBINAR',
  'build & learn': 'BUILD_LEARN',
  'build and learn': 'BUILD_LEARN',
  'office hours': 'OFFICE_HOURS',
  'hackathon': 'HACKATHON',
  'architect day': 'ARCHITECT_DAY',
  'virtual primer': 'VIRTUAL_PRIMER',
  'primer': 'VIRTUAL_PRIMER',
  'other': 'OTHER',
};

export function normalizeEventType(raw: string | undefined | null): EventType {
  if (!raw) return 'OTHER';
  const normalized = raw.toLowerCase().trim();
  return EVENT_TYPE_MAP[normalized] || 'OTHER';
}

// Human-readable display names for event types
export const EVENT_TYPE_DISPLAY: Record<EventType, string> = {
  DEV_DAY_1_1: '1:1 Dev Day',
  DEV_DAY_REGIONAL: 'Regional Dev Day',
  WEBINAR: 'Workshop/Webinar',
  BUILD_LEARN: 'Build & Learn',
  OFFICE_HOURS: 'Office Hours',
  HACKATHON: 'Hackathon',
  ARCHITECT_DAY: 'Architect Day',
  VIRTUAL_PRIMER: 'Virtual Primer',
  OTHER: 'Other',
};

// ============================================================================
// TRAVEL STATUS NORMALIZATION
// ============================================================================

const TRAVEL_MAP: Record<string, TravelStatus> = {
  'ready to book': 'READY_TO_BOOK',
  'virtual, confirmed': 'VIRTUAL_CONFIRMED',
  'virtual confirmed': 'VIRTUAL_CONFIRMED',
  "don't book yet": 'DONT_BOOK_YET',
  'dont book yet': 'DONT_BOOK_YET',
  'not needed': 'NOT_NEEDED',
  'cancelled': 'CANCELLED',
  'canceled': 'CANCELLED',
};

export function normalizeTravelStatus(raw: string | undefined | null): TravelStatus {
  if (!raw) return 'DONT_BOOK_YET';
  const normalized = raw.toLowerCase().trim();
  return TRAVEL_MAP[normalized] || 'DONT_BOOK_YET';
}

// ============================================================================
// LOCATION PARSING
// ============================================================================

interface LocationInfo {
  location: string;
  isVirtual: boolean;
  timezone?: string;
}

export function parseLocation(raw: string): LocationInfo {
  if (!raw) return { location: '', isVirtual: false };
  
  const trimmed = raw.trim();
  
  // Check for virtual
  const virtualMatch = trimmed.match(/^virtual\s*\(([^)]+)\)?$/i);
  if (virtualMatch) {
    return {
      location: 'Virtual',
      isVirtual: true,
      timezone: virtualMatch[1]?.trim(),
    };
  }
  
  if (trimmed.toLowerCase() === 'virtual') {
    return { location: 'Virtual', isVirtual: true };
  }
  
  return { location: trimmed, isVirtual: false };
}

// ============================================================================
// DATE PARSING
// ============================================================================

export function parseDate(raw: string, year = 2026): string | null {
  if (!raw) return null;
  
  // Format: "Tue, Feb 3" or "Wed, Mar 18"
  const match = raw.match(/\w+,\s+(\w+)\s+(\d+)/);
  if (!match) {
    // Try direct date parsing
    const date = new Date(raw);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  }
  
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  
  const month = monthNames[match[1].toLowerCase().substring(0, 3)];
  const day = parseInt(match[2], 10);
  
  if (month === undefined || isNaN(day)) return null;
  
  const date = new Date(year, month, day);
  return date.toISOString();
}

// ============================================================================
// ACCOUNT SEGMENT PARSING
// ============================================================================

export function parseAccountSegment(raw: string): { segment?: AccountSegment; region?: Region } {
  if (!raw) return {};
  
  const normalized = raw.toLowerCase().trim();
  
  // Extract region
  let region: Region | undefined;
  if (normalized.includes('amer')) region = 'AMER';
  else if (normalized.includes('emea')) region = 'EMEA';
  else if (normalized.includes('apac')) region = 'APAC';
  else if (normalized.includes('latam')) region = 'LATAM';
  
  // Extract segment type
  let segment: AccountSegment | undefined;
  if (normalized.includes('aspire pod')) segment = 'ASPIRE_POD';
  else if (normalized.includes('pod')) segment = 'POD';
  else if (normalized.includes('anchor')) segment = 'ANCHOR';
  else if (normalized.includes('key growth')) segment = 'KEY_GROWTH';
  else if (normalized.includes('all')) segment = 'ALL';
  
  return { segment, region };
}

// ============================================================================
// DA ASSIGNMENT PARSING
// ============================================================================

export function parseAssignment(value: string): AssignmentType | null {
  if (!value) return null;
  
  const normalized = value.toLowerCase().trim();
  
  if (normalized.includes('on-site') || normalized.includes('on site') || normalized === '✅ on-site') {
    return 'ON_SITE';
  }
  if (normalized.includes('remote') || normalized === '✅ remote') {
    return 'REMOTE';
  }
  if (normalized.includes('volunteer')) {
    return 'VOLUNTEER_TRAVEL';
  }
  
  return null;
}

// ============================================================================
// COLUMN MAPPING
// ============================================================================

export interface ColumnMapping {
  csvColumn: string;
  field: string;
  confidence: number;
}

export interface MappingResult {
  mappings: ColumnMapping[];
  daColumns: string[];
  unmappedColumns: string[];
}

// Known PMO columns with their field mappings
const PMO_COLUMN_MAP: Record<string, string> = {
  'q': 'quarter',
  'status': 'status',
  'start date': 'startDate',
  'end date': 'endDate',
  'location': 'location',
  'event type': 'eventType',
  'account': 'accountName',
  'if other (account name)': 'accountNameOther',
  'if other': 'accountNameOther',
  'event region': 'eventRegion',
  'account segment': 'accountSegment',
  'calendar invite title': 'name',
  'event id': 'calendarEventId',
  'notes': 'notes',
  'marketer': 'marketer',
  'champion / sponsor name': 'championName',
  'champion name': 'championName',
  'champion job title': 'championTitle',
  "champion's motivation for engagement": 'championMotivation',
  'champion motivation': 'championMotivation',
  'event page link': 'eventPageUrl',
  'agenda details': 'agendaDetails',
  'wrike planning ticket (devrel)': 'wrikeTicket',
  'wrike planning ticket': 'wrikeTicket',
  'sfdc link': 'sfdcLink',
  'project plan tracker link': 'projectTrackerUrl',
  'badge assessment ticket (jira links)': 'badgeJiraTickets',
  'badge assessment ticket': 'badgeJiraTickets',
  'badge assessment links (for external use)': 'badgeLinks',
  'badge assessment links': 'badgeLinks',
  'event language': 'language',
  'event slack channel': 'slackChannel',
  'customer programming languages': 'customerTechStack',
  'travel': 'travelStatus',
  '# of das needed': 'dasNeeded',
  'das needed': 'dasNeeded',
};

export function mapColumns(headers: string[]): MappingResult {
  const mappings: ColumnMapping[] = [];
  const daColumns: string[] = [];
  const unmappedColumns: string[] = [];
  
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    
    // Check if it's a DA column
    const isDaColumn = KNOWN_DAS.some(
      (da) => da.toLowerCase() === normalized || header === da
    );
    
    if (isDaColumn) {
      daColumns.push(header);
      continue;
    }
    
    // Check known columns
    const field = PMO_COLUMN_MAP[normalized];
    if (field) {
      mappings.push({
        csvColumn: header,
        field,
        confidence: 1,
      });
      continue;
    }
    
    // Fuzzy match
    let bestMatch: { field: string; score: number } | null = null;
    for (const [pattern, fieldName] of Object.entries(PMO_COLUMN_MAP)) {
      const score = similarity(normalized, pattern);
      if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { field: fieldName, score };
      }
    }
    
    if (bestMatch) {
      mappings.push({
        csvColumn: header,
        field: bestMatch.field,
        confidence: bestMatch.score,
      });
    } else {
      unmappedColumns.push(header);
    }
  }
  
  return { mappings, daColumns, unmappedColumns };
}

// ============================================================================
// ROW TRANSFORMATION
// ============================================================================

export function transformRow(
  row: Record<string, string>,
  mappings: ColumnMapping[],
  daColumns: string[]
): ParsedEvent {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Build field lookup
  const fields: Record<string, string> = {};
  for (const mapping of mappings) {
    fields[mapping.field] = row[mapping.csvColumn]?.trim() || '';
  }
  
  // Parse location
  const locationInfo = parseLocation(fields.location);
  
  // Parse account
  let accountName = fields.accountName || '';
  const isRegional = accountName.toLowerCase().includes('n/a') || 
                     accountName.toLowerCase().includes('regional');
  
  if (accountName.toLowerCase() === 'other' && fields.accountNameOther) {
    accountName = fields.accountNameOther;
  }
  
  const segmentInfo = parseAccountSegment(fields.accountSegment);
  
  // Parse assignments
  const assignments: Assignment[] = [];
  for (const daColumn of daColumns) {
    const value = row[daColumn];
    const assignmentType = parseAssignment(value);
    if (assignmentType) {
      assignments.push({
        advocateName: daColumn,
        assignmentType,
      });
    }
  }
  
  // Parse dates
  const startDate = parseDate(fields.startDate);
  const endDate = parseDate(fields.endDate);
  
  // Determine region from account segment, event region field, or other sources
  const eventRegion: Region | undefined = segmentInfo.region 
    || (fields.eventRegion?.toUpperCase() as Region) 
    || undefined;

  const eventType = normalizeEventType(fields.eventType);

  // Build event
  const event: ParsedEvent = {
    name: fields.name || fields.location || 'Unnamed Event',
    quarter: fields.quarter || 'Q1',
    status: normalizeStatus(fields.status),
    
    startDate,
    endDate,
    
    location: locationInfo.location,
    isVirtual: locationInfo.isVirtual,
    timezone: locationInfo.timezone,
    
    eventType,
    
    // Top-level region and engagementType for the events page display/filtering
    region: eventRegion,
    engagementType: EVENT_TYPE_DISPLAY[eventType] || eventType,
    
    isRegional,
    
    language: fields.language || 'English',
    slackChannel: fields.slackChannel || undefined,
    customerTechStack: fields.customerTechStack 
      ? fields.customerTechStack.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    travelStatus: normalizeTravelStatus(fields.travelStatus),
    dasNeeded: parseInt(fields.dasNeeded, 10) || 1,
    
    assignments,
    
    notes: fields.notes || undefined,
    
    calendarEventId: fields.calendarEventId || undefined,
    eventPageUrl: fields.eventPageUrl || undefined,
    agendaDetails: fields.agendaDetails || undefined,
    wrikeTicket: fields.wrikeTicket || undefined,
    sfdcLink: fields.sfdcLink || undefined,
    projectTrackerUrl: fields.projectTrackerUrl || undefined,
    
    badgeJiraTickets: fields.badgeJiraTickets
      ? fields.badgeJiraTickets.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
      : undefined,
    badgeLinks: fields.badgeLinks
      ? fields.badgeLinks.split(/[\n\s]+/).map((s) => s.trim()).filter((s) => s.startsWith('http'))
      : undefined,
    
    marketer: fields.marketer || undefined,
    
    valid: true,
    errors,
    warnings,
  };
  
  // Add account if not regional
  if (!isRegional && accountName && accountName.toLowerCase() !== 'n/a (regional)') {
    event.account = {
      name: accountName,
      segment: segmentInfo.segment,
      region: segmentInfo.region || (fields.eventRegion as Region),
    };
  }
  
  // Add champion if present
  if (fields.championName) {
    event.champion = {
      name: fields.championName,
      title: fields.championTitle || undefined,
      motivation: fields.championMotivation || undefined,
    };
  }
  
  // Validation
  if (!event.name || event.name === 'Unnamed Event') {
    errors.push('Missing event name');
    event.valid = false;
  }
  
  if (!startDate) {
    warnings.push('Could not parse start date');
  }
  
  return event;
}

// ============================================================================
// HELPERS
// ============================================================================

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;
  
  // Levenshtein
  const matrix: number[][] = [];
  for (let i = 0; i <= bLower.length; i++) matrix[i] = [i];
  for (let j = 0; j <= aLower.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower[i - 1] === aLower[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLen = Math.max(aLower.length, bLower.length);
  return maxLen === 0 ? 1 : 1 - matrix[bLower.length][aLower.length] / maxLen;
}

// Re-export for backward compatibility - consolidate aliases per unique field
export const SCHEMA = (() => {
  const fieldMap = new Map<string, string[]>();
  for (const [alias, field] of Object.entries(PMO_COLUMN_MAP)) {
    const existing = fieldMap.get(field) || [];
    existing.push(alias);
    fieldMap.set(field, existing);
  }
  return Array.from(fieldMap.entries()).map(([field, aliases]) => ({
    name: field,
    aliases,
    required: ['name', 'eventType'].includes(field),
  }));
})();
