'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Avatar,
  Chip,
  Stack,
  Skeleton,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Person,
  Search,
  Email,
  Add,
  MoreVert,
  Edit,
  Delete,
  Insights as InsightsIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import PageHelp from '@/components/help/PageHelp';
import { useHelp } from '@/components/help';
import AdvocateFormDialog, { AdvocateFormData } from '@/components/AdvocateFormDialog';

export default function AdvocatesPageWrapper() {
  return (
    <Suspense fallback={
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Advocates</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={56} height={56} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="70%" />
                      <Skeleton variant="text" width="50%" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    }>
      <AdvocatesPage />
    </Suspense>
  );
}

interface Advocate {
  _id: string;
  name: string;
  email: string;
  title?: string;
  role: string;
  isActive?: boolean;
  region?: string;
  insightCount?: number;
  eventCount?: number;
}

function isLeadership(advocate: Advocate): boolean {
  return advocate.role === 'manager' || advocate.role === 'admin';
}

// Generate color from name
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#00ED64', '#016BF8', '#00684A', '#5C6BC0', '#26A69A', '#7E57C2', '#EF5350', '#FF7043'];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface UserSession {
  role: string;
  isAdmin: boolean;
}

function AdvocatesPage() {
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { openHelp } = useHelp();
  const searchParams = useSearchParams();

  // Current user session (for role-based UI)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdvocate, setEditingAdvocate] = useState<AdvocateFormData | null>(null);

  // Menu state (for card actions)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuAdvocate, setMenuAdvocate] = useState<Advocate | null>(null);

  // Highlight from search
  const highlightId = searchParams.get('highlight');

  // Can the current user modify advocates? (manager or admin)
  const canModify = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.isAdmin === true;

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadAdvocates = useCallback(async () => {
    try {
      const res = await fetch('/api/advocates');
      if (res.ok) {
        const data = await res.json();
        setAdvocates(data.advocates || []);
      }
    } catch (err) {
      console.error('Failed to load advocates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current user session for role-based UI
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser({ role: data.role, isAdmin: data.isAdmin });
        }
      } catch {
        // If we can't fetch the session, default to no write access
      }
    }
    loadSession();
  }, []);

  useEffect(() => {
    loadAdvocates();
  }, [loadAdvocates]);

  // Scroll to highlighted advocate
  useEffect(() => {
    if (highlightId && !loading) {
      const el = document.getElementById(`advocate-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightId, loading]);

  const filteredAdvocates = advocates.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.title?.toLowerCase().includes(search.toLowerCase())
  );

  const managers = filteredAdvocates.filter(isLeadership);
  const nonManagers = filteredAdvocates.filter(a => !isLeadership(a));

  // --- Actions ---

  const handleAddNew = () => {
    setEditingAdvocate(null);
    setDialogOpen(true);
  };

  const handleEdit = (advocate: Advocate) => {
    setEditingAdvocate({
      _id: advocate._id,
      name: advocate.name,
      email: advocate.email,
      title: advocate.title,
      role: advocate.role,
      region: advocate.region,
      isActive: advocate.isActive,
    });
    setDialogOpen(true);
    handleCloseMenu();
  };

  const handleDelete = async (advocate: Advocate) => {
    handleCloseMenu();
    if (!window.confirm(`Deactivate ${advocate.name}? They will be marked as inactive.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/advocates/${advocate._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to deactivate advocate');
      }
      setSnackbar({ open: true, message: `${advocate.name} has been deactivated`, severity: 'success' });
      loadAdvocates();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to deactivate advocate', severity: 'error' });
    }
  };

  const handleSave = async (data: AdvocateFormData) => {
    const isEdit = !!data._id;

    const url = isEdit ? `/api/advocates/${data._id}` : '/api/advocates';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        title: data.title,
        role: data.role,
        region: data.region,
        isActive: data.isActive,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to ${isEdit ? 'update' : 'create'} advocate`);
    }

    setSnackbar({
      open: true,
      message: isEdit ? `${data.name} updated` : `${data.name} added to the team`,
      severity: 'success',
    });
    loadAdvocates();
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, advocate: Advocate) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuAdvocate(advocate);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuAdvocate(null);
  };

  // --- Render helpers ---

  const renderCard = (advocate: Advocate, isManagerCard: boolean) => {
    const isHighlighted = highlightId === advocate._id;

    return (
      <Grid key={advocate._id} size={isManagerCard ? { xs: 12, sm: 6, md: 4 } : { xs: 12, sm: 6, md: 4, lg: 3 }}>
        <Card
          id={`advocate-${advocate._id}`}
          sx={{
            position: 'relative',
            ...(isManagerCard && { borderLeft: 4, borderColor: '#7C3AED' }),
            ...(isHighlighted && {
              boxShadow: '0 0 0 2px #016BF8',
              animation: 'pulse 2s ease-in-out',
            }),
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardActionArea onClick={() => canModify && handleEdit(advocate)} disabled={!canModify}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar
                  sx={{
                    width: isManagerCard ? 56 : 48,
                    height: isManagerCard ? 56 : 48,
                    bgcolor: stringToColor(advocate.name),
                    fontSize: isManagerCard ? '1.25rem' : '1rem',
                    fontWeight: 600,
                  }}
                >
                  {getInitials(advocate.name)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant={isManagerCard ? 'h6' : 'subtitle1'}
                    sx={{ fontWeight: 600 }}
                    noWrap
                  >
                    {advocate.name}
                  </Typography>
                  <Typography variant={isManagerCard ? 'body2' : 'caption'} color="text.secondary" noWrap>
                    {advocate.title || (isManagerCard ? advocate.role : 'Developer Advocate')}
                  </Typography>
                </Box>
              </Box>

              {/* Email */}
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {advocate.email}
                </Typography>
              </Stack>

              {/* Stats row */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                {advocate.insightCount != null && (
                  <Tooltip title="Insights captured">
                    <Chip
                      icon={<InsightsIcon sx={{ fontSize: 14 }} />}
                      label={advocate.insightCount}
                      size="small"
                      variant="outlined"
                      sx={{ height: 24, '& .MuiChip-label': { px: 0.5 } }}
                    />
                  </Tooltip>
                )}
                {advocate.eventCount != null && (
                  <Tooltip title="Events attended">
                    <Chip
                      icon={<EventIcon sx={{ fontSize: 14 }} />}
                      label={advocate.eventCount}
                      size="small"
                      variant="outlined"
                      sx={{ height: 24, '& .MuiChip-label': { px: 0.5 } }}
                    />
                  </Tooltip>
                )}
                {advocate.region && (
                  <Chip
                    label={advocate.region}
                    size="small"
                    variant="outlined"
                    sx={{ height: 24, '& .MuiChip-label': { fontSize: '0.7rem' } }}
                  />
                )}
              </Stack>
            </CardContent>
          </CardActionArea>

          {/* Action menu button — only visible to managers/admins */}
          {canModify && (
            <IconButton
              size="small"
              onClick={(e) => handleOpenMenu(e, advocate)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'background.paper',
                opacity: 0.7,
                '&:hover': { opacity: 1, bgcolor: 'background.paper' },
              }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          )}
        </Card>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Advocates</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={56} height={56} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="70%" />
                      <Skeleton variant="text" width="50%" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <PageHelp page="advocates" onOpenDrawer={openHelp} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Advocates</Typography>
          <Typography color="text.secondary">
            {advocates.length} team members
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search advocates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          {canModify && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddNew}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Add Advocate
            </Button>
          )}
        </Box>
      </Box>

      {/* Managers Section */}
      {managers.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
            Leadership ({managers.length})
          </Typography>
          <Grid container spacing={3}>
            {managers.map((advocate) => renderCard(advocate, true))}
          </Grid>
        </Box>
      )}

      {/* Advocates Section */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
          Advocates ({nonManagers.length})
        </Typography>
        <Grid container spacing={3}>
          {nonManagers.map((advocate) => renderCard(advocate, false))}
        </Grid>
      </Box>

      {filteredAdvocates.length === 0 && !loading && (
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {search ? 'No advocates match your search' : 'No advocates found'}
            </Typography>
            {!search && canModify && (
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddNew}
                sx={{ mt: 2 }}
              >
                Add your first advocate
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card action menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => menuAdvocate && handleEdit(menuAdvocate)}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => menuAdvocate && handleDelete(menuAdvocate)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><Delete fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <AdvocateFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        advocate={editingAdvocate}
      />

      {/* Feedback snackbar */}
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
