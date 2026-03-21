export type ProgramHealth = 'on_track' | 'watch' | 'at_risk';

export type ProgramStage = 'strategy' | 'build' | 'validate' | 'launch' | 'post_launch';

export type ProgramStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';

export type ProgramPriority = 'critical' | 'high' | 'medium' | 'low';

export type DecisionStatus = 'pending' | 'approved' | 'deferred';

export type DecisionCategory = 'product' | 'engineering' | 'launch' | 'content' | 'operations';

export type RiskStatus = 'open' | 'mitigated' | 'resolved';

export type StakeholderGroup =
  | 'product'
  | 'engineering'
  | 'devrel'
  | 'docs'
  | 'operations'
  | 'leadership';

export type ProgramRepoArea = 'mobile' | 'admin' | 'docs';
export type ProgramEntityType = 'workstream' | 'task' | 'stakeholder' | 'decision' | 'risk';
export type ProgramReferenceType = 'github_issue' | 'github_pr' | 'docs_page' | 'figma' | 'slack' | 'other';

export type ProgramActivityType = 'created' | 'field_updated' | 'comment_added' | 'reply_added';

export interface ProgramActivityEntry {
  id: string;
  type: ProgramActivityType;
  actorName: string;
  actorEmail: string;
  createdAt: string;
  summary: string;
}

export interface ProgramParticipant {
  name: string;
  email: string;
  role: string;
  handle: string;
}

export interface ProgramMention {
  name: string;
  email: string;
  handle: string;
}

export interface ProgramMentionNotification {
  id: string;
  entityType: ProgramEntityType;
  entityId: string;
  entityLabel: string;
  commentId: string;
  email: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  message: string;
  mentionedAs: string;
}

export interface ProgramAudit {
  createdAt: string;
  createdBy: string;
  createdByEmail: string;
  updatedAt: string;
  updatedBy: string;
  updatedByEmail: string;
  activity: ProgramActivityEntry[];
}

export interface ProgramComment {
  id: string;
  authorName: string;
  authorEmail: string;
  message: string;
  createdAt: string;
  mentions: ProgramMention[];
  replies: ProgramComment[];
}

export interface ProgramReference {
  id: string;
  type: ProgramReferenceType;
  label: string;
  url: string;
  notes: string;
}

export interface ProgramRepo {
  id: string;
  name: string;
  area: ProgramRepoArea;
  path: string;
  summary: string;
}

export interface ProgramPhase {
  id: ProgramStage;
  title: string;
  description: string;
  exitCriteria: string;
}

export interface ProgramChecklistItem {
  id: string;
  label: string;
  owner: string;
  assigneeEmail: string;
  linkedTaskId?: string;
  status: ProgramStatus;
  dueDate: string;
  sortOrder: number;
}

export interface ProgramWorkstream {
  id: string;
  title: string;
  repoId: string;
  owner: string;
  stage: ProgramStage;
  status: ProgramStatus;
  health: ProgramHealth;
  completion: number;
  targetDate: string;
  summary: string;
  stakeholders: string[];
  notes: string;
  checklist: ProgramChecklistItem[];
  comments: ProgramComment[];
  references: ProgramReference[];
  audit: ProgramAudit;
}

export interface ProgramTask {
  id: string;
  title: string;
  description: string;
  workstreamId: string;
  repoId: string;
  sourceChecklistItemId?: string;
  owner: string;
  stage: ProgramStage;
  status: ProgramStatus;
  priority: ProgramPriority;
  dueDate: string;
  stakeholders: string[];
  dependencies: string;
  comments: ProgramComment[];
  references: ProgramReference[];
  audit: ProgramAudit;
}

export interface ProgramDecision {
  id: string;
  title: string;
  category: DecisionCategory;
  owner: string;
  dueDate: string;
  status: DecisionStatus;
  impact: string;
  notes: string;
  comments: ProgramComment[];
  references: ProgramReference[];
  audit: ProgramAudit;
}

export interface ProgramStakeholder {
  id: string;
  name: string;
  role: string;
  group: StakeholderGroup;
  focus: string;
  responsibilities: string[];
  comments: ProgramComment[];
  references: ProgramReference[];
  audit: ProgramAudit;
}

