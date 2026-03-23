'use client';

/**
 * Insight Detail Drawer
 * 
 * Shows full insight details with AI analysis in a slide-out drawer.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  Divider,
  Avatar,
  Button,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  LocalOffer as TagIcon,
  Category as CategoryIcon,
  Mic as MicIcon,
  HourglassEmpty as HourglassIcon,
  ErrorOutline as ErrorIcon,
  AutoAwesome as AIIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { Insight } from '@/types';
import { mongoColors } from '@/theme';
import InsightAIAnalysis from './InsightAIAnalysis';

interface Props {
  insight: Insight | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (insight: Insight) => void;
}

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: '#00ED64',
  Neutral: '#016BF8',
  Negative: '#EF4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#EF4444',
  High: '#F97316',
  Medium: '#FFC010',
  Low: '#14B8A6',
};

function formatDuration(ms?: number) {
  if (!ms) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export default function InsightDetailDrawer({ insight, open, onClose, onEdit }: Props) {
  const [slackConfigured, setSlackConfigured] = useState(false);
  const [slackSending, setSlackSending] = useState(false);
  const [slackResult, setSlackResult] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  // Check once whether Slack is configured
  useEffect(() => {
    fetch('/api/slack/post')
      .then((res) => res.json())
      .then((data) => setSlackConfigured(data.configured))
      .catch(() => setSlackConfigured(false));
  }, []);

  const handleShareToSlack = useCallback(async () => {
    if (!insight) return;
    setSlackSending(true);
    setSlackResult(null);
    try {
      const res = await fetch('/api/slack/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: insight.type,
          text: insight.text,
          sentiment: insight.sentiment,
          priority: insight.priority,
          productAreas: insight.productAreas || [],
          tags: insight.tags || [],
          eventName: insight.eventName,
          sessionTitle: insight.sessionTitle,
          advocateName: insight.advocateName,
          capturedAt: insight.capturedAt,
        }),
      });
      if (res.ok) {
        setSlackResult({ severity: 'success', message: 'Insight shared to Slack!' });
      } else {
        const data = await res.json().catch(() => ({}));
        setSlackResult({ severity: 'error', message: data.error || 'Failed to share to Slack' });
      }
    } catch {
      setSlackResult({ severity: 'error', message: 'Network error sharing to Slack' });
    } finally {
      setSlackSending(false);
    }
  }, [insight]);

  if (!insight) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 500, md: 600 }, p: 0 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${mongoColors.gray[200]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Insight Details
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {slackConfigured && (
            <Tooltip title="Share this insight to Slack">
              <span>
                <Button
                  size="small"
                  startIcon={<ShareIcon />}
                  onClick={handleShareToSlack}
                  disabled={slackSending}
                >
                  {slackSending ? 'Sharing...' : 'Slack'}
                </Button>
              </span>
            </Tooltip>
          )}
          {onEdit && (
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onEdit(insight)}
            >
              Edit
            </Button>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, overflowY: 'auto' }}>
        {/* Type & Priority Badges */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
          <Chip
            label={insight.type}
            size="small"
            sx={{ fontWeight: 500 }}
          />
          <Chip
            label={insight.priority}
            size="small"
            sx={{
              bgcolor: PRIORITY_COLORS[insight.priority] + '20',
              color: PRIORITY_COLORS[insight.priority],
              fontWeight: 600,
            }}
          />
          <Chip
            label={insight.sentiment}
            size="small"
            sx={{
              bgcolor: SENTIMENT_COLORS[insight.sentiment] + '20',
              color: SENTIMENT_COLORS[insight.sentiment],
              fontWeight: 600,
            }}
          />
          {insight.audioIntelligence && (
            <Chip
              icon={<MicIcon sx={{ fontSize: 14 }} />}
              label={`Audio ${formatDuration(insight.audioIntelligence.durationMs)}`}
              size="small"
              variant="outlined"
            />
          )}
          {insight.pendingTranscription && (
            <Chip icon={<HourglassIcon sx={{ fontSize: 14 }} />} label="Transcription Pending" size="small" color="warning" />
          )}
          {insight.transcriptionError && (
            <Chip icon={<ErrorIcon sx={{ fontSize: 14 }} />} label="Transcription Error" size="small" color="error" title={insight.transcriptionError} />
          )}
        </Stack>

        {/* Title */}
        {insight.title && (
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {insight.title}
          </Typography>
        )}

        {/* Main Text */}
        <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
          {insight.text}
        </Typography>

        {/* Metadata */}
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {/* Advocate */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: mongoColors.green }}>
              <PersonIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {insight.advocateName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Advocate
              </Typography>
            </Box>
          </Box>

          {/* Event */}
          {insight.eventName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: mongoColors.gray[200] }}>
                <EventIcon sx={{ fontSize: 16, color: mongoColors.gray[600] }} />
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {insight.eventName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Event
                </Typography>
              </Box>
            </Box>
          )}

          {/* Timestamp */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: mongoColors.gray[200] }}>
              <TimeIcon sx={{ fontSize: 16, color: mongoColors.gray[600] }} />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {new Date(insight.capturedAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Captured
              </Typography>
            </Box>
          </Box>
        </Stack>

        {/* Product Areas */}
        {insight.productAreas && insight.productAreas.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <CategoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                Product Areas
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {insight.productAreas.map((area) => (
                <Chip
                  key={area}
                  label={area}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Tags */}
        {insight.tags && insight.tags.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <TagIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                Tags
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {insight.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Attachments */}
        {insight.attachments && insight.attachments.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Attachments ({insight.attachments.length})
            </Typography>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
              {insight.attachments.map((att) => (
                <Box
                  key={att._id}
                  component="a"
                  href={att.uri}
                  target="_blank"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 1,
                    overflow: 'hidden',
                    flexShrink: 0,
                    bgcolor: mongoColors.gray[100],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {att.type === 'image' ? (
                    <Box
                      component="img"
                      src={att.uri}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      File
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* AI Distillation (from mobile app) */}
        {insight.aiDistillation && (insight.aiDistillation.summary || (insight.aiDistillation.bullets && insight.aiDistillation.bullets.length > 0)) && (
          <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: `${mongoColors.green}08`, border: `1px solid ${mongoColors.green}20` }}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
              <AIIcon sx={{ fontSize: 16, color: mongoColors.darkGreen }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: mongoColors.darkGreen }}>
                AI Distillation
                {insight.aiDistillation.source && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    ({insight.aiDistillation.source})
                  </Typography>
                )}
              </Typography>
            </Stack>
            {insight.aiDistillation.summary && (
              <Typography variant="body2" sx={{ mb: 1 }}>{insight.aiDistillation.summary}</Typography>
            )}
            {insight.aiDistillation.bullets && insight.aiDistillation.bullets.length > 0 && (
              <Box sx={{ ml: 1 }}>
                {insight.aiDistillation.bullets.map((bullet, i) => (
                  <Typography key={i} variant="body2" sx={{ mb: 0.25 }}>- {bullet}</Typography>
                ))}
              </Box>
            )}
            {insight.aiDistillation.actionItems && insight.aiDistillation.actionItems.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Action Items</Typography>
                {insight.aiDistillation.actionItems.map((item, i) => (
                  <Typography key={i} variant="body2" sx={{ mb: 0.25 }}>- {item}</Typography>
                ))}
              </Box>
            )}
            {insight.aiDistillation.keyPhrases && insight.aiDistillation.keyPhrases.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {insight.aiDistillation.keyPhrases.map((phrase) => (
                  <Chip key={phrase} label={phrase} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* Audio Intelligence - Speaker Transcript */}
        {insight.audioIntelligence && insight.audioIntelligence.segments && insight.audioIntelligence.segments.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
              <MicIcon sx={{ fontSize: 16, color: mongoColors.gray[500] }} />
              <Typography variant="subtitle2" color="text.secondary">
                Audio Transcript ({insight.audioIntelligence.segments.length} segments
                {insight.audioIntelligence.speakers ? `, ${insight.audioIntelligence.speakers.length} speaker${insight.audioIntelligence.speakers.length === 1 ? '' : 's'}` : ''})
              </Typography>
            </Stack>
            <Box sx={{ maxHeight: 240, overflowY: 'auto', p: 1.5, borderRadius: 2, bgcolor: mongoColors.gray[100] }}>
              {insight.audioIntelligence.segments.map((seg) => (
                <Box key={seg.id} sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: mongoColors.gray[500] }}>
                    {seg.speakerLabel} ({Math.round(seg.startMs / 1000)}s)
                  </Typography>
                  <Typography variant="body2">{seg.text}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* AI Analysis Section (admin-side) */}
        <InsightAIAnalysis 
          insightId={insight._id} 
          initialAnalysis={insight.aiAnalysis}
        />

        {/* Annotations */}
        {insight.annotations && insight.annotations.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Team Notes ({insight.annotations.length})
            </Typography>
            <Stack spacing={2}>
              {insight.annotations.map((note) => (
                <Box
                  key={note._id}
                  sx={{
                    p: 2,
                    bgcolor: mongoColors.gray[100],
                    borderRadius: 1,
                    borderLeft: `3px solid ${mongoColors.green}`,
                  }}
                >
                  <Typography variant="body2">{note.text}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    — {note.advocateName}, {new Date(note.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Box>

      {/* Slack share feedback */}
      <Snackbar
        open={slackResult !== null}
        autoHideDuration={4000}
        onClose={() => setSlackResult(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {slackResult ? (
          <Alert severity={slackResult.severity} onClose={() => setSlackResult(null)} variant="filled">
            {slackResult.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Drawer>
  );
}
