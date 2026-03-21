'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddCircleOutline,
  AlternateEmail,
  ArrowDownward,
  ArrowUpward,
  AutoGraph,
  Campaign,
  CheckCircle,
  ContentCopy,
  DeleteOutline,
  Description,
  Download,
  Print,
  Flag,
  Groups,
  Insights,
  PhoneIphone,
  Save,
  Sync,
  WarningAmber,
  Web,
} from '@mui/icons-material';
import { HelpButton, PageHelp, useHelp } from '@/components/help';
import ProgramAuditTrail from '@/components/program/ProgramAuditTrail';
import ProgramCommentThread from '@/components/program/ProgramCommentThread';
import ProgramReferenceList from '@/components/program/ProgramReferenceList';
import { createProgramAudit, createProgramReference } from '@/lib/program-utils';
import { mongoColors } from '@/theme';
import type { ProgramRecord } from '@/types/program';
import {
  DECISION_CATEGORY_LABELS,
  DECISION_STATUS_LABELS,
  PROGRAM_HEALTH_LABELS,
  PROGRAM_PRIORITY_LABELS,
  PROGRAM_REPO_AREA_LABELS,
  PROGRAM_STAGE_LABELS,
  PROGRAM_STATUS_LABELS,
  RISK_STATUS_LABELS,
  STAKEHOLDER_GROUP_LABELS,
} from '@/types/program';

