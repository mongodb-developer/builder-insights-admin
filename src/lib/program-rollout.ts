import { collections } from '@/lib/mongodb';
import { buildMentionNotifications, buildParticipantHandle, createProgramAudit } from '@/lib/program-utils';
import type {
  ProgramActivityEntry,
  ProgramAudit,
  ProgramComment,
  ProgramMentionNotification,
  ProgramParticipant,
  ProgramRecord,
  ProgramHealth,
  ProgramStatus,
  ProgramStage,
  ProgramPriority,
  DecisionCategory,
  DecisionStatus,
  RiskStatus,
  StakeholderGroup,
  ProgramRepoArea,
} from '@/types/program';

const DEFAULT_PROGRAM_ID = 'devrel-insights-suite-rollout';

export const defaultProgramId = DEFAULT_PROGRAM_ID;

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function parseNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function normalizeActivity(input: unknown): ProgramActivityEntry[] {
  if (!Array.isArray(input)) return [];

  return input.filter(isRecord).map((entry, index) => ({
    id: isString(entry.id) ? entry.id : `activity-${index + 1}`,
    type: enumValue(entry.type, ['created', 'field_updated', 'comment_added', 'reply_added'] as const, 'field_updated'),
    actorName: isString(entry.actorName) ? entry.actorName : 'Unknown',
    actorEmail: isString(entry.actorEmail) ? entry.actorEmail : '',
    createdAt: isString(entry.createdAt) ? entry.createdAt : nowIso(),
    summary: isString(entry.summary) ? entry.summary : '',
  }));
}

function createAudit(name: string, email: string, summary: string, createdAt = nowIso()): ProgramAudit {
  return {
    ...createProgramAudit(name, email, summary),
    createdAt,
    updatedAt: createdAt,
  };
}

function normalizeAudit(input: unknown, fallback: ProgramAudit): ProgramAudit {
  if (!isRecord(input)) return fallback;

  return {
    createdAt: isString(input.createdAt) ? input.createdAt : fallback.createdAt,
    createdBy: isString(input.createdBy) ? input.createdBy : fallback.createdBy,
    createdByEmail: isString(input.createdByEmail) ? input.createdByEmail : fallback.createdByEmail,
    updatedAt: isString(input.updatedAt) ? input.updatedAt : fallback.updatedAt,
    updatedBy: isString(input.updatedBy) ? input.updatedBy : fallback.updatedBy,
    updatedByEmail: isString(input.updatedByEmail) ? input.updatedByEmail : fallback.updatedByEmail,
    activity: normalizeActivity(input.activity).length > 0 ? normalizeActivity(input.activity) : fallback.activity,
  };
}

function normalizeComments(input: unknown): ProgramComment[] {
  if (!Array.isArray(input)) return [];

  return input.filter(isRecord).map((comment, index) => ({
    id: isString(comment.id) ? comment.id : `comment-${index + 1}`,
    authorName: isString(comment.authorName) ? comment.authorName : 'Unknown',
    authorEmail: isString(comment.authorEmail) ? comment.authorEmail : '',
    message: isString(comment.message) ? comment.message : '',
    createdAt: isString(comment.createdAt) ? comment.createdAt : nowIso(),
    mentions: Array.isArray(comment.mentions)
      ? comment.mentions.filter(isRecord).map((mention, mentionIndex) => ({
          name: isString(mention.name) ? mention.name : `Mention ${mentionIndex + 1}`,
          email: isString(mention.email) ? mention.email : '',
          handle: isString(mention.handle) ? mention.handle : '',
        }))
      : [],
    replies: normalizeComments(comment.replies),
  }));
}

function normalizeReferences(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input.filter(isRecord).map((reference, index) => ({
    id: isString(reference.id) ? reference.id : `reference-${index + 1}`,
    type: enumValue(reference.type, ['github_issue', 'github_pr', 'docs_page', 'figma', 'slack', 'other'] as const, 'other'),
    label: isString(reference.label) ? reference.label : 'Reference',
    url: isString(reference.url) ? reference.url : '',
    notes: isString(reference.notes) ? reference.notes : '',
  }));
}

function normalizeChecklist(input: unknown, fallback: ProgramRecord['workstreams'][number]['checklist']) {
  if (!Array.isArray(input)) return fallback;

  return input.filter(isRecord).map((item, index) => ({
    id: isString(item.id) ? item.id : `checklist-${index + 1}`,
    label: isString(item.label) ? item.label : 'Checklist item',
    owner: isString(item.owner) ? item.owner : 'Owner',
    assigneeEmail: isString(item.assigneeEmail) ? item.assigneeEmail : '',
    linkedTaskId: isString(item.linkedTaskId) ? item.linkedTaskId : undefined,
    status: enumValue(item.status, STATUS_VALUES, 'not_started'),
    dueDate: isString(item.dueDate) ? item.dueDate : '',
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
  })).sort((a, b) => a.sortOrder - b.sortOrder);
}

