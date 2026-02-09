'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Stack,
  Alert,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';

const STATUSES = [
  'NEW',
  'CONFIRMING',
  'NEEDS_STAFFING',
  'ASSIGNED',
  'COMPLETED',
  'CANCELLED',
  'SA_LED',
  'FYI',
];

const EVENT_TYPES = [
  'DEV_DAY_1_1',
  'DEV_DAY_REGIONAL',
  'WEBINAR',
  'BUILD_LEARN',
  'OFFICE_HOURS',
  'HACKATHON',
  'ARCHITECT_DAY',
  'VIRTUAL_PRIMER',
  'OTHER',
];

const TRAVEL_STATUSES = [
  'DONT_BOOK_YET',
  'WAITING_ON_CUSTOMER',
  'BOOKING_NEEDED',
  'BOOKED',
  'NOT_REQUIRED',
];

interface EventFormData {
  name: string;
  status: string;
  eventType: string;
  startDate: string;
  endDate: string;
  location: string;
  isVirtual: boolean;
  timezone: string;
  quarter: string;
  isRegional: boolean;
  language: string;
  slackChannel: string;
  travelStatus: string;
  notes: string;
  eventPageUrl: string;
  sfdcLink: string;
  wrikeTicket: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<EventFormData>({
    name: '',
    status: 'NEW',
    eventType: 'OTHER',
    startDate: '',
    endDate: '',
    location: '',
    isVirtual: false,
    timezone: '',
    quarter: '',
    isRegional: false,
    language: 'English',
    slackChannel: '',
    travelStatus: 'DONT_BOOK_YET',
    notes: '',
    eventPageUrl: '',
    sfdcLink: '',
    wrikeTicket: '',
  });

  const handleChange = (field: keyof EventFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSwitchChange = (field: keyof EventFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!form.name.trim()) {
      setError('Event name is required');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      const data = await res.json();
      setSuccess(true);
      setTimeout(() => router.push(`/events/${data._id || data.insertedId}`), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => router.push('/events')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            New Event
          </Typography>
          <Typography color="text.secondary">Create a new event</Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Event created successfully! Redirecting...
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    label="Event Name"
                    value={form.name}
                    onChange={handleChange('name')}
                    required
                    fullWidth
                    autoFocus
                  />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={form.status}
                          label="Status"
                          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                        >
                          {STATUSES.map((s) => (
                            <MenuItem key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Event Type</InputLabel>
                        <Select
                          value={form.eventType}
                          label="Event Type"
                          onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value }))}
                        >
                          {EVENT_TYPES.map((t) => (
                            <MenuItem key={t} value={t}>
                              {t.replace(/_/g, ' ')}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Start Date"
                        type="date"
                        value={form.startDate}
                        onChange={handleChange('startDate')}
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="End Date"
                        type="date"
                        value={form.endDate}
                        onChange={handleChange('endDate')}
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <TextField
                        label="Location"
                        value={form.location}
                        onChange={handleChange('location')}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        label="Timezone"
                        value={form.timezone}
                        onChange={handleChange('timezone')}
                        fullWidth
                      />
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={3}>
                    <FormControlLabel
                      control={
                        <Switch checked={form.isVirtual} onChange={handleSwitchChange('isVirtual')} />
                      }
                      label="Virtual Event"
                    />
                    <FormControlLabel
                      control={
                        <Switch checked={form.isRegional} onChange={handleSwitchChange('isRegional')} />
                      }
                      label="Regional Event"
                    />
                  </Stack>

                  <TextField
                    label="Notes"
                    value={form.notes}
                    onChange={handleChange('notes')}
                    multiline
                    rows={4}
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Logistics
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Quarter"
                    value={form.quarter}
                    onChange={handleChange('quarter')}
                    fullWidth
                    placeholder="e.g., Q1 FY26"
                  />
                  <TextField
                    label="Language"
                    value={form.language}
                    onChange={handleChange('language')}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>Travel Status</InputLabel>
                    <Select
                      value={form.travelStatus}
                      label="Travel Status"
                      onChange={(e) => setForm((prev) => ({ ...prev, travelStatus: e.target.value }))}
                    >
                      {TRAVEL_STATUSES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t.replace(/_/g, ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Slack Channel"
                    value={form.slackChannel}
                    onChange={handleChange('slackChannel')}
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Links
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Event Page URL"
                    value={form.eventPageUrl}
                    onChange={handleChange('eventPageUrl')}
                    fullWidth
                    type="url"
                  />
                  <TextField
                    label="Salesforce Link"
                    value={form.sfdcLink}
                    onChange={handleChange('sfdcLink')}
                    fullWidth
                    type="url"
                  />
                  <TextField
                    label="Wrike Ticket"
                    value={form.wrikeTicket}
                    onChange={handleChange('wrikeTicket')}
                    fullWidth
                    type="url"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            type="submit"
            disabled={saving}
            startIcon={<Save />}
            size="large"
          >
            {saving ? 'Creating...' : 'Create Event'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/events')}
            size="large"
          >
            Cancel
          </Button>
        </Box>
      </form>
    </Box>
  );
}
