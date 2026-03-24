'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack,
  Skeleton,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add,
  ContentCopy,
  QrCode2,
  Edit,
  Delete,
  Visibility,
  OpenInNew,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';

interface FeedbackForm {
  _id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed';
  template: string;
  eventName?: string;
  slug: string;
  responseCount: number;
  lastResponseAt?: string;
  advocateName: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, 'default' | 'success' | 'error'> = {
  draft: 'default',
  active: 'success',
  closed: 'error',
};

const templateLabels: Record<string, string> = {
  session_feedback: 'Session Feedback',
  product_feedback: 'Product Feedback',
  general_feedback: 'General Feedback',
};

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadForms = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback/forms');
      const data = await res.json();
      setForms(data.forms || []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load forms', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    setSnackbar({ open: true, message: 'Form link copied to clipboard', severity: 'info' });
  };

  const handleDelete = async (form: FeedbackForm) => {
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/feedback/forms/${form._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setSnackbar({ open: true, message: 'Form deleted', severity: 'success' });
      loadForms();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete form', severity: 'error' });
    }
  };

  const handleToggleStatus = async (form: FeedbackForm) => {
    const newStatus = form.status === 'active' ? 'closed' : 'active';
    try {
      const res = await fetch(`/api/feedback/forms/${form._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setSnackbar({
        open: true,
        message: newStatus === 'active' ? 'Form is now live!' : 'Form closed',
        severity: 'success',
      });
      loadForms();
    } catch {
      setSnackbar({ open: true, message: 'Failed to update form status', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Feedback Forms</Typography>
        <Card>
          <CardContent>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Feedback Forms</Typography>
          <Typography color="text.secondary">
            Create shareable forms to collect developer feedback at events
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => router.push('/forms/new')}
        >
          Create Form
        </Button>
      </Box>

      {forms.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Feedback Forms Yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create a feedback form to share with developers at your next event.
              They can provide insights directly through a simple link or QR code.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/forms/new')}
              sx={{ bgcolor: mongoColors.darkGreen, '&:hover': { bgcolor: mongoColors.green, color: mongoColors.black } }}
            >
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Form</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Responses</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell width={200}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forms.map((form) => (
                  <TableRow
                    key={form._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/forms/${form._id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {form.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {form.advocateName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={templateLabels[form.template] || form.template}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {form.eventName || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                        size="small"
                        color={statusColors[form.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {form.responseCount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(form.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0}>
                        {form.status === 'active' && (
                          <Tooltip title="Open Form">
                            <IconButton
                              size="small"
                              href={`/f/${form.slug}`}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Copy Link">
                          <IconButton size="small" onClick={() => handleCopyLink(form.slug)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="QR Code">
                          <IconButton size="small" onClick={() => router.push(`/forms/${form._id}?tab=share`)}>
                            <QrCode2 fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={form.status === 'active' ? 'Close Form' : 'Activate Form'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleStatus(form)}
                            color={form.status === 'active' ? 'error' : 'success'}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(form)} color="error">
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
        </Card>
      )}

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
