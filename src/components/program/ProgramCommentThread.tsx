'use client';

import { useMemo, useState } from 'react';
import {
  alpha,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddComment,
  AlternateEmail,
  ChatBubbleOutline,
  ExpandLess,
  ExpandMore,
  Reply,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';
import { buildParticipantHandle, createProgramId, extractMentions } from '@/lib/program-utils';
import type { ProgramComment, ProgramParticipant } from '@/types/program';

interface CommentUser {
  name: string;
  email: string;
}

interface ProgramCommentThreadProps {
  title?: string;
  comments: ProgramComment[];
  canEdit: boolean;
  currentUser: CommentUser | null;
  participants: ProgramParticipant[];
  onChange: (comments: ProgramComment[]) => void;
  onPersist?: (payload: { message: string; parentId?: string }) => Promise<void>;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function appendReply(comments: ProgramComment[], parentId: string, reply: ProgramComment): ProgramComment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...comment.replies, reply],
      };
    }

    return {
      ...comment,
      replies: appendReply(comment.replies, parentId, reply),
    };
  });
}

function renderMessage(message: string, participants: ProgramParticipant[]) {
  const segments = message.split(/(@[a-z0-9._-]+)/gi);

  return segments.map((segment, index) => {
    const normalized = segment.toLowerCase();
    const participant = participants.find((item) => item.handle.toLowerCase() === normalized);

    if (!participant) return <span key={`${segment}-${index}`}>{segment}</span>;

    return (
      <Chip
        key={`${segment}-${index}`}
        label={participant.handle}
        size="small"
        sx={{ mx: 0.25, height: 22, bgcolor: alpha(mongoColors.darkGreen, 0.12), color: mongoColors.darkGreen, fontWeight: 700 }}
      />
    );
  });
}

function CommentComposer({
  label,
  participants,
  value,
  onValueChange,
  onSubmit,
  submitLabel,
}: {
  label: string;
  participants: ProgramParticipant[];
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <Box>
      <TextField
        fullWidth
        multiline
        minRows={2}
        size="small"
        label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <Autocomplete
        size="small"
        options={participants}
        getOptionLabel={(option) => `${option.handle} - ${option.name}`}
        onChange={(_, option) => {
          if (!option) return;
          const handle = option.handle || buildParticipantHandle(option);
          onValueChange(value.includes(handle) ? value : `${value}${value && !value.endsWith(' ') ? ' ' : ''}${handle} `);
        }}
        renderInput={(params) => <TextField {...params} label="Mention a teammate" sx={{ mt: 1 }} />}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
        <Button size="small" variant="contained" startIcon={<AddComment />} onClick={onSubmit}>
          {submitLabel}
        </Button>
      </Stack>
    </Box>
  );
}

