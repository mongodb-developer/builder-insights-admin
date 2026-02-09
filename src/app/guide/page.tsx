'use client';

/**
 * DevRel Insights - Comprehensive User Guide
 * 
 * Public documentation page covering:
 * - Mobile app quick start
 * - Web dashboard usage
 * - Role-based access
 * - API documentation
 * - FAQ
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Link from 'next/link';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppleIcon from '@mui/icons-material/Apple';
import DownloadIcon from '@mui/icons-material/Download';
import MicIcon from '@mui/icons-material/Mic';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import EventIcon from '@mui/icons-material/Event';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApiIcon from '@mui/icons-material/Api';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ComputerIcon from '@mui/icons-material/Computer';
import SecurityIcon from '@mui/icons-material/Security';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
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
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: '#112733',
          '&:before': { display: 'none' },
        },
      },
    },
  },
});

// Code block component
function CodeBlock({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ position: 'relative', my: 2 }}>
      {title && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          {title}
        </Typography>
      )}
      <Paper
        sx={{
          bgcolor: '#001E2B',
          p: 2,
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: 13,
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Button
          size="small"
          onClick={handleCopy}
          sx={{
            position: 'absolute',
            top: title ? 28 : 8,
            right: 8,
            minWidth: 'auto',
            p: 0.5,
            color: 'text.secondary',
          }}
        >
          {copied ? <CheckCircleIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </Button>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{children}</pre>
      </Paper>
    </Box>
  );
}

// Section component
function Section({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box id={id} sx={{ mb: 6, scrollMarginTop: 100 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Typography variant="h4">{title}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState(0);

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
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackIcon />}
            color="inherit"
          >
            Back to Home
          </Button>
          <Stack direction="row" spacing={2}>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              color="primary"
            >
              Sign In
            </Button>
          </Stack>
        </Box>

        <Container maxWidth="lg" sx={{ py: 6 }}>
          {/* Page Header */}
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography variant="h2" sx={{ mb: 2 }}>
              DevRel Insights Guide
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Everything you need to know about capturing, managing, and analyzing developer insights.
            </Typography>
          </Box>

          {/* Navigation Tabs */}
          <Paper sx={{ mb: 4, bgcolor: 'background.paper' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { minHeight: 64, textTransform: 'none', fontWeight: 600 },
                '& .Mui-selected': { color: 'primary.main' },
              }}
            >
              <Tab icon={<PhoneIphoneIcon />} label="Mobile App" />
              <Tab icon={<ComputerIcon />} label="Dashboard" />
              <Tab icon={<SecurityIcon />} label="Roles" />
              <Tab icon={<ApiIcon />} label="API" />
              <Tab icon={<HelpOutlineIcon />} label="FAQ" />
            </Tabs>
          </Paper>

          {/* Mobile App Guide */}
          {activeTab === 0 && (
            <Box>
              <Section id="mobile-install" title="Getting Started" icon={<DownloadIcon sx={{ fontSize: 32 }} />}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  DevRel Insights is currently in beta. Join via TestFlight to get early access.
                </Alert>
                
                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>1. Install from TestFlight</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Open TestFlight on your iPhone" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Tap 'Redeem' and enter the code, or use the link below" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Install DevRel Insights and open the app" />
                      </ListItem>
                    </List>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AppleIcon />}
                      href="https://testflight.apple.com/join/rAqHXs1Y"
                      target="_blank"
                      sx={{ mt: 2, color: '#001E2B' }}
                    >
                      Join TestFlight Beta
                    </Button>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>2. Sign In</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Enter your @mongodb.com email address" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Check your email for a 6-digit verification code" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Enter the code to complete sign in" />
                      </ListItem>
                    </List>
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <strong>Test Account:</strong> Use <code>demo@devrelinsights.app</code> with code <code>999999</code> to try the app.
                    </Alert>
                  </CardContent>
                </Card>
              </Section>

              <Section id="mobile-capture" title="Capturing Insights" icon={<MicIcon sx={{ fontSize: 32 }} />}>
                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Voice Recording</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      The fastest way to capture insights during conversations:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><TouchAppIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Tap the microphone button" 
                          secondary="Hold to record, release to stop"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="AI transcribes automatically" 
                          secondary="Edit the text if needed"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><LocalOfferIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Add tags and categorize" 
                          secondary="Type, sentiment, priority, product area"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Photo Attachments</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Attach photos of whiteboards, diagrams, or architecture sketches:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CameraAltIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Tap the camera icon to take a photo" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Or select from your photo library" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>

                <Card sx={{ bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Offline Mode</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No internet? No problem. DevRel Insights works fully offline:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CloudSyncIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Insights are stored locally" 
                          secondary="Automatically sync when you reconnect"
                        />
                      </ListItem>
                    </List>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Look for the sync indicator in the app to see pending uploads.
                    </Alert>
                  </CardContent>
                </Card>
              </Section>

              <Section id="mobile-events" title="Selecting Events" icon={<EventIcon sx={{ fontSize: 32 }} />}>
                <Card sx={{ bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Link your insights to specific conferences, meetups, or customer visits:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Tap 'Select Event' before capturing" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Search or browse upcoming events" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="All insights will be tagged with that event" />
                      </ListItem>
                    </List>
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <strong>Pro tip:</strong> Set your event at the start of the day and capture multiple insights throughout.
                    </Alert>
                  </CardContent>
                </Card>
              </Section>
            </Box>
          )}

          {/* Dashboard Guide */}
          {activeTab === 1 && (
            <Box>
              <Section id="dashboard-overview" title="Dashboard Overview" icon={<DashboardIcon sx={{ fontSize: 32 }} />}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  The web dashboard at <Link href="/login" style={{ color: '#00ED64' }}>devrel-insights-admin.vercel.app</Link> provides 
                  powerful tools for viewing, analyzing, and reporting on captured insights.
                </Typography>

                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Key Features</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><DashboardIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Executive Dashboard" 
                          secondary="High-level metrics, trends, and AI-generated summaries"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Insights Feed" 
                          secondary="Search, filter, and browse all captured insights"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><EventIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Events Management" 
                          secondary="Create and manage conferences, meetups, and visits"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><PersonIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Team Leaderboard" 
                          secondary="See who's capturing the most valuable insights"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Section>

              <Section id="dashboard-insights" title="Working with Insights" icon={<TipsAndUpdatesIcon sx={{ fontSize: 32 }} />}>
                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Viewing & Filtering</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Use the Insights page to find and analyze feedback:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Filter by type: Pain Point, Feature Request, Feedback, etc." />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Filter by sentiment: Positive, Neutral, Negative" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Filter by priority: Critical, High, Medium, Low" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="Search by keyword, tag, event, or advocate" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>

                <Card sx={{ bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>AI Analysis</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Get AI-powered insights on your data:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Per-Insight Analysis" 
                          secondary="Click any insight and hit 'Analyze' for AI summary and theme extraction"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Quarterly Summaries" 
                          secondary="Dashboard shows AI-generated summary of all insights"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Section>
            </Box>
          )}

          {/* Roles Guide */}
          {activeTab === 2 && (
            <Box>
              <Section id="roles-overview" title="Role-Based Access" icon={<SecurityIcon sx={{ fontSize: 32 }} />}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  DevRel Insights uses a role-based access control system. New users are automatically 
                  assigned the <strong>Viewer</strong> role and can be upgraded by administrators.
                </Typography>

                <TableContainer component={Paper} sx={{ mb: 4, bgcolor: 'background.paper' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Role</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Key Permissions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Chip icon={<VisibilityIcon />} label="Viewer" size="small" />
                        </TableCell>
                        <TableCell>Read-only access for stakeholders</TableCell>
                        <TableCell>View insights, events, analytics, reports</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Chip icon={<PersonIcon />} label="Advocate" size="small" color="primary" />
                        </TableCell>
                        <TableCell>Field advocates who capture insights</TableCell>
                        <TableCell>+ Create insights, edit own insights, voice capture</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Chip icon={<SupervisorAccountIcon />} label="Manager" size="small" color="warning" />
                        </TableCell>
                        <TableCell>Team leads who oversee advocates</TableCell>
                        <TableCell>+ Edit all insights, manage events, PMO import</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Chip icon={<AdminPanelSettingsIcon />} label="Admin" size="small" color="error" />
                        </TableCell>
                        <TableCell>System administrators</TableCell>
                        <TableCell>+ User management, settings, operations</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Alert severity="info">
                  <strong>Need elevated access?</strong> Contact your team administrator to upgrade your role.
                </Alert>
              </Section>

              <Section id="test-accounts" title="Test Accounts" icon={<CodeIcon sx={{ fontSize: 32 }} />}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Use these accounts to test different role permissions. All use verification code <code>999999</code>.
                </Typography>

                <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Email</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Access Level</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell><code>admin@devrelinsights.app</code></TableCell>
                        <TableCell><code>999999</code></TableCell>
                        <TableCell><Chip label="Admin" size="small" color="error" /></TableCell>
                        <TableCell>Full access</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>manager@devrelinsights.app</code></TableCell>
                        <TableCell><code>999999</code></TableCell>
                        <TableCell><Chip label="Manager" size="small" color="warning" /></TableCell>
                        <TableCell>Manage events, import</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>advocate@devrelinsights.app</code></TableCell>
                        <TableCell><code>999999</code></TableCell>
                        <TableCell><Chip label="Advocate" size="small" color="primary" /></TableCell>
                        <TableCell>Create/edit insights</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>viewer@devrelinsights.app</code></TableCell>
                        <TableCell><code>999999</code></TableCell>
                        <TableCell><Chip label="Viewer" size="small" /></TableCell>
                        <TableCell>Read-only</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>demo@devrelinsights.app</code></TableCell>
                        <TableCell><code>999999</code></TableCell>
                        <TableCell><Chip label="Advocate" size="small" color="primary" /></TableCell>
                        <TableCell>Demo account</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Section>
            </Box>
          )}

          {/* API Documentation */}
          {activeTab === 3 && (
            <Box id="api">
              <Section id="api-overview" title="API Overview" icon={<ApiIcon sx={{ fontSize: 32 }} />}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  DevRel Insights provides a REST API for building integrations and automating workflows.
                  All endpoints are available at <code>https://devrel-insights-admin.vercel.app/api</code>.
                </Typography>

                <Alert severity="warning" sx={{ mb: 3 }}>
                  <strong>Authentication Required:</strong> Most endpoints require a valid session cookie. 
                  Use the magic link flow to authenticate, or contact an admin for API access.
                </Alert>
              </Section>

              <Section id="api-insights" title="Insights API" icon={<TipsAndUpdatesIcon sx={{ fontSize: 32 }} />}>
                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>GET /api/insights</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Retrieve all insights with optional filters.
                    </Typography>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Query Parameters:</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary={<code>type</code>} secondary="Filter by type (Pain Point, Feature Request, etc.)" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary={<code>sentiment</code>} secondary="Filter by sentiment (Positive, Neutral, Negative)" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary={<code>priority</code>} secondary="Filter by priority (Critical, High, Medium, Low)" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary={<code>eventId</code>} secondary="Filter by event ID" />
                      </ListItem>
                    </List>
                    <CodeBlock title="Example Request">{`curl -X GET "https://devrel-insights-admin.vercel.app/api/insights?type=Pain%20Point&priority=High" \\
  -H "Cookie: di-session=YOUR_SESSION_TOKEN"`}</CodeBlock>
                    <CodeBlock title="Example Response">{`{
  "insights": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "text": "Developers find the aggregation pipeline syntax confusing",
      "type": "Pain Point",
      "sentiment": "Negative",
      "priority": "High",
      "productAreas": ["Aggregation", "Documentation"],
      "tags": ["syntax", "learning-curve"],
      "eventName": "MongoDB World 2026",
      "advocateName": "Michael Lynn",
      "capturedAt": "2026-02-08T14:30:00Z"
    }
  ],
  "total": 1
}`}</CodeBlock>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>POST /api/insights</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Create a new insight. Requires <strong>Advocate</strong> role or higher.
                    </Typography>
                    <CodeBlock title="Example Request">{`curl -X POST "https://devrel-insights-admin.vercel.app/api/insights" \\
  -H "Cookie: di-session=YOUR_SESSION_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Would love to see better TypeScript support in the Node.js driver",
    "type": "Feature Request",
    "sentiment": "Positive",
    "priority": "Medium",
    "productAreas": ["Drivers", "Node.js"],
    "tags": ["typescript", "dx"],
    "eventId": "65f1a2b3c4d5e6f7a8b9c0d2"
  }'`}</CodeBlock>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>POST /api/insights/:id/analyze</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Generate AI analysis for an insight. Returns summary, themes, and priority suggestions.
                    </Typography>
                    <CodeBlock title="Example Request">{`curl -X POST "https://devrel-insights-admin.vercel.app/api/insights/65f1a2b3c4d5e6f7a8b9c0d1/analyze" \\
  -H "Cookie: di-session=YOUR_SESSION_TOKEN"`}</CodeBlock>
                    <CodeBlock title="Example Response">{`{
  "analysis": {
    "summary": "Developer requesting improved TypeScript types for better IDE support",
    "themes": ["Developer Experience", "Type Safety", "Tooling"],
    "prioritySuggestion": "Medium",
    "confidence": 0.85,
    "analyzedAt": "2026-02-08T15:00:00Z"
  }
}`}</CodeBlock>
                  </CardContent>
                </Card>
              </Section>

              <Section id="api-events" title="Events API" icon={<EventIcon sx={{ fontSize: 32 }} />}>
                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>GET /api/events</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Retrieve all events (conferences, meetups, customer visits).
                    </Typography>
                    <CodeBlock title="Example Request">{`curl -X GET "https://devrel-insights-admin.vercel.app/api/events" \\
  -H "Cookie: di-session=YOUR_SESSION_TOKEN"`}</CodeBlock>
                  </CardContent>
                </Card>

                <Card sx={{ bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>POST /api/events</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Create a new event. Requires <strong>Manager</strong> role or higher.
                    </Typography>
                    <CodeBlock title="Example Request">{`curl -X POST "https://devrel-insights-admin.vercel.app/api/events" \\
  -H "Cookie: di-session=YOUR_SESSION_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "MongoDB World 2026",
    "type": "Conference",
    "location": "New York, NY",
    "startDate": "2026-06-15",
    "endDate": "2026-06-17"
  }'`}</CodeBlock>
                  </CardContent>
                </Card>
              </Section>

              <Section id="api-dashboard" title="Dashboard API" icon={<DashboardIcon sx={{ fontSize: 32 }} />}>
                <Card sx={{ bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>GET /api/dashboard</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Retrieve dashboard metrics and statistics.
                    </Typography>
                    <CodeBlock title="Example Response">{`{
  "totalInsights": 1247,
  "thisMonth": 89,
  "byType": {
    "Pain Point": 423,
    "Feature Request": 312,
    "Positive Feedback": 289,
    "Bug Report": 112,
    "Use Case": 111
  },
  "bySentiment": {
    "Positive": 456,
    "Neutral": 534,
    "Negative": 257
  },
  "topAdvocates": [
    { "name": "Michael Lynn", "count": 234 },
    { "name": "Jane Doe", "count": 198 }
  ]
}`}</CodeBlock>
                  </CardContent>
                </Card>
              </Section>
            </Box>
          )}

          {/* FAQ */}
          {activeTab === 4 && (
            <Box>
              <Section id="faq" title="Frequently Asked Questions" icon={<HelpOutlineIcon sx={{ fontSize: 32 }} />}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>Who can use DevRel Insights?</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">
                      DevRel Insights is currently available to MongoDB Developer Relations team members. 
                      Sign in with your @mongodb.com email to get started. External collaborators can 
                      request access through their MongoDB contact.
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>Does the mobile app work offline?</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">
                      Yes! The mobile app is fully offline-capable. You can capture insights without 
                      internet connectivity, and they'll automatically sync when you reconnect. Look 
                      for the sync indicator to see pending uploads.
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>How does voice transcription work?</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">
                      Voice recordings are processed using AI transcription. Simply tap and hold the 
                      microphone button, speak your insight, and release. The text is transcribed 
                      automatically and you can edit it before saving.
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>What's the difference between roles?</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">
                      <strong>Viewer:</strong> Read-only access to all data and reports.<br />
                      <strong>Advocate:</strong> Can create and edit their own insights.<br />
                      <strong>Manager:</strong> Can edit all insights and manage events.<br />
                      <strong>Admin:</strong> Full access including user management.
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>How do I upgrade my role?</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">
                      New users start as Viewers. To upgrade to Advocate, Manager, or Admin, 
                      contact your team administrator. They can change your role in the 
                      User Management section of the dashboard.
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>Can I export my data?</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">
                      Yes! Use the API to export insights programmatically, or contact an admin 
                      for bulk exports. We're working on built-in export features for the dashboard.
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>How do I report a bug?</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">
                      Use the bug report button (bottom-right corner of any page in the dashboard) 
                      or shake your phone in the mobile app to report issues. Include steps to 
                      reproduce and screenshots if possible.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Section>
            </Box>
          )}

          {/* Quick Links */}
          <Divider sx={{ my: 6 }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Ready to get started?</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                color="primary"
                startIcon={<AppleIcon />}
                href="https://testflight.apple.com/join/rAqHXs1Y"
                target="_blank"
                sx={{ color: '#001E2B' }}
              >
                Get iOS App
              </Button>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                color="primary"
                startIcon={<DashboardIcon />}
              >
                Open Dashboard
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
            mt: 6,
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
