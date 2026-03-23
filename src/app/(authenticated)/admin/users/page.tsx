'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Divider,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  History as HistoryIcon,
  Login as LoginIcon,
  LoginOutlined as LoginOutlinedIcon,
  PhoneAndroid as MobileIcon,
  Computer as WebIcon,
  PersonOff as PersonOffIcon,
  PersonAdd as PersonAddIcon,
  SwapHoriz as SwapHorizIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  title: string | null;
  region: string;
  isActive: boolean;
  isAdmin: boolean;
  avatarUrl: string | null;
  insightCount: number;
  lastAccessAt: string | null;
  lastLoginAt: string | null;
  lastLoginSource: string | null;
  totalLogins: number;
  last30DaysLogins: number;
  createdAt: string;
}

interface RoleOption {
  value: string;
  label: string;
}

interface ActivityEntry {
  _id: string;
  action: string;
  email: string;
  advocateId: string | null;
  targetEmail: string | null;
  targetAdvocateId: string | null;
  source: string | null;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  timestamp: string;
}

interface ActivityData {
  entries: ActivityEntry[];
  total: number;
  loginStats: {
    totalLogins: number;
    lastLoginAt: string | null;
    lastLoginSource: string | null;
    last30DaysLogins: number;
  };
  advocate: {
    _id: string;
    name: string;
    email: string;
    role: string;
    lastAccessAt: string | null;
  };
}

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
  admin: 'error',
  manager: 'warning',
  advocate: 'info',
  viewer: 'success',
};

// Format relative time (e.g., "2 hours ago", "3 days ago")
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

// Get icon and label for an activity action
function getActivityDisplay(action: string): { icon: React.ReactNode; label: string; color: string } {
  switch (action) {
    case 'login':
      return { icon: <LoginIcon fontSize="small" />, label: 'Logged in', color: 'success.main' };
    case 'logout':
      return { icon: <LoginOutlinedIcon fontSize="small" />, label: 'Logged out', color: 'text.secondary' };
    case 'login_failed':
      return { icon: <WarningIcon fontSize="small" />, label: 'Failed login', color: 'error.main' };
    case 'user_created':
      return { icon: <PersonAddIcon fontSize="small" />, label: 'Created user', color: 'info.main' };
    case 'user_updated':
      return { icon: <EditIcon fontSize="small" />, label: 'Updated user', color: 'info.main' };
    case 'user_deactivated':
      return { icon: <PersonOffIcon fontSize="small" />, label: 'Deactivated user', color: 'warning.main' };
    case 'user_reactivated':
      return { icon: <PersonAddIcon fontSize="small" />, label: 'Reactivated user', color: 'success.main' };
    case 'role_changed':
      return { icon: <SwapHorizIcon fontSize="small" />, label: 'Changed role', color: 'warning.main' };
    case 'bulk_update':
      return { icon: <SwapHorizIcon fontSize="small" />, label: 'Bulk update', color: 'info.main' };
    default:
      return { icon: <HistoryIcon fontSize="small" />, label: action, color: 'text.secondary' };
  }
}

// Format activity details into a readable string
function formatActivityDetails(entry: ActivityEntry): string {
  const parts: string[] = [];

  if (entry.source) {
    parts.push(`via ${entry.source}`);
  }

  if (entry.details) {
    const d = entry.details as Record<string, any>;
    if (d.method) parts.push(`(${d.method.replace(/_/g, ' ')})`);
    if (d.roleChanged) parts.push(`role: ${d.roleChanged.from} -> ${d.roleChanged.to}`);
    if (d.statusChanged) parts.push(`status: ${d.statusChanged.from} -> ${d.statusChanged.to}`);
    if (d.reason) parts.push(`reason: ${d.reason.replace(/_/g, ' ')}`);
  }

  if (entry.targetEmail && entry.targetEmail !== entry.email) {
    parts.push(`target: ${entry.targetEmail}`);
  }

  return parts.join(' ');
}