function CommentItem({
  comment,
  canEdit,
  currentUser,
  participants,
  onReply,
  depth = 0,
}: {
  comment: ProgramComment;
  canEdit: boolean;
  currentUser: CommentUser | null;
  participants: ProgramParticipant[];
  onReply: (parentId: string, message: string) => void;
  depth?: number;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

  const replyCount = comment.replies.length;

  return (
    <Box sx={{ pl: depth > 0 ? 2.5 : 0, borderLeft: depth > 0 ? `2px solid ${mongoColors.gray[200]}` : 'none' }}>
      <Box sx={{ p: 1.75, borderRadius: 3, bgcolor: 'background.default', border: `1px solid ${mongoColors.gray[200]}` }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(mongoColors.darkGreen, 0.18), color: mongoColors.darkGreen, fontSize: 13, fontWeight: 700 }}>
            {getInitials(comment.authorName || 'U')}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} alignItems={{ sm: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{comment.authorName}</Typography>
              <Typography variant="caption" color="text.secondary">{comment.authorEmail}</Typography>
              <Chip label={new Date(comment.createdAt).toLocaleString()} size="small" variant="outlined" sx={{ width: 'fit-content' }} />
              {comment.mentions.length > 0 && <Chip icon={<AlternateEmail sx={{ fontSize: 15 }} />} label={`${comment.mentions.length} mention${comment.mentions.length === 1 ? '' : 's'}`} size="small" />}
            </Stack>
            <Typography component="div" variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
              {renderMessage(comment.message, participants)}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              {canEdit && currentUser && (
                <Button size="small" startIcon={<Reply fontSize="small" />} onClick={() => setReplyOpen((value) => !value)}>
                  Reply
                </Button>
              )}
              {replyCount > 0 && (
                <Chip icon={<ChatBubbleOutline sx={{ fontSize: 15 }} />} label={`${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`} size="small" />
              )}
            </Stack>

            {canEdit && currentUser && (
              <Collapse in={replyOpen}>
                <Box sx={{ mt: 1.5 }}>
                  <CommentComposer
                    label="Reply"
                    participants={participants}
                    value={replyMessage}
                    onValueChange={setReplyMessage}
                    submitLabel="Post Reply"
                    onSubmit={() => {
                      const message = replyMessage.trim();
                      if (!message) return;
                      onReply(comment.id, message);
                      setReplyMessage('');
                      setReplyOpen(false);
                    }}
                  />
                </Box>
              </Collapse>
            )}
          </Box>
        </Stack>
      </Box>

      {comment.replies.length > 0 && (
        <Stack spacing={1.25} sx={{ mt: 1.25 }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              canEdit={canEdit}
              currentUser={currentUser}
              participants={participants}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function ProgramCommentThread({
  title = 'Threaded Notes',
  comments,
  canEdit,
  currentUser,
  participants,
  onChange,
  onPersist,
}: ProgramCommentThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');

  const totalComments = useMemo(() => {
    const count = (items: ProgramComment[]): number => items.reduce((sum, item) => sum + 1 + count(item.replies), 0);
    return count(comments);
  }, [comments]);

  async function addTopLevelComment() {
    const message = newComment.trim();
    if (!message || !currentUser) return;

    const nextComment: ProgramComment = {
      id: createProgramId('comment'),
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      message,
      createdAt: new Date().toISOString(),
      mentions: extractMentions(message, participants),
      replies: [],
    };

    onChange([...comments, nextComment]);
    if (onPersist) await onPersist({ message });
    setNewComment('');
    setExpanded(true);
  }

  async function addReply(parentId: string, message: string) {
    if (!currentUser) return;

    const reply: ProgramComment = {
      id: createProgramId('comment'),
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      message,
      createdAt: new Date().toISOString(),
      mentions: extractMentions(message, participants),
      replies: [],
    };

    onChange(appendReply(comments, parentId, reply));
    if (onPersist) await onPersist({ message, parentId });
    setExpanded(true);
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ChatBubbleOutline sx={{ color: mongoColors.darkGreen, fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Chip label={`${totalComments} ${totalComments === 1 ? 'comment' : 'comments'}`} size="small" variant="outlined" />
        </Stack>
        <IconButton size="small" onClick={() => setExpanded((value) => !value)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5 }}>
          {canEdit && currentUser && (
            <Box sx={{ p: 1.5, mb: 1.5, borderRadius: 3, bgcolor: alpha(mongoColors.green, 0.06), border: `1px solid ${alpha(mongoColors.green, 0.2)}` }}>
              <CommentComposer
                label="Add note or update"
                participants={participants}
                value={newComment}
                onValueChange={setNewComment}
                submitLabel="Post Update"
                onSubmit={() => {
                  void addTopLevelComment();
                }}
              />
            </Box>
          )}

          {comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No comments yet. Use this thread for rollout updates, decisions, follow-up context, and @mentions.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  canEdit={canEdit}
                  currentUser={currentUser}
                  participants={participants}
                  onReply={(parentId, message) => {
                    void addReply(parentId, message);
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
