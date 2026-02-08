'use client';

/**
 * DevRel Insights - Landing Page
 * 
 * Marketing page with:
 * - App overview and features
 * - Login button for admin access
 * - TestFlight beta signup link
 */

import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Link from 'next/link';

// Icons
import MicIcon from '@mui/icons-material/Mic';
import InsightsIcon from '@mui/icons-material/Insights';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import GroupsIcon from '@mui/icons-material/Groups';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import LoginIcon from '@mui/icons-material/Login';
import AppleIcon from '@mui/icons-material/Apple';

// MongoDB-themed dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ED64',
      dark: '#00C853',
    },
    background: {
      default: '#001E2B',
      paper: '#112733',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B8C4C8',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

const features = [
  {
    icon: <MicIcon sx={{ fontSize: 40 }} />,
    title: 'Voice Capture',
    description: 'One-tap voice recording with AI transcription. Capture insights in seconds.',
  },
  {
    icon: <CloudSyncIcon sx={{ fontSize: 40 }} />,
    title: 'Offline-First',
    description: 'Works without internet. Syncs automatically when you reconnect.',
  },
  {
    icon: <InsightsIcon sx={{ fontSize: 40 }} />,
    title: 'Smart Tagging',
    description: 'Categorize by sentiment, priority, product area, and custom tags.',
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 40 }} />,
    title: 'Team Collaboration',
    description: 'React to insights, add comments, and see what your team captures.',
  },
  {
    icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
    title: 'Analytics Dashboard',
    description: 'Track trends, identify themes, and measure impact over time.',
  },
  {
    icon: <PhoneIphoneIcon sx={{ fontSize: 40 }} />,
    title: 'Native Mobile',
    description: 'iOS app built for speed at conferences, workshops, and events.',
  },
];

export default function LandingPage() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Header */}
        <Box 
          component="header" 
          sx={{ 
            py: 2, 
            px: 3, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            📊 DevRel Insights
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              component={Link}
              href="/guide"
              color="inherit"
            >
              Guide
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              color="primary"
              startIcon={<LoginIcon />}
            >
              Sign In
            </Button>
          </Stack>
        </Box>

        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ pt: 10, pb: 8 }}>
          <Box textAlign="center" mb={8}>
            <Chip 
              label="Beta Testing Now Open" 
              color="primary" 
              sx={{ mb: 3, fontWeight: 600 }}
            />
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                mb: 3,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #B8C4C8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Capture Developer Insights<br />
              at the Speed of Conversation
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ maxWidth: 600, mx: 'auto', mb: 4, lineHeight: 1.7 }}
            >
              The mobile-first tool for Developer Advocates to capture, categorize, 
              and share insights from conferences, workshops, and customer conversations.
            </Typography>
            
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              justifyContent="center"
            >
              <Button
                variant="contained"
                size="large"
                color="primary"
                startIcon={<AppleIcon />}
                href="https://testflight.apple.com/join/YOUR_TESTFLIGHT_CODE"
                target="_blank"
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  color: '#001E2B',
                  '&:hover': { bgcolor: '#00C853' },
                }}
              >
                Join Beta on TestFlight
              </Button>
              <Button
                component={Link}
                href="/guide"
                variant="outlined"
                size="large"
                color="primary"
                sx={{ px: 4, py: 1.5 }}
              >
                Quick Start Guide
              </Button>
            </Stack>
            <Button
              component={Link}
              href="/login"
              size="small"
              color="inherit"
              sx={{ mt: 2, opacity: 0.7 }}
            >
              Admin Dashboard →
            </Button>
          </Box>

          {/* App Preview */}
          <Box 
            sx={{ 
              textAlign: 'center', 
              mb: 10,
              position: 'relative',
            }}
          >
            <Box
              component="img"
              src="/banner-dark.png"
              alt="DevRel Insights - Capture What Developers Say"
              sx={{
                width: '100%',
                maxWidth: 700,
                height: 'auto',
                borderRadius: 3,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </Box>

          {/* Features Grid */}
          <Box mb={10}>
            <Typography 
              variant="h2" 
              textAlign="center" 
              sx={{ mb: 6, fontSize: { xs: '2rem', md: '2.5rem' } }}
            >
              Built for Developer Advocates
            </Typography>
            <Grid container spacing={3}>
              {features.map((feature, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      bgcolor: 'background.paper',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'transform 0.2s, border-color 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ color: 'primary.main', mb: 2 }}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* CTA Section */}
          <Box 
            sx={{ 
              textAlign: 'center',
              py: 8,
              px: 4,
              borderRadius: 4,
              bgcolor: 'rgba(0, 237, 100, 0.05)',
              border: '1px solid rgba(0, 237, 100, 0.2)',
            }}
          >
            <Typography variant="h4" sx={{ mb: 2 }}>
              Ready to capture better insights?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Join the MongoDB DevRel team in beta testing. Available now on iOS via TestFlight.
            </Typography>
            <Button
              variant="contained"
              size="large"
              color="primary"
              startIcon={<AppleIcon />}
              href="https://testflight.apple.com/join/YOUR_TESTFLIGHT_CODE"
              target="_blank"
              sx={{ 
                px: 4, 
                py: 1.5,
                color: '#001E2B',
              }}
            >
              Get the App
            </Button>
          </Box>
        </Container>

        {/* Footer */}
        <Box 
          component="footer" 
          sx={{ 
            py: 4, 
            px: 3, 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Built with 💚 by the MongoDB Developer Relations team
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            © 2026 MongoDB, Inc.
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
