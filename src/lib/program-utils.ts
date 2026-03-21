import type {
  ProgramComment,
  ProgramMention,
  ProgramMentionNotification,
  ProgramParticipant,
  ProgramReference,
  ProgramAudit,
  ProgramEntityType,
} from '@/types/program';

export function createProgramId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createProgramAudit(name: string, email: string, summary: string): ProgramAudit {
  const createdAt = new Date().toISOString();

  return {
    createdAt,
    createdBy: name,
    createdByEmail: email,
    updatedAt: createdAt,
    updatedBy: name,
    updatedByEmail: email,
    activity: [
      {
        id: createProgramId('activity'),
        type: 'created',
        actorName: name,
        actorEmail: email,
        createdAt,
        summary,
      },
    ],
  };
}

export function createProgramReference(): ProgramReference {
  return {
    id: createProgramId('reference'),
    type: 'github_issue',
    label: 'New reference',
    url: '',
    notes: '',
  };
}

export function buildParticipantHandle(participant: Pick<ProgramParticipant, 'name' | 'email'>) {
  const local = participant.email.split('@')[0]?.trim();
  if (local) return `@${local.toLowerCase()}`;
  return `@${participant.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}`;
}

export function extractMentions(message: string, participants: ProgramParticipant[]): ProgramMention[] {
  const handles = new Set((message.match(/@[a-z0-9._-]+/gi) || []).map((value) => value.toLowerCase()));

  return participants
    .filter((participant) => handles.has(participant.handle.toLowerCase()))
    .map((participant) => ({
      name: participant.name,
      email: participant.email,
      handle: participant.handle,
    }));
}

export function flattenComments(comments: ProgramComment[]): ProgramComment[] {
  return comments.flatMap((comment) => [comment, ...flattenComments(comment.replies)]);
}

export function buildMentionNotifications(params: {
  entityType: ProgramEntityType;
  entityId: string;
  entityLabel: string;
  comments: ProgramComment[];
}): ProgramMentionNotification[] {
  const flattened = flattenComments(params.comments);

  return flattened.flatMap((comment) =>
    comment.mentions.map((mention) => ({
      id: `${comment.id}-${mention.email}`,
      entityType: params.entityType,
      entityId: params.entityId,
      entityLabel: params.entityLabel,
      commentId: comment.id,
      email: mention.email,
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      createdAt: comment.createdAt,
      message: comment.message,
      mentionedAs: mention.handle,
    }))
  );
}
