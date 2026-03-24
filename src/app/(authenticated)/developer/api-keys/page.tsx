'use client';

/**
 * Developer API Keys Page
 *
 * Allows any authenticated user to:
 *  - View documentation and getting-started info for the public API
 *  - Submit a request for an API key (goes to admin for approval)
 *  - View the status of their pending/approved/rejected requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
} from '@mui/material';
import {
  VpnKey as KeyIcon,
  Send as SendIcon,
  Code as CodeIcon,
  CheckCircle as ApprovedIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  MenuBook as DocsIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';

// ============================================================================
// TYPES
// ============================================================================

interface UserInfo {
  email: string;
  name: string;
  role: string;
}

interface MyRequest {
  _id: string;
  name: string;
  description: string;
  requestedScopes: string[];
  intendedUse: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

const SCOPE_OPTIONS = [
  { value: 'insights:read', label: 'Read Insights', description: 'Query and retrieve insight data' },
  { value: 'insights:write', label: 'Write Insights', description: 'Create and update insights' },
  { value: 'events:read', label: 'Read Events', description: 'Query events and conferences' },
  { value: 'events:write', label: 'Write Events', description: 'Create and update events' },
  { value: 'sessions:read', label: 'Read Sessions', description: 'Query session data' },
  { value: 'advocates:read', label: 'Read Advocates', description: 'Query advocate profiles' },
];

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

// ============================================================================
// CODE EXAMPLES
// ============================================================================

const CURL_EXAMPLE = `curl -X POST \\
  -H "X-API-Key: bi_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Developer interested in vector search for RAG",
    "type": "Use Case",
    "sentiment": "Positive",
    "priority": "High",
    "productAreas": ["Atlas Vector Search"]
  }' \\
  https://your-app.vercel.app/api/v1/insights`;

const PYTHON_EXAMPLE = `import requests

API_KEY = "bi_your_key_here"
BASE_URL = "https://your-app.vercel.app/api/v1"

response = requests.post(
    f"{BASE_URL}/insights",
    headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
    json={
        "text": "Developer interested in vector search for RAG",
        "type": "Use Case",
        "sentiment": "Positive",
        "productAreas": ["Atlas Vector Search"],
    },
)
print(response.json())`;

const JS_EXAMPLE = `const response = await fetch("https://your-app.vercel.app/api/v1/insights", {
  method: "POST",
  headers: {
    "X-API-Key": "bi_your_key_here",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: "Developer interested in vector search for RAG",
    type: "Use Case",
    sentiment: "Positive",
    productAreas: ["Atlas Vector Search"],
  }),
});
const data = await response.json();
console.log(data);`;

// ============================================================================
// CODE BLOCK COMPONENT
// ============================================================================

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: mongoColors.gray[700],
          color: mongoColors.gray[300],
          px: 2,
          py: 0.5,
          borderRadius: '8px 8px 0 0',
          fontSize: 12,
        }}
      >
        {language}
        <Button
          size="small"
          onClick={handleCopy}
          startIcon={copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
          sx={{ color: mongoColors.gray[300], fontSize: 11, minWidth: 0 }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </Box>
      <Box
        component="pre"
        sx={{
          bgcolor: mongoColors.black,
          color: mongoColors.green,
          p: 2,
          borderRadius: '0 0 8px 8px',
          overflow: 'auto',
          fontSize: 12,
          fontFamily: 'monospace',
          lineHeight: 1.6,
          m: 0,
        }}
      >
        {code}
      </Box>
    </Box>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function DeveloperApiKeysPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Request form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [intendedUse, setIntendedUse] = useState('');
  const [scopes, setScopes] = useState<string[]>(['insights:read', 'insights:write']);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Active code example tab
  const [codeTab, setCodeTab] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/api-keys/requests/mine').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([userData, requestsData]) => {
      if (userData) setUser({ email: userData.email, name: userData.name, role: userData.role });
      if (requestsData?.requests) setMyRequests(requestsData.requests);
      setLoading(false);
    });
  }, []);

  const handleScopeToggle = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/api-keys/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, intendedUse, requestedScopes: scopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request');
      setSubmitted(true);
      setSnackbar('API key request submitted! An admin will review it shortly.');
      // Refresh requests list
      const refreshed = await fetch('/api/api-keys/requests/mine').then((r) => r.ok ? r.json() : null);
      if (refreshed?.requests) setMyRequests(refreshed.requests);
      // Reset form
      setName('');
      setDescription('');
      setIntendedUse('');
      setScopes(['insights:read', 'insights:write']);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <CodeIcon sx={{ fontSize: 32, color: mongoColors.green }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Developer API</Typography>
          <Typography variant="body2" color="text.secondary">
            Build integrations with the Builder Insights API
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left column: Getting started + Code examples */}
        <Grid size={{ xs: 12, lg: 7 }}>
          {/* Getting Started */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DocsIcon sx={{ color: mongoColors.darkGreen }} />
                Getting Started
              </Typography>
              <Stepper orientation="vertical" activeStep={-1}>
                <Step active>
                  <StepLabel>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Request an API Key</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      Fill out the request form on this page. An administrator will review and approve your request.
                    </Typography>
                  </StepContent>
                </Step>
                <Step active>
                  <StepLabel>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Authenticate with X-API-Key</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      Include your API key in every request using the <code>X-API-Key</code> header.
                    </Typography>
                  </StepContent>
                </Step>
                <Step active>
                  <StepLabel>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Call the /api/v1/* Endpoints</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      Use the versioned API to create insights, query events, and more. See the code examples below.
                    </Typography>
                  </StepContent>
                </Step>
              </Stepper>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Available Endpoints</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Endpoint</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Scope</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { method: 'GET', endpoint: '/api/v1/insights', scope: 'insights:read' },
                      { method: 'POST', endpoint: '/api/v1/insights', scope: 'insights:write' },
                      { method: 'GET', endpoint: '/api/v1/insights/:id', scope: 'insights:read' },
                      { method: 'PUT', endpoint: '/api/v1/insights/:id', scope: 'insights:write' },
                      { method: 'GET', endpoint: '/api/v1/events', scope: 'events:read' },
                      { method: 'POST', endpoint: '/api/v1/events', scope: 'events:write' },
                      { method: 'GET', endpoint: '/api/v1/events/:id', scope: 'events:read' },
                      { method: 'GET', endpoint: '/api/v1/sessions', scope: 'sessions:read' },
                      { method: 'GET', endpoint: '/api/v1/advocates', scope: 'advocates:read' },
                    ].map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Chip
                            label={r.method}
                            size="small"
                            color={r.method === 'POST' ? 'warning' : r.method === 'PUT' ? 'info' : 'default'}
                            sx={{ fontFamily: 'monospace', fontSize: 11, minWidth: 50 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.endpoint}</TableCell>
                        <TableCell>
                          <Chip label={r.scope} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Code Examples */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Code Examples</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {['cURL', 'Python', 'JavaScript'].map((lang, i) => (
                  <Chip
                    key={lang}
                    label={lang}
                    onClick={() => setCodeTab(i)}
                    variant={codeTab === i ? 'filled' : 'outlined'}
                    color={codeTab === i ? 'primary' : 'default'}
                    size="small"
                  />
                ))}
              </Box>
              {codeTab === 0 && <CodeBlock code={CURL_EXAMPLE} language="bash" />}
              {codeTab === 1 && <CodeBlock code={PYTHON_EXAMPLE} language="python" />}
              {codeTab === 2 && <CodeBlock code={JS_EXAMPLE} language="javascript" />}
            </CardContent>
          </Card>
        </Grid>

        {/* Right column: Request form + My requests */}
        <Grid size={{ xs: 12, lg: 5 }}>
          {/* Request Form */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyIcon sx={{ color: mongoColors.darkGreen }} />
                Request an API Key
              </Typography>

              {submitted && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSubmitted(false)}>
                  Your request has been submitted and is pending admin review.
                </Alert>
              )}
              {submitError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
                  {submitError}
                </Alert>
              )}

              <TextField
                label="Key Name"
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="e.g., My Conference App"
                size="small"
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Brief description of your integration"
                size="small"
              />
              <TextField
                label="Intended Use"
                fullWidth
                required
                multiline
                rows={3}
                value={intendedUse}
                onChange={(e) => setIntendedUse(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Describe how you plan to use the API. For example: 'I'm building a Slack bot that records developer feedback from our community channels as insights.'"
                size="small"
              />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Requested Scopes</Typography>
              <FormGroup sx={{ mb: 2 }}>
                {SCOPE_OPTIONS.map((s) => (
                  <FormControlLabel
                    key={s.value}
                    control={
                      <Checkbox
                        checked={scopes.includes(s.value)}
                        onChange={() => handleScopeToggle(s.value)}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.description}</Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>

              <Button
                fullWidth
                variant="contained"
                onClick={handleSubmitRequest}
                disabled={submitting || !name || !intendedUse || scopes.length === 0}
                startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
              >
                Submit Request
              </Button>
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>My Requests</Typography>
              {myRequests.length > 0 ? (
                myRequests.map((req) => (
                  <Paper
                    key={req._id}
                    variant="outlined"
                    sx={{ p: 2, mb: 1.5, '&:last-child': { mb: 0 } }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{req.name}</Typography>
                      <Chip
                        size="small"
                        icon={
                          req.status === 'pending' ? <PendingIcon /> :
                          req.status === 'approved' ? <ApprovedIcon /> :
                          <RejectedIcon />
                        }
                        label={req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        color={
                          req.status === 'pending' ? 'warning' :
                          req.status === 'approved' ? 'success' : 'error'
                        }
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Submitted {formatDate(req.createdAt)}
                    </Typography>
                    {req.reviewNote && (
                      <Alert severity={req.status === 'rejected' ? 'error' : 'info'} sx={{ mt: 1 }} variant="outlined">
                        <Typography variant="caption">{req.reviewNote}</Typography>
                      </Alert>
                    )}
                    {req.status === 'approved' && (
                      <Alert severity="success" sx={{ mt: 1 }} variant="outlined">
                        <Typography variant="caption">
                          Approved! Your API key was sent to your email. Check your inbox.
                        </Typography>
                      </Alert>
                    )}
                  </Paper>
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <KeyIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography variant="body2">No requests yet. Submit your first request above.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
