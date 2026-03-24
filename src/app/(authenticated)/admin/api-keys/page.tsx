'use client';

/**
 * API Key Management (Admin)
 *
 * Full CRUD for API keys: generate, view, update, revoke.
 * Includes usage stats, scope management, and pending request approval.
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  Paper,
  Divider,
  Snackbar,
  InputAdornment,
  LinearProgress,
} from '@mui/material';
import {
  VpnKey as KeyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Block as RevokeIcon,
  Refresh as RefreshIcon,
  Pending as PendingIcon,
  CheckCircle as ApproveIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';

// ============================================================================
// TYPES
// ============================================================================

interface ApiKeyData {
  _id: string;
  prefix: string;
  name: string;
  description?: string;
  ownerEmail: string;
  ownerName: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  totalRequests: number;
}

interface ApiKeyRequest {
  _id: string;
  name: string;
  description: string;
  requestedScopes: string[];
  requesterEmail: string;
  requesterName: string;
  intendedUse: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

const ALL_SCOPES = [
  { value: 'insights:read', label: 'Insights: Read' },
  { value: 'insights:write', label: 'Insights: Write' },
  { value: 'events:read', label: 'Events: Read' },
  { value: 'events:write', label: 'Events: Write' },
  { value: 'sessions:read', label: 'Sessions: Read' },
  { value: 'advocates:read', label: 'Advocates: Read' },
];

// ============================================================================
// HELPERS
// ============================================================================

const formatDate = (d: string | null) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatTimeAgo = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

// ============================================================================
// CREATE DIALOG
// ============================================================================

function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (key: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['insights:read', 'insights:write']);
  const [rateLimit, setRateLimit] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScopeToggle = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, ownerEmail, ownerName, scopes, rateLimit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create key');
      onCreated(data.key);
      setName('');
      setDescription('');
      setOwnerEmail('');
      setOwnerName('');
      setScopes(['insights:read', 'insights:write']);
      setRateLimit(1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Generate New API Key</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="Key Name"
          fullWidth
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
          placeholder="e.g., Partner Integration - Acme Corp"
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="What will this key be used for?"
        />
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Owner Email"
              fullWidth
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="dev@acme.com"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Owner Name"
              fullWidth
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Acme Corp"
            />
          </Grid>
        </Grid>
        <TextField
          label="Daily Rate Limit"
          type="number"
          fullWidth
          value={rateLimit}
          onChange={(e) => setRateLimit(parseInt(e.target.value) || 0)}
          sx={{ mb: 2 }}
          helperText="0 = unlimited. Default: 1,000 requests/day"
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">req/day</InputAdornment>,
            },
          }}
        />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Scopes</Typography>
        <FormGroup>
          {ALL_SCOPES.map((s) => (
            <FormControlLabel
              key={s.value}
              control={
                <Checkbox
                  checked={scopes.includes(s.value)}
                  onChange={() => handleScopeToggle(s.value)}
                  size="small"
                />
              }
              label={<Typography variant="body2">{s.label}</Typography>}
            />
          ))}
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !name || !ownerEmail || !ownerName || scopes.length === 0}
          startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
        >
          Generate Key
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================================
// KEY REVEAL DIALOG
// ============================================================================

function KeyRevealDialog({
  open,
  apiKey,
  onClose,
}: {
  open: boolean;
  apiKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>API Key Created</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Copy this key now. It will not be shown again.
        </Alert>
        <TextField
          fullWidth
          value={apiKey}
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleCopy} size="small">
                    {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: { fontFamily: 'monospace', fontSize: 13 },
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ApiKeysAdminPage() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [requests, setRequests] = useState<ApiKeyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.isAdmin === true || data?.role === 'admin'))
      .catch(() => setIsAdmin(false));
  }, []);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/api-keys');
      if (!res.ok) throw new Error('Failed to fetch keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/api-keys/requests');
      if (!res.ok) return; // May not exist yet, that's ok
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      // Silently fail if endpoint doesn't exist yet
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchKeys(), fetchRequests()]).finally(() => setLoading(false));
  }, [fetchKeys, fetchRequests]);

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke key');
      setSnackbar('API key revoked');
      fetchKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/admin/api-keys/requests/${requestId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to approve request');
      const data = await res.json();
      setRevealKey(data.key);
      setSnackbar('Request approved and key generated');
      fetchRequests();
      fetchKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const note = prompt('Reason for rejection (optional):');
    try {
      const res = await fetch(`/api/admin/api-keys/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error('Failed to reject request');
      setSnackbar('Request rejected');
      fetchRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreated = (key: string) => {
    setCreateOpen(false);
    setRevealKey(key);
    fetchKeys();
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  if (isAdmin === null || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAdmin === false) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Admin access required to manage API keys.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <KeyIcon sx={{ fontSize: 32, color: mongoColors.green }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>API Keys</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage API keys for third-party integrations
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => { fetchKeys(); fetchRequests(); }}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setCreateOpen(true)}
          >
            Generate Key
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Active Keys
                <Chip label={keys.filter((k) => k.isActive).length} size="small" color="primary" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Requests
                {pendingRequests.length > 0 && (
                  <Chip label={pendingRequests.length} size="small" color="warning" />
                )}
              </Box>
            }
          />
          <Tab label="Revoked" />
        </Tabs>
      </Paper>

      {/* Active Keys Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Key Prefix</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Owner</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Scopes</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Rate Limit</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Requests</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Last Used</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {keys
                    .filter((k) => k.isActive)
                    .map((key) => (
                      <TableRow key={key._id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{key.name}</Typography>
                          {key.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {key.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={key.prefix + '...'}
                            size="small"
                            sx={{ fontFamily: 'monospace', fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{key.ownerName}</Typography>
                          <Typography variant="caption" color="text.secondary">{key.ownerEmail}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {key.scopes.map((s) => (
                              <Chip
                                key={s}
                                label={s}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 10 }}
                                color={s.includes('write') ? 'warning' : 'default'}
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {key.rateLimit > 0 ? `${key.rateLimit.toLocaleString()}/day` : 'Unlimited'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{key.totalRequests.toLocaleString()}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatTimeAgo(key.lastUsedAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(key.createdAt)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Revoke Key">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRevoke(key._id, key.name)}
                            >
                              <RevokeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  {keys.filter((k) => k.isActive).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                        <KeyIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
                        No active API keys. Click &quot;Generate Key&quot; to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Requests Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Requester</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Key Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Intended Use</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Requested Scopes</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Submitted</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req._id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{req.requesterName}</Typography>
                        <Typography variant="caption" color="text.secondary">{req.requesterEmail}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{req.name}</Typography>
                        {req.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {req.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.intendedUse}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {req.requestedScopes.map((s) => (
                            <Chip key={s} label={s} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={req.status}
                          size="small"
                          color={
                            req.status === 'pending' ? 'warning' :
                            req.status === 'approved' ? 'success' : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(req.createdAt)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        {req.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Approve & Generate Key">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApproveRequest(req._id)}
                              >
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRejectRequest(req._id)}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                        {req.status !== 'pending' && (
                          <Typography variant="caption" color="text.secondary">
                            {req.reviewedBy && `by ${req.reviewedBy}`}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                        <PendingIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
                        No API key requests yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Revoked Keys Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Key Prefix</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Owner</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Total Requests</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Revoked</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {keys
                    .filter((k) => !k.isActive)
                    .map((key) => (
                      <TableRow key={key._id} hover sx={{ opacity: 0.6 }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{key.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={key.prefix + '...'} size="small" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{key.ownerName}</Typography>
                        </TableCell>
                        <TableCell>{key.totalRequests.toLocaleString()}</TableCell>
                        <TableCell><Typography variant="caption">{formatDate(key.createdAt)}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{formatDate(key.updatedAt)}</Typography></TableCell>
                      </TableRow>
                    ))}
                  {keys.filter((k) => !k.isActive).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                        No revoked keys.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateKeyDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      {revealKey && (
        <KeyRevealDialog open={!!revealKey} apiKey={revealKey} onClose={() => setRevealKey(null)} />
      )}

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
