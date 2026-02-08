'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  Delete,
  ViewList,
  ViewModule,
  Search,
  CalendarMonth,
  LocationOn,
  Lightbulb,
  Business,
} from '@mui/icons-material';
import { PageHelp, HelpButton, useHelp } from '@/components/help';

interface Event {
  _id: string;
  name: string;
  status: string;
  region: string;
  engagementType: string;
  location: string;
  startDate?: string;
  endDate?: string;
  insightCount?: number;
  account?: { name: string };
  description?: string;
  technicalTheme?: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  'In Queue': 'default',
  'In Hack Queue': 'default',
  'Scheduled': 'info',
  'Confirmed': 'info',
  'In Progress': 'warning',
  'Delivered': 'success',
  'Completed': 'success',
  'Postponed': 'error',
  'Cancelled': 'error',
};

const regionColors: Record<string, string> = {
  'AMER': '#2196f3',
  'EMEA': '#9c27b0',
  'APAC': '#ff9800',
  'LATAM': '#4caf50',
};

export default function EventsPage() {
  const { openHelp } = useHelp();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        setError('Failed to load events. Check your MongoDB connection.');
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchQuery === '' ||
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.account?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesRegion = regionFilter === 'all' || event.region === regionFilter;

    return matchesSearch && matchesStatus && matchesRegion;
  });

  // Get unique statuses and regions for filters
  const statuses = [...new Set(events.map((e) => e.status))].filter(Boolean);
  const regions = [...new Set(events.map((e) => e.region))].filter(Boolean);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return 'TBD';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      return `${startStr}, ${startDate.getFullYear()}`;
    }
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Events</Typography>
            <Typography color="text.secondary">Manage conferences, hackathons, and developer days</Typography>
          </Box>
        </Box>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Events Yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create your first event or import from the PMO spreadsheet.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" startIcon={<Add />}>
                Create Event
              </Button>
              <Button variant="outlined" onClick={() => router.push('/import')}>
                Import from PMO
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Help */}
      <PageHelp page="events" onOpenDrawer={() => openHelp('events')} />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Events</Typography>
          <Typography color="text.secondary">
            {filteredEvents.length} of {events.length} events
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => router.push('/import')}>
            Import PMO
          </Button>
          <Button variant="contained" startIcon={<Add />}>
            New Event
          </Button>
        </Stack>
      </Box>

      {/* Filters & View Toggle */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Region</InputLabel>
            <Select
              value={regionFilter}
              label="Region"
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <MenuItem value="all">All Regions</MenuItem>
              {regions.map((region) => (
                <MenuItem key={region} value={region}>{region}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="cards">
              <ViewModule />
            </ToggleButton>
            <ToggleButton value="table">
              <ViewList />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Card>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <Grid container spacing={3}>
          {filteredEvents.map((event) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={event._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Status & Region */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      label={event.status}
                      size="small"
                      color={statusColors[event.status] || 'default'}
                    />
                    <Chip
                      label={event.region}
                      size="small"
                      sx={{
                        bgcolor: regionColors[event.region] || '#757575',
                        color: 'white',
                      }}
                    />
                  </Stack>

                  {/* Title */}
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, lineHeight: 1.3 }}>
                    {event.name}
                  </Typography>

                  {/* Type */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {event.engagementType}
                  </Typography>

                  {/* Details */}
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarMonth fontSize="small" color="action" />
                      <Typography variant="body2">
                        {formatDateRange(event.startDate, event.endDate)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2" noWrap>
                        {event.location || 'TBD'}
                      </Typography>
                    </Stack>

                    {event.account?.name && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Business fontSize="small" color="action" />
                        <Typography variant="body2" noWrap>
                          {event.account.name}
                        </Typography>
                      </Stack>
                    )}

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Lightbulb fontSize="small" color="action" />
                      <Typography variant="body2">
                        {event.insightCount || 0} insights captured
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Technical Theme */}
                  {event.technicalTheme && (
                    <Chip
                      label={event.technicalTheme}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 2 }}
                    />
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => router.push(`/events/${event._id}`)}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => router.push(`/events/${event._id}/edit`)}
                  >
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Insights</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{event.name}</Typography>
                      {event.account?.name && (
                        <Typography variant="caption" color="text.secondary">
                          {event.account.name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={event.status}
                        size="small"
                        color={statusColors[event.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={event.region}
                        size="small"
                        sx={{
                          bgcolor: regionColors[event.region] || '#757575',
                          color: 'white',
                        }}
                      />
                    </TableCell>
                    <TableCell>{event.engagementType}</TableCell>
                    <TableCell>{formatDate(event.startDate)}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>
                      <Chip label={event.insightCount || 0} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => router.push(`/events/${event._id}`)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => router.push(`/events/${event._id}/edit`)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* No results */}
      {filteredEvents.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              No events match your filters
            </Typography>
            <Button
              sx={{ mt: 2 }}
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRegionFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
