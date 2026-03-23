'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  OutlinedInput,
  Autocomplete,
  Alert,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

// Enums matching mobile app
const INSIGHT_TYPES = [
  'Feature Request',
  'Bug Report',
  'Pain Point',
  'Positive Feedback',
  'Competitive Intel',
  'Use Case',
  'Documentation',
  'General Feedback',
];

const PRODUCT_AREAS = [
  'Atlas',
  'Vector Search',
  'Queryable Encryption',
  'Aggregation Framework',
  'Stream Processing',
  'Data Modeling',
  'Atlas Search',
  'App Services',
  'Voyage AI',
  'Other',
];

const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export interface InsightFormData {
  _id?: string;
  title?: string;
  text: string;
  type: string;
  sentiment: string;
  priority: string;
  productAreas: string[];
  tags: string[];
  eventId?: string;
  eventName?: string;
  advocateName: string;
  followUpRequired: boolean;
}

interface Event {
  _id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: InsightFormData) => Promise<void>;
  insight?: InsightFormData | null;
  events?: Event[];
}

const defaultFormData: InsightFormData = {
  text: '',
  type: 'General Feedback',
  sentiment: 'Neutral',
  priority: 'Medium',
  productAreas: [],
  tags: [],
  eventId: '',
  eventName: '',
  advocateName: '',
  followUpRequired: false,
};

export default function InsightFormDialog({ open, onClose, onSave, insight, events = [] }: Props) {
  const [form, setForm] = useState<InsightFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const isEdit = !!insight?._id;

  useEffect(() => {
    if (insight) {
      setForm({
        ...defaultFormData,
        ...insight,
        productAreas: insight.productAreas || [],
        tags: insight.tags || [],
      });
    } else {
      setForm(defaultFormData);
    }
    setError(null);
  }, [insight, open]);

  const handleChange = (field: keyof InsightFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleProductAreasChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      productAreas: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const handleEventChange = (event: SelectChangeEvent<string>) => {
    const eventId = event.target.value;
    const selectedEvent = events.find((e) => e._id === eventId);
    setForm((prev) => ({
      ...prev,
      eventId: eventId || '',
      eventName: selectedEvent?.name || '',
    }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSubmit = async () => {
    if (!form.text.trim()) {
      setError('Insight text is required');
      return;
    }
    if (!form.advocateName.trim()) {
      setError('Advocate name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save insight');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Insight' : 'Add New Insight'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Title */}
          <TextField
            label="Title (Optional)"
            value={form.title || ''}
            onChange={handleChange('title')}
            fullWidth
            placeholder="Brief headline for this insight"
            size="small"
          />

          {/* Insight Text */}
          <TextField
            label="Insight Text"
            value={form.text}
            onChange={handleChange('text')}
            multiline
            rows={4}
            required
            fullWidth
            placeholder="Describe the developer feedback, pain point, or feature request..."
          />

          {/* Type and Sentiment */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={form.type} label="Type" onChange={handleChange('type')}>
                {INSIGHT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Sentiment</InputLabel>
              <Select value={form.sentiment} label="Sentiment" onChange={handleChange('sentiment')}>
                {SENTIMENTS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={form.priority} label="Priority" onChange={handleChange('priority')}>
                {PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Product Areas */}
          <FormControl fullWidth>
            <InputLabel>Product Areas</InputLabel>
            <Select
              multiple
              value={form.productAreas}
              onChange={handleProductAreasChange}
              input={<OutlinedInput label="Product Areas" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {PRODUCT_AREAS.map((area) => (
                <MenuItem key={area} value={area}>
                  {area}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tags */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Add Tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                size="small"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={handleAddTag}>
                Add
              </Button>
            </Stack>
            {form.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {form.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => handleRemoveTag(tag)}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Event and Advocate */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Event (Optional)</InputLabel>
              <Select
                value={form.eventId || ''}
                label="Event (Optional)"
                onChange={handleEventChange}
              >
                <MenuItem value="">No Event</MenuItem>
                {events.map((event) => (
                  <MenuItem key={event._id} value={event._id}>
                    {event.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Advocate Name"
              value={form.advocateName}
              onChange={handleChange('advocateName')}
              required
              fullWidth
              placeholder="Who captured this insight?"
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Insight'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