interface SessionUser {
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

interface ProgramParticipantView {
  name: string;
  email: string;
  role: string;
  handle: string;
}

interface MentionNotification {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  commentId: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  message: string;
  mentionedAs: string;
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

function getHealthColor(health: ProgramRecord['health']) {
  if (health === 'on_track') return mongoColors.green;
  if (health === 'watch') return '#F59E0B';
  return '#DB3030';
}

function getStatusColor(status: string) {
  if (status === 'complete') return mongoColors.green;
  if (status === 'blocked') return '#DB3030';
  if (status === 'in_progress') return '#016BF8';
  return mongoColors.gray[500];
}

function getPriorityColor(priority: string) {
  if (priority === 'critical') return '#DB3030';
  if (priority === 'high') return '#F97316';
  if (priority === 'medium') return '#F59E0B';
  return '#0EA5A4';
}

function isOverdue(date: string, status: string) {
  if (!date || status === 'complete') return false;
  return new Date(date) < new Date(new Date().toDateString());
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatCard({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  color: string;
}) {
  return (
    <Card sx={{ height: '100%', border: `1px solid ${alpha(color, 0.18)}`, background: `linear-gradient(160deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.03)} 100%)` }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>{value}</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>{detail}</Typography>
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: alpha(color, 0.16), color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export default function ProgramPage() {
  const { openHelp } = useHelp();
  const [tab, setTab] = useState(0);
  const [program, setProgram] = useState<ProgramRecord | null>(null);
  const [draft, setDraft] = useState<ProgramRecord | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [participants, setParticipants] = useState<ProgramParticipantView[]>([]);
  const [notifications, setNotifications] = useState<MentionNotification[]>([]);
  const [draggedChecklist, setDraggedChecklist] = useState<{ workstreamId: string; itemId: string } | null>(null);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [programRes, userRes] = await Promise.all([fetch('/api/program'), fetch('/api/auth/me')]);

        if (!programRes.ok) throw new Error('Failed to load program workspace');

        const programJson = await programRes.json();
        setProgram(programJson.program);
        setDraft(programJson.program);
        setParticipants(programJson.participants || []);
        setNotifications(programJson.notifications || []);

        if (userRes.ok) {
          const userJson = await userRes.json();
          setUser(userJson);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load program workspace');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const commentUser = useMemo(() => (user ? { name: user.name, email: user.email } : null), [user]);
  const availableParticipants = useMemo(() => {
    if (!commentUser) return participants;

    if (participants.some((participant) => participant.email.toLowerCase() === commentUser.email.toLowerCase())) {
      return participants;
    }

    return [
      ...participants,
      {
        name: commentUser.name,
        email: commentUser.email,
        role: user?.role || 'manager',
        handle: `@${commentUser.email.split('@')[0].toLowerCase()}`,
      },
    ];
  }, [participants, commentUser, user?.role]);

  const metrics = useMemo(() => {
    if (!draft) return null;

    const blockedTasks = draft.tasks.filter((task) => task.status === 'blocked').length;
    const pendingDecisions = draft.decisions.filter((decision) => decision.status === 'pending').length;
    const openRisks = draft.risks.filter((risk) => risk.status !== 'resolved').length;
    const avgCompletion = draft.workstreams.length
      ? Math.round(draft.workstreams.reduce((sum, workstream) => sum + workstream.completion, 0) / draft.workstreams.length)
      : 0;

    return { blockedTasks, pendingDecisions, openRisks, avgCompletion };
  }, [draft]);

  const repoMap = useMemo(() => {
    if (!draft) return new Map<string, ProgramRecord['repos'][number]>();
    return new Map(draft.repos.map((repo) => [repo.id, repo]));
  }, [draft]);

  const repoCounts = useMemo(() => {
    if (!draft) return [];

    return draft.repos.map((repo) => {
      const count = draft.tasks.filter((task) => task.repoId === repo.id).length;
      const blocked = draft.tasks.filter((task) => task.repoId === repo.id && task.status === 'blocked').length;
      return { repo, count, blocked };
    });
  }, [draft]);

  const checklistMetrics = useMemo(() => {
    if (!draft) return { overdue: 0, blocked: 0, total: 0 };

    const items = draft.workstreams.flatMap((workstream) => workstream.checklist);

    return {
      total: items.length,
      overdue: items.filter((item) => isOverdue(item.dueDate, item.status)).length,
      blocked: items.filter((item) => item.status === 'blocked').length,
    };
  }, [draft]);

  const checklistFilters = useMemo(() => {
    const assignees = Array.from(
      new Set(
        draft?.workstreams.flatMap((workstream) =>
          workstream.checklist.map((item) => item.assigneeEmail || item.owner)
        ) || []
      )
    ).filter(Boolean);

    return assignees.sort();
  }, [draft]);

  const [checklistAssigneeFilter, setChecklistAssigneeFilter] = useState('all');
  const [checklistStatusFilter, setChecklistStatusFilter] = useState('all');
  const [savedView, setSavedView] = useState('all');

  const savedViewDescription = useMemo(() => {
    if (savedView === 'launch_blockers') return 'Blocked tasks, blocked checklist items, and at-risk workstreams.';
    if (savedView === 'overdue_work') return 'Checklist items and tasks that are late and still open.';
    if (savedView === 'needs_decision') return 'Pending decisions plus the work that may slip waiting on them.';
    return 'Full program view across all rollout work.';
  }, [savedView]);

  const recentActivity = useMemo(() => {
    if (!draft) return [];

    const activity = [
      ...draft.workstreams.flatMap((item) => item.audit.activity.map((entry) => ({ ...entry, entityType: 'Workstream', entityLabel: item.title }))),
      ...draft.tasks.flatMap((item) => item.audit.activity.map((entry) => ({ ...entry, entityType: 'Task', entityLabel: item.title }))),
      ...draft.stakeholders.flatMap((item) => item.audit.activity.map((entry) => ({ ...entry, entityType: 'Stakeholder', entityLabel: item.name }))),
      ...draft.decisions.flatMap((item) => item.audit.activity.map((entry) => ({ ...entry, entityType: 'Decision', entityLabel: item.title }))),
      ...draft.risks.flatMap((item) => item.audit.activity.map((entry) => ({ ...entry, entityType: 'Risk', entityLabel: item.title }))),
    ];

    return activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  }, [draft]);

  const isDirty = useMemo(() => {
    if (!program || !draft) return false;
    return JSON.stringify(program) !== JSON.stringify(draft);
  }, [program, draft]);

  const myChecklistActions = useMemo(() => {
    if (!draft || !commentUser) return [];

    return draft.workstreams.flatMap((workstream) =>
      workstream.checklist
        .filter((item) => item.assigneeEmail.toLowerCase() === commentUser.email.toLowerCase() && item.status !== 'complete')
        .map((item) => ({
          ...item,
          workstreamTitle: workstream.title,
          workstreamId: workstream.id,
          repoId: workstream.repoId,
        }))
    );
  }, [draft, commentUser]);

  const myTaskActions = useMemo(() => {
    if (!draft || !commentUser) return [];

    return draft.tasks.filter((task) => task.owner.toLowerCase() === commentUser.name.toLowerCase() && task.status !== 'complete');
  }, [draft, commentUser]);

  const weeklyReport = useMemo(() => {
    if (!draft || !metrics) return '';

    const reportLines = [
      `# ${draft.name}`,
      ``,
      `Health: ${PROGRAM_HEALTH_LABELS[draft.health]}`,
      `Launch Window: ${draft.launchWindow}`,
      `Operating Cadence: ${draft.operatingCadence}`,
      ``,
      `## Weekly Rollup`,
      `- Average readiness: ${metrics.avgCompletion}%`,
      `- Blocked tasks: ${metrics.blockedTasks}`,
      `- Pending decisions: ${metrics.pendingDecisions}`,
      `- Open risks: ${metrics.openRisks}`,
      `- Overdue checklist items: ${checklistMetrics.overdue}`,
      ``,
      `## Workstreams`,
      ...draft.workstreams.map((workstream) =>
        `- ${workstream.title}: ${PROGRAM_STATUS_LABELS[workstream.status]} / ${PROGRAM_HEALTH_LABELS[workstream.health]} / ${workstream.completion}%`
      ),
      ``,
      `## Launch Blockers`,
      ...draft.tasks.filter((task) => task.status === 'blocked').map((task) => `- Task: ${task.title} (${task.owner})`),
      ...draft.workstreams.flatMap((workstream) =>
        workstream.checklist.filter((item) => item.status === 'blocked').map((item) => `- Checklist: ${workstream.title} / ${item.label} (${item.owner})`)
      ),
      ``,
      `## Pending Decisions`,
      ...draft.decisions.filter((decision) => decision.status === 'pending').map((decision) => `- ${decision.title} (${decision.owner}) due ${formatDate(decision.dueDate)}`),
      ``,
      `## Open Risks`,
      ...draft.risks.filter((risk) => risk.status !== 'resolved').map((risk) => `- ${risk.title} (${risk.owner}) [${risk.status}]`),
    ];

    return reportLines.join('\n');
  }, [draft, metrics, checklistMetrics]);

  const csvExports = useMemo(() => {
    if (!draft) return { tasks: '', checklist: '', decisions: '', risks: '' };

    const toCsv = (rows: string[][]) => rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');

    return {
      tasks: toCsv([
        ['Title', 'Owner', 'Repo', 'Stage', 'Status', 'Priority', 'Due Date'],
        ...draft.tasks.map((task) => [
          task.title,
          task.owner,
          repoMap.get(task.repoId)?.name || task.repoId,
          PROGRAM_STAGE_LABELS[task.stage],
          PROGRAM_STATUS_LABELS[task.status],
          PROGRAM_PRIORITY_LABELS[task.priority],
          task.dueDate,
        ]),
      ]),
      checklist: toCsv([
        ['Workstream', 'Checklist Item', 'Owner', 'Assignee', 'Status', 'Due Date'],
        ...draft.workstreams.flatMap((workstream) =>
          workstream.checklist.map((item) => [
            workstream.title,
            item.label,
            item.owner,
            item.assigneeEmail,
            PROGRAM_STATUS_LABELS[item.status],
            item.dueDate,
          ])
        ),
      ]),
      decisions: toCsv([
        ['Title', 'Owner', 'Status', 'Due Date', 'Impact'],
        ...draft.decisions.map((decision) => [
          decision.title,
          decision.owner,
          DECISION_STATUS_LABELS[decision.status],
          decision.dueDate,
          decision.impact,
        ]),
      ]),
      risks: toCsv([
        ['Title', 'Owner', 'Status', 'Level', 'Trigger'],
        ...draft.risks.map((risk) => [risk.title, risk.owner, RISK_STATUS_LABELS[risk.status], risk.level, risk.trigger]),
      ]),
    };
  }, [draft, repoMap]);

  function updateDraft(updater: (current: ProgramRecord) => ProgramRecord) {
    setDraft((current) => (current ? updater(current) : current));
    setMessage('');
  }

  function updateWorkstream(workstreamId: string, changes: Partial<ProgramRecord['workstreams'][number]>) {
    updateDraft((current) => ({
      ...current,
      workstreams: current.workstreams.map((workstream) =>
        workstream.id === workstreamId ? { ...workstream, ...changes } : workstream
      ),
    }));
  }

  function resequenceChecklist(items: ProgramRecord['workstreams'][number]['checklist']) {
    return items.map((item, index) => ({ ...item, sortOrder: index }));
  }

  function updateWorkstreamChecklist(
    workstreamId: string,
    updater: (items: ProgramRecord['workstreams'][number]['checklist']) => ProgramRecord['workstreams'][number]['checklist']
  ) {
    updateDraft((current) => ({
      ...current,
      workstreams: current.workstreams.map((workstream) =>
        workstream.id === workstreamId
          ? {
              ...workstream,
              checklist: resequenceChecklist(updater(workstream.checklist)),
            }
          : workstream
      ),
    }));
  }

  function updateChecklistItem(
    workstreamId: string,
    itemId: string,
    changes: Partial<ProgramRecord['workstreams'][number]['checklist'][number]>
  ) {
    updateWorkstreamChecklist(workstreamId, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, ...changes } : item))
    );
  }

  function addChecklistItem(workstreamId: string) {
    updateWorkstreamChecklist(workstreamId, (items) => [
      ...items,
      {
        id: makeId('checklist'),
        label: 'New checklist item',
        owner: user?.name || 'Owner',
        assigneeEmail: user?.email || '',
        status: 'not_started',
        dueDate: '',
        sortOrder: items.length,
      },
    ]);
  }

  function removeChecklistItem(workstreamId: string, itemId: string) {
    updateWorkstreamChecklist(workstreamId, (items) => items.filter((item) => item.id !== itemId));
    setSelectedChecklistIds((current) => current.filter((id) => id !== itemId));
  }

  function toggleChecklistSelection(itemId: string) {
    setSelectedChecklistIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    );
  }

  function applyBulkChecklistUpdate(changes: Partial<ProgramRecord['workstreams'][number]['checklist'][number]>) {
    updateDraft((current) => ({
      ...current,
      workstreams: current.workstreams.map((workstream) => ({
        ...workstream,
        checklist: resequenceChecklist(
          workstream.checklist.map((item) =>
            selectedChecklistIds.includes(item.id) ? { ...item, ...changes } : item
          )
        ),
      })),
    }));
  }

  function promoteChecklistItem(workstreamId: string, itemId: string) {
    updateDraft((current) => {
      const workstream = current.workstreams.find((entry) => entry.id === workstreamId);
      const item = workstream?.checklist.find((entry) => entry.id === itemId);
      if (!workstream || !item) return current;

      const newTaskId = makeId('task');

      return {
        ...current,
        tasks: [
          ...current.tasks,
          {
            id: newTaskId,
            title: item.label,
            description: `Promoted from checklist in ${workstream.title}.`,
            workstreamId,
            repoId: workstream.repoId,
            sourceChecklistItemId: item.id,
            owner: item.owner,
            stage: workstream.stage,
            status: item.status,
            priority: item.status === 'blocked' ? 'high' : 'medium',
            dueDate: item.dueDate,
            stakeholders: workstream.stakeholders,
            dependencies: 'Promoted from workstream checklist.',
            comments: [],
            references: [],
            audit: createProgramAudit(user?.name || 'Owner', user?.email || '', `Promoted checklist item ${item.label} into a launch task.`),
          },
        ],
        workstreams: current.workstreams.map((entry) =>
          entry.id === workstreamId
            ? {
                ...entry,
                checklist: resequenceChecklist(
                  entry.checklist.map((checklistItem) =>
                    checklistItem.id === itemId ? { ...checklistItem, linkedTaskId: newTaskId } : checklistItem
                  )
                ),
              }
            : entry
        ),
      };
    });

    setTab(1);
    setMessage('Checklist item promoted into the launch task board.');
  }

  function moveChecklistItem(workstreamId: string, itemId: string, direction: 'up' | 'down') {
    updateWorkstreamChecklist(workstreamId, (items) => {
      const currentIndex = items.findIndex((item) => item.id === itemId);
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return items;

      const nextItems = [...items];
      const [movedItem] = nextItems.splice(currentIndex, 1);
      nextItems.splice(nextIndex, 0, movedItem);
      return nextItems;
    });
  }

  function reorderChecklistItem(workstreamId: string, sourceItemId: string, targetItemId: string) {
    if (sourceItemId === targetItemId) return;

    updateWorkstreamChecklist(workstreamId, (items) => {
      const sourceIndex = items.findIndex((item) => item.id === sourceItemId);
      const targetIndex = items.findIndex((item) => item.id === targetItemId);

      if (sourceIndex < 0 || targetIndex < 0) return items;

      const nextItems = [...items];
      const [movedItem] = nextItems.splice(sourceIndex, 1);
      nextItems.splice(targetIndex, 0, movedItem);
      return nextItems;
    });
  }

  function updateTask(taskId: string, changes: Partial<ProgramRecord['tasks'][number]>) {
    updateDraft((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
    }));
  }

  function addTask() {
    const actorName = user?.name || 'Owner';
    const actorEmail = user?.email || '';

    updateDraft((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: makeId('task'),
          title: 'New launch task',
          description: 'Describe the milestone, owner, and dependency.',
          workstreamId: current.workstreams[0]?.id || '',
          repoId: current.repos[0]?.id || '',
          owner: user?.name || 'Owner',
          stage: 'build',
          status: 'not_started',
          priority: 'medium',
          dueDate: new Date().toISOString().slice(0, 10),
          stakeholders: [],
          dependencies: 'None.',
          comments: [],
          references: [],
          audit: createProgramAudit(actorName, actorEmail, 'Created task New launch task.'),
        },
      ],
    }));
  }

  function removeTask(taskId: string) {
    updateDraft((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
  }

  function updateDecision(decisionId: string, changes: Partial<ProgramRecord['decisions'][number]>) {
    updateDraft((current) => ({
      ...current,
      decisions: current.decisions.map((decision) =>
        decision.id === decisionId ? { ...decision, ...changes } : decision
      ),
    }));
  }

  function addDecision() {
    const actorName = user?.name || 'Owner';
    const actorEmail = user?.email || '';

    updateDraft((current) => ({
      ...current,
      decisions: [
        ...current.decisions,
        {
          id: makeId('decision'),
          title: 'New decision',
          category: 'operations',
          owner: user?.name || 'Owner',
          dueDate: new Date().toISOString().slice(0, 10),
          status: 'pending',
          impact: 'Document the launch impact of this decision.',
          notes: 'Add context, assumptions, and next action.',
          comments: [],
          references: [],
          audit: createProgramAudit(actorName, actorEmail, 'Created decision New decision.'),
        },
      ],
    }));
  }

  function removeDecision(decisionId: string) {
    updateDraft((current) => ({
      ...current,
      decisions: current.decisions.filter((decision) => decision.id !== decisionId),
    }));
  }

  function updateRisk(riskId: string, changes: Partial<ProgramRecord['risks'][number]>) {
    updateDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) => (risk.id === riskId ? { ...risk, ...changes } : risk)),
    }));
  }

  function addRisk() {
    const actorName = user?.name || 'Owner';
    const actorEmail = user?.email || '';

    updateDraft((current) => ({
      ...current,
      risks: [
        ...current.risks,
        {
          id: makeId('risk'),
          title: 'New rollout risk',
          owner: user?.name || 'Owner',
          level: 'medium',
          status: 'open',
          trigger: 'Describe what would cause this risk to materialize.',
          mitigation: 'Describe the mitigation or contingency plan.',
          comments: [],
          references: [],
          audit: createProgramAudit(actorName, actorEmail, 'Created risk New rollout risk.'),
        },
      ],
    }));
  }

  function removeRisk(riskId: string) {
    updateDraft((current) => ({
      ...current,
      risks: current.risks.filter((risk) => risk.id !== riskId),
    }));
  }

  function updateStakeholder(stakeholderId: string, changes: Partial<ProgramRecord['stakeholders'][number]>) {
    updateDraft((current) => ({
      ...current,
      stakeholders: current.stakeholders.map((stakeholder) =>
        stakeholder.id === stakeholderId ? { ...stakeholder, ...changes } : stakeholder
      ),
    }));
  }

  function addStakeholder() {
    const actorName = user?.name || 'Owner';
    const actorEmail = user?.email || '';

    updateDraft((current) => ({
      ...current,
      stakeholders: [
        ...current.stakeholders,
        {
          id: makeId('stakeholder'),
          name: 'New stakeholder',
          role: 'Role',
          group: 'operations',
          focus: 'Add what this stakeholder cares about.',
          responsibilities: ['Add responsibility'],
          comments: [],
          references: [],
          audit: createProgramAudit(actorName, actorEmail, 'Created stakeholder New stakeholder.'),
        },
      ],
    }));
  }

  function removeStakeholder(stakeholderId: string) {
    updateDraft((current) => ({
      ...current,
      stakeholders: current.stakeholders.filter((stakeholder) => stakeholder.id !== stakeholderId),
    }));
  }

  function updateWorkstreamReferences(workstreamId: string, references: ProgramRecord['workstreams'][number]['references']) {
    updateWorkstream(workstreamId, { references });
  }

  function updateTaskReferences(taskId: string, references: ProgramRecord['tasks'][number]['references']) {
    updateTask(taskId, { references });
  }

  function updateStakeholderReferences(stakeholderId: string, references: ProgramRecord['stakeholders'][number]['references']) {
    updateStakeholder(stakeholderId, { references });
  }

  function updateDecisionReferences(decisionId: string, references: ProgramRecord['decisions'][number]['references']) {
    updateDecision(decisionId, { references });
  }

  function updateRiskReferences(riskId: string, references: ProgramRecord['risks'][number]['references']) {
    updateRisk(riskId, { references });
  }

  function addSuccessMeasure() {
    updateDraft((current) => ({
      ...current,
      successMeasures: [...current.successMeasures, 'New success measure'],
    }));
  }

  function updateSuccessMeasure(index: number, value: string) {
    updateDraft((current) => ({
      ...current,
      successMeasures: current.successMeasures.map((measure, measureIndex) =>
        measureIndex === index ? value : measure
      ),
    }));
  }

  function removeSuccessMeasure(index: number) {
    updateDraft((current) => ({
      ...current,
      successMeasures: current.successMeasures.filter((_, measureIndex) => measureIndex !== index),
    }));
  }

  async function refreshProgramMeta() {
    const res = await fetch('/api/program', { method: 'PATCH' });
    if (!res.ok) return;
    const json = await res.json();
    const nextParticipants = json.participants || [];
    setParticipants(nextParticipants);
    setNotifications(json.notifications || []);

    if (commentUser && !nextParticipants.some((participant: ProgramParticipantView) => participant.email.toLowerCase() === commentUser.email.toLowerCase())) {
      setParticipants((current) => [
        ...current,
        {
          name: commentUser.name,
          email: commentUser.email,
          role: user?.role || 'manager',
          handle: `@${commentUser.email.split('@')[0].toLowerCase()}`,
        },
      ]);
    }
  }

  async function persistComment(entityType: 'workstream' | 'task' | 'stakeholder' | 'decision' | 'risk', entityId: string, text: string, parentId?: string) {
    const res = await fetch('/api/program/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, message: text, parentId }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.program) {
        setProgram(json.program);
        setDraft(json.program);
      }
      await refreshProgramMeta();
      setMessage('Comment posted and mentions refreshed.');
    }
  }

  async function handleSave() {
    if (!draft || !canEdit) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/program', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program: draft }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save program workspace');

      setProgram(json.program);
      setDraft(json.program);
      setParticipants(json.participants || participants);
      setNotifications(json.notifications || notifications);
      setMessage('Program workspace saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save program workspace');
    } finally {
      setSaving(false);
    }
  }

  async function copyWeeklyReport() {
    if (!weeklyReport) return;
    await navigator.clipboard.writeText(weeklyReport);
    setMessage('Weekly rollout report copied to clipboard.');
  }

  function exportWeeklyReport() {
    if (!weeklyReport) return;
    const filename = `${draft?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'program'}-weekly-report.md`;
    downloadTextFile(filename, weeklyReport, 'text/markdown');
    setMessage('Weekly rollout report exported.');
  }

  function exportProgramJson() {
    if (!draft) return;
    const filename = `${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'program'}.json`;
    downloadTextFile(filename, JSON.stringify(draft, null, 2), 'application/json');
    setMessage('Program JSON exported.');
  }

  function exportCsv(filename: string, content: string) {
    downloadTextFile(filename, content, 'text/csv');
    setMessage(`${filename} exported.`);
  }

  function saveSnapshot() {
    if (!draft) return;

    const createdAt = new Date().toISOString();
    const snapshotName = `Weekly Snapshot ${new Date(createdAt).toLocaleDateString()}`;

    updateDraft((current) => ({
      ...current,
      snapshots: [
        {
          id: makeId('snapshot'),
          name: snapshotName,
          createdAt,
          createdBy: user?.name || user?.email || 'Owner',
          summary: `Health ${PROGRAM_HEALTH_LABELS[current.health]}, ${metrics?.blockedTasks || 0} blocked tasks, ${metrics?.pendingDecisions || 0} pending decisions.`,
          markdownReport: weeklyReport,
        },
        ...(current.snapshots || []),
      ].slice(0, 12),
    }));

    setMessage('Weekly snapshot added to the program record. Save Program to persist it.');
  }

  function togglePrintMode() {
    setPrintMode((current) => !current);
    setMessage(printMode ? 'Exited leadership print mode.' : 'Leadership print mode enabled.');
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={22} />
        <Typography color="text.secondary">Loading rollout workspace...</Typography>
      </Box>
    );
  }

  if (!draft || !metrics) {
    return (
      <Box>
        <Alert severity="error">{error || 'Program workspace is unavailable.'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={printMode ? { '@media print': { '& .program-editor-only': { display: 'none !important' } } } : undefined}>
      <PageHelp page="program" onOpenDrawer={() => openHelp('program-rollout')} />

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: 4,
          border: `1px solid ${alpha(mongoColors.darkGreen, 0.14)}`,
          background: `radial-gradient(circle at top left, ${alpha(mongoColors.green, 0.22)} 0%, ${alpha('#D6F5E5', 0.55)} 32%, ${mongoColors.white} 100%)`,
        }}
      >
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} justifyContent="space-between">
          <Box sx={{ maxWidth: 900 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
              <Chip label="Program Management" sx={{ bgcolor: alpha(mongoColors.black, 0.08), color: mongoColors.black, fontWeight: 700 }} />
              <Chip label={PROGRAM_HEALTH_LABELS[draft.health]} sx={{ bgcolor: alpha(getHealthColor(draft.health), 0.14), color: getHealthColor(draft.health), fontWeight: 700 }} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{draft.name}</Typography>
              <HelpButton topic="program-rollout" onOpenDrawer={openHelp} />
            </Stack>
            <Typography variant="body1" sx={{ mt: 1.5, maxWidth: 860, color: 'text.secondary' }}>{draft.objective}</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>Launch Window</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{draft.launchWindow}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>Operating Cadence</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{draft.operatingCadence}</Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ minWidth: { lg: 280 } }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Overall Health"
              value={draft.health}
              onChange={(event) => updateDraft((current) => ({ ...current, health: event.target.value as ProgramRecord['health'] }))}
              disabled={!canEdit}
            >
              {Object.entries(PROGRAM_HEALTH_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <Button
              className="program-editor-only"
              sx={{ mt: 1.5 }}
              fullWidth
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={!canEdit || saving || !isDirty}
            >
              {saving ? 'Saving...' : 'Save Program'}
            </Button>
            <Stack className="program-editor-only" direction="row" spacing={1} sx={{ mt: 1.25 }}>
              <Button size="small" variant="outlined" startIcon={<Print />} onClick={togglePrintMode}>
                {printMode ? 'Exit Print Mode' : 'Print Mode'}
              </Button>
              <Button size="small" variant="outlined" onClick={saveSnapshot}>
                Save Snapshot
              </Button>
            </Stack>
            <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: isDirty ? 'warning.main' : 'text.secondary' }}>
              {isDirty ? 'You have unsaved changes.' : 'Everything is saved.'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
              Updated by {draft.updatedBy} on {new Date(draft.updatedAt).toLocaleString()}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
      {!canEdit && <Alert severity="info" sx={{ mb: 3 }}>You have read-only access. Managers and admins can update records, save changes, and post threaded updates.</Alert>}
      {canEdit && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Update fields inline, add comments directly on each record, then click Save Program to persist everything.
        </Alert>
      )}

      <Card className="program-editor-only" sx={{ mb: 3, border: `1px solid ${alpha('#016BF8', 0.18)}` }}>
        <CardContent>
          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Mentions Inbox</Typography>
              <Typography variant="body2" color="text.secondary">
                Use `@handle` mentions in comments to direct action requests and decision follow-ups to specific teammates.
              </Typography>
            </Box>
            <Chip icon={<AlternateEmail />} label={`${notifications.length} mention${notifications.length === 1 ? '' : 's'}`} color="primary" variant="outlined" />
          </Stack>
          <Stack spacing={1.25}>
            {notifications.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No active mentions for your account.</Typography>
            ) : (
              notifications.slice(0, 6).map((notification) => (
                <Box key={notification.id} sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha('#016BF8', 0.05), border: `1px solid ${alpha('#016BF8', 0.15)}` }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Chip label={notification.entityType} size="small" variant="outlined" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{notification.entityLabel}</Typography>
                      </Stack>
                      <Typography variant="body2">{notification.authorName} mentioned {notification.mentionedAs}</Typography>
                      <Typography variant="caption" color="text.secondary">{notification.message}</Typography>
                    </Box>
                    <Chip label={new Date(notification.createdAt).toLocaleString()} size="small" sx={{ width: 'fit-content' }} />
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>

      <Grid className="program-editor-only" container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard icon={<AutoGraph />} label="Average Readiness" value={`${metrics.avgCompletion}%`} detail="Average completion across all workstreams" color={mongoColors.darkGreen} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard icon={<Sync />} label="Blocked Tasks" value={metrics.blockedTasks} detail="Active tasks currently blocked" color="#DB3030" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard icon={<Flag />} label="Pending Decisions" value={metrics.pendingDecisions} detail="Leadership or cross-team calls still open" color="#F59E0B" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard icon={<WarningAmber />} label="Open Risks" value={metrics.openRisks} detail="Risks still needing mitigation or closure" color="#016BF8" />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Checklist Readiness</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${checklistMetrics.total} total`} />
                <Chip label={`${checklistMetrics.overdue} overdue`} color={checklistMetrics.overdue ? 'error' : 'default'} />
                <Chip label={`${checklistMetrics.blocked} blocked`} color={checklistMetrics.blocked ? 'warning' : 'default'} />
                <Chip label={`${selectedChecklistIds.length} selected`} color={selectedChecklistIds.length ? 'info' : 'default'} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Checklist Filters</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Saved View"
                    value={savedView}
                    onChange={(event) => setSavedView(event.target.value)}
                  >
                    <MenuItem value="all">All Work</MenuItem>
                    <MenuItem value="launch_blockers">Launch Blockers</MenuItem>
                    <MenuItem value="overdue_work">Overdue Work</MenuItem>
                    <MenuItem value="needs_decision">Needs Decision</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Assignee"
                    value={checklistAssigneeFilter}
                    onChange={(event) => setChecklistAssigneeFilter(event.target.value)}
                  >
                    <MenuItem value="all">All assignees</MenuItem>
                    {checklistFilters.map((assignee) => (
                      <MenuItem key={assignee} value={assignee}>{assignee}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Status"
                    value={checklistStatusFilter}
                    onChange={(event) => setChecklistStatusFilter(event.target.value)}
                  >
                    <MenuItem value="all">All statuses</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    {Object.entries(PROGRAM_STATUS_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                {savedViewDescription}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {canEdit && selectedChecklistIds.length > 0 && (
        <Card className="program-editor-only" sx={{ mb: 3, border: `1px solid ${alpha(mongoColors.darkGreen, 0.16)}` }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ md: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Bulk Checklist Actions</Typography>
                <Typography variant="body2" color="text.secondary">Apply updates to the selected checklist items across workstreams.</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" onClick={() => applyBulkChecklistUpdate({ status: 'in_progress' })}>Mark In Progress</Button>
                <Button size="small" variant="outlined" onClick={() => applyBulkChecklistUpdate({ status: 'blocked' })}>Mark Blocked</Button>
                <Button size="small" variant="outlined" onClick={() => applyBulkChecklistUpdate({ status: 'complete' })}>Mark Complete</Button>
                <Button size="small" variant="outlined" onClick={() => applyBulkChecklistUpdate({ assigneeEmail: user?.email || '', owner: user?.name || 'Owner' })}>Assign To Me</Button>
                <Button size="small" color="inherit" onClick={() => setSelectedChecklistIds([])}>Clear Selection</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid className="program-editor-only" container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly Review Export</Typography>
                  <Typography variant="body2" color="text.secondary">Generate a leadership-ready rollout snapshot for status reviews and PMO reporting.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" startIcon={<ContentCopy />} onClick={() => void copyWeeklyReport()}>
                    Copy
                  </Button>
                  <Button size="small" variant="contained" startIcon={<Download />} onClick={exportWeeklyReport}>
                    Export MD
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<Download />} onClick={exportProgramJson}>
                    Export JSON
                  </Button>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportCsv('program-tasks.csv', csvExports.tasks)}>
                  Tasks CSV
                </Button>
                <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportCsv('program-checklist.csv', csvExports.checklist)}>
                  Checklist CSV
                </Button>
                <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportCsv('program-decisions.csv', csvExports.decisions)}>
                  Decisions CSV
                </Button>
                <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportCsv('program-risks.csv', csvExports.risks)}>
                  Risks CSV
                </Button>
              </Stack>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(mongoColors.black, 0.03), border: `1px solid ${mongoColors.gray[200]}`, maxHeight: 280, overflow: 'auto' }}>
                <Typography component="pre" sx={{ m: 0, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {weeklyReport}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>My Dashboard</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(mongoColors.green, 0.06), border: `1px solid ${alpha(mongoColors.green, 0.18)}` }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>My Checklist Actions</Typography>
                    <Stack spacing={1}>
                      {myChecklistActions.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No open checklist items assigned to you.</Typography>
                      ) : (
                        myChecklistActions.slice(0, 6).map((item) => (
                          <Box key={item.id}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.workstreamTitle}{item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ''}</Typography>
                          </Box>
                        ))
                      )}
                    </Stack>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha('#016BF8', 0.05), border: `1px solid ${alpha('#016BF8', 0.16)}` }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>My Launch Tasks</Typography>
                    <Stack spacing={1}>
                      {myTaskActions.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No open launch tasks assigned to you.</Typography>
                      ) : (
                        myTaskActions.slice(0, 6).map((task) => (
                          <Box key={task.id}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{PROGRAM_STATUS_LABELS[task.status]} · Due {formatDate(task.dueDate)}</Typography>
                          </Box>
                        ))
                      )}
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {(draft.snapshots?.length || 0) > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Saved Weekly Snapshots</Typography>
            <Grid container spacing={2}>
              {(draft.snapshots || []).map((snapshot) => (
                <Grid key={snapshot.id} size={{ xs: 12, md: 6, xl: 4 }}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default', border: `1px solid ${mongoColors.gray[200]}` }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{snapshot.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(snapshot.createdAt).toLocaleString()} · {snapshot.createdBy}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>{snapshot.summary}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button size="small" variant="outlined" startIcon={<ContentCopy />} onClick={() => { void navigator.clipboard.writeText(snapshot.markdownReport); setMessage('Snapshot report copied to clipboard.'); }}>
                        Copy
                      </Button>
                      <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => { downloadTextFile(`${snapshot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`, snapshot.markdownReport, 'text/markdown'); setMessage('Snapshot report exported.'); }}>
                        Export
                      </Button>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Program Charter</Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Objective"
                value={draft.objective}
                onChange={(event) => updateDraft((current) => ({ ...current, objective: event.target.value }))}
                disabled={!canEdit}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Launch Window"
                value={draft.launchWindow}
                onChange={(event) => updateDraft((current) => ({ ...current, launchWindow: event.target.value }))}
                disabled={!canEdit}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Operating Cadence"
                value={draft.operatingCadence}
                onChange={(event) => updateDraft((current) => ({ ...current, operatingCadence: event.target.value }))}
                disabled={!canEdit}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Program Success Measures</Typography>
                {canEdit && (
                  <Button size="small" startIcon={<AddCircleOutline />} onClick={addSuccessMeasure}>
                    Add Measure
                  </Button>
                )}
              </Stack>
              <Grid container spacing={2}>
                {draft.successMeasures.map((measure, index) => (
                  <Grid key={`${measure}-${index}`} size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, p: 2, height: '100%', borderRadius: 3, bgcolor: alpha(mongoColors.green, 0.07), border: `1px solid ${alpha(mongoColors.green, 0.18)}` }}>
                      <CheckCircle sx={{ color: mongoColors.darkGreen, mt: 0.25 }} />
                      {canEdit ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={measure}
                          onChange={(event) => updateSuccessMeasure(index, event.target.value)}
                        />
                      ) : (
                        <Typography variant="body2">{measure}</Typography>
                      )}
                      {canEdit && (
                        <IconButton size="small" color="error" onClick={() => removeSuccessMeasure(index)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Repos In Scope</Typography>
              <Stack spacing={1.5}>
                {repoCounts.map(({ repo, count, blocked }) => (
                  <Box key={repo.id} sx={{ p: 1.75, borderRadius: 3, bgcolor: 'background.default', border: `1px solid ${mongoColors.gray[200]}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{repo.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{PROGRAM_REPO_AREA_LABELS[repo.area]} repo</Typography>
                      </Box>
                      <Chip label={`${count} tasks`} size="small" />
                    </Stack>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: blocked > 0 ? 'error.main' : 'text.secondary' }}>
                      {blocked > 0 ? `${blocked} blocked items need escalation` : 'No blocked tasks right now'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent Program Activity</Typography>
          <Grid container spacing={2}>
            {recentActivity.map((entry) => (
              <Grid key={`${entry.entityType}-${entry.entityLabel}-${entry.id}`} size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default', border: `1px solid ${mongoColors.gray[200]}` }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Chip label={entry.entityType} size="small" variant="outlined" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{entry.entityLabel}</Typography>
                      </Stack>
                      <Typography variant="body2">{entry.summary}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {entry.actorName} · {entry.actorEmail}
                      </Typography>
                    </Box>
                    <Chip label={new Date(entry.createdAt).toLocaleString()} size="small" sx={{ width: 'fit-content' }} />
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label="Workstreams" />
          <Tab label="Launch Tasks" />
          <Tab label="Stakeholders" />
          <Tab label="Decisions & Risks" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          {draft.workstreams.map((workstream) => {
            const repo = repoMap.get(workstream.repoId);
            const color = getHealthColor(workstream.health);
            const filteredChecklist = workstream.checklist.filter((item) => {
              if (savedView === 'launch_blockers') {
                return workstream.health === 'at_risk' || item.status === 'blocked';
              }
              if (savedView === 'overdue_work') {
                return isOverdue(item.dueDate, item.status);
              }
              if (savedView === 'needs_decision') {
                return draft.decisions.some((decision) => decision.status === 'pending');
              }

              const matchesAssignee = checklistAssigneeFilter === 'all' || (item.assigneeEmail || item.owner) === checklistAssigneeFilter;
              const matchesStatus =
                checklistStatusFilter === 'all' ||
                (checklistStatusFilter === 'overdue' ? isOverdue(item.dueDate, item.status) : item.status === checklistStatusFilter);
              return matchesAssignee && matchesStatus;
            });

            return (
              <Grid key={workstream.id} size={{ xs: 12, xl: 6 }}>
                <Card sx={{ height: '100%', border: `1px solid ${alpha(color, 0.18)}` }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{workstream.title}</Typography>
                        {canEdit ? (
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            size="small"
                            sx={{ mt: 1 }}
                            value={workstream.summary}
                            onChange={(event) => updateWorkstream(workstream.id, { summary: event.target.value })}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{workstream.summary}</Typography>
                        )}
                      </Box>
                      <Chip label={PROGRAM_HEALTH_LABELS[workstream.health]} size="small" sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 700 }} />
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                      <Chip label={`${PROGRAM_REPO_AREA_LABELS[repo?.area || 'admin']} - ${repo?.name || 'Repo'}`} size="small" variant="outlined" />
                      <Chip label={PROGRAM_STAGE_LABELS[workstream.stage]} size="small" variant="outlined" />
                      <Chip label={PROGRAM_STATUS_LABELS[workstream.status]} size="small" sx={{ bgcolor: alpha(getStatusColor(workstream.status), 0.12), color: getStatusColor(workstream.status), fontWeight: 700 }} />
                    </Stack>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Owner"
                          value={workstream.owner}
                          onChange={(event) => updateWorkstream(workstream.id, { owner: event.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Target Date"
                          type="date"
                          value={workstream.targetDate}
                          onChange={(event) => updateWorkstream(workstream.id, { targetDate: event.target.value })}
                          disabled={!canEdit}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Stage"
                          value={workstream.stage}
                          onChange={(event) => updateWorkstream(workstream.id, { stage: event.target.value as ProgramRecord['workstreams'][number]['stage'] })}
                          disabled={!canEdit}
                        >
                          {Object.entries(PROGRAM_STAGE_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Status"
                          value={workstream.status}
                          onChange={(event) => updateWorkstream(workstream.id, { status: event.target.value as ProgramRecord['workstreams'][number]['status'] })}
                          disabled={!canEdit}
                        >
                          {Object.entries(PROGRAM_STATUS_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Health"
                          value={workstream.health}
                          onChange={(event) => updateWorkstream(workstream.id, { health: event.target.value as ProgramRecord['workstreams'][number]['health'] })}
                          disabled={!canEdit}
                        >
                          {Object.entries(PROGRAM_HEALTH_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>

                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Completion</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{workstream.completion}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={workstream.completion} sx={{ height: 10, borderRadius: 999, bgcolor: alpha(color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                      {canEdit && (
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Completion %"
                          value={workstream.completion}
                          onChange={(event) => updateWorkstream(workstream.id, { completion: Number(event.target.value) })}
                          sx={{ mt: 1.5 }}
                          slotProps={{ htmlInput: { min: 0, max: 100 } }}
                        />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary">Key stakeholders</Typography>
                    {canEdit ? (
                      <TextField
                        fullWidth
                        size="small"
                        sx={{ mt: 0.75, mb: 2 }}
                        value={workstream.stakeholders.join(', ')}
                        onChange={(event) =>
                          updateWorkstream(workstream.id, {
                            stakeholders: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                          })
                        }
                        helperText="Comma-separated stakeholders"
                      />
                    ) : (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75, mb: 2 }}>
                        {workstream.stakeholders.map((stakeholder) => (
                          <Chip key={stakeholder} label={stakeholder} size="small" />
                        ))}
                      </Stack>
                    )}

                    <Typography variant="caption" color="text.secondary">Execution Notes</Typography>
                    {canEdit ? (
                      <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        size="small"
                        sx={{ mt: 0.5, mb: 2 }}
                        value={workstream.notes}
                        onChange={(event) => updateWorkstream(workstream.id, { notes: event.target.value })}
                      />
                    ) : (
                      <Typography variant="body2" sx={{ mt: 0.5, mb: 2 }}>{workstream.notes}</Typography>
                    )}

                    <Divider sx={{ mb: 1.5 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Phase Checklist</Typography>
                        <Typography variant="caption" color="text.secondary">These checklist items are saved with the workstream and can be managed directly here.</Typography>
                      </Box>
                      {canEdit && (
                        <Button size="small" startIcon={<AddCircleOutline />} onClick={() => addChecklistItem(workstream.id)}>
                          Add Checklist Item
                        </Button>
                      )}
                    </Stack>
                    <Stack spacing={1}>
                      {filteredChecklist.map((item, index) => (
                        <Box
                          key={item.id}
                          draggable={canEdit}
                          onDragStart={() => {
                            if (checklistAssigneeFilter !== 'all' || checklistStatusFilter !== 'all' || savedView !== 'all') return;
                            setDraggedChecklist({ workstreamId: workstream.id, itemId: item.id });
                          }}
                          onDragOver={(event) => {
                            if (!canEdit) return;
                            event.preventDefault();
                          }}
                          onDrop={() => {
                            if (!canEdit || !draggedChecklist || draggedChecklist.workstreamId !== workstream.id) return;
                            reorderChecklistItem(workstream.id, draggedChecklist.itemId, item.id);
                            setDraggedChecklist(null);
                          }}
                          onDragEnd={() => setDraggedChecklist(null)}
                          sx={{
                            p: 1.25,
                            borderRadius: 2,
                            bgcolor: draggedChecklist?.itemId === item.id ? alpha(mongoColors.green, 0.1) : isOverdue(item.dueDate, item.status) ? alpha('#DB3030', 0.05) : 'background.default',
                            border: `1px solid ${isOverdue(item.dueDate, item.status) ? alpha('#DB3030', 0.32) : mongoColors.gray[200]}`,
                            cursor: canEdit ? 'grab' : 'default',
                          }}
                        >
                          {canEdit ? (
                            <Stack spacing={1.25}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Chip label={`Order ${item.sortOrder + 1}`} size="small" variant="outlined" />
                                <Button size="small" color={selectedChecklistIds.includes(item.id) ? 'primary' : 'inherit'} onClick={() => toggleChecklistSelection(item.id)}>
                                  {selectedChecklistIds.includes(item.id) ? 'Selected' : 'Select'}
                                </Button>
                              </Stack>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Checklist Item"
                                  value={item.label}
                                  onChange={(event) => updateChecklistItem(workstream.id, item.id, { label: event.target.value })}
                                />
                                <TextField
                                  size="small"
                                  label="Due Date"
                                  type="date"
                                  value={item.dueDate}
                                  onChange={(event) => updateChecklistItem(workstream.id, item.id, { dueDate: event.target.value })}
                                  slotProps={{ inputLabel: { shrink: true } }}
                                  sx={{ minWidth: 170 }}
                                />
                              </Stack>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Owner"
                                  value={item.owner}
                                  onChange={(event) => updateChecklistItem(workstream.id, item.id, { owner: event.target.value })}
                                />
                                <Autocomplete
                                  options={availableParticipants}
                                  value={availableParticipants.find((participant) => participant.email === item.assigneeEmail) || null}
                                  onChange={(_, participant) =>
                                    updateChecklistItem(workstream.id, item.id, {
                                      assigneeEmail: participant?.email || '',
                                      owner: participant?.name || item.owner,
                                    })
                                  }
                                  getOptionLabel={(option) => `${option.name} (${option.handle})`}
                                  renderInput={(params) => <TextField {...params} size="small" label="Assignee" />}
                                  sx={{ minWidth: 260 }}
                                />
                                <TextField
                                  select
                                  fullWidth
                                  size="small"
                                  label="Status"
                                  value={item.status}
                                  onChange={(event) => updateChecklistItem(workstream.id, item.id, { status: event.target.value as ProgramRecord['workstreams'][number]['checklist'][number]['status'] })}
                                >
                                  {Object.entries(PROGRAM_STATUS_LABELS).map(([value, label]) => (
                                    <MenuItem key={value} value={value}>{label}</MenuItem>
                                  ))}
                                </TextField>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Button size="small" variant="outlined" onClick={() => promoteChecklistItem(workstream.id, item.id)} disabled={Boolean(item.linkedTaskId)}>
                                    Promote
                                  </Button>
                                  <IconButton color="inherit" size="small" onClick={() => moveChecklistItem(workstream.id, item.id, 'up')} disabled={index === 0 || savedView !== 'all' || checklistAssigneeFilter !== 'all' || checklistStatusFilter !== 'all'}>
                                    <ArrowUpward fontSize="small" />
                                  </IconButton>
                                  <IconButton color="inherit" size="small" onClick={() => moveChecklistItem(workstream.id, item.id, 'down')} disabled={index === filteredChecklist.length - 1 || savedView !== 'all' || checklistAssigneeFilter !== 'all' || checklistStatusFilter !== 'all'}>
                                    <ArrowDownward fontSize="small" />
                                  </IconButton>
                                </Stack>
                                <IconButton color="error" size="small" onClick={() => removeChecklistItem(workstream.id, item.id)}>
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                          ) : (
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Owner: {item.owner}{item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ''}
                                </Typography>
                                {item.linkedTaskId && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Linked task: {draft.tasks.find((task) => task.id === item.linkedTaskId)?.title || item.linkedTaskId}
                                  </Typography>
                                )}
                              </Box>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {item.linkedTaskId && <Chip label="Promoted" size="small" color="info" />}
                                {isOverdue(item.dueDate, item.status) && <Chip label="Overdue" size="small" color="error" />}
                                <Chip label={PROGRAM_STATUS_LABELS[item.status]} size="small" sx={{ bgcolor: alpha(getStatusColor(item.status), 0.12), color: getStatusColor(item.status), fontWeight: 700 }} />
                              </Stack>
                            </Stack>
                          )}
                        </Box>
                      ))}
                      {filteredChecklist.length === 0 && (
                        <Typography variant="body2" color="text.secondary">No checklist items match the current filters.</Typography>
                      )}
                    </Stack>

                    <ProgramCommentThread
                      comments={workstream.comments}
                      canEdit={canEdit}
                      currentUser={commentUser}
                      participants={availableParticipants}
                      onChange={(comments) => updateWorkstream(workstream.id, { comments })}
                      onPersist={({ message: commentMessage, parentId }) => persistComment('workstream', workstream.id, commentMessage, parentId)}
                    />
                    <ProgramReferenceList
                      references={workstream.references}
                      canEdit={canEdit}
                      onChange={(references) => updateWorkstreamReferences(workstream.id, references)}
                      onAdd={() => updateWorkstreamReferences(workstream.id, [...workstream.references, createProgramReference()])}
                    />
                    <ProgramAuditTrail audit={workstream.audit} />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Cross-Repo Launch Task Board</Typography>
              {canEdit && (
                <Button size="small" startIcon={<AddCircleOutline />} onClick={addTask}>
                  Add Task
                </Button>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This is the shared execution layer across mobile, admin, and docs. Track dependency-heavy items here, especially when launch sequencing matters.
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Repo</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Due</TableCell>
                    {canEdit && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {draft.tasks.map((task) => {
                    const repo = repoMap.get(task.repoId);
                    const sourceWorkstream = draft.workstreams.find((workstream) => workstream.id === task.workstreamId);
                    const sourceChecklistItem = sourceWorkstream?.checklist.find((item) => item.id === task.sourceChecklistItemId);
                    return (
                      [
                        <TableRow key={`${task.id}-row`} hover>
                          <TableCell sx={{ minWidth: 320 }}>
                            {canEdit ? (
                              <Stack spacing={1}>
                                <TextField size="small" value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} />
                                <TextField size="small" multiline minRows={2} value={task.description} onChange={(event) => updateTask(task.id, { description: event.target.value })} />
                                <TextField size="small" label="Dependencies" value={task.dependencies} onChange={(event) => updateTask(task.id, { dependencies: event.target.value })} />
                              </Stack>
                            ) : (
                              <>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{task.title}</Typography>
                                <Typography variant="caption" color="text.secondary">{task.description}</Typography>
                                {sourceChecklistItem && (
                                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'info.main' }}>
                                    Promoted from checklist: {sourceWorkstream?.title} / {sourceChecklistItem.label}
                                  </Typography>
                                )}
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                                  Dependencies: {task.dependencies}
                                </Typography>
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            {canEdit ? (
                              <TextField
                                select
                                size="small"
                                value={task.repoId}
                                onChange={(event) => updateTask(task.id, { repoId: event.target.value })}
                                sx={{ minWidth: 180 }}
                              >
                                {draft.repos.map((item) => (
                                  <MenuItem key={item.id} value={item.id}>{PROGRAM_REPO_AREA_LABELS[item.area]} / {item.name}</MenuItem>
                                ))}
                              </TextField>
                            ) : (
                              <Chip label={repo ? `${PROGRAM_REPO_AREA_LABELS[repo.area]} / ${repo.name}` : task.repoId} size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            {canEdit ? <TextField size="small" value={task.owner} onChange={(event) => updateTask(task.id, { owner: event.target.value })} /> : task.owner}
                          </TableCell>
                          <TableCell>
                            {canEdit ? (
                              <TextField select size="small" value={task.stage} onChange={(event) => updateTask(task.id, { stage: event.target.value as ProgramRecord['tasks'][number]['stage'] })}>
                                {Object.entries(PROGRAM_STAGE_LABELS).map(([value, label]) => (
                                  <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                              </TextField>
                            ) : PROGRAM_STAGE_LABELS[task.stage]}
                          </TableCell>
                          <TableCell>
                            {canEdit ? (
                              <TextField select size="small" value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as ProgramRecord['tasks'][number]['status'] })}>
                                {Object.entries(PROGRAM_STATUS_LABELS).map(([value, label]) => (
                                  <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                              </TextField>
                            ) : (
                              <Chip label={PROGRAM_STATUS_LABELS[task.status]} size="small" sx={{ bgcolor: alpha(getStatusColor(task.status), 0.12), color: getStatusColor(task.status), fontWeight: 700 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            {canEdit ? (
                              <TextField select size="small" value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as ProgramRecord['tasks'][number]['priority'] })}>
                                {Object.entries(PROGRAM_PRIORITY_LABELS).map(([value, label]) => (
                                  <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                              </TextField>
                            ) : (
                              <Chip label={PROGRAM_PRIORITY_LABELS[task.priority]} size="small" sx={{ bgcolor: alpha(getPriorityColor(task.priority), 0.12), color: getPriorityColor(task.priority), fontWeight: 700 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            {canEdit ? (
                              <TextField
                                size="small"
                                type="date"
                                value={task.dueDate}
                                onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }}
                              />
                            ) : formatDate(task.dueDate)}
                          </TableCell>
                          {canEdit && (
                            <TableCell align="right">
                              <IconButton color="error" size="small" onClick={() => removeTask(task.id)}>
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>,
                        <TableRow key={`${task.id}-comments`}>
                          <TableCell colSpan={canEdit ? 8 : 7} sx={{ bgcolor: alpha(mongoColors.gray[100], 0.6) }}>
                            <ProgramCommentThread
                              title="Task Updates"
                              comments={task.comments}
                              canEdit={canEdit}
                              currentUser={commentUser}
                              participants={availableParticipants}
                              onChange={(comments) => updateTask(task.id, { comments })}
                              onPersist={({ message: commentMessage, parentId }) => persistComment('task', task.id, commentMessage, parentId)}
                            />
                            <ProgramReferenceList
                              references={task.references}
                              canEdit={canEdit}
                              onChange={(references) => updateTaskReferences(task.id, references)}
                              onAdd={() => updateTaskReferences(task.id, [...task.references, createProgramReference()])}
                            />
                            <ProgramAuditTrail audit={task.audit} title="Task Activity" />
                          </TableCell>
                        </TableRow>,
                      ]
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Groups sx={{ color: mongoColors.darkGreen }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Stakeholder Map</Typography>
                  </Stack>
                  {canEdit && (
                    <Button size="small" startIcon={<AddCircleOutline />} onClick={addStakeholder}>
                      Add Stakeholder
                    </Button>
                  )}
                </Stack>
                <Stack spacing={1.5}>
                  {draft.stakeholders.map((stakeholder) => (
                    <Box key={stakeholder.id} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default', border: `1px solid ${mongoColors.gray[200]}` }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box sx={{ flex: 1 }}>
                          {canEdit ? (
                            <Stack spacing={1}>
                              <TextField size="small" value={stakeholder.name} onChange={(event) => updateStakeholder(stakeholder.id, { name: event.target.value })} />
                              <TextField size="small" value={stakeholder.role} onChange={(event) => updateStakeholder(stakeholder.id, { role: event.target.value })} label="Role" />
                            </Stack>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{stakeholder.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{stakeholder.role}</Typography>
                            </>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          {canEdit ? (
                            <TextField
                              select
                              size="small"
                              value={stakeholder.group}
                              onChange={(event) => updateStakeholder(stakeholder.id, { group: event.target.value as ProgramRecord['stakeholders'][number]['group'] })}
                              sx={{ minWidth: 130 }}
                            >
                              {Object.entries(STAKEHOLDER_GROUP_LABELS).map(([value, label]) => (
                                <MenuItem key={value} value={value}>{label}</MenuItem>
                              ))}
                            </TextField>
                          ) : (
                            <Chip label={STAKEHOLDER_GROUP_LABELS[stakeholder.group]} size="small" />
                          )}
                          {canEdit && (
                            <IconButton size="small" color="error" onClick={() => removeStakeholder(stakeholder.id)}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </Stack>
                      {canEdit ? (
                        <>
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            size="small"
                            sx={{ mt: 1.25 }}
                            label="Focus"
                            value={stakeholder.focus}
                            onChange={(event) => updateStakeholder(stakeholder.id, { focus: event.target.value })}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            sx={{ mt: 1.25 }}
                            label="Responsibilities"
                            helperText="Comma-separated responsibilities"
                            value={stakeholder.responsibilities.join(', ')}
                            onChange={(event) =>
                              updateStakeholder(stakeholder.id, {
                                responsibilities: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                              })
                            }
                          />
                        </>
                      ) : (
                        <>
                          <Typography variant="body2" sx={{ mt: 1.25 }}>{stakeholder.focus}</Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                            {stakeholder.responsibilities.map((responsibility) => (
                              <Chip key={responsibility} label={responsibility} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </>
                      )}

                      <ProgramCommentThread
                        title="Stakeholder Notes"
                        comments={stakeholder.comments}
                        canEdit={canEdit}
                        currentUser={commentUser}
                        participants={availableParticipants}
                        onChange={(comments) => updateStakeholder(stakeholder.id, { comments })}
                        onPersist={({ message: commentMessage, parentId }) => persistComment('stakeholder', stakeholder.id, commentMessage, parentId)}
                      />
                      <ProgramReferenceList
                        references={stakeholder.references}
                        canEdit={canEdit}
                        onChange={(references) => updateStakeholderReferences(stakeholder.id, references)}
                        onAdd={() => updateStakeholderReferences(stakeholder.id, [...stakeholder.references, createProgramReference()])}
                      />
                      <ProgramAuditTrail audit={stakeholder.audit} title="Stakeholder Activity" />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Program Phases</Typography>
                <Stack spacing={1.5}>
                  {draft.phases.map((phase) => (
                    <Box key={phase.id} sx={{ p: 2, borderRadius: 3, border: `1px solid ${mongoColors.gray[200]}` }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{phase.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{phase.description}</Typography>
                        </Box>
                        <Chip label={PROGRAM_STAGE_LABELS[phase.id]} size="small" variant="outlined" />
                      </Stack>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'text.secondary' }}>
                        Exit criteria: {phase.exitCriteria}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Repositories and Operating Surfaces</Typography>
                <Grid container spacing={2}>
                  {draft.repos.map((repo) => {
                    const icon = repo.area === 'mobile' ? <PhoneIphone /> : repo.area === 'admin' ? <Web /> : <Description />;

                    return (
                      <Grid key={repo.id} size={{ xs: 12, md: 4 }}>
                        <Box sx={{ height: '100%', p: 2, borderRadius: 3, bgcolor: alpha(mongoColors.black, 0.03), border: `1px solid ${mongoColors.gray[200]}` }}>
                          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.2 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(mongoColors.darkGreen, 0.12), color: mongoColors.darkGreen, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {icon}
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{repo.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{PROGRAM_REPO_AREA_LABELS[repo.area]}</Typography>
                            </Box>
                          </Stack>
                          <Typography variant="body2" sx={{ mb: 1.5 }}>{repo.summary}</Typography>
                          <Typography variant="caption" color="text.secondary">{repo.path}</Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Campaign sx={{ color: mongoColors.darkGreen }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Decision Log</Typography>
                  </Stack>
                  {canEdit && (
                    <Button size="small" startIcon={<AddCircleOutline />} onClick={addDecision}>
                      Add Decision
                    </Button>
                  )}
                </Stack>
                <Stack spacing={1.5}>
                  {draft.decisions.map((decision) => (
                    <Box key={decision.id} sx={{ p: 2, borderRadius: 3, border: `1px solid ${mongoColors.gray[200]}`, bgcolor: 'background.default' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                        <Box sx={{ flex: 1 }}>
                          {canEdit ? (
                            <Stack spacing={1}>
                              <TextField size="small" value={decision.title} onChange={(event) => updateDecision(decision.id, { title: event.target.value })} />
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <TextField select size="small" value={decision.category} onChange={(event) => updateDecision(decision.id, { category: event.target.value as ProgramRecord['decisions'][number]['category'] })} sx={{ minWidth: 150 }}>
                                  {Object.entries(DECISION_CATEGORY_LABELS).map(([value, label]) => (
                                    <MenuItem key={value} value={value}>{label}</MenuItem>
                                  ))}
                                </TextField>
                                <TextField size="small" value={decision.owner} label="Owner" onChange={(event) => updateDecision(decision.id, { owner: event.target.value })} />
                              </Stack>
                            </Stack>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{decision.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{DECISION_CATEGORY_LABELS[decision.category]} decision - owner: {decision.owner}</Typography>
                            </>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          {canEdit ? (
                            <>
                              <TextField select size="small" value={decision.status} onChange={(event) => updateDecision(decision.id, { status: event.target.value as ProgramRecord['decisions'][number]['status'] })} sx={{ minWidth: 140 }}>
                                {Object.entries(DECISION_STATUS_LABELS).map(([value, label]) => (
                                  <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                              </TextField>
                              <IconButton size="small" color="error" onClick={() => removeDecision(decision.id)}>
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <Chip label={DECISION_STATUS_LABELS[decision.status]} size="small" sx={{ bgcolor: alpha(getStatusColor(decision.status === 'approved' ? 'complete' : decision.status === 'pending' ? 'blocked' : 'not_started'), 0.12), color: getStatusColor(decision.status === 'approved' ? 'complete' : decision.status === 'pending' ? 'blocked' : 'not_started'), fontWeight: 700 }} />
                          )}
                        </Stack>
                      </Stack>
                      {canEdit ? (
                        <>
                          <TextField fullWidth multiline minRows={2} size="small" sx={{ mt: 1.25 }} label="Impact" value={decision.impact} onChange={(event) => updateDecision(decision.id, { impact: event.target.value })} />
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.25 }}>
                            <TextField type="date" size="small" label="Due Date" value={decision.dueDate} onChange={(event) => updateDecision(decision.id, { dueDate: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                            <TextField fullWidth size="small" label="Notes" value={decision.notes} onChange={(event) => updateDecision(decision.id, { notes: event.target.value })} />
                          </Stack>
                        </>
                      ) : (
                        <>
                          <Typography variant="body2" sx={{ mt: 1.25 }}>{decision.impact}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>Due {formatDate(decision.dueDate)} - {decision.notes}</Typography>
                        </>
                      )}

                      <ProgramCommentThread
                        title="Decision Discussion"
                        comments={decision.comments}
                        canEdit={canEdit}
                        currentUser={commentUser}
                        participants={availableParticipants}
                        onChange={(comments) => updateDecision(decision.id, { comments })}
                        onPersist={({ message: commentMessage, parentId }) => persistComment('decision', decision.id, commentMessage, parentId)}
                      />
                      <ProgramReferenceList
                        references={decision.references}
                        canEdit={canEdit}
                        onChange={(references) => updateDecisionReferences(decision.id, references)}
                        onAdd={() => updateDecisionReferences(decision.id, [...decision.references, createProgramReference()])}
                      />
                      <ProgramAuditTrail audit={decision.audit} title="Decision Activity" />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Insights sx={{ color: '#016BF8' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Risk Register</Typography>
                  </Stack>
                  {canEdit && (
                    <Button size="small" startIcon={<AddCircleOutline />} onClick={addRisk}>
                      Add Risk
                    </Button>
                  )}
                </Stack>
                <Stack spacing={1.5}>
                  {draft.risks.map((risk) => (
                    <Box key={risk.id} sx={{ p: 2, borderRadius: 3, border: `1px solid ${mongoColors.gray[200]}`, bgcolor: 'background.default' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                        <Box sx={{ flex: 1 }}>
                          {canEdit ? (
                            <Stack spacing={1}>
                              <TextField size="small" value={risk.title} onChange={(event) => updateRisk(risk.id, { title: event.target.value })} />
                              <TextField size="small" label="Owner" value={risk.owner} onChange={(event) => updateRisk(risk.id, { owner: event.target.value })} />
                            </Stack>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{risk.title}</Typography>
                              <Typography variant="caption" color="text.secondary">Owner: {risk.owner}</Typography>
                            </>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          {canEdit ? (
                            <>
                              <TextField select size="small" value={risk.level} onChange={(event) => updateRisk(risk.id, { level: event.target.value as ProgramRecord['risks'][number]['level'] })} sx={{ minWidth: 120 }}>
                                {['high', 'medium', 'low'].map((value) => (
                                  <MenuItem key={value} value={value}>{PROGRAM_PRIORITY_LABELS[value as 'high' | 'medium' | 'low']}</MenuItem>
                                ))}
                              </TextField>
                              <TextField select size="small" value={risk.status} onChange={(event) => updateRisk(risk.id, { status: event.target.value as ProgramRecord['risks'][number]['status'] })} sx={{ minWidth: 130 }}>
                                {Object.entries(RISK_STATUS_LABELS).map(([value, label]) => (
                                  <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                              </TextField>
                              <IconButton size="small" color="error" onClick={() => removeRisk(risk.id)}>
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <Chip label={PROGRAM_PRIORITY_LABELS[risk.level]} size="small" sx={{ bgcolor: alpha(getPriorityColor(risk.level), 0.12), color: getPriorityColor(risk.level), fontWeight: 700 }} />
                              <Chip label={RISK_STATUS_LABELS[risk.status]} size="small" variant="outlined" />
                            </>
                          )}
                        </Stack>
                      </Stack>
                      {canEdit ? (
                        <>
                          <TextField fullWidth multiline minRows={2} size="small" sx={{ mt: 1.25 }} label="Trigger" value={risk.trigger} onChange={(event) => updateRisk(risk.id, { trigger: event.target.value })} />
                          <TextField fullWidth multiline minRows={2} size="small" sx={{ mt: 1.25 }} label="Mitigation" value={risk.mitigation} onChange={(event) => updateRisk(risk.id, { mitigation: event.target.value })} />
                        </>
                      ) : (
                        <>
                          <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'text.secondary' }}>Trigger: {risk.trigger}</Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>Mitigation: {risk.mitigation}</Typography>
                        </>
                      )}

                      <ProgramCommentThread
                        title="Risk Updates"
                        comments={risk.comments}
                        canEdit={canEdit}
                        currentUser={commentUser}
                        participants={availableParticipants}
                        onChange={(comments) => updateRisk(risk.id, { comments })}
                        onPersist={({ message: commentMessage, parentId }) => persistComment('risk', risk.id, commentMessage, parentId)}
                      />
                      <ProgramReferenceList
                        references={risk.references}
                        canEdit={canEdit}
                        onChange={(references) => updateRiskReferences(risk.id, references)}
                        onAdd={() => updateRiskReferences(risk.id, [...risk.references, createProgramReference()])}
                      />
                      <ProgramAuditTrail audit={risk.audit} title="Risk Activity" />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
