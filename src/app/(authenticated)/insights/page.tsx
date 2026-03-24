'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Skeleton,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  Checkbox,
  Divider,
} from '@mui/material';
import {
  Search,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
  Add,
  Edit,
  Delete,
  ViewList,
  ViewModule,
  Event as EventIcon,
  Person,
  CalendarToday,
  AutoAwesome as AIIcon,
  Mic as MicIcon,
  HourglassEmpty as HourglassIcon,
  SelectAll,
  Close as CloseIcon,
} from '@mui/icons-material';
import InsightFormDialog, { InsightFormData } from '@/components/InsightFormDialog';
import InsightDetailDrawer from '@/components/InsightDetailDrawer';
import { PageHelp, HelpButton, useHelp } from '@/components/help';
import { canEditInsight, canDeleteInsight, canCreateInsight } from '@/lib/roles';

interface ReactionCounts {
  like?: number;
  love?: number;
  insightful?: number;
  celebrate?: number;
  fire?: number;
}

const REACTION_EMOJI: Record<string, string> = {
  like: '👍',
  love: '❤️',
  insightful: '💡',
  celebrate: '🎉',
  fire: '🔥',
};

interface AIAnalysis {
  summary?: string;
  themes?: string[];
  prioritySuggestion?: string;
  confidence?: number;
  analyzedAt?: string;
}

interface Insight {
  _id: string;
  title?: string;
  type: string;
  text: string;
  sentiment: string;
  priority: string;
  productAreas: string[];
  tags: string[];
  eventId?: string;
  eventName?: string;
  advocateName: string;
  advocateId?: string;
  followUpRequired?: boolean;
  capturedAt: string;
  source?: string;
  feedbackFormId?: string;
  respondent?: { name?: string; email?: string };
  reactionCounts?: ReactionCounts;
  reactionTotal?: number;
  aiAnalysis?: AIAnalysis;
  aiDistillation?: {
    summary?: string;
    bullets?: string[];
    actionItems?: string[];
    keyPhrases?: string[];
    source?: string;
  };
  audioIntelligence?: {
    durationMs?: number;
    speakers?: Array<{ id: string; label: string }>;
  };
  pendingTranscription?: string | null;
  transcriptionError?: string;
}

interface Event {
  _id: string;
  name: string;
}

function formatDuration(ms?: number) {
  if (!ms) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

const priorityColors: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  'Low': 'default',
  'Medium': 'info',
  'High': 'warning',
  'Critical': 'error',
};

