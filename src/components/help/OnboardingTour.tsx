'use client';

import { useState, useEffect } from 'react';
import Joyride from 'react-joyride';
import { Box, Typography, Button } from '@mui/material';
import { mongoColors } from '@/theme';

const TOUR_COMPLETED_KEY = 'builder-insights-tour-completed';

export interface TourStep {
  target: string;
  content: React.ReactNode;
  title?: string;
  disableBeacon?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

// Default onboarding steps
const defaultSteps: TourStep[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to Builder Insights! 👋',
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This quick tour will help you get started with the admin portal.
          You&apos;ll learn where to find key features and how to make the most of your team&apos;s insights.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Takes about 1 minute · You can skip anytime
        </Typography>
      </Box>
    ),
  },
  {
    target: '[data-tour="nav-dashboard"]',
    title: 'Dashboard',
    placement: 'right',
    content: (
      <Typography variant="body2">
        Your command center! See AI-generated summaries, trends, top contributors, and critical items at a glance.
      </Typography>
    ),
  },
  {
    target: '[data-tour="nav-events"]',
    title: 'Events',
    placement: 'right',
    content: (
      <Typography variant="body2">
        Manage conferences and meetups here. Mark events as &quot;active&quot; to make them available in the mobile app.
      </Typography>
    ),
  },
  {
    target: '[data-tour="nav-insights"]',
    title: 'Insights',
    placement: 'right',
    content: (
      <Typography variant="body2">
        Browse all captured developer feedback. Filter by sentiment, priority, event, or product area.
      </Typography>
    ),
  },
  {
    target: '[data-tour="nav-leaderboard"]',
    title: 'Leaderboard',
    placement: 'right',
    content: (
      <Typography variant="body2">
        Celebrate your top contributors! The leaderboard ranks team members by their insight contributions.
      </Typography>
    ),
  },
  {
    target: 'body',
    placement: 'center',
    title: 'You\'re all set! 🎉',
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          That&apos;s the basics! A few more tips:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><Typography variant="body2">Press <strong>?</strong> anytime to open help</Typography></li>
          <li><Typography variant="body2">Get the mobile app to capture insights on the go</Typography></li>
          <li><Typography variant="body2">Use PMO Import to bulk-add events</Typography></li>
        </ul>
      </Box>
    ),
  },
];

interface OnboardingTourProps {
  steps?: TourStep[];
  forceShow?: boolean;
  onComplete?: () => void;
}

export default function OnboardingTour({
  steps = defaultSteps,
  forceShow = false,
  onComplete,
}: OnboardingTourProps) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Check if tour has been completed
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!completed || forceShow) {
      // Small delay to let the page render and sidebar to be visible
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // Handle joyride callbacks
  const handleCallback = (data: { status: string; action: string; type: string }) => {
    const { status, action } = data;

    // Handle completion states
    if (status === 'finished' || status === 'skipped') {
      setRun(false);
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
      onComplete?.();
    }

    // Handle close button click
    if (action === 'close') {
      setRun(false);
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
      onComplete?.();
    }
  };

  return (
    <Joyride
      steps={steps.map((step) => ({
        ...step,
        content: (
          <Box sx={{ textAlign: 'left' }}>
            {step.title && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {step.title}
              </Typography>
            )}
            {step.content}
          </Box>
        ),
      }))}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableScrolling
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: mongoColors.darkGreen,
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: mongoColors.darkGreen,
          borderRadius: 8,
          fontWeight: 600,
        },
        buttonBack: {
          color: mongoColors.darkGreen,
          marginRight: 10,
        },
        buttonSkip: {
          color: mongoColors.gray[500],
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started!',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}

// Reset tour completion (for settings or testing)
export function resetOnboardingTour() {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}

// Button to restart the tour
export function RestartTourButton({ onStart }: { onStart: () => void }) {
  const handleClick = () => {
    resetOnboardingTour();
    onStart();
  };

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={handleClick}
      sx={{
        textTransform: 'none',
        borderColor: mongoColors.gray[300],
        color: mongoColors.darkGreen,
      }}
    >
      Restart Tour
    </Button>
  );
}
