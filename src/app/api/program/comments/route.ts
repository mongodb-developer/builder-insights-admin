import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getProgramCollection, getOrCreateProgram, prepareProgramUpdate } from '@/lib/program-rollout';
import { createProgramId, extractMentions } from '@/lib/program-utils';
import type { ProgramComment, ProgramEntityType, ProgramParticipant, ProgramRecord } from '@/types/program';

export const dynamic = 'force-dynamic';

function canUpdateProgram(role?: string) {
  return role === 'admin' || role === 'manager';
}

function appendComment(comments: ProgramComment[], parentId: string | null, nextComment: ProgramComment): ProgramComment[] {
  if (!parentId) return [...comments, nextComment];

  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...comment.replies, nextComment],
      };
    }

    return {
      ...comment,
      replies: appendComment(comment.replies, parentId, nextComment),
    };
  });
}

function withEntityUpdate(
  program: ProgramRecord,
  entityType: ProgramEntityType,
  entityId: string,
  updater: (comments: ProgramComment[]) => ProgramComment[]
) {
  if (entityType === 'workstream') {
    return { ...program, workstreams: program.workstreams.map((item) => item.id === entityId ? { ...item, comments: updater(item.comments) } : item) };
  }
  if (entityType === 'task') {
    return { ...program, tasks: program.tasks.map((item) => item.id === entityId ? { ...item, comments: updater(item.comments) } : item) };
  }
  if (entityType === 'stakeholder') {
    return { ...program, stakeholders: program.stakeholders.map((item) => item.id === entityId ? { ...item, comments: updater(item.comments) } : item) };
  }
  if (entityType === 'decision') {
    return { ...program, decisions: program.decisions.map((item) => item.id === entityId ? { ...item, comments: updater(item.comments) } : item) };
  }

  return { ...program, risks: program.risks.map((item) => item.id === entityId ? { ...item, comments: updater(item.comments) } : item) };
}

function findParticipants(program: ProgramRecord): ProgramParticipant[] {
  return program.stakeholders
    .map((stakeholder) => {
      const email = stakeholder.audit.updatedByEmail || stakeholder.audit.createdByEmail;
      if (!email) return null;
      return {
        name: stakeholder.name,
        email,
        role: stakeholder.role,
        handle: `@${email.split('@')[0].toLowerCase()}`,
      };
    })
    .filter((value): value is ProgramParticipant => Boolean(value));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canUpdateProgram(user.role)) {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
    }

    const body = await request.json();
    const entityType = body.entityType as ProgramEntityType;
    const entityId = body.entityId as string;
    const parentId = (body.parentId as string | null) || null;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!entityType || !entityId || !message) {
      return NextResponse.json({ error: 'entityType, entityId, and message are required' }, { status: 400 });
    }

    const existing = await getOrCreateProgram(user.name || user.email || 'system');
    const participants = findParticipants(existing);

    const comment: ProgramComment = {
      id: createProgramId('comment'),
      authorName: user.name || user.email,
      authorEmail: user.email,
      message,
      createdAt: new Date().toISOString(),
      mentions: extractMentions(message, participants),
      replies: [],
    };

    const updatedProgram = withEntityUpdate(existing, entityType, entityId, (comments) => appendComment(comments, parentId, comment));
    const prepared = prepareProgramUpdate(updatedProgram, existing, user.name || user.email || 'system');
    const col = await getProgramCollection();

    await col.replaceOne({ _id: existing._id }, prepared, { upsert: true });

    return NextResponse.json({ comment, program: prepared });
  } catch (error) {
    console.error('POST /api/program/comments error:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
