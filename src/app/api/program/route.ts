import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { extractProgramMentions, extractProgramParticipants, getProgramCollection, getOrCreateProgram, prepareProgramUpdate } from '@/lib/program-rollout';
import type { ProgramActivityEntry, ProgramAudit, ProgramComment, ProgramRecord } from '@/types/program';

export const dynamic = 'force-dynamic';

function canUpdateProgram(role?: string) {
  return role === 'admin' || role === 'manager';
}

function makeActivityId() {
  return `activity-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function countComments(comments: ProgramComment[]): number {
  return comments.reduce((sum, comment) => sum + 1 + countComments(comment.replies), 0);
}

function latestCommentAt(comments: ProgramComment[]): string | null {
  let latest: string | null = null;

  for (const comment of comments) {
    if (!latest || comment.createdAt > latest) latest = comment.createdAt;
    const nested = latestCommentAt(comment.replies);
    if (nested && (!latest || nested > latest)) latest = nested;
  }

  return latest;
}

function buildActivityEntry(type: ProgramActivityEntry['type'], actorName: string, actorEmail: string, createdAt: string, summary: string): ProgramActivityEntry {
  return {
    id: makeActivityId(),
    type,
    actorName,
    actorEmail,
    createdAt,
    summary,
  };
}

function syncAudit(
  previous: ProgramAudit,
  next: ProgramAudit | undefined,
  actorName: string,
  actorEmail: string,
  fallbackSummary: string,
  fieldChanged: boolean,
  commentDelta: number,
  latestCommentTimestamp: string | null
): ProgramAudit {
  const updatedAt = fieldChanged
    ? new Date().toISOString()
    : latestCommentTimestamp || next?.updatedAt || previous.updatedAt;

  const activity = [...(previous.activity || [])];

  if (fieldChanged) {
    activity.unshift(buildActivityEntry('field_updated', actorName, actorEmail, updatedAt, fallbackSummary));
  }

  if (commentDelta > 0 && latestCommentTimestamp) {
    activity.unshift(
      buildActivityEntry(
        'comment_added',
        actorName,
        actorEmail,
        latestCommentTimestamp,
        commentDelta === 1 ? 'Added 1 threaded update.' : `Added ${commentDelta} threaded updates.`
      )
    );
  }

  return {
    ...previous,
    updatedAt,
    updatedBy: fieldChanged || commentDelta > 0 ? actorName : next?.updatedBy || previous.updatedBy,
    updatedByEmail: fieldChanged || commentDelta > 0 ? actorEmail : next?.updatedByEmail || previous.updatedByEmail,
    activity: activity.slice(0, 20),
  };
}

function checklistSummary(previous: ProgramRecord['workstreams'][number], next: ProgramRecord['workstreams'][number]) {
  const previousIds = new Set(previous.checklist.map((item) => item.id));
  const nextIds = new Set(next.checklist.map((item) => item.id));

  const added = next.checklist.filter((item) => !previousIds.has(item.id)).length;
  const removed = previous.checklist.filter((item) => !nextIds.has(item.id)).length;
  const reordered =
    previous.checklist.length === next.checklist.length &&
    previous.checklist.some((item, index) => next.checklist[index]?.id !== item.id);

  const updatedFields = next.checklist.some((item) => {
    const prior = previous.checklist.find((entry) => entry.id === item.id);
    if (!prior) return false;
    return (
      prior.label !== item.label ||
      prior.owner !== item.owner ||
      prior.assigneeEmail !== item.assigneeEmail ||
      prior.linkedTaskId !== item.linkedTaskId ||
      prior.dueDate !== item.dueDate ||
      prior.status !== item.status ||
      prior.sortOrder !== item.sortOrder
    );
  });

  if (added || removed || reordered || updatedFields) {
    const parts = [];
    if (added) parts.push(`added ${added}`);
    if (removed) parts.push(`removed ${removed}`);
    if (updatedFields) parts.push('updated item details');
    if (reordered) parts.push('reordered checklist');
    return `Updated checklist: ${parts.join(', ')}.`;
  }

  return null;
}

function equalIgnoringAuditAndComments<T>(a: T, b: T) {
  const left = { ...(a as object) } as Record<string, unknown>;
  const right = { ...(b as object) } as Record<string, unknown>;
  delete left.audit;
  delete right.audit;
  delete left.comments;
  delete right.comments;
  return JSON.stringify(left) === JSON.stringify(right);
}

function withProgramAudit(previous: ProgramRecord, updated: ProgramRecord, actorName: string, actorEmail: string): ProgramRecord {
  return {
    ...updated,
    workstreams: updated.workstreams.map((item) => {
      const prior = previous.workstreams.find((entry) => entry.id === item.id);
      if (!prior) return item;
      const checklistActivity = checklistSummary(prior, item);
      const nextAudit = syncAudit(
        prior.audit,
        item.audit,
        actorName,
        actorEmail,
        `Updated workstream ${item.title}.`,
        !equalIgnoringAuditAndComments(prior, item),
        countComments(item.comments) - countComments(prior.comments),
        latestCommentAt(item.comments)
      );

      if (checklistActivity) {
        nextAudit.activity.unshift(
          buildActivityEntry('field_updated', actorName, actorEmail, new Date().toISOString(), checklistActivity)
        );
        nextAudit.activity = nextAudit.activity.slice(0, 20);
      }

      return {
        ...item,
        audit: nextAudit,
      };
    }),
    tasks: updated.tasks.map((item) => {
      const prior = previous.tasks.find((entry) => entry.id === item.id);
      if (!prior) return item;
      return {
        ...item,
        audit: syncAudit(
          prior.audit,
          item.audit,
          actorName,
          actorEmail,
          `Updated task ${item.title}.`,
          !equalIgnoringAuditAndComments(prior, item),
          countComments(item.comments) - countComments(prior.comments),
          latestCommentAt(item.comments)
        ),
      };
    }),
    stakeholders: updated.stakeholders.map((item) => {
      const prior = previous.stakeholders.find((entry) => entry.id === item.id);
      if (!prior) return item;
      return {
        ...item,
        audit: syncAudit(
          prior.audit,
          item.audit,
          actorName,
          actorEmail,
          `Updated stakeholder ${item.name}.`,
          !equalIgnoringAuditAndComments(prior, item),
          countComments(item.comments) - countComments(prior.comments),
          latestCommentAt(item.comments)
        ),
      };
    }),
    decisions: updated.decisions.map((item) => {
      const prior = previous.decisions.find((entry) => entry.id === item.id);
      if (!prior) return item;
      return {
        ...item,
        audit: syncAudit(
          prior.audit,
          item.audit,
          actorName,
          actorEmail,
          `Updated decision ${item.title}.`,
          !equalIgnoringAuditAndComments(prior, item),
          countComments(item.comments) - countComments(prior.comments),
          latestCommentAt(item.comments)
        ),
      };
    }),
    risks: updated.risks.map((item) => {
      const prior = previous.risks.find((entry) => entry.id === item.id);
      if (!prior) return item;
      return {
        ...item,
        audit: syncAudit(
          prior.audit,
          item.audit,
          actorName,
          actorEmail,
          `Updated risk ${item.title}.`,
          !equalIgnoringAuditAndComments(prior, item),
          countComments(item.comments) - countComments(prior.comments),
          latestCommentAt(item.comments)
        ),
      };
    }),
  };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const program = await getOrCreateProgram(user.name || user.email || 'system');
    return NextResponse.json({
      program,
      participants: extractProgramParticipants(program),
      notifications: extractProgramMentions(program).filter((mention) => mention.email.toLowerCase() === user.email.toLowerCase()),
    });
  } catch (error) {
    console.error('GET /api/program error:', error);
    return NextResponse.json({ error: 'Failed to load program' }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const program = await getOrCreateProgram(user.name || user.email || 'system');
    const participants = extractProgramParticipants(program);

    return NextResponse.json({
      participants,
      notifications: extractProgramMentions(program).filter((mention) => mention.email.toLowerCase() === user.email.toLowerCase()),
    });
  } catch (error) {
    console.error('PATCH /api/program error:', error);
    return NextResponse.json({ error: 'Failed to load program metadata' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canUpdateProgram(user.role)) {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
    }

    const payload = await request.json();
    const existing = await getOrCreateProgram(user.name || user.email || 'system');
    const updated = withProgramAudit(
      existing,
      prepareProgramUpdate(payload?.program, existing, user.name || user.email || 'system'),
      user.name || user.email || 'system',
      user.email || ''
    );
    const col = await getProgramCollection();

    await col.replaceOne({ _id: existing._id }, updated, { upsert: true });

    return NextResponse.json({
      program: updated,
      participants: extractProgramParticipants(updated),
      notifications: extractProgramMentions(updated).filter((mention) => mention.email.toLowerCase() === user.email.toLowerCase()),
    });
  } catch (error) {
    console.error('PUT /api/program error:', error);
    return NextResponse.json({ error: 'Failed to save program' }, { status: 500 });
  }
}
