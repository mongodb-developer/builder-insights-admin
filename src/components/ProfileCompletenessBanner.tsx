'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';

interface CompletenessData {
  percentage: number;
  missingFields: string[];
  missingFieldLabels?: string[];
  isComplete: boolean;
  threshold: number;
}

interface ProfileBannerProps {
  onEditProfile: () => void;
}

const DISMISS_KEY = 'profile-completeness-dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function ProfileCompletenessBanner({ onEditProfile }: ProfileBannerProps) {
  const [completeness, setCompleteness] = useState<CompletenessData | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCompleteness = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) return;
      const data = await res.json();
      setCompleteness(data.completeness);

      // Show banner only if incomplete and not recently dismissed
      if (!data.completeness.isComplete) {
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed) {
          const ts = parseInt(dismissed, 10);
          if (Date.now() - ts < DISMISS_DURATION_MS) {
            setVisible(false);
            return;
          }
        }
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch {
      // Silently fail — not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompleteness();
  }, [fetchCompleteness]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  // Re-check after profile edit dialog closes
  useEffect(() => {
    const handler = () => fetchCompleteness();
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, [fetchCompleteness]);

  if (loading || !completeness || !visible) return null;

  const { percentage, missingFieldLabels } = completeness;
  const missingCount = missingFieldLabels?.length || 0;

  // Color based on percentage
  const progressColor =
    percentage >= 80 ? mongoColors.darkGreen :
    percentage >= 50 ? '#F0A500' :
    '#CF4520';

  return (
    <Collapse in={visible}>
      <Alert
        severity="info"
        icon={<PersonIcon sx={{ color: mongoColors.darkGreen }} />}
        action={
          <IconButton
            aria-label="dismiss"
            size="small"
            onClick={handleDismiss}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{
          mb: 2,
          borderRadius: 2,
          border: `1px solid ${mongoColors.green}40`,
          bgcolor: `${mongoColors.green}08`,
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <AlertTitle sx={{ fontWeight: 700, color: mongoColors.black }}>
          Complete Your Profile
        </AlertTitle>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Your profile is <strong>{percentage}%</strong> complete.
          {missingCount > 0 && (
            <>
              {' '}Add your{' '}
              {missingFieldLabels!.slice(0, 3).join(', ')}
              {missingCount > 3 && ` and ${missingCount - 3} more`}
              {' '}to help your team connect with you.
            </>
          )}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: `${progressColor}20`,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor: progressColor,
                },
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: progressColor, minWidth: 36 }}>
            {percentage}%
          </Typography>
        </Box>

        <Button
          size="small"
          variant="contained"
          onClick={onEditProfile}
          sx={{
            mt: 0.5,
            bgcolor: mongoColors.darkGreen,
            color: mongoColors.white,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: mongoColors.green, color: mongoColors.black },
          }}
        >
          Complete Profile
        </Button>
      </Alert>
    </Collapse>
  );
}
