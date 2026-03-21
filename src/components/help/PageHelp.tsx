'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Collapse,
  Button,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Lightbulb as TipIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';
import { pageHelp, type PageHelpContent } from './helpContent';

interface PageHelpProps {
  page: string;
  onOpenDrawer?: () => void;
}

// Track dismissed help cards in localStorage
const DISMISSED_KEY = 'builder-insights-dismissed-help';

function getDismissed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function setDismissed(pages: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(pages));
}

/**
 * Page-level help card - shows at the top of pages with intro text and quick actions.
 * Users can dismiss it, and the dismissal is remembered.
 * 
 * Usage:
 * <PageHelp page="dashboard" onOpenDrawer={() => setHelpOpen(true)} />
 */
export default function PageHelp({ page, onOpenDrawer }: PageHelpProps) {
  const [dismissed, setDismissedState] = useState(true); // Start hidden to avoid flash
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const dismissedPages = getDismissed();
    setDismissedState(dismissedPages.includes(page));
  }, [page]);

  const content = pageHelp[page];

  if (!content || dismissed) return null;

  const handleDismiss = () => {
    const dismissedPages = getDismissed();
    setDismissed([...dismissedPages, page]);
    setDismissedState(true);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        overflow: 'hidden',
        border: `1px solid ${mongoColors.green}30`,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${mongoColors.green}08 0%, ${mongoColors.darkGreen}05 100%)`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: `${mongoColors.green}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <TipIcon sx={{ color: mongoColors.darkGreen }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {content.title}
            </Typography>
            <Chip
              label="New to this page?"
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                bgcolor: `${mongoColors.green}20`,
                color: mongoColors.darkGreen,
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {content.description}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: 'text.secondary' }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Expandable content */}
      <Collapse in={expanded}>
        {content.quickActions && content.quickActions.length > 0 && (
          <Box
            sx={{
              px: 2,
              pb: 2,
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {content.quickActions.map((action) => (
              <Box
                key={action.label}
                sx={{
                  flex: '1 1 200px',
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  border: `1px solid ${mongoColors.gray[200]}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {action.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {action.description}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Footer with help link */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: `1px solid ${mongoColors.green}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Dismiss to hide this tip · You can always access help from the menu
          </Typography>
          {onOpenDrawer && (
            <Button
              size="small"
              startIcon={<HelpIcon sx={{ fontSize: 16 }} />}
              onClick={onOpenDrawer}
              sx={{
                textTransform: 'none',
                color: mongoColors.darkGreen,
              }}
            >
              Open Help
            </Button>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

// Reset dismissed help cards (for settings or testing)
export function resetDismissedHelp() {
  localStorage.removeItem(DISMISSED_KEY);
}

// Compact inline tip - for use within forms or sections
export function InlineTip({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        p: 1.5,
        mt: 1,
        borderRadius: 1,
        bgcolor: `${mongoColors.green}08`,
        borderLeft: `3px solid ${mongoColors.green}`,
      }}
    >
      <TipIcon sx={{ color: mongoColors.green, fontSize: 18, mt: 0.25 }} />
      <Typography variant="caption" color="text.secondary">
        {children}
      </Typography>
    </Box>
  );
}