// ============================================================================
// Activity Dialog Component
// ============================================================================
function UserActivityDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
}) {
  const [loading, setLoading] = useState(false);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      setError(null);
      fetch(`/api/admin/users/${user._id}/activity?limit=100`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch activity');
          return res.json();
        })
        .then((data) => setActivityData(data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setActivityData(null);
      setTabValue(0);
    }
  }, [open, user]);

  if (!user) return null;

  const loginEntries = activityData?.entries.filter((e) => e.action === 'login' || e.action === 'login_failed') || [];
  const adminEntries = activityData?.entries.filter((e) => e.action !== 'login' && e.action !== 'login_failed' && e.action !== 'logout') || [];
  const stats = activityData?.loginStats;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar
            src={user.avatarUrl || undefined}
            sx={{ width: 40, height: 40, bgcolor: user.isAdmin ? 'error.main' : 'primary.main' }}
          >
            {user.isAdmin ? <AdminIcon /> : user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" component="span">
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" display="block">
              {user.email}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {activityData && !loading && (
          <>
            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {stats?.totalLogins ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Logins
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {stats?.last30DaysLogins ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last 30 Days
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {user.insightCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Insights
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                    {stats?.lastLoginAt ? formatRelativeTime(stats.lastLoginAt) : 'Never'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last Login
                  </Typography>
                  {stats?.lastLoginSource && (
                    <Chip
                      icon={stats.lastLoginSource === 'mobile' ? <MobileIcon /> : <WebIcon />}
                      label={stats.lastLoginSource}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5, height: 22 }}
                    />
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Activity Tabs */}
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
              <Tab label={`Login History (${loginEntries.length})`} />
              <Tab label={`Admin Actions (${adminEntries.length})`} />
              <Tab label={`All Activity (${activityData.entries.length})`} />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {tabValue === 0 && (
                <ActivityList entries={loginEntries} emptyMessage="No login history recorded yet" />
              )}
              {tabValue === 1 && (
                <ActivityList entries={adminEntries} emptyMessage="No admin actions recorded for this user" />
              )}
              {tabValue === 2 && (
                <ActivityList entries={activityData.entries} emptyMessage="No activity recorded yet" />
              )}
            </Box>

            {activityData.total > activityData.entries.length && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing {activityData.entries.length} of {activityData.total} total entries
              </Typography>
            )}
          </>
        )}
        {!activityData && !loading && !error && (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No activity data available
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// Reusable activity list component
function ActivityList({ entries, emptyMessage }: { entries: ActivityEntry[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {entries.map((entry) => {
        const display = getActivityDisplay(entry.action);
        const details = formatActivityDetails(entry);

        return (
          <ListItem
            key={entry._id}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              py: 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: display.color }}>
              {display.icon}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight={500}>
                    {display.label}
                  </Typography>
                  {entry.source && (
                    <Chip
                      icon={entry.source === 'mobile' ? <MobileIcon /> : <WebIcon />}
                      label={entry.source}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Box component="span">
                  <Typography variant="caption" color="text.secondary" component="span">
                    {new Date(entry.timestamp).toLocaleString()}
                  </Typography>
                  {details && (
                    <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                      - {details}
                    </Typography>
                  )}
                  {entry.ip && (
                    <Typography variant="caption" color="text.disabled" component="span" sx={{ ml: 1 }}>
                      IP: {entry.ip.split(',')[0].trim()}
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
}

// ============================================================================
// Card view component for a single user
// ============================================================================
function UserCard({ user, onEdit, onDelete, onViewActivity, roleColors }: { 
  user: User; 
  onEdit: (user: User) => void; 
  onDelete: (user: User) => void;
  onViewActivity: (user: User) => void;
  roleColors: Record<string, 'error' | 'warning' | 'info' | 'success'>;
}) {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        opacity: user.isActive ? 1 : 0.6,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        {/* Header with avatar and status */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Avatar 
            src={user.avatarUrl || undefined} 
            sx={{ 
              width: 56, 
              height: 56,
              bgcolor: user.isAdmin ? 'error.main' : 'primary.main',
            }}
          >
            {user.isAdmin ? <AdminIcon /> : user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Chip
            label={user.isActive ? 'Active' : 'Inactive'}
            size="small"
            color={user.isActive ? 'success' : 'default'}
            variant="filled"
          />
        </Box>

        {/* Name and role */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          {user.name}
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <Chip
            label={user.roleLabel}
            size="small"
            color={roleColors[user.role] || 'default'}
            variant="outlined"
          />
          {user.title && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {user.title}
            </Typography>
          )}
        </Box>

        {/* Email */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, wordBreak: 'break-word' }}>
          {user.email}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Stats */}
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {user.insightCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Insights
            </Typography>
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
              {user.totalLogins}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Logins
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {user.region || '\u2014'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Region
            </Typography>
          </Box>
        </Stack>

        {/* Last login */}
        <Box sx={{ mt: 2 }}>
          {user.lastLoginAt ? (
            <Tooltip title={new Date(user.lastLoginAt).toLocaleString()}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                  Last login: {formatRelativeTime(user.lastLoginAt)}
                </Typography>
                {user.lastLoginSource && (
                  <Chip
                    icon={user.lastLoginSource === 'mobile' ? <MobileIcon /> : <WebIcon />}
                    label={user.lastLoginSource}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, ml: 0.5, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }}
                  />
                )}
              </Box>
            </Tooltip>
          ) : (
            <Typography variant="caption" color="text.disabled">
              Never logged in
            </Typography>
          )}
          {user.last30DaysLogins > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {user.last30DaysLogins} login{user.last30DaysLogins !== 1 ? 's' : ''} in last 30 days
            </Typography>
          )}
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        <Button size="small" startIcon={<HistoryIcon />} onClick={() => onViewActivity(user)}>
          Activity
        </Button>
        <Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(user)}>
          Edit
        </Button>
        <Button 
          size="small" 
          color="error" 
          startIcon={<DeleteIcon />} 
          onClick={() => onDelete(user)}
          disabled={user.isAdmin}
        >
          Deactivate
        </Button>
      </CardActions>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [activityUser, setActivityUser] = useState<User | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'advocate',
    title: '',
    region: '',
    isActive: true,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data.users || []);
      setRoles(data.roles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title || '',
        region: user.region || '',
        isActive: user.isActive,
      });
    } else {
      setEditUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'advocate',
        title: '',
        region: '',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditUser(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const url = editUser
        ? `/api/admin/users/${editUser._id}`
        : '/api/admin/users';
      const method = editUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save user');
      }

      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to deactivate user');
      }

      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  const handleViewActivity = (user: User) => {
    setActivityUser(user);
    setActivityDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage team members, access roles, and monitor activity
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="table">
              <Tooltip title="Table View"><ViewListIcon /></Tooltip>
            </ToggleButton>
            <ToggleButton value="card">
              <Tooltip title="Card View"><ViewModuleIcon /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <Grid container spacing={3}>
          {users.map((user) => (
            <Grid key={user._id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <UserCard 
                user={user} 
                onEdit={handleOpenDialog} 
                onDelete={handleDelete}
                onViewActivity={handleViewActivity}
                roleColors={ROLE_COLORS}
              />
            </Grid>
          ))}
          {users.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">No users found</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Region</TableCell>
              <TableCell align="center">Insights</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="center">Logins (30d)</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow 
                key={user._id}
                sx={{ opacity: user.isActive ? 1 : 0.5 }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar src={user.avatarUrl || undefined} sx={{ width: 36, height: 36 }}>
                      {user.isAdmin ? <AdminIcon /> : <PersonIcon />}
                    </Avatar>
                    <Typography variant="body2" fontWeight={500}>
                      {user.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Chip
                      label={user.roleLabel}
                      size="small"
                      color={ROLE_COLORS[user.role] || 'default'}
                      variant="outlined"
                    />
                    {user.title && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {user.title}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.region || '\u2014'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {user.insightCount}
                  </Typography>
                </TableCell>
                <TableCell>
                  {user.lastLoginAt ? (
                    <Tooltip title={new Date(user.lastLoginAt).toLocaleString()}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatRelativeTime(user.lastLoginAt)}
                        </Typography>
                        {user.lastLoginSource && (
                          <Chip
                            icon={user.lastLoginSource === 'mobile' ? <MobileIcon /> : <WebIcon />}
                            label={user.lastLoginSource}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5, height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                          />
                        )}
                      </Box>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      Never
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={`${user.totalLogins} total logins`}>
                    <Typography 
                      variant="body2" 
                      fontWeight={user.last30DaysLogins > 0 ? 600 : 400}
                      color={user.last30DaysLogins > 0 ? 'text.primary' : 'text.disabled'}
                    >
                      {user.last30DaysLogins}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={user.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={user.isActive ? 'success' : 'default'}
                    variant="filled"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Activity">
                    <IconButton size="small" onClick={() => handleViewActivity(user)}>
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Deactivate">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(user)}
                      disabled={user.isAdmin}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No users found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
              disabled={!!editUser} // Can't change email after creation
            />
            <TextField
              label="Role"
              select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              fullWidth
              required
            >
              {roles.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              placeholder="e.g., Senior Developer Advocate"
            />
            <TextField
              label="Region"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              fullWidth
              placeholder="e.g., Americas, EMEA, APAC"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formData.name || !formData.email}
          >
            {saving ? <CircularProgress size={24} /> : editUser ? 'Save Changes' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity Dialog */}
      <UserActivityDialog
        open={activityDialogOpen}
        onClose={() => {
          setActivityDialogOpen(false);
          setActivityUser(null);
        }}
        user={activityUser}
      />
    </Box>
  );
}