const HEALTH_VALUES = ['on_track', 'watch', 'at_risk'] as const satisfies readonly ProgramHealth[];
const STATUS_VALUES = ['not_started', 'in_progress', 'blocked', 'complete'] as const satisfies readonly ProgramStatus[];
const STAGE_VALUES = ['strategy', 'build', 'validate', 'launch', 'post_launch'] as const satisfies readonly ProgramStage[];
const PRIORITY_VALUES = ['critical', 'high', 'medium', 'low'] as const satisfies readonly ProgramPriority[];
const DECISION_CATEGORY_VALUES = ['product', 'engineering', 'launch', 'content', 'operations'] as const satisfies readonly DecisionCategory[];
const DECISION_STATUS_VALUES = ['pending', 'approved', 'deferred'] as const satisfies readonly DecisionStatus[];
const RISK_STATUS_VALUES = ['open', 'mitigated', 'resolved'] as const satisfies readonly RiskStatus[];
const RISK_LEVEL_VALUES = ['high', 'medium', 'low'] as const;
const STAKEHOLDER_GROUP_VALUES = ['product', 'engineering', 'devrel', 'docs', 'operations', 'leadership'] as const satisfies readonly StakeholderGroup[];
const REPO_AREA_VALUES = ['mobile', 'admin', 'docs'] as const satisfies readonly ProgramRepoArea[];

