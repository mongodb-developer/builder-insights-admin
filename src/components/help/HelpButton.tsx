'use client';

import { useState } from 'react';
import {
  IconButton,
  Popover,
  Box,
  Typography,
  Button,
  Tooltip,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';
import { helpTopics, type HelpTopic } from './helpContent';

interface HelpButtonProps {
  topic: string;
  size?: 'small' | 'medium';
  onOpenDrawer?: (topic: string) => void;
  tooltip?: string;
}

/**
 * Contextual help button - shows a "?" icon that opens a quick help popover.
 * Place next to UI elements that might need explanation.
 * 
 * Usage:
 * <HelpButton topic="sentiment" onOpenDrawer={openHelp} />
 */
export default function HelpButton({
  topic,
  size = 'small',
  onOpenDrawer,
  tooltip,
}: HelpButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const helpTopic = helpTopics[topic];

  if (!helpTopic) {
    console.warn(`HelpButton: Unknown topic "${topic}"`);
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLearnMore = () => {
    handleClose();
    onOpenDrawer?.(topic);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={tooltip || `Help: ${helpTopic.title}`}>
        <IconButton
          size={size}
          onClick={handleClick}
          sx={{
            color: 'text.disabled',
            '&:hover': {
              color: mongoColors.darkGreen,
              bgcolor: `${mongoColors.green}10`,
            },
          }}
        >
          <HelpIcon fontSize={size === 'small' ? 'small' : 'medium'} />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            maxWidth: 320,
            borderRadius: 2,
            boxShadow: 3,
          },
        }}
      >
        <HelpPopoverContent
          topic={helpTopic}
          onLearnMore={onOpenDrawer ? handleLearnMore : undefined}
        />
      </Popover>
    </>
  );
}

function HelpPopoverContent({
  topic,
  onLearnMore,
}: {
  topic: HelpTopic;
  onLearnMore?: () => void;
}) {
  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="body1">{topic.icon}</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {topic.title}
        </Typography>
      </Box>

      {/* Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {topic.summary}
      </Typography>

      {/* Quick tip (show first tip if available) */}
      {topic.tips && topic.tips[0] && (
        <Box
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: `${mongoColors.green}08`,
            borderRadius: 1,
            borderLeft: `3px solid ${mongoColors.green}`,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            💡 {topic.tips[0]}
          </Typography>
        </Box>
      )}

      {/* Learn more button */}
      {onLearnMore && (
        <Button
          fullWidth
          size="small"
          variant="outlined"
          endIcon={<ArrowIcon sx={{ fontSize: 16 }} />}
          onClick={onLearnMore}
          sx={{
            textTransform: 'none',
            borderColor: mongoColors.gray[300],
            color: mongoColors.darkGreen,
            '&:hover': {
              borderColor: mongoColors.darkGreen,
              bgcolor: `${mongoColors.green}10`,
            },
          }}
        >
          Learn more
        </Button>
      )}
    </Box>
  );
}

// Compact inline variant - just icon + tooltip
export function HelpTooltip({ topic, children }: { topic: string; children?: React.ReactNode }) {
  const helpTopic = helpTopics[topic];

  if (!helpTopic) return children || null;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {helpTopic.icon} {helpTopic.title}
          </Typography>
          <Typography variant="caption">{helpTopic.summary}</Typography>
        </Box>
      }
      arrow
    >
      <span style={{ cursor: 'help' }}>{children}</span>
    </Tooltip>
  );
}