export interface ProgramRisk {
  id: string;
  title: string;
  owner: string;
  level: Exclude<ProgramPriority, 'critical'>;
  status: RiskStatus;
  trigger: string;
  mitigation: string;
  comments: ProgramComment[];
  references: ProgramReference[];
  audit: ProgramAudit;
}

export interface ProgramRecord {
  _id: string;
  name: string;
  health: ProgramHealth;
  objective: string;
  launchWindow: string;
  operatingCadence: string;
  successMeasures: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  repos: ProgramRepo[];
  phases: ProgramPhase[];
  workstreams: ProgramWorkstream[];
  tasks: ProgramTask[];
  stakeholders: ProgramStakeholder[];
  decisions: ProgramDecision[];
  risks: ProgramRisk[];
  snapshots?: ProgramSnapshot[];
}

export interface ProgramSnapshot {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  summary: string;
  markdownReport: string;
}

export const PROGRAM_HEALTH_OPTIONS: ProgramHealth[] = ['on_track', 'watch', 'at_risk'];

export const PROGRAM_STAGE_OPTIONS: ProgramStage[] = ['strategy', 'build', 'validate', 'launch', 'post_launch'];

export const PROGRAM_STATUS_OPTIONS: ProgramStatus[] = ['not_started', 'in_progress', 'blocked', 'complete'];

export const PROGRAM_PRIORITY_OPTIONS: ProgramPriority[] = ['critical', 'high', 'medium', 'low'];

export const DECISION_STATUS_OPTIONS: DecisionStatus[] = ['pending', 'approved', 'deferred'];

export const DECISION_CATEGORY_OPTIONS: DecisionCategory[] = ['product', 'engineering', 'launch', 'content', 'operations'];

export const RISK_STATUS_OPTIONS: RiskStatus[] = ['open', 'mitigated', 'resolved'];

export const RISK_LEVEL_OPTIONS: Array<Exclude<ProgramPriority, 'critical'>> = ['high', 'medium', 'low'];

export const STAKEHOLDER_GROUP_OPTIONS: StakeholderGroup[] = [
  'product',
  'engineering',
  'devrel',
  'docs',
  'operations',
  'leadership',
];

export const PROGRAM_REPO_AREA_OPTIONS: ProgramRepoArea[] = ['mobile', 'admin', 'docs'];

export const PROGRAM_REFERENCE_TYPE_OPTIONS: ProgramReferenceType[] = [
  'github_issue',
  'github_pr',
  'docs_page',
  'figma',
  'slack',
  'other',
];

export const PROGRAM_HEALTH_LABELS: Record<ProgramHealth, string> = {
  on_track: 'On Track',
  watch: 'Watch',
  at_risk: 'At Risk',
};

export const PROGRAM_STAGE_LABELS: Record<ProgramStage, string> = {
  strategy: 'Strategy',
  build: 'Build',
  validate: 'Validate',
  launch: 'Launch',
  post_launch: 'Post-Launch',
};

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  complete: 'Complete',
};

export const PROGRAM_PRIORITY_LABELS: Record<ProgramPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  deferred: 'Deferred',
};

export const DECISION_CATEGORY_LABELS: Record<DecisionCategory, string> = {
  product: 'Product',
  engineering: 'Engineering',
  launch: 'Launch',
  content: 'Content',
  operations: 'Operations',
};

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Open',
  mitigated: 'Mitigated',
  resolved: 'Resolved',
};

export const STAKEHOLDER_GROUP_LABELS: Record<StakeholderGroup, string> = {
  product: 'Product',
  engineering: 'Engineering',
  devrel: 'DevRel',
  docs: 'Docs',
  operations: 'Operations',
  leadership: 'Leadership',
};

export const PROGRAM_REPO_AREA_LABELS: Record<ProgramRepoArea, string> = {
  mobile: 'Mobile',
  admin: 'Admin',
  docs: 'Docs',
};

export const PROGRAM_REFERENCE_TYPE_LABELS: Record<ProgramReferenceType, string> = {
  github_issue: 'GitHub Issue',
  github_pr: 'GitHub PR',
  docs_page: 'Docs Page',
  figma: 'Figma',
  slack: 'Slack',
  other: 'Other',
};
