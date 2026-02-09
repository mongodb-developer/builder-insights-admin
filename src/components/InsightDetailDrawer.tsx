'use client';

/**
 * Insight Detail Drawer
 * 
 * Shows full insight details with AI analysis in a slide-out drawer.
 */

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
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  LocalOffer as TagIcon,
  Category as CategoryIcon,
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

export default function InsightDetailDrawer({ insight, open, onClose, onEdit }: Props) {
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
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
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
        </Stack>

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

        <Divider sx={{ my: 3 }} />

        {/* AI Analysis Section */}
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
    </Drawer>
  );
}
