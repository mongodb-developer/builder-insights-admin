'use client';

/**
 * DevRel Insights - Landing Page
 * 
 * Marketing page with:
 * - App overview and features
 * - How it works workflow
 * - Dashboard preview
 * - Role-based access tiers
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
  Avatar,
  Divider,
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
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ApiIcon from '@mui/icons-material/Api';

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

const howItWorks = [
  {
    step: 1,
    icon: <MicIcon sx={{ fontSize: 32 }} />,
    title: 'Capture',
    description: 'Record voice or type notes during conversations. AI transcribes and suggests tags automatically.',
  },
  {
    step: 2,
    icon: <InsightsIcon sx={{ fontSize: 32 }} />,
    title: 'Categorize',
    description: 'Tag by type (pain point, feature request, feedback), sentiment, priority, and product area.',
  },
  {
    step: 3,
    icon: <CloudSyncIcon sx={{ fontSize: 32 }} />,
    title: 'Sync',
    description: 'Insights sync to the cloud automatically. Works offline and uploads when connected.',
  },
  {
    step: 4,
    icon: <AutoAwesomeIcon sx={{ fontSize: 32 }} />,
    title: 'Analyze',
    description: 'AI summarizes insights, identifies themes, and suggests priority levels.',
  },
  {
    step: 5,
    icon: <DashboardIcon sx={{ fontSize: 32 }} />,
    title: 'Report',
    description: 'View dashboards, leaderboards, world maps, and export reports for stakeholders.',
  },
];

const roles = [
  {
    icon: <VisibilityIcon />,
    title: 'Viewer',
    description: 'Read-only access to insights, events, and reports. Perfect for stakeholders.',
    color: '#6B7280',
    features: ['View all insights', 'Access dashboards', 'See analytics', 'Export reports'],
  },
  {
    icon: <PersonIcon />,
    title: 'Advocate',
    description: 'Capture and manage your own insights from the field.',
    color: '#3B82F6',
    features: ['Everything in Viewer', 'Create insights', 'Edit own insights', 'Voice capture'],
  },
  {
    icon: <SupervisorAccountIcon />,
    title: 'Manager',
    description: 'Oversee team insights and manage events.',
    color: '#F59E0B',
    features: ['Everything in Advocate', 'Edit all insights', 'Manage events', 'PMO import'],
  },
  {
    icon: <AdminPanelSettingsIcon />,
    title: 'Admin',
    description: 'Full control over users, settings, and operations.',
    color: '#EF4444',
    features: ['Everything in Manager', 'User management', 'System settings', 'Operations'],
  },
];

const dashboardFeatures = [
  {
    title: 'Executive Dashboard',
    description: 'High-level metrics, trends, and AI-generated summaries for leadership.',
    image: '/screenshots/dashboard.png',
  },
  {
    title: 'Insights Feed',
    description: 'Browse, search, and filter all captured insights with rich detail views.',
    image: '/screenshots/insights.png',
  },
  {
    title: 'World Map',
    description: 'See where insights are being captured globally in real-time.',
    image: '/screenshots/world.png',
  },
  {
    title: 'Leaderboard',
    description: 'Track team contributions and celebrate top performers.',
    image: '/screenshots/leaderboard.png',
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
            position: 'sticky',
            top: 0,
            bgcolor: 'background.default',
            zIndex: 1000,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src="/mongodb-leaf.png"
              alt="MongoDB"
              sx={{ width: 28, height: 42 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              DevRel Insights
            </Typography>
          </Box>
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
              href="#api"
              color="inherit"
            >
              API
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
                href="https://testflight.apple.com/join/rAqHXs1Y"
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
                href="/login"
                variant="outlined"
                size="large"
                color="primary"
                startIcon={<DashboardIcon />}
                sx={{ px: 4, py: 1.5 }}
              >
                Open Dashboard
              </Button>
            </Stack>
          </Box>

          {/* App Preview */}
          <Box 
            sx={{ 
              textAlign: 'center', 
              mb: 12,
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

          {/* How It Works Section */}
          <Box mb={12} id="how-it-works">
            <Typography 
              variant="h2" 
              textAlign="center" 
              sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}
            >
              How It Works
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              textAlign="center" 
              sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
            >
              From conversation to actionable insight in five simple steps
            </Typography>
            
            <Box sx={{ position: 'relative' }}>
              {/* Connection line */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'block' },
                  position: 'absolute',
                  top: 60,
                  left: '10%',
                  right: '10%',
                  height: 2,
                  bgcolor: 'rgba(0, 237, 100, 0.2)',
                  zIndex: 0,
                }}
              />
              
              <Grid container spacing={3} justifyContent="center">
                {howItWorks.map((item, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          bgcolor: 'background.paper',
                          border: '3px solid',
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        {item.icon}
                      </Avatar>
                      <Chip
                        label={`Step ${item.step}`}
                        size="small"
                        sx={{ mb: 1, bgcolor: 'primary.main', color: '#001E2B', fontWeight: 600 }}
                      />
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>

          {/* Features Grid */}
          <Box mb={12}>
            <Typography 
              variant="h2" 
              textAlign="center" 
              sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}
            >
              Built for Developer Advocates
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              textAlign="center" 
              sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
            >
              Every feature designed for the unique needs of DevRel professionals
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

          {/* Dashboard Preview Section */}
          <Box mb={12} id="dashboard">
            <Typography 
              variant="h2" 
              textAlign="center" 
              sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}
            >
              Powerful Admin Dashboard
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              textAlign="center" 
              sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
            >
              Analyze insights, track trends, and generate reports from one central hub
            </Typography>
            
            <Grid container spacing={4}>
              {dashboardFeatures.map((feature, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={index}>
                  <Card
                    sx={{
                      bgcolor: 'background.paper',
                      border: '1px solid rgba(255,255,255,0.1)',
                      overflow: 'hidden',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        height: 200,
                        bgcolor: 'rgba(0, 237, 100, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <DashboardIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5 }} />
                    </Box>
                    <CardContent sx={{ p: 3 }}>
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
            
            <Box textAlign="center" mt={4}>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                color="primary"
                endIcon={<ArrowForwardIcon />}
              >
                Explore the Dashboard
              </Button>
            </Box>
          </Box>

          {/* Role-Based Access Section */}
          <Box mb={12} id="roles">
            <Typography 
              variant="h2" 
              textAlign="center" 
              sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}
            >
              Role-Based Access
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              textAlign="center" 
              sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
            >
              Right access for every team member — from stakeholders to admins
            </Typography>
            
            <Grid container spacing={3}>
              {roles.map((role, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                  <Card
                    sx={{
                      height: '100%',
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: role.color,
                      borderTopWidth: 4,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Avatar
                        sx={{
                          bgcolor: role.color,
                          mb: 2,
                        }}
                      >
                        {role.icon}
                      </Avatar>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        {role.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {role.description}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={1}>
                        {role.features.map((feature, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircleIcon sx={{ fontSize: 16, color: role.color }} />
                            <Typography variant="caption" color="text.secondary">
                              {feature}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* API Section */}
          <Box mb={12} id="api">
            <Card
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid rgba(255,255,255,0.1)',
                p: { xs: 3, md: 6 },
              }}
            >
              <Grid container spacing={4} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <ApiIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      REST API
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Build integrations, automate workflows, and extend DevRel Insights 
                    with our comprehensive REST API. Full CRUD operations for insights, 
                    events, and team data.
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Button
                      component={Link}
                      href="/guide#api"
                      variant="contained"
                      color="primary"
                      sx={{ color: '#001E2B' }}
                    >
                      API Documentation
                    </Button>
                    <Button
                      component={Link}
                      href="/login"
                      variant="outlined"
                      color="primary"
                    >
                      Get API Access
                    </Button>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      bgcolor: '#001E2B',
                      borderRadius: 2,
                      p: 3,
                      fontFamily: 'monospace',
                      fontSize: 14,
                      color: 'text.secondary',
                      border: '1px solid rgba(255,255,255,0.1)',
                      overflow: 'auto',
                    }}
                  >
                    <Box sx={{ color: '#6B7280', mb: 1 }}># Get all insights</Box>
                    <Box sx={{ color: 'primary.main' }}>
                      GET /api/insights
                    </Box>
                    <Box sx={{ color: '#6B7280', mt: 2, mb: 1 }}># Create an insight</Box>
                    <Box sx={{ color: 'primary.main' }}>
                      POST /api/insights
                    </Box>
                    <Box sx={{ color: 'text.secondary', mt: 1, pl: 2 }}>
                      {`{ "text": "...", "type": "Pain Point" }`}
                    </Box>
                    <Box sx={{ color: '#6B7280', mt: 2, mb: 1 }}># AI analysis</Box>
                    <Box sx={{ color: 'primary.main' }}>
                      POST /api/insights/:id/analyze
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Card>
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                color="primary"
                startIcon={<AppleIcon />}
                href="https://testflight.apple.com/join/rAqHXs1Y"
                target="_blank"
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  color: '#001E2B',
                }}
              >
                Get the iOS App
              </Button>
              <Button
                component={Link}
                href="/guide"
                variant="outlined"
                size="large"
                color="primary"
                sx={{ px: 4, py: 1.5 }}
              >
                Read the Guide
              </Button>
            </Stack>
          </Box>
        </Container>

        {/* Footer */}
        <Box 
          component="footer" 
          sx={{ 
            py: 4, 
            px: 3, 
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box
                    component="img"
                    src="/mongodb-leaf.png"
                    alt="MongoDB"
                    sx={{ width: 20, height: 30 }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    DevRel Insights
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Built with 💚 by the MongoDB Developer Relations team
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Product
                </Typography>
                <Stack spacing={1}>
                  <Link href="#how-it-works" style={{ color: '#B8C4C8', textDecoration: 'none', fontSize: 14 }}>How It Works</Link>
                  <Link href="#dashboard" style={{ color: '#B8C4C8', textDecoration: 'none', fontSize: 14 }}>Dashboard</Link>
                  <Link href="#roles" style={{ color: '#B8C4C8', textDecoration: 'none', fontSize: 14 }}>Roles</Link>
                  <Link href="#api" style={{ color: '#B8C4C8', textDecoration: 'none', fontSize: 14 }}>API</Link>
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Resources
                </Typography>
                <Stack spacing={1}>
                  <Link href="/guide" style={{ color: '#B8C4C8', textDecoration: 'none', fontSize: 14 }}>User Guide</Link>
                  <Link href="/guide#api" style={{ color: '#B8C4C8', textDecoration: 'none', fontSize: 14 }}>API Docs</Link>
                  <Link href="https://testflight.apple.com/join/rAqHXs1Y" target="_blank" style={{ color: '#B8C4C8', textDecoration: 'none', fontSize: 14 }}>TestFlight</Link>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Get Started
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<AppleIcon />}
                  href="https://testflight.apple.com/join/rAqHXs1Y"
                  target="_blank"
                  sx={{ color: '#001E2B', mr: 1 }}
                >
                  iOS App
                </Button>
                <Button
                  component={Link}
                  href="/login"
                  variant="outlined"
                  color="primary"
                  size="small"
                >
                  Dashboard
                </Button>
              </Grid>
            </Grid>
            <Divider sx={{ my: 3 }} />
            <Typography variant="caption" color="text.secondary">
              © 2026 MongoDB, Inc. All rights reserved.
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
