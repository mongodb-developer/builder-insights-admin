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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Alert,
  Snackbar,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  alpha,
} from '@mui/material';
import {
  Search,
  BugReport,
  Edit,
  Delete,
  Refresh,
  PhoneIphone,
  ViewList,
  ViewModule,
  ViewKanban,
  Person,
  CalendarToday,
  DragIndicator,
} from '@mui/icons-material';
import PageHelp from '@/components/help/PageHelp';
import { useHelp } from '@/components/help';

type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
type BugPriority = 'low' | 'medium' | 'high' | 'critical';
type ViewMode = 'table' | 'cards' | 'kanban';

interface Bug {
  _id: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: BugPriority;
  reportedBy: string;
  deviceInfo?: string;
  appVersion?: string;
  screenshot?: string;
  steps?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

const STATUS_CONFIG: Record<BugStatus, { label: string; color: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
  open: { label: 'Open', color: 'error' },
  in_progress: { label: 'In Progress', color: 'info' },
  resolved: { label: 'Resolved', color: 'success' },
  closed: { label: 'Closed', color: 'default' },
  wont_fix: { label: "Won't Fix", color: 'warning' },
};

const KANBAN_COLUMNS: BugStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const PRIORITY_CONFIG: Record<BugPriority, { label: string; color: 'default' | 'info' | 'warning' | 'error' }> = {
  low: { label: 'Low', color: 'default' },
  medium: { label: 'Medium', color: 'info' },
  high: { label: 'High', color: 'warning' },
  critical: { label: 'Critical', color: 'error' },
};

const PRIORITY_BORDER_COLORS: Record<BugPriority, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f97316',
  critical: '#ef4444',
};

