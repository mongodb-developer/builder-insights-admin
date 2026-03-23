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
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

// Shared constants — single source of truth for both /advocates and /admin/users
const ROLES = ['viewer', 'advocate', 'manager', 'admin'] as const;
const ROLE_LABELS: Record<string, string> = {
  viewer: 'Viewer',
  advocate: 'Advocate',
  manager: 'Manager',
  admin: 'Admin',
};
const REGIONS = ['North America', 'EMEA', 'APAC', 'LATAM'] as const;

export interface AdvocateFormData {
  _id?: string;
  name: string;
  email: string;
  title?: string;
  role: string;
  region?: string;
  isActive?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: AdvocateFormData) => Promise<void>;
  advocate?: AdvocateFormData | null;
}

const defaultFormData: AdvocateFormData = {
  name: '',
  email: '',
  title: '',
  role: 'advocate',
  region: '',
  isActive: true,
};

export default function AdvocateFormDialog({ open, onClose, onSave, advocate }: Props) {
  const [form, setForm] = useState<AdvocateFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!advocate?._id;

  useEffect(() => {
    if (advocate) {
      setForm({ ...defaultFormData, ...advocate });
    } else {
      setForm(defaultFormData);
    }
    setError(null);
  }, [advocate, open]);

  const handleChange = (field: keyof AdvocateFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save advocate');
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = form.role || 'advocate';
  const isLeadershipRole = selectedRole === 'manager' || selectedRole === 'admin';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Advocate' : 'Add New Advocate'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={handleChange('name')}
            required
            fullWidth
            placeholder="Full name"
          />

          <TextField
            label="Email"
            value={form.email}
            onChange={handleChange('email')}
            required
            fullWidth
            type="email"
            placeholder="email@example.com"
            disabled={isEdit}
          />

          <TextField
            label="Title"
            value={form.title || ''}
            onChange={handleChange('title')}
            fullWidth
            placeholder="e.g. Senior Developer Advocate"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={selectedRole} label="Role" onChange={handleChange('role')}>
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </MenuItem>
                ))}
              </Select>
              {isLeadershipRole && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                  Will appear in the Leadership section
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Region</InputLabel>
              <Select value={form.region || ''} label="Region" onChange={handleChange('region')}>
                <MenuItem value="">Not specified</MenuItem>
                {REGIONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={form.isActive ?? true}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
            }
            label="Active"
          />
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
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Advocate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
