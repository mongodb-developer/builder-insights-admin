'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  LinearProgress,
  Alert,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';
import {
  Person as PersonIcon,
  LinkedIn as LinkedInIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';
import { PROFILE_FIELDS, type ProfileField } from '@/lib/profile';

const REGIONS = ['AMER', 'EMEA', 'APAC', 'LATAM'];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

interface ProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ProfileData {
  name: string;
  email: string;
  title: string;
  linkedinUrl: string;
  phone: string;
  region: string;
  location: string;
  bio: string;
  timezone: string;
  github: string;
  twitter: string;
  [key: string]: string;
}

export default function ProfileEditDialog({ open, onClose }: ProfileEditDialogProps) {
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    title: '',
    linkedinUrl: '',
    phone: '',
    region: '',
    location: '',
    bio: '',
    timezone: '',
    github: '',
    twitter: '',
  });
  const [completeness, setCompleteness] = useState<{ percentage: number; isComplete: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch current profile when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    fetch('/api/profile')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load profile'))
      .then(data => {
        const adv = data.advocate;
        setProfile({
          name: adv.name || '',
          email: adv.email || '',
          title: adv.title || '',
          linkedinUrl: adv.linkedinUrl || '',
          phone: adv.phone || '',
          region: adv.region || '',
          location: adv.location || '',
          bio: adv.bio || '',
          timezone: adv.timezone || '',
          github: adv.github || '',
          twitter: adv.twitter || '',
        });
        setCompleteness(data.completeness);
      })
      .catch(() => setError('Failed to load your profile. Please try again.'))
      .finally(() => setLoading(false));
  }, [open]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field-level error on change
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    for (const field of PROFILE_FIELDS) {
      const value = profile[field.key as string] || '';
      if (field.validate && value) {
        const err = field.validate(value);
        if (err) errors[field.key] = err;
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      setCompleteness(data.completeness);
      setSuccess(true);

      // Notify the banner to re-check
      window.dispatchEvent(new Event('profile-updated'));

      // Auto-close after short delay on success
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const progressColor =
    (completeness?.percentage ?? 0) >= 80 ? mongoColors.darkGreen :
    (completeness?.percentage ?? 0) >= 50 ? '#F0A500' :
    '#CF4520';

  const renderField = (field: ProfileField) => {
    const key = field.key as string;
    const value = profile[key] || '';

    if (key === 'email') {
      return (
        <TextField
          key={key}
          label={field.label}
          value={value}
          disabled
          fullWidth
          size="small"
          helperText="Email cannot be changed"
          sx={{ mb: 2 }}
        />
      );
    }

    if (field.type === 'select' && key === 'region') {
      return (
        <TextField
          key={key}
          select
          label={field.label}
          value={value}
          onChange={handleChange(key)}
          fullWidth
          size="small"
          helperText={field.helperText}
          sx={{ mb: 2 }}
        >
          <MenuItem value="">Select region...</MenuItem>
          {REGIONS.map(r => (
            <MenuItem key={r} value={r}>{r}</MenuItem>
          ))}
        </TextField>
      );
    }

    if (field.type === 'select' && key === 'timezone') {
      return (
        <TextField
          key={key}
          select
          label={field.label}
          value={value}
          onChange={handleChange(key)}
          fullWidth
          size="small"
          helperText={field.helperText}
          sx={{ mb: 2 }}
        >
          <MenuItem value="">Select timezone...</MenuItem>
          {TIMEZONES.map(tz => (
            <MenuItem key={tz} value={tz}>{tz}</MenuItem>
          ))}
        </TextField>
      );
    }

    if (field.type === 'textarea') {
      return (
        <TextField
          key={key}
          label={field.label}
          value={value}
          onChange={handleChange(key)}
          fullWidth
          size="small"
          multiline
          rows={3}
          placeholder={field.placeholder}
          helperText={field.helperText}
          error={!!fieldErrors[key]}
          sx={{ mb: 2 }}
        />
      );
    }

    return (
      <TextField
        key={key}
        label={field.label}
        value={value}
        onChange={handleChange(key)}
        fullWidth
        size="small"
        placeholder={field.placeholder}
        helperText={fieldErrors[key] || field.helperText}
        error={!!fieldErrors[key]}
        type={field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
        sx={{ mb: 2 }}
      />
    );
  };

  // Split fields into required and optional groups
  const requiredFields = PROFILE_FIELDS.filter(f => f.required);
  const optionalFields = PROFILE_FIELDS.filter(f => !f.required);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon sx={{ color: mongoColors.darkGreen }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Your Profile
          </Typography>
        </Box>
        {completeness && (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Profile completeness
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: progressColor }}>
                {completeness.percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completeness.percentage}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: `${progressColor}20`,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: progressColor,
                },
              }}
            />
          </Box>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: mongoColors.darkGreen }} />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Profile saved successfully!
              </Alert>
            )}

            {/* Required fields section */}
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 1.5, color: mongoColors.darkGreen, display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              Essential Information
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              These fields are needed so your team can reach and identify you.
            </Typography>
            {requiredFields.map(renderField)}

            <Divider sx={{ my: 2 }} />

            {/* Optional fields section */}
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 1.5, color: mongoColors.gray[600] }}
            >
              Additional Details
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Optional but helpful for collaboration.
            </Typography>
            {optionalFields.map(renderField)}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          {success ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: mongoColors.darkGreen,
            color: mongoColors.white,
            '&:hover': { bgcolor: mongoColors.green, color: mongoColors.black },
          }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
