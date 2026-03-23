'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import { Delete, Save, Refresh, Help, RestartAlt, School } from '@mui/icons-material';
import { resetOnboardingTour, resetDismissedHelp, useHelp } from '@/components/help';
import { SCHEMA } from '@/lib/schema-mapper';

interface SchemaMapping {
  field: string;
  aliases: string[];
}

const ROLE_LEVELS: Record<string, number> = { admin: 100, manager: 75, advocate: 50, viewer: 25 };

export default function SettingsPage() {
  const { startTour } = useHelp();
  const [aliases, setAliases] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [helpReset, setHelpReset] = useState(false);
  const [userRole, setUserRole] = useState<string>('viewer');

  const isManager = (ROLE_LEVELS[userRole] || 0) >= ROLE_LEVELS.manager;

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.role) setUserRole(data.role); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/schema')
      .then((res) => res.json())
      .then((data) => {
        setAliases(data.aliases || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDeleteAlias = async (field: string, alias: string) => {
    try {
      await fetch('/api/schema', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, alias }),
      });
      
      setAliases((prev) => ({
        ...prev,
        [field]: (prev[field] || []).filter((a) => a !== alias),
      }));
    } catch (err) {
      console.error('Failed to delete alias:', err);
    }
  };

  const allMappings = SCHEMA.map((field) => ({
    field: field.name,
    builtIn: field.aliases,
    custom: aliases[field.name] || [],
    required: field.required,
  }));

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Settings</Typography>
        <Typography color="text.secondary">
          Configure schema mappings and system settings
        </Typography>
      </Box>

      {/* Database Connection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Database Connection
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Configure MONGODB_URI in your .env.local file
          </Alert>
          <TextField
            fullWidth
            label="MongoDB URI"
            value="mongodb+srv://***@***.mongodb.net"
            disabled
            size="small"
            helperText="Connection string is configured via environment variables"
          />
        </CardContent>
      </Card>

      {/* Schema Mappings */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">
                Column Mappings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Learned aliases for CSV import. These are auto-saved when you correct mappings.
              </Typography>
            </Box>
            <Button
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Built-in Aliases</TableCell>
                  <TableCell>Learned Aliases</TableCell>
                  <TableCell width={80}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allMappings.map((mapping) => (
                  <TableRow key={mapping.field}>
                    <TableCell>
                      <Typography component="span" fontWeight={500}>
                        {mapping.field}
                      </Typography>
                      {mapping.required && (
                        <Chip label="required" size="small" sx={{ ml: 1 }} color="error" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {mapping.builtIn.slice(0, 4).map((alias) => (
                          <Chip key={alias} label={alias} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                        ))}
                        {mapping.builtIn.length > 4 && (
                          <Chip label={`+${mapping.builtIn.length - 4}`} size="small" sx={{ mb: 0.5 }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {mapping.custom.map((alias) => (
                          <Chip
                            key={alias}
                            label={alias}
                            size="small"
                            color="primary"
                            onDelete={isManager ? () => handleDeleteAlias(mapping.field, alias) : undefined}
                            sx={{ mb: 0.5 }}
                          />
                        ))}
                        {mapping.custom.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            None
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {mapping.custom.length > 0 && isManager && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            mapping.custom.forEach((a) => handleDeleteAlias(mapping.field, a));
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Slack Integration */}
      <SlackSettings canSend={isManager} />

      {/* Export/Import */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Export
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined">Export Events (CSV)</Button>
            <Button variant="outlined">Export Insights (CSV)</Button>
            <Button variant="outlined">Export All (JSON)</Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Help & Onboarding */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Help color="primary" />
            <Typography variant="h6">Help & Onboarding</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Access help resources and restart the onboarding experience.
          </Typography>
          
          {helpReset && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Help preferences reset! Page-level tips will appear again.
            </Alert>
          )}

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<School />}
              onClick={() => {
                resetOnboardingTour();
                startTour();
              }}
            >
              Restart Tour
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestartAlt />}
              onClick={() => {
                resetDismissedHelp();
                setHelpReset(true);
                setTimeout(() => setHelpReset(false), 3000);
              }}
            >
              Reset Help Tips
            </Button>
          </Stack>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            💡 Tip: Press <strong>?</strong> anywhere to open the help drawer
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

function SlackSettings({ canSend }: { canSend: boolean }) {
  const [configured, setConfigured] = useState(false);
  const [digestPreview, setDigestPreview] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/slack/digest')
      .then((res) => res.json())
      .then((data) => {
        setConfigured(data.configured);
        setDigestPreview(data.preview);
      })
      .catch(console.error);
  }, []);

  const handleSendDigest = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/slack/digest', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `Digest sent! ${data.insightCount} insights summarized.` });
      } else {
        setResult({ success: false, message: data.error || 'Failed to send' });
      }
    } catch (err) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Slack Integration
        </Typography>
        
        {!configured ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Slack webhook not configured. Set SLACK_WEBHOOK_URL in your environment variables.
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mb: 2 }}>
            Slack webhook configured and ready.
          </Alert>
        )}

        {digestPreview && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Weekly Digest Preview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {digestPreview.insightCount} insights from the past week
              {digestPreview.insightCount > 0 && (
                <> • 😊 {digestPreview.sentiment.positive} positive, 
                😐 {digestPreview.sentiment.neutral} neutral, 
                😟 {digestPreview.sentiment.negative} negative</>
              )}
            </Typography>
          </Box>
        )}

        {result && (
          <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 2 }}>
            {result.message}
          </Alert>
        )}

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={handleSendDigest}
            disabled={!configured || sending || !canSend}
          >
            {sending ? 'Sending...' : 'Send Weekly Digest Now'}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {canSend
              ? 'Tip: A weekly cron job is configured to send this automatically every Monday.'
              : 'Manager or admin access required to send digests.'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