// Reaction display component
function ReactionDisplay({ counts, total }: { counts?: ReactionCounts; total?: number }) {
  if (!counts || !total || total === 0) return null;
  
  const activeReactions = Object.entries(counts)
    .filter(([_, count]) => count && count > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0));
  
  if (activeReactions.length === 0) return null;

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
      <Stack direction="row" spacing={-0.5}>
        {activeReactions.slice(0, 3).map(([type]) => (
          <Box
            key={type}
            sx={{
              fontSize: '0.85rem',
              lineHeight: 1,
            }}
          >
            {REACTION_EMOJI[type]}
          </Box>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        {total}
      </Typography>
    </Stack>
  );
}

export default function InsightsPage() {
  const { openHelp } = useHelp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    sentiment: '',
    priority: '',
    source: '',
    search: '',
  });

  // Current user identity (role + advocateId for ownership checks)
  const [currentUser, setCurrentUser] = useState<{ role: string; advocateId: string | null }>({
    role: 'viewer',
    advocateId: null,
  });

  // Role-level permission: can this user create new insights at all?
  const canCreate = canCreateInsight(currentUser.role);

  // Per-insight permission helpers
  const userCanEdit = useCallback(
    (insight: Insight) => canEditInsight(currentUser.role, currentUser.advocateId ?? undefined, insight.advocateId),
    [currentUser.role, currentUser.advocateId],
  );
  const userCanDelete = useCallback(
    (insight: Insight) => canDeleteInsight(currentUser.role, currentUser.advocateId ?? undefined, insight.advocateId),
    [currentUser.role, currentUser.advocateId],
  );

  // Fetch user identity on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject('Not authenticated'))
      .then(data => setCurrentUser({
        role: data.role || 'viewer',
        advocateId: data.advocateId || null,
      }))
      .catch(() => setCurrentUser({ role: 'viewer', advocateId: null }));
  }, []);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInsight, setEditingInsight] = useState<InsightFormData | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Detail drawer state
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null);

  // View and pagination state
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState<'type' | 'sentiment' | 'priority' | 'tag' | null>(null);
  const [bulkTagValue, setBulkTagValue] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(paginatedInsights.filter(userCanEdit).map((i) => i._id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkActionOpen(null);
  };

  const applyBulkUpdate = async (updates: Record<string, any>) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/insights/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
        )
      );
      setSnackbar({ open: true, message: `Updated ${ids.length} insight${ids.length === 1 ? '' : 's'}`, severity: 'success' });
      clearSelection();
      loadInsights();
    } catch {
      setSnackbar({ open: true, message: 'Failed to update some insights', severity: 'error' });
    }
  };

  const applyBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} insight${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;

    try {
      await Promise.all(ids.map((id) => fetch(`/api/insights/${id}`, { method: 'DELETE' })));
      setSnackbar({ open: true, message: `Deleted ${ids.length} insight${ids.length === 1 ? '' : 's'}`, severity: 'success' });
      clearSelection();
      loadInsights();
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete some insights', severity: 'error' });
    }
  };

  const applyBulkAddTag = async () => {
    const tag = bulkTagValue.trim();
    if (!tag) return;
    const ids = Array.from(selectedIds);

    try {
      await Promise.all(
        ids.map(async (id) => {
          const insight = insights.find((i) => i._id === id);
          const existingTags = insight?.tags || [];
          if (existingTags.includes(tag)) return;
          return fetch(`/api/insights/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: [...existingTags, tag] }),
          });
        })
      );
      setSnackbar({ open: true, message: `Added tag "${tag}" to ${ids.length} insight${ids.length === 1 ? '' : 's'}`, severity: 'success' });
      setBulkTagValue('');
      clearSelection();
      loadInsights();
    } catch {
      setSnackbar({ open: true, message: 'Failed to add tag to some insights', severity: 'error' });
    }
  };

  const loadInsights = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.sentiment) params.set('sentiment', filters.sentiment);
      if (filters.priority) params.set('priority', filters.priority);

      const res = await fetch(`/api/insights?${params}`);
      const data = await res.json();
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.sentiment, filters.priority]);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events?limit=200');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, []);

  useEffect(() => {
    loadInsights();
    loadEvents();
  }, [loadInsights, loadEvents]);

  const filteredInsights = insights.filter((insight) => {
    // Source filter (client-side since API doesn't support it yet)
    if (filters.source) {
      const insightSource = insight.source || 'web'; // Default to 'web' for legacy insights
      if (insightSource !== filters.source) return false;
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        insight.text.toLowerCase().includes(search) ||
        insight.title?.toLowerCase().includes(search) ||
        insight.aiDistillation?.summary?.toLowerCase().includes(search) ||
        insight.tags.some((t) => t.includes(search)) ||
        insight.eventName?.toLowerCase().includes(search) ||
        insight.advocateName?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return <SentimentSatisfied color="success" />;
      case 'Negative':
        return <SentimentDissatisfied color="error" />;
      default:
        return <SentimentNeutral color="action" />;
    }
  };

  const getSentimentColor = (sentiment: string): 'success' | 'error' | 'warning' => {
    switch (sentiment) {
      case 'Positive': return 'success';
      case 'Negative': return 'error';
      default: return 'warning';
    }
  };

  // Pagination handlers
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Paginated data
  const paginatedInsights = filteredInsights.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleAddNew = () => {
    setEditingInsight(null);
    setDialogOpen(true);
  };

  const handleEdit = (insight: Insight) => {
    setEditingInsight({
      _id: insight._id,
      text: insight.text,
      type: insight.type,
      sentiment: insight.sentiment,
      priority: insight.priority,
      productAreas: insight.productAreas || [],
      tags: insight.tags || [],
      eventId: insight.eventId,
      eventName: insight.eventName,
      advocateName: insight.advocateName,
      followUpRequired: insight.followUpRequired || false,
    });
    setDialogOpen(true);
  };

  const handleViewDetail = (insight: Insight) => {
    setSelectedInsight(insight);
    setDetailDrawerOpen(true);
  };

  const handleDelete = async (insight: Insight) => {
    if (!confirm(`Delete this insight?\n\n"${insight.text.slice(0, 100)}..."`)) {
      return;
    }

    try {
      const res = await fetch(`/api/insights/${insight._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setSnackbar({ open: true, message: 'Insight deleted', severity: 'success' });
      loadInsights();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete insight', severity: 'error' });
    }
  };

  const handleSave = async (data: InsightFormData) => {
    const isEdit = !!data._id;
    const url = isEdit ? `/api/insights/${data._id}` : '/api/insights';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
      ...data,
      capturedAt: isEdit ? undefined : new Date().toISOString(),
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save insight');
    }

    setSnackbar({
      open: true,
      message: isEdit ? 'Insight updated' : 'Insight created',
      severity: 'success',
    });
    loadInsights();
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Insights</Typography>
        <Card>
          <CardContent>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Help */}
      <PageHelp page="insights" onOpenDrawer={() => openHelp('insights')} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Insights</Typography>
          <Typography color="text.secondary">
            Developer feedback captured at events ({filteredInsights.length} of {insights.length})
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="table">
              <Tooltip title="Table View"><ViewList /></Tooltip>
            </ToggleButton>
            <ToggleButton value="cards">
              <Tooltip title="Card View"><ViewModule /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddNew}
            >
              Add Insight
            </Button>
          )}
        </Stack>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              size="small"
              placeholder="Search insights..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Pain Point">Pain Point</MenuItem>
                <MenuItem value="Feature Request">Feature Request</MenuItem>
                <MenuItem value="Positive Feedback">Positive Feedback</MenuItem>
                <MenuItem value="Bug Report">Bug Report</MenuItem>
                <MenuItem value="Competitive Intel">Competitive Intel</MenuItem>
                <MenuItem value="Use Case">Use Case</MenuItem>
                <MenuItem value="Documentation">Documentation</MenuItem>
                <MenuItem value="General Feedback">General Feedback</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sentiment</InputLabel>
              <Select
                value={filters.sentiment}
                label="Sentiment"
                onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Positive">Positive</MenuItem>
                <MenuItem value="Neutral">Neutral</MenuItem>
                <MenuItem value="Negative">Negative</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={filters.source}
                label="Source"
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              >
                <MenuItem value="">All Sources</MenuItem>
                <MenuItem value="mobile">Mobile App</MenuItem>
                <MenuItem value="web">Web</MenuItem>
                <MenuItem value="api">API</MenuItem>
                <MenuItem value="feedback_form">Feedback Form</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {canCreate && selectedIds.size > 0 && (
        <Card sx={{ mb: 2, border: '1px solid', borderColor: 'primary.main', bgcolor: 'primary.50' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`${selectedIds.size} selected`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Button size="small" startIcon={<SelectAll />} onClick={selectAll}>Select Page</Button>
                <Button size="small" startIcon={<CloseIcon />} onClick={clearSelection}>Clear</Button>
              </Stack>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                {/* Type */}
                {bulkActionOpen === 'type' ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        displayEmpty
                        value=""
                        onChange={(e) => { if (e.target.value) applyBulkUpdate({ type: e.target.value }); setBulkActionOpen(null); }}
                      >
                        <MenuItem value="" disabled>Set type...</MenuItem>
                        <MenuItem value="Pain Point">Pain Point</MenuItem>
                        <MenuItem value="Feature Request">Feature Request</MenuItem>
                        <MenuItem value="Positive Feedback">Positive Feedback</MenuItem>
                        <MenuItem value="Bug Report">Bug Report</MenuItem>
                        <MenuItem value="Competitive Intel">Competitive Intel</MenuItem>
                        <MenuItem value="Use Case">Use Case</MenuItem>
                        <MenuItem value="Documentation">Documentation</MenuItem>
                        <MenuItem value="General Feedback">General Feedback</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton size="small" onClick={() => setBulkActionOpen(null)}><CloseIcon fontSize="small" /></IconButton>
                  </Stack>
                ) : (
                  <Button size="small" variant="outlined" onClick={() => setBulkActionOpen('type')}>Set Type</Button>
                )}

                {/* Sentiment */}
                {bulkActionOpen === 'sentiment' ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <Select
                        displayEmpty
                        value=""
                        onChange={(e) => { if (e.target.value) applyBulkUpdate({ sentiment: e.target.value }); setBulkActionOpen(null); }}
                      >
                        <MenuItem value="" disabled>Set sentiment...</MenuItem>
                        <MenuItem value="Positive">Positive</MenuItem>
                        <MenuItem value="Neutral">Neutral</MenuItem>
                        <MenuItem value="Negative">Negative</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton size="small" onClick={() => setBulkActionOpen(null)}><CloseIcon fontSize="small" /></IconButton>
                  </Stack>
                ) : (
                  <Button size="small" variant="outlined" onClick={() => setBulkActionOpen('sentiment')}>Set Sentiment</Button>
                )}

                {/* Priority */}
                {bulkActionOpen === 'priority' ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <Select
                        displayEmpty
                        value=""
                        onChange={(e) => { if (e.target.value) applyBulkUpdate({ priority: e.target.value }); setBulkActionOpen(null); }}
                      >
                        <MenuItem value="" disabled>Set priority...</MenuItem>
                        <MenuItem value="Critical">Critical</MenuItem>
                        <MenuItem value="High">High</MenuItem>
                        <MenuItem value="Medium">Medium</MenuItem>
                        <MenuItem value="Low">Low</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton size="small" onClick={() => setBulkActionOpen(null)}><CloseIcon fontSize="small" /></IconButton>
                  </Stack>
                ) : (
                  <Button size="small" variant="outlined" onClick={() => setBulkActionOpen('priority')}>Set Priority</Button>
                )}

                {/* Add Tag */}
                {bulkActionOpen === 'tag' ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <TextField
                      size="small"
                      placeholder="Tag name"
                      value={bulkTagValue}
                      onChange={(e) => setBulkTagValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyBulkAddTag(); }}
                      sx={{ width: 140 }}
                      autoFocus
                    />
                    <Button size="small" variant="contained" onClick={applyBulkAddTag} disabled={!bulkTagValue.trim()}>Add</Button>
                    <IconButton size="small" onClick={() => { setBulkActionOpen(null); setBulkTagValue(''); }}><CloseIcon fontSize="small" /></IconButton>
                  </Stack>
                ) : (
                  <Button size="small" variant="outlined" onClick={() => setBulkActionOpen('tag')}>Add Tag</Button>
                )}

                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={applyBulkDelete}>
                  Delete ({selectedIds.size})
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredInsights.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Insights Yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Add insights manually or capture them from the mobile app.
            </Typography>
            {canCreate && (
              <Button variant="outlined" startIcon={<Add />} onClick={handleAddNew}>
                Add First Insight
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {canCreate && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={paginatedInsights.length > 0 && paginatedInsights.filter(userCanEdit).every((i) => selectedIds.has(i._id))}
                        indeterminate={paginatedInsights.some((i) => selectedIds.has(i._id)) && !paginatedInsights.filter(userCanEdit).every((i) => selectedIds.has(i._id))}
                        onChange={(e) => {
                          if (e.target.checked) selectAll();
                          else clearSelection();
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell width={40}></TableCell>
                  <TableCell>Insight</TableCell>
                  <TableCell>AI Summary</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Advocate</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Reactions</TableCell>
                  <TableCell width={100}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedInsights.map((insight) => (
                  <TableRow
                    key={insight._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleViewDetail(insight)}
                  >
                    {canCreate && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        {userCanEdit(insight) ? (
                          <Checkbox
                            size="small"
                            checked={selectedIds.has(insight._id)}
                            onChange={() => toggleSelect(insight._id)}
                          />
                        ) : null}
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {getSentimentIcon(insight.sentiment)}
                    </TableCell>
                    <TableCell>
                      {insight.title && (
                        <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 350 }}>
                          {insight.title}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ maxWidth: 350, color: insight.title ? 'text.secondary' : 'text.primary', fontSize: insight.title ? '0.8rem' : undefined }}>
                        {insight.text.length > 120
                          ? `${insight.text.substring(0, 120)}...`
                          : insight.text}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        {insight.source === 'feedback_form' && (
                          <Chip label="Form" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
                        )}
                        {insight.audioIntelligence && (
                          <Chip icon={<MicIcon sx={{ fontSize: 12 }} />} label={formatDuration(insight.audioIntelligence.durationMs)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                        {insight.pendingTranscription && (
                          <Chip icon={<HourglassIcon sx={{ fontSize: 12 }} />} label="Transcribing" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                        {insight.transcriptionError && (
                          <Tooltip title={insight.transcriptionError}><Chip label="Transcription Error" size="small" color="error" sx={{ height: 20, fontSize: '0.65rem' }} /></Tooltip>
                        )}
                        {insight.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        ))}
                        {insight.tags.length > 3 && (
                          <Chip label={`+${insight.tags.length - 3}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      {(() => {
                        const summary = insight.aiDistillation?.summary || insight.aiAnalysis?.summary;
                        const bullets = insight.aiDistillation?.bullets;
                        const themes = insight.aiAnalysis?.themes;
                        const source = insight.aiDistillation?.source;
                        if (!summary) return <Typography variant="caption" color="text.disabled">—</Typography>;
                        return (
                          <Tooltip
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  {source ? `AI Distillation (${source})` : 'AI Summary'}
                                </Typography>
                                <Typography variant="body2">{summary}</Typography>
                                {bullets && bullets.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    {bullets.map((b, i) => <Typography key={i} variant="body2">- {b}</Typography>)}
                                  </Box>
                                )}
                                {themes && themes.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>Themes: {themes.join(', ')}</Typography>
                                  </Box>
                                )}
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ cursor: 'help' }}>
                              <AIIcon sx={{ fontSize: 16, color: 'primary.main', mt: 0.25 }} />
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {summary.length > 60 ? `${summary.substring(0, 60)}...` : summary}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Chip label={insight.type} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={insight.priority}
                        size="small"
                        color={priorityColors[insight.priority] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {insight.eventName || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{insight.advocateName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(insight.capturedAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ReactionDisplay counts={insight.reactionCounts} total={insight.reactionTotal} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {userCanEdit(insight) ? (
                        <Stack direction="row" spacing={0}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEdit(insight)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(insight)}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          View only
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredInsights.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Card>
      ) : (
        /* Card View */
        <>
          <Grid container spacing={2}>
            {paginatedInsights.map((insight) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={insight._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                    ...(selectedIds.has(insight._id) ? { border: '2px solid', borderColor: 'primary.main', bgcolor: 'primary.50' } : {}),
                  }}
                  onClick={() => handleViewDetail(insight)}
                >
                  <CardContent sx={{ flex: 1 }}>
                    {/* Header: Checkbox + Sentiment + Type + Priority + AI + Reactions */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
                      {userCanEdit(insight) && (
                        <Checkbox
                          size="small"
                          checked={selectedIds.has(insight._id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(insight._id)}
                          sx={{ p: 0, mr: -0.5 }}
                        />
                      )}
                      {getSentimentIcon(insight.sentiment)}
                      <Chip label={insight.type} size="small" />
                      <Chip
                        label={insight.priority}
                        size="small"
                        color={priorityColors[insight.priority] || 'default'}
                      />
                      {insight.source === 'feedback_form' && (
                        <Chip label="Form" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
                      )}
                      {(insight.aiDistillation?.summary || insight.aiAnalysis?.summary) && (
                        <Tooltip title={insight.aiDistillation?.summary || insight.aiAnalysis?.summary || ''}>
                          <Chip
                            icon={<AIIcon sx={{ fontSize: 14 }} />}
                            label="AI"
                            size="small"
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              '& .MuiChip-icon': { color: 'inherit' },
                            }}
                          />
                        </Tooltip>
                      )}
                      {insight.audioIntelligence && (
                        <Chip icon={<MicIcon sx={{ fontSize: 14 }} />} label={formatDuration(insight.audioIntelligence.durationMs)} size="small" variant="outlined" />
                      )}
                      {insight.pendingTranscription && (
                        <Chip icon={<HourglassIcon sx={{ fontSize: 14 }} />} label="Transcribing" size="small" color="warning" />
                      )}
                      <Box sx={{ flex: 1 }} />
                      <ReactionDisplay counts={insight.reactionCounts} total={insight.reactionTotal} />
                    </Stack>

                    {/* Title + Text */}
                    {insight.title && (
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {insight.title}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mb: 2, minHeight: insight.title ? 40 : 60, color: insight.title ? 'text.secondary' : 'text.primary' }}>
                      {insight.text.length > 200
                        ? `${insight.text.substring(0, 200)}...`
                        : insight.text}
                    </Typography>

                    {/* Tags */}
                    {insight.tags.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        {insight.tags.slice(0, 4).map((tag) => (
                          <Chip
                            key={tag}
                            label={`#${tag}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {insight.tags.length > 4 && (
                          <Chip label={`+${insight.tags.length - 4}`} size="small" sx={{ fontSize: '0.7rem' }} />
                        )}
                      </Stack>
                    )}

                    <Divider sx={{ my: 1 }} />

                    {/* Meta: Event, Advocate, Date */}
                    <Stack spacing={0.5}>
                      {insight.eventName && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {insight.eventName}
                          </Typography>
                        </Stack>
                      )}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {insight.advocateName}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(insight.capturedAt).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>

                  {userCanEdit(insight) && (
                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(insight)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(insight)} color="error">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
          <Card sx={{ mt: 2 }}>
            <TablePagination
              component="div"
              count={filteredInsights.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[12, 24, 48, 96]}
            />
          </Card>
        </>
      )}

      {/* Add/Edit Dialog */}
      <InsightFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        insight={editingInsight}
        events={events}
      />

      {/* Detail Drawer with AI Analysis */}
      <InsightDetailDrawer
        insight={selectedInsight}
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedInsight(null);
        }}
        canEdit={selectedInsight ? userCanEdit(selectedInsight) : false}
        onEdit={(insight) => {
          setDetailDrawerOpen(false);
          handleEdit(insight);
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