export function createDefaultProgram(updatedBy = 'system'): ProgramRecord {
  const timestamp = nowIso();
  const defaultEmail = updatedBy.includes('@') ? updatedBy : 'system@local';

  return {
    _id: DEFAULT_PROGRAM_ID,
    name: 'DevRel Insights Suite Rollout',
    health: 'watch',
    objective:
      'Coordinate the rollout of mobile capture, admin operations, and documentation so the suite launches as one managed program instead of three disconnected projects.',
    launchWindow: 'Q3 2026 launch readiness target',
    operatingCadence: 'Weekly program review, twice-weekly workstream standup, launch readiness review every Friday',
    successMeasures: [
      'iOS and Android launch checklists complete with no critical blockers',
      'Admin portal supports program oversight, rollout reporting, and operational handoff',
      'Documentation is complete for internal teams, beta users, and production release paths',
      'Owners, stakeholders, risks, and decisions are visible in one place',
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy,
    repos: [
      {
        id: 'repo-mobile',
        name: 'devrel-insights',
        area: 'mobile',
        path: '/Users/michael.lynn/code/devrel-insights',
        summary: 'Primary product repo for iOS and Android mobile app delivery.',
      },
      {
        id: 'repo-admin',
        name: 'devrel-insights-admin',
        area: 'admin',
        path: '/Users/michael.lynn/code/devrel-insights-admin',
        summary: 'Operational control plane, reporting hub, and now rollout management workspace.',
      },
      {
        id: 'repo-docs',
        name: 'devrel-insights-docs',
        area: 'docs',
        path: '/Users/michael.lynn/code/devrel-insights-docs',
        summary: 'Docusaurus documentation site for onboarding, release communication, and support content.',
      },
    ],
    phases: [
      {
        id: 'strategy',
        title: 'Strategy',
        description: 'Align scope, launch objectives, stakeholders, and release model across the full suite.',
        exitCriteria: 'Owners, launch window, success measures, and go/no-go inputs are defined.',
      },
      {
        id: 'build',
        title: 'Build',
        description: 'Ship core mobile, admin, and docs deliverables needed for end-to-end readiness.',
        exitCriteria: 'Critical launch features are implemented and tied to clear owners.',
      },
      {
        id: 'validate',
        title: 'Validate',
        description: 'Exercise QA, beta, analytics, and operational readiness before external launch.',
        exitCriteria: 'Critical test gaps, instrumentation gaps, and support gaps are closed.',
      },
      {
        id: 'launch',
        title: 'Launch',
        description: 'Coordinate submission, communications, enablement, and launch-day command center.',
        exitCriteria: 'Distribution, communications, and stakeholder approvals are complete.',
      },
      {
        id: 'post_launch',
        title: 'Post-Launch',
        description: 'Monitor adoption, resolve hot issues, and operationalize learnings into the next cycle.',
        exitCriteria: 'Stabilization metrics are healthy and ownership is transitioned to steady-state operations.',
      },
    ],
    workstreams: [
      {
        id: 'ios-launch',
        title: 'iOS Launch Readiness',
        repoId: 'repo-mobile',
        owner: 'Mobile Engineering Lead',
        stage: 'validate',
        status: 'in_progress',
        health: 'watch',
        completion: 68,
        targetDate: '2026-07-15',
        summary: 'Finalize iOS beta quality, analytics coverage, App Store assets, and launch operations.',
        stakeholders: ['Product Manager', 'Developer Relations Lead', 'QA Lead'],
        notes: 'Primary focus is beta stabilization, App Store submission prep, and support readiness.',
        comments: [
          {
            id: 'comment-ios-1',
            authorName: 'Program Manager',
            authorEmail: 'program.manager@mongodb.com',
            message: 'Need a crisp update on App Store asset readiness before Friday launch review.',
            createdAt: '2026-06-14T17:00:00.000Z',
            mentions: [],
            replies: [
              {
                id: 'comment-ios-1-reply-1',
                authorName: 'Product Marketing',
                authorEmail: 'product.marketing@mongodb.com',
                message: 'Screenshots are in progress. Waiting on final approved build for two capture flows.',
                createdAt: '2026-06-14T18:10:00.000Z',
                mentions: [],
                replies: [],
              },
            ],
          },
        ],
        references: [
          {
            id: 'ref-ios-issue',
            type: 'github_issue',
            label: 'iOS submission readiness epic',
            url: 'https://github.com/example/devrel-insights/issues/101',
            notes: 'Master issue for final iOS launch prep.',
          },
          {
            id: 'ref-ios-docs',
            type: 'docs_page',
            label: 'iOS launch support runbook',
            url: 'https://example.local/docs/mobile/ios-launch-runbook',
            notes: 'Support and escalation playbook.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded iOS launch readiness workstream.', timestamp),
        checklist: [
          { id: 'ios-beta', label: 'Close beta-critical bugs', owner: 'iOS Engineer', assigneeEmail: 'ios.engineer@mongodb.com', status: 'in_progress', dueDate: '2026-06-24', sortOrder: 0 },
          { id: 'ios-store', label: 'Prepare App Store metadata and screenshots', owner: 'Product Marketing', assigneeEmail: 'product.marketing@mongodb.com', status: 'blocked', dueDate: '2026-06-26', sortOrder: 1 },
          { id: 'ios-analytics', label: 'Verify crash and product analytics instrumentation', owner: 'Mobile Engineering Lead', assigneeEmail: 'mobile.lead@mongodb.com', status: 'in_progress', dueDate: '2026-06-22', sortOrder: 2 },
          { id: 'ios-support', label: 'Publish iOS troubleshooting runbook', owner: 'Docs Lead', assigneeEmail: 'docs.lead@mongodb.com', status: 'not_started', dueDate: '2026-06-29', sortOrder: 3 },
        ],
      },
      {
        id: 'android-launch',
        title: 'Android Launch Readiness',
        repoId: 'repo-mobile',
        owner: 'Android Engineering Lead',
        stage: 'build',
        status: 'in_progress',
        health: 'at_risk',
        completion: 44,
        targetDate: '2026-08-05',
        summary: 'Bring Android to feature parity and clear Play Store launch requirements.',
        stakeholders: ['Product Manager', 'QA Lead', 'Program Manager'],
        notes: 'Android remains the pacing risk because parity and device validation are still open.',
        comments: [
          {
            id: 'comment-android-1',
            authorName: 'Android Engineering Lead',
            authorEmail: 'android.lead@mongodb.com',
            message: 'Recommend we decide this week whether Android is day-one or fast-follow if parity slips.',
            createdAt: '2026-06-13T20:30:00.000Z',
            mentions: [],
            replies: [],
          },
        ],
        references: [
          {
            id: 'ref-android-issue',
            type: 'github_issue',
            label: 'Android parity tracker',
            url: 'https://github.com/example/devrel-insights/issues/118',
            notes: 'Tracks parity and device validation scope.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded Android launch readiness workstream.', timestamp),
        checklist: [
          { id: 'android-parity', label: 'Reach parity for capture and sync flows', owner: 'Android Engineering Lead', assigneeEmail: 'android.lead@mongodb.com', status: 'in_progress', dueDate: '2026-07-01', sortOrder: 0 },
          { id: 'android-devices', label: 'Complete device matrix validation', owner: 'QA Lead', assigneeEmail: 'qa.lead@mongodb.com', status: 'not_started', dueDate: '2026-07-04', sortOrder: 1 },
          { id: 'android-play', label: 'Prepare Play Store listing and policies', owner: 'Product Marketing', assigneeEmail: 'product.marketing@mongodb.com', status: 'not_started', dueDate: '2026-07-07', sortOrder: 2 },
          { id: 'android-beta', label: 'Recruit closed beta cohort', owner: 'Developer Relations Lead', assigneeEmail: 'devrel.lead@mongodb.com', status: 'blocked', dueDate: '2026-07-03', sortOrder: 3 },
        ],
      },
      {
        id: 'admin-rollout',
        title: 'Admin Platform Rollout',
        repoId: 'repo-admin',
        owner: 'Admin Product Owner',
        stage: 'build',
        status: 'in_progress',
        health: 'on_track',
        completion: 72,
        targetDate: '2026-07-08',
        summary: 'Expand the admin portal into the operational command center for launch and post-launch management.',
        stakeholders: ['Operations Lead', 'Developer Relations Lead', 'Support Manager'],
        notes: 'The immediate need is a shared program view that keeps rollout execution visible to leadership.',
        comments: [
          {
            id: 'comment-admin-1',
            authorName: 'Operations Lead',
            authorEmail: 'operations.lead@mongodb.com',
            message: 'This workstream should become the source of truth for readiness reviews and weekly status snapshots.',
            createdAt: '2026-06-15T15:45:00.000Z',
            mentions: [],
            replies: [],
          },
        ],
        references: [
          {
            id: 'ref-admin-pr',
            type: 'github_pr',
            label: 'Program workspace implementation PR',
            url: 'https://github.com/example/devrel-insights-admin/pull/42',
            notes: 'Admin workspace changes for rollout operations.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded admin rollout workstream.', timestamp),
        checklist: [
          { id: 'admin-program', label: 'Add program tracking workspace', owner: 'Admin Product Owner', assigneeEmail: 'admin.owner@mongodb.com', status: 'in_progress', dueDate: '2026-06-20', sortOrder: 0 },
          { id: 'admin-perms', label: 'Confirm role access and update workflows', owner: 'Platform Engineer', assigneeEmail: 'platform.engineer@mongodb.com', status: 'complete', dueDate: '2026-06-14', sortOrder: 1 },
          { id: 'admin-reporting', label: 'Define launch health reporting views', owner: 'Operations Lead', assigneeEmail: 'operations.lead@mongodb.com', status: 'in_progress', dueDate: '2026-06-23', sortOrder: 2 },
          { id: 'admin-handoff', label: 'Draft operational handoff checklist', owner: 'Support Manager', assigneeEmail: 'support.manager@mongodb.com', status: 'not_started', dueDate: '2026-06-28', sortOrder: 3 },
        ],
      },
      {
        id: 'docs-rollout',
        title: 'Documentation Rollout',
        repoId: 'repo-docs',
        owner: 'Docs Lead',
        stage: 'validate',
        status: 'in_progress',
        health: 'watch',
        completion: 61,
        targetDate: '2026-07-18',
        summary: 'Prepare internal enablement, user onboarding, release notes, and support documentation in Docusaurus.',
        stakeholders: ['Support Manager', 'Developer Relations Lead', 'Product Marketing'],
        notes: 'Docs must cover launch-day support, onboarding, and release messaging across all app surfaces.',
        comments: [
          {
            id: 'comment-docs-1',
            authorName: 'Docs Lead',
            authorEmail: 'docs.lead@mongodb.com',
            message: 'Need final support flow decisions before we can finish the troubleshooting and escalation content.',
            createdAt: '2026-06-12T16:20:00.000Z',
            mentions: [],
            replies: [],
          },
        ],
        references: [
          {
            id: 'ref-docs-page',
            type: 'docs_page',
            label: 'Launch docs hub',
            url: 'https://example.local/docs/launch',
            notes: 'Primary docs landing page for rollout content.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded docs rollout workstream.', timestamp),
        checklist: [
          { id: 'docs-ia', label: 'Finalize launch information architecture', owner: 'Docs Lead', assigneeEmail: 'docs.lead@mongodb.com', status: 'complete', dueDate: '2026-06-12', sortOrder: 0 },
          { id: 'docs-onboarding', label: 'Write admin and mobile onboarding guides', owner: 'Technical Writer', assigneeEmail: 'tech.writer@mongodb.com', status: 'in_progress', dueDate: '2026-06-25', sortOrder: 1 },
          { id: 'docs-release', label: 'Draft release notes and FAQ', owner: 'Product Marketing', assigneeEmail: 'product.marketing@mongodb.com', status: 'not_started', dueDate: '2026-06-27', sortOrder: 2 },
          { id: 'docs-support', label: 'Create support escalation handbook', owner: 'Support Manager', assigneeEmail: 'support.manager@mongodb.com', status: 'blocked', dueDate: '2026-06-30', sortOrder: 3 },
        ],
      },
    ],
    tasks: [
      {
        id: 'task-ios-submission',
        title: 'Complete App Store submission packet',
        description: 'Assemble screenshots, privacy responses, release notes, and reviewer credentials for iOS.',
        workstreamId: 'ios-launch',
        repoId: 'repo-mobile',
        owner: 'Product Marketing',
        stage: 'launch',
        status: 'blocked',
        priority: 'critical',
        dueDate: '2026-06-28',
        stakeholders: ['Mobile Engineering Lead', 'Product Manager'],
        dependencies: 'Needs final UI assets and privacy review sign-off.',
        comments: [
          {
            id: 'comment-task-ios-submission-1',
            authorName: 'Product Manager',
            authorEmail: 'product.manager@mongodb.com',
            message: 'This is a go/no-go item. Escalate immediately if assets are not ready by next checkpoint.',
            createdAt: '2026-06-15T10:00:00.000Z',
            mentions: [],
            replies: [],
          },
        ],
        references: [
          {
            id: 'ref-task-ios-pr',
            type: 'github_pr',
            label: 'Submission asset PR',
            url: 'https://github.com/example/devrel-insights/pull/88',
            notes: 'Final UI and screenshot prep changes.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded App Store submission task.', timestamp),
      },
      {
        id: 'task-android-qa',
        title: 'Run Android device certification pass',
        description: 'Validate capture, sync, auth, and offline recovery across target device matrix.',
        workstreamId: 'android-launch',
        repoId: 'repo-mobile',
        owner: 'QA Lead',
        stage: 'validate',
        status: 'not_started',
        priority: 'high',
        dueDate: '2026-07-04',
        stakeholders: ['Android Engineering Lead', 'Program Manager'],
        dependencies: 'Requires parity milestone build candidate.',
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded Android device validation task.', timestamp),
      },
      {
        id: 'task-admin-readout',
        title: 'Publish weekly launch readiness scorecard',
        description: 'Create a leadership-ready rollup for risks, blockers, and milestones inside the admin app.',
        workstreamId: 'admin-rollout',
        repoId: 'repo-admin',
        owner: 'Operations Lead',
        stage: 'validate',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-06-20',
        stakeholders: ['Leadership Sponsor', 'Admin Product Owner'],
        dependencies: 'Needs program workspace and data ownership model in place.',
        comments: [
          {
            id: 'comment-task-admin-readout-1',
            authorName: 'Leadership Sponsor',
            authorEmail: 'leadership.sponsor@mongodb.com',
            message: 'Weekly scorecard should highlight blockers, owner accountability, and confidence by surface area.',
            createdAt: '2026-06-11T09:30:00.000Z',
            mentions: [],
            replies: [],
          },
        ],
        references: [
          {
            id: 'ref-task-admin-docs',
            type: 'docs_page',
            label: 'Leadership readiness scorecard doc',
            url: 'https://example.local/docs/admin/readiness-scorecard',
            notes: 'Draft reporting format for leadership review.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded weekly readiness scorecard task.', timestamp),
      },
      {
        id: 'task-docs-support',
        title: 'Ship launch-day support playbook',
        description: 'Document common issues, escalation paths, owner matrix, and known launch caveats.',
        workstreamId: 'docs-rollout',
        repoId: 'repo-docs',
        owner: 'Support Manager',
        stage: 'launch',
        status: 'blocked',
        priority: 'high',
        dueDate: '2026-07-02',
        stakeholders: ['Docs Lead', 'Developer Relations Lead'],
        dependencies: 'Needs final support process decisions from leadership.',
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded launch-day support playbook task.', timestamp),
      },
      {
        id: 'task-mobile-analytics',
        title: 'Validate mobile telemetry and alert thresholds',
        description: 'Confirm crash, sync failure, and adoption alerts are wired before launch.',
        workstreamId: 'ios-launch',
        repoId: 'repo-mobile',
        owner: 'Mobile Engineering Lead',
        stage: 'validate',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-06-24',
        stakeholders: ['Operations Lead', 'QA Lead'],
        dependencies: 'Depends on production analytics keys and dashboard thresholds.',
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded mobile telemetry validation task.', timestamp),
      },
      {
        id: 'task-docs-site-map',
        title: 'Align docs site navigation to launch journey',
        description: 'Organize docs around onboarding, operations, release notes, and troubleshooting.',
        workstreamId: 'docs-rollout',
        repoId: 'repo-docs',
        owner: 'Docs Lead',
        stage: 'build',
        status: 'complete',
        priority: 'medium',
        dueDate: '2026-06-12',
        stakeholders: ['Technical Writer', 'Product Marketing'],
        dependencies: 'None.',
        comments: [],
        references: [
          {
            id: 'ref-task-docs-nav',
            type: 'docs_page',
            label: 'Docs IA proposal',
            url: 'https://example.local/docs/ia/launch-navigation',
            notes: 'Proposed site map and navigation structure.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded docs site navigation task.', timestamp),
      },
    ],
    stakeholders: [
      {
        id: 'stakeholder-leadership',
        name: 'Leadership Sponsor',
        role: 'Executive Sponsor',
        group: 'leadership',
        focus: 'Go/no-go confidence, risk posture, and strategic outcomes.',
        responsibilities: ['Approve launch readiness', 'Escalate cross-team blockers'],
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded leadership stakeholder profile.', timestamp),
      },
      {
        id: 'stakeholder-product',
        name: 'Product Manager',
        role: 'Product Lead',
        group: 'product',
        focus: 'Scope alignment, feature priority, and launch sequencing.',
        responsibilities: ['Define MVP', 'Own tradeoff decisions'],
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded product stakeholder profile.', timestamp),
      },
      {
        id: 'stakeholder-mobile',
        name: 'Mobile Engineering Lead',
        role: 'Engineering Lead',
        group: 'engineering',
        focus: 'Delivery health, technical risk, and app store readiness.',
        responsibilities: ['Own mobile delivery', 'Escalate quality blockers'],
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded engineering stakeholder profile.', timestamp),
      },
      {
        id: 'stakeholder-admin',
        name: 'Admin Product Owner',
        role: 'Platform Owner',
        group: 'operations',
        focus: 'Admin workflows, rollout reporting, and internal adoption.',
        responsibilities: ['Operate the command center', 'Define reporting needs'],
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded admin stakeholder profile.', timestamp),
      },
      {
        id: 'stakeholder-docs',
        name: 'Docs Lead',
        role: 'Documentation Lead',
        group: 'docs',
        focus: 'Information architecture, release communications, and support content.',
        responsibilities: ['Own docs readiness', 'Coordinate launch content'],
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded docs stakeholder profile.', timestamp),
      },
      {
        id: 'stakeholder-devrel',
        name: 'Developer Relations Lead',
        role: 'Launch Enablement Lead',
        group: 'devrel',
        focus: 'Field adoption, advocacy workflows, and communication loops.',
        responsibilities: ['Drive beta participation', 'Coordinate stakeholder communication'],
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded DevRel stakeholder profile.', timestamp),
      },
    ],
    decisions: [
      {
        id: 'decision-parity',
        title: 'Define Android parity bar for launch',
        category: 'product',
        owner: 'Product Manager',
        dueDate: '2026-06-18',
        status: 'pending',
        impact: 'Determines whether Android ships alongside iOS or as a fast follow.',
        notes: 'Needs explicit scope line between must-have and post-launch backlog.',
        comments: [
          {
            id: 'comment-decision-parity-1',
            authorName: 'Program Manager',
            authorEmail: 'program.manager@mongodb.com',
            message: 'Need a recommendation with customer impact and engineering risk before leadership review.',
            createdAt: '2026-06-15T14:10:00.000Z',
            mentions: [],
            replies: [],
          },
        ],
        references: [
          {
            id: 'ref-decision-android',
            type: 'github_issue',
            label: 'Android parity decision brief',
            url: 'https://github.com/example/devrel-insights/issues/122',
            notes: 'Decision packet and parity tradeoffs.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded Android parity launch decision.', timestamp),
      },
      {
        id: 'decision-support',
        title: 'Choose launch support model and escalation rotation',
        category: 'operations',
        owner: 'Support Manager',
        dueDate: '2026-06-21',
        status: 'pending',
        impact: 'Affects launch-day coverage, docs content, and after-hours escalation plan.',
        notes: 'Need agreement across admin, mobile, and docs owners.',
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded support model decision.', timestamp),
      },
      {
        id: 'decision-metrics',
        title: 'Lock success metrics for first 30 days',
        category: 'launch',
        owner: 'Leadership Sponsor',
        dueDate: '2026-06-25',
        status: 'deferred',
        impact: 'Required for post-launch scorecard and stakeholder reporting.',
        notes: 'Waiting on baseline analytics confidence.',
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded 30-day success metric decision.', timestamp),
      },
    ],
    risks: [
      {
        id: 'risk-android-parity',
        title: 'Android feature parity slips beyond launch window',
        owner: 'Android Engineering Lead',
        level: 'high',
        status: 'open',
        trigger: 'Core capture, sync, or auth paths remain incomplete by validation milestone.',
        mitigation: 'Establish parity cutoff, add contingency plan for phased mobile rollout.',
        comments: [
          {
            id: 'comment-risk-android-parity-1',
            authorName: 'Leadership Sponsor',
            authorEmail: 'leadership.sponsor@mongodb.com',
            message: 'Please attach the contingency decision no later than next weekly review.',
            createdAt: '2026-06-14T11:00:00.000Z',
            mentions: [],
            replies: [],
          },
        ],
        references: [
          {
            id: 'ref-risk-android',
            type: 'github_issue',
            label: 'Android contingency tracker',
            url: 'https://github.com/example/devrel-insights/issues/129',
            notes: 'Risk mitigation and phased rollout fallback.',
          },
        ],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded Android parity risk.', timestamp),
      },
      {
        id: 'risk-support-gap',
        title: 'Launch support process is undefined',
        owner: 'Support Manager',
        level: 'medium',
        status: 'open',
        trigger: 'Escalation matrix and ownership are not signed off two weeks before launch.',
        mitigation: 'Draft RACI and publish support handbook in docs site.',
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded support process risk.', timestamp),
      },
      {
        id: 'risk-submission-assets',
        title: 'Store submission assets lag final product changes',
        owner: 'Product Marketing',
        level: 'medium',
        status: 'mitigated',
        trigger: 'Final screenshots or compliance language diverge from build candidate.',
        mitigation: 'Freeze UI for submission flows and review assets weekly.',
        comments: [],
        references: [],
        audit: createAudit('Program Seed', defaultEmail, 'Seeded submission asset risk.', timestamp),
      },
    ],
  };
}

function normalizeProgramRecord(input: unknown, fallback: ProgramRecord): ProgramRecord {
  if (!isRecord(input)) return fallback;

  return {
    _id: isString(input._id) ? input._id : fallback._id,
    name: isString(input.name) ? input.name : fallback.name,
    health: enumValue(input.health, HEALTH_VALUES, fallback.health),
    objective: isString(input.objective) ? input.objective : fallback.objective,
    launchWindow: isString(input.launchWindow) ? input.launchWindow : fallback.launchWindow,
    operatingCadence: isString(input.operatingCadence) ? input.operatingCadence : fallback.operatingCadence,
    successMeasures: isStringArray(input.successMeasures) ? input.successMeasures : fallback.successMeasures,
    createdAt: isString(input.createdAt) ? input.createdAt : fallback.createdAt,
    updatedAt: isString(input.updatedAt) ? input.updatedAt : fallback.updatedAt,
    updatedBy: isString(input.updatedBy) ? input.updatedBy : fallback.updatedBy,
    repos: Array.isArray(input.repos)
      ? input.repos.filter(isRecord).map((repo, index) => ({
          id: isString(repo.id) ? repo.id : fallback.repos[index]?.id || `repo-${index + 1}`,
          name: isString(repo.name) ? repo.name : fallback.repos[index]?.name || 'Repository',
          area: enumValue(repo.area, REPO_AREA_VALUES, fallback.repos[index]?.area || 'admin'),
          path: isString(repo.path) ? repo.path : fallback.repos[index]?.path || '',
          summary: isString(repo.summary) ? repo.summary : fallback.repos[index]?.summary || '',
        }))
      : fallback.repos,
    phases: Array.isArray(input.phases)
      ? input.phases.filter(isRecord).map((phase, index) => ({
          id: enumValue(phase.id, STAGE_VALUES, fallback.phases[index]?.id || 'strategy'),
          title: isString(phase.title) ? phase.title : fallback.phases[index]?.title || 'Phase',
          description: isString(phase.description) ? phase.description : fallback.phases[index]?.description || '',
          exitCriteria: isString(phase.exitCriteria) ? phase.exitCriteria : fallback.phases[index]?.exitCriteria || '',
        }))
      : fallback.phases,
    workstreams: Array.isArray(input.workstreams)
      ? input.workstreams.filter(isRecord).map((workstream, index) => ({
          id: isString(workstream.id) ? workstream.id : fallback.workstreams[index]?.id || `workstream-${index + 1}`,
          title: isString(workstream.title) ? workstream.title : fallback.workstreams[index]?.title || 'Workstream',
          repoId: isString(workstream.repoId) ? workstream.repoId : fallback.workstreams[index]?.repoId || fallback.repos[0].id,
          owner: isString(workstream.owner) ? workstream.owner : fallback.workstreams[index]?.owner || 'Owner',
          stage: enumValue(workstream.stage, STAGE_VALUES, fallback.workstreams[index]?.stage || 'strategy'),
          status: enumValue(workstream.status, STATUS_VALUES, fallback.workstreams[index]?.status || 'not_started'),
          health: enumValue(workstream.health, HEALTH_VALUES, fallback.workstreams[index]?.health || 'watch'),
          completion: Math.min(100, Math.max(0, parseNumber(workstream.completion, fallback.workstreams[index]?.completion || 0))),
          targetDate: isString(workstream.targetDate) ? workstream.targetDate : fallback.workstreams[index]?.targetDate || '',
          summary: isString(workstream.summary) ? workstream.summary : fallback.workstreams[index]?.summary || '',
          stakeholders: isStringArray(workstream.stakeholders) ? workstream.stakeholders : fallback.workstreams[index]?.stakeholders || [],
          notes: isString(workstream.notes) ? workstream.notes : fallback.workstreams[index]?.notes || '',
          checklist: normalizeChecklist(workstream.checklist, fallback.workstreams[index]?.checklist || []),
          comments: normalizeComments(workstream.comments),
          references: normalizeReferences(workstream.references),
          audit: normalizeAudit(
            workstream.audit,
            fallback.workstreams[index]?.audit || createAudit('System', 'system@local', 'Created workstream.')
          ),
        }))
      : fallback.workstreams,
    tasks: Array.isArray(input.tasks)
      ? input.tasks.filter(isRecord).map((task, index) => ({
          id: isString(task.id) ? task.id : fallback.tasks[index]?.id || `task-${index + 1}`,
          title: isString(task.title) ? task.title : fallback.tasks[index]?.title || 'Task',
          description: isString(task.description) ? task.description : fallback.tasks[index]?.description || '',
          workstreamId: isString(task.workstreamId) ? task.workstreamId : fallback.tasks[index]?.workstreamId || fallback.workstreams[0].id,
          repoId: isString(task.repoId) ? task.repoId : fallback.tasks[index]?.repoId || fallback.repos[0].id,
          sourceChecklistItemId: isString(task.sourceChecklistItemId) ? task.sourceChecklistItemId : fallback.tasks[index]?.sourceChecklistItemId,
          owner: isString(task.owner) ? task.owner : fallback.tasks[index]?.owner || 'Owner',
          stage: enumValue(task.stage, STAGE_VALUES, fallback.tasks[index]?.stage || 'strategy'),
          status: enumValue(task.status, STATUS_VALUES, fallback.tasks[index]?.status || 'not_started'),
          priority: enumValue(task.priority, PRIORITY_VALUES, fallback.tasks[index]?.priority || 'medium'),
          dueDate: isString(task.dueDate) ? task.dueDate : fallback.tasks[index]?.dueDate || '',
          stakeholders: isStringArray(task.stakeholders) ? task.stakeholders : fallback.tasks[index]?.stakeholders || [],
          dependencies: isString(task.dependencies) ? task.dependencies : fallback.tasks[index]?.dependencies || '',
          comments: normalizeComments(task.comments),
          references: normalizeReferences(task.references),
          audit: normalizeAudit(
            task.audit,
            fallback.tasks[index]?.audit || createAudit('System', 'system@local', 'Created task.')
          ),
        }))
      : fallback.tasks,
    stakeholders: Array.isArray(input.stakeholders)
      ? input.stakeholders.filter(isRecord).map((stakeholder, index) => ({
          id: isString(stakeholder.id) ? stakeholder.id : fallback.stakeholders[index]?.id || `stakeholder-${index + 1}`,
          name: isString(stakeholder.name) ? stakeholder.name : fallback.stakeholders[index]?.name || 'Stakeholder',
          role: isString(stakeholder.role) ? stakeholder.role : fallback.stakeholders[index]?.role || '',
          group: enumValue(stakeholder.group, STAKEHOLDER_GROUP_VALUES, fallback.stakeholders[index]?.group || 'operations'),
          focus: isString(stakeholder.focus) ? stakeholder.focus : fallback.stakeholders[index]?.focus || '',
          responsibilities: isStringArray(stakeholder.responsibilities)
            ? stakeholder.responsibilities
            : fallback.stakeholders[index]?.responsibilities || [],
          comments: normalizeComments(stakeholder.comments),
          references: normalizeReferences(stakeholder.references),
          audit: normalizeAudit(
            stakeholder.audit,
            fallback.stakeholders[index]?.audit || createAudit('System', 'system@local', 'Created stakeholder.')
          ),
        }))
      : fallback.stakeholders,
    snapshots: Array.isArray(input.snapshots)
      ? input.snapshots.filter(isRecord).map((snapshot, index) => ({
          id: isString(snapshot.id) ? snapshot.id : `snapshot-${index + 1}`,
          name: isString(snapshot.name) ? snapshot.name : `Snapshot ${index + 1}`,
          createdAt: isString(snapshot.createdAt) ? snapshot.createdAt : fallback.updatedAt,
          createdBy: isString(snapshot.createdBy) ? snapshot.createdBy : fallback.updatedBy,
          summary: isString(snapshot.summary) ? snapshot.summary : '',
          markdownReport: isString(snapshot.markdownReport) ? snapshot.markdownReport : '',
        }))
      : fallback.snapshots || [],
    decisions: Array.isArray(input.decisions)
      ? input.decisions.filter(isRecord).map((decision, index) => ({
          id: isString(decision.id) ? decision.id : fallback.decisions[index]?.id || `decision-${index + 1}`,
          title: isString(decision.title) ? decision.title : fallback.decisions[index]?.title || 'Decision',
          category: enumValue(decision.category, DECISION_CATEGORY_VALUES, fallback.decisions[index]?.category || 'operations'),
          owner: isString(decision.owner) ? decision.owner : fallback.decisions[index]?.owner || 'Owner',
          dueDate: isString(decision.dueDate) ? decision.dueDate : fallback.decisions[index]?.dueDate || '',
          status: enumValue(decision.status, DECISION_STATUS_VALUES, fallback.decisions[index]?.status || 'pending'),
          impact: isString(decision.impact) ? decision.impact : fallback.decisions[index]?.impact || '',
          notes: isString(decision.notes) ? decision.notes : fallback.decisions[index]?.notes || '',
          comments: normalizeComments(decision.comments),
          references: normalizeReferences(decision.references),
          audit: normalizeAudit(
            decision.audit,
            fallback.decisions[index]?.audit || createAudit('System', 'system@local', 'Created decision.')
          ),
        }))
      : fallback.decisions,
    risks: Array.isArray(input.risks)
      ? input.risks.filter(isRecord).map((risk, index) => ({
          id: isString(risk.id) ? risk.id : fallback.risks[index]?.id || `risk-${index + 1}`,
          title: isString(risk.title) ? risk.title : fallback.risks[index]?.title || 'Risk',
          owner: isString(risk.owner) ? risk.owner : fallback.risks[index]?.owner || 'Owner',
          level: enumValue(risk.level, RISK_LEVEL_VALUES, fallback.risks[index]?.level || 'medium'),
          status: enumValue(risk.status, RISK_STATUS_VALUES, fallback.risks[index]?.status || 'open'),
          trigger: isString(risk.trigger) ? risk.trigger : fallback.risks[index]?.trigger || '',
          mitigation: isString(risk.mitigation) ? risk.mitigation : fallback.risks[index]?.mitigation || '',
          comments: normalizeComments(risk.comments),
          references: normalizeReferences(risk.references),
          audit: normalizeAudit(
            risk.audit,
            fallback.risks[index]?.audit || createAudit('System', 'system@local', 'Created risk.')
          ),
        }))
      : fallback.risks,
  };
}

export async function getProgramCollection() {
  const { getCollection } = await import('@/lib/mongodb');
  return getCollection<ProgramRecord>(collections.programs);
}

export async function getOrCreateProgram(userLabel = 'system') {
  const col = await getProgramCollection();
  const existing = await col.findOne({ _id: DEFAULT_PROGRAM_ID });

  if (existing) {
    return normalizeProgramRecord(existing, createDefaultProgram(userLabel));
  }

  const initial = createDefaultProgram(userLabel);
  await col.insertOne(initial);
  return initial;
}

export function prepareProgramUpdate(input: unknown, existing: ProgramRecord, updatedBy: string): ProgramRecord {
  const normalized = normalizeProgramRecord(input, existing);
  return {
    ...normalized,
    _id: existing._id,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
    updatedBy,
  };
}

/**
 * Build program participants from the advocates (users) collection.
 * Each active advocate becomes an assignable / mentionable participant.
 */
export function extractProgramParticipants(
  advocates: Array<{ name?: string; email: string; role?: string; title?: string | null; isActive?: boolean }>
): ProgramParticipant[] {
  const map = new Map<string, ProgramParticipant>();

  for (const advocate of advocates) {
    if (advocate.isActive === false) continue;
    const email = advocate.email?.trim();
    if (!email) continue;
    const name = advocate.name?.trim() || email.split('@')[0] || email;
    map.set(email.toLowerCase(), {
      name,
      email,
      role: advocate.title || advocate.role || 'Team Member',
      handle: buildParticipantHandle({ name, email }),
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function extractProgramMentions(program: ProgramRecord): ProgramMentionNotification[] {
  return [
    ...program.workstreams.flatMap((item) =>
      buildMentionNotifications({ entityType: 'workstream', entityId: item.id, entityLabel: item.title, comments: item.comments })
    ),
    ...program.tasks.flatMap((item) =>
      buildMentionNotifications({ entityType: 'task', entityId: item.id, entityLabel: item.title, comments: item.comments })
    ),
    ...program.stakeholders.flatMap((item) =>
      buildMentionNotifications({ entityType: 'stakeholder', entityId: item.id, entityLabel: item.name, comments: item.comments })
    ),
    ...program.decisions.flatMap((item) =>
      buildMentionNotifications({ entityType: 'decision', entityId: item.id, entityLabel: item.title, comments: item.comments })
    ),
    ...program.risks.flatMap((item) =>
      buildMentionNotifications({ entityType: 'risk', entityId: item.id, entityLabel: item.title, comments: item.comments })
    ),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
