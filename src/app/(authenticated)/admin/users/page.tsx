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
} from '@mui/icons-material';

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  region: string;
  isActive: boolean;
  isAdmin: boolean;
  avatarUrl: string | null;
  insightCount: number;
  lastActiveAt: string | null;
  createdAt: string;
}

interface RoleOption {
  value: string;
  label: string;
}

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
  admin: 'error',
  manager: 'warning',
  advocate: 'info',
  viewer: 'success',
};

// Card view component for a single user
function UserCard({ user, onEdit, onDelete, roleColors }: { 
  user: User; 
  onEdit: (user: User) => void; 
  onDelete: (user: User) => void;
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
        <Chip
          label={user.roleLabel}
          size="small"
          color={roleColors[user.role] || 'default'}
          variant="outlined"
          sx={{ mb: 1.5 }}
        />

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
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {user.region || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Region
            </Typography>
          </Box>
        </Stack>

        {/* Last active */}
        {user.lastActiveAt && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Last active: {new Date(user.lastActiveAt).toLocaleDateString()}
          </Typography>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'advocate',
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
        region: user.region || '',
        isActive: user.isActive,
      });
    } else {
      setEditUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'advocate',
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
            Manage team members and their access roles
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
                  <Chip
                    label={user.roleLabel}
                    size="small"
                    color={ROLE_COLORS[user.role] || 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.region || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {user.insightCount}
                  </Typography>
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
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
    </Box>
  );
}