export default function BugsPage() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const { openHelp } = useHelp();

  const loadBugs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);

      const res = await fetch(`/api/bugs?${params}`);
      const data = await res.json();
      setBugs(data.bugs || []);
      setCounts(data.counts || {});
    } catch (err) {
      console.error('Failed to load bugs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.priority]);

  useEffect(() => {
    loadBugs();
  }, [loadBugs]);

  const filteredBugs = bugs.filter((bug) => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      bug.title.toLowerCase().includes(search) ||
      bug.description.toLowerCase().includes(search) ||
      bug.reportedBy.toLowerCase().includes(search)
    );
  });

  const paginatedBugs = filteredBugs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleEditClick = (bug: Bug) => {
    setSelectedBug({ ...bug });
    setEditDialogOpen(true);
  };

  const handleStatusChange = async (bugId: string, newStatus: BugStatus) => {
    try {
      const res = await fetch(`/api/bugs/${bugId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update');

      // Optimistically update the local state
      setBugs((prev) =>
        prev.map((b) => (b._id === bugId ? { ...b, status: newStatus } : b))
      );
      setSnackbar({ open: true, message: `Status updated to ${STATUS_CONFIG[newStatus].label}`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleSave = async () => {
    if (!selectedBug) return;

    try {
      const res = await fetch(`/api/bugs/${selectedBug._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedBug.status,
          priority: selectedBug.priority,
          notes: selectedBug.notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setSnackbar({ open: true, message: 'Bug updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      loadBugs();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update bug', severity: 'error' });
    }
  };

  const handleDelete = async (bug: Bug) => {
    if (!confirm(`Delete bug report: "${bug.title}"?`)) return;

    try {
      const res = await fetch(`/api/bugs/${bug._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setSnackbar({ open: true, message: 'Bug deleted', severity: 'success' });
      loadBugs();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete bug', severity: 'error' });
    }
  };

  const openCount = counts.open || 0;
  const inProgressCount = counts.in_progress || 0;

  // Kanban helpers
  const getBugsByStatus = (status: BugStatus) =>
    filteredBugs.filter((bug) => bug.status === status);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Bug Reports</Typography>
        <Card>
          <CardContent>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <PageHelp page="bugs" onOpenDrawer={openHelp} />
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <BugReport sx={{ fontSize: 32, color: 'error.main' }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Bug Reports</Typography>
          </Stack>
          <Typography color="text.secondary">
            {filteredBugs.length} reports • {openCount} open • {inProgressCount} in progress
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
            <ToggleButton value="kanban">
              <Tooltip title="Kanban Board"><ViewKanban /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadBugs}>
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Filters (hide in kanban mode for cleaner view) */}
      {viewMode !== 'kanban' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                placeholder="Search bugs..."
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
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="wont_fix">Won't Fix</MenuItem>
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
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredBugs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <BugReport sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Bug Reports
            </Typography>
            <Typography color="text.secondary">
              Bug reports submitted from the mobile app will appear here.
            </Typography>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        /* ═══════════════════════════════════════════════════════════════════
           KANBAN VIEW
           ═══════════════════════════════════════════════════════════════════ */
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {KANBAN_COLUMNS.map((status) => {
            const columnBugs = getBugsByStatus(status);
            const config = STATUS_CONFIG[status];
            return (
              <Paper
                key={status}
                sx={{
                  minWidth: 300,
                  maxWidth: 300,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 250px)',
                }}
              >
                {/* Column Header */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={config.label}
                      color={config.color}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {columnBugs.length}
                    </Typography>
                  </Stack>
                </Box>

                {/* Column Cards */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                  {columnBugs.map((bug) => (
                    <Card
                      key={bug._id}
                      sx={{
                        mb: 1,
                        cursor: 'pointer',
                        borderLeft: 3,
                        borderColor: PRIORITY_BORDER_COLORS[bug.priority],
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                        },
                      }}
                      onClick={() => handleEditClick(bug)}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {bug.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: 1,
                          }}
                        >
                          {bug.description}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
                          <Chip
                            label={PRIORITY_CONFIG[bug.priority].label}
                            size="small"
                            color={PRIORITY_CONFIG[bug.priority].color}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {bug.reportedBy.split(' ')[0]}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                  {columnBugs.length === 0 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        No bugs
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      ) : viewMode === 'cards' ? (
        /* ═══════════════════════════════════════════════════════════════════
           CARD VIEW
           ═══════════════════════════════════════════════════════════════════ */
        <>
          <Grid container spacing={2}>
            {paginatedBugs.map((bug) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={bug._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    borderLeft: 4,
                    borderColor: PRIORITY_BORDER_COLORS[bug.priority],
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => handleEditClick(bug)}
                >
                  <CardContent sx={{ flex: 1 }}>
                    {/* Header */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Chip
                        label={STATUS_CONFIG[bug.status].label}
                        size="small"
                        color={STATUS_CONFIG[bug.status].color}
                      />
                      <Chip
                        label={PRIORITY_CONFIG[bug.priority].label}
                        size="small"
                        color={PRIORITY_CONFIG[bug.priority].color}
                      />
                    </Stack>

                    {/* Title */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {bug.title}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {bug.description}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    {/* Meta */}
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {bug.reportedBy}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(bug.createdAt).toLocaleDateString()}
                        </Typography>
                      </Stack>
                      {bug.deviceInfo && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PhoneIphone sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {bug.appVersion || 'Mobile'}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEditClick(bug)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(bug)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Card sx={{ mt: 2 }}>
            <TablePagination
              component="div"
              count={filteredBugs.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[12, 24, 48]}
            />
          </Card>
        </>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
           TABLE VIEW
           ═══════════════════════════════════════════════════════════════════ */
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bug</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Reporter</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Reported</TableCell>
                  <TableCell width={100}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBugs.map((bug) => (
                  <TableRow
                    key={bug._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleEditClick(bug)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {bug.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 400 }}>
                        {bug.description.length > 100
                          ? `${bug.description.substring(0, 100)}...`
                          : bug.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_CONFIG[bug.status].label}
                        size="small"
                        color={STATUS_CONFIG[bug.status].color}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={PRIORITY_CONFIG[bug.priority].label}
                        size="small"
                        color={PRIORITY_CONFIG[bug.priority].color}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{bug.reportedBy}</Typography>
                    </TableCell>
                    <TableCell>
                      {bug.deviceInfo ? (
                        <Tooltip title={bug.deviceInfo}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <PhoneIphone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {bug.appVersion || 'Unknown'}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(bug.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEditClick(bug)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(bug)} color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredBugs.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <BugReport color="error" />
            <Typography variant="h6">Bug Details</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedBug && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Title
                </Typography>
                <Typography variant="h6">{selectedBug.title}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedBug.description}
                </Typography>
              </Box>

              {selectedBug.steps && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Steps to Reproduce
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedBug.steps}
                  </Typography>
                </Box>
              )}

              <Divider />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedBug.status}
                    label="Status"
                    onChange={(e) => setSelectedBug({ ...selectedBug, status: e.target.value as BugStatus })}
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                    <MenuItem value="wont_fix">Won't Fix</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={selectedBug.priority}
                    label="Priority"
                    onChange={(e) => setSelectedBug({ ...selectedBug, priority: e.target.value as BugPriority })}
                  >
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                label="Admin Notes"
                multiline
                rows={3}
                value={selectedBug.notes || ''}
                onChange={(e) => setSelectedBug({ ...selectedBug, notes: e.target.value })}
                placeholder="Internal notes about this bug..."
              />

              <Divider />

              <Stack direction="row" spacing={4} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="text.secondary">Reporter</Typography>
                  <Typography variant="body2">{selectedBug.reportedBy}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Reported</Typography>
                  <Typography variant="body2">
                    {new Date(selectedBug.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                {selectedBug.deviceInfo && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Device</Typography>
                    <Typography variant="body2">{selectedBug.deviceInfo}</Typography>
                  </Box>
                )}
                {selectedBug.appVersion && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">App Version</Typography>
                    <Typography variant="body2">{selectedBug.appVersion}</Typography>
                  </Box>
                )}
              </Stack>

              {selectedBug.screenshot && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Screenshot
                  </Typography>
                  <Box
                    component="img"
                    src={selectedBug.screenshot}
                    alt="Bug screenshot"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 400,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
