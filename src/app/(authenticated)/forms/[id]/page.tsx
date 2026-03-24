'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  Tab,
  Tabs,
  Divider,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  ContentCopy,
  QrCode2,
  Edit,
  OpenInNew,
  Download,
  Visibility,
  VisibilityOff,
  Delete,
  Link as LinkIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';

// ============================================================================
// TYPES
// ============================================================================

interface FeedbackForm {
  _id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed';
  template: string;
  eventName?: string;
  sessionTitle?: string;
  slug: string;
  questions: any[];
  settings: any;
  responseCount: number;
  lastResponseAt?: string;
  advocateName: string;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackResponse {
  _id: string;
  formId: string;
  respondentName?: string;
  respondentEmail?: string;
  answers: Array<{ questionId: string; value: any }>;
  insightId: string;
  submittedAt: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = params.id as string;

  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') === 'share' ? 1 : 0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback/forms/${formId}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setForm(data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load form', severity: 'error' });
    }
  }, [formId]);

  const loadResponses = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback/forms/${formId}/responses`);
      if (!res.ok) return;
      const data = await res.json();
      setResponses(data.responses || []);
    } catch {}
  }, [formId]);

  useEffect(() => {
    Promise.all([loadForm(), loadResponses()]).finally(() => setLoading(false));
  }, [loadForm, loadResponses]);

  const formUrl = form ? `${window.location.origin}/f/${form.slug}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setSnackbar({ open: true, message: 'Link copied to clipboard', severity: 'info' });
  };

  const handleToggleStatus = async () => {
    if (!form) return;
    const newStatus = form.status === 'active' ? 'closed' : 'active';
    try {
      const res = await fetch(`/api/feedback/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setSnackbar({
        open: true,
        message: newStatus === 'active' ? 'Form is now live!' : 'Form closed',
        severity: 'success',
      });
      loadForm();
    } catch {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleDownloadQR = async (format: 'png' | 'svg' = 'png') => {
    try {
      const res = await fetch(`/api/feedback/forms/${formId}/qr?format=${format}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${form?.slug || 'form'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to download QR code', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!form) return;
    if (!confirm(`Delete "${form.title}"? This will also delete all responses.`)) return;
    try {
      const res = await fetch(`/api/feedback/forms/${formId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      router.push('/forms');
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete', severity: 'error' });
    }
  };

  // Resolve question label from ID
  const getQuestionLabel = (questionId: string): string => {
    const q = form?.questions.find((q: any) => q._id === questionId);
    return q?.label || questionId;
  };

  const formatAnswerValue = (value: any): string => {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'number') return `${value}/5`;
    return String(value || '-');
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={40} width={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={300} />
      </Box>
    );
  }

  if (!form) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => router.push('/forms')} sx={{ mb: 2 }}>
          Back to Forms
        </Button>
        <Alert severity="error">Form not found</Alert>
      </Box>
    );
  }

  const statusColors: Record<string, 'default' | 'success' | 'error'> = {
    draft: 'default',
    active: 'success',
    closed: 'error',
  };

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => router.push('/forms')} sx={{ mb: 2 }}>
        Back to Forms
      </Button>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {form.title}
            </Typography>
            <Chip
              label={form.status.charAt(0).toUpperCase() + form.status.slice(1)}
              size="small"
              color={statusColors[form.status] || 'default'}
            />
          </Stack>
          <Typography color="text.secondary">
            {form.responseCount} response{form.responseCount !== 1 ? 's' : ''}
            {form.eventName && ` | ${form.eventName}`}
            {` | Created by ${form.advocateName}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {form.status === 'active' && (
            <Button
              variant="outlined"
              startIcon={<OpenInNew />}
              href={`/f/${form.slug}`}
              target="_blank"
              size="small"
            >
              Open Form
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={form.status === 'active' ? <VisibilityOff /> : <Visibility />}
            onClick={handleToggleStatus}
            color={form.status === 'active' ? 'error' : 'success'}
            size="small"
          >
            {form.status === 'active' ? 'Close' : 'Activate'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Delete />}
            onClick={handleDelete}
            color="error"
            size="small"
          >
            Delete
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`Responses (${form.responseCount})`} />
        <Tab label="Share & QR Code" />
        <Tab label={`Questions (${form.questions.length})`} />
      </Tabs>

      {/* Responses Tab */}
      {tab === 0 && (
        <>
          {responses.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Responses Yet
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {form.status === 'draft'
                    ? 'Activate this form and share it to start collecting responses.'
                    : 'Share the form link or QR code with developers to collect feedback.'
                  }
                </Typography>
                {form.status === 'draft' && (
                  <Button variant="contained" onClick={handleToggleStatus}>
                    Activate Form
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Respondent</TableCell>
                      {form.questions.slice(0, 4).map((q: any) => (
                        <TableCell key={q._id}>
                          <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 150 }} noWrap>
                            {q.label}
                          </Typography>
                        </TableCell>
                      ))}
                      <TableCell>Submitted</TableCell>
                      <TableCell>Insight</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {responses.map((response, index) => (
                      <TableRow key={response._id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {response.respondentName || 'Anonymous'}
                          </Typography>
                          {response.respondentEmail && (
                            <Typography variant="caption" color="text.secondary">
                              {response.respondentEmail}
                            </Typography>
                          )}
                        </TableCell>
                        {form.questions.slice(0, 4).map((q: any) => {
                          const answer = response.answers.find((a) => a.questionId === q._id);
                          return (
                            <TableCell key={q._id}>
                              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }} noWrap>
                                {answer ? formatAnswerValue(answer.value) : '-'}
                              </Typography>
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(response.submittedAt).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Insight">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/insights?search=${response.insightId}`)}
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {/* Share & QR Tab */}
      {tab === 1 && (
        <Stack spacing={3}>
          {/* Form link */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Share Link
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  value={formUrl}
                  fullWidth
                  size="small"
                  slotProps={{ input: { readOnly: true, startAdornment: <LinkIcon sx={{ mr: 1, color: mongoColors.gray[400] }} /> } }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: mongoColors.gray[100] } }}
                />
                <Button
                  variant="contained"
                  startIcon={<ContentCopy />}
                  onClick={handleCopyLink}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Copy
                </Button>
              </Stack>
              {form.status !== 'active' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This form is not active. Activate it to make the link accessible.
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                QR Code
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Display this QR code on your slides, printed materials, or at your booth.
                Attendees can scan it to open the feedback form on their phone.
              </Typography>

              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box
                  component="img"
                  src={`/api/feedback/forms/${formId}/qr?format=png&t=${Date.now()}`}
                  alt="QR Code"
                  sx={{
                    width: 250,
                    height: 250,
                    border: `2px solid ${mongoColors.gray[200]}`,
                    borderRadius: 2,
                    p: 1,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {formUrl}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleDownloadQR('png')}
                >
                  Download PNG
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleDownloadQR('svg')}
                >
                  Download SVG
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Questions Tab */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Form Questions
              </Typography>
              <Button
                size="small"
                startIcon={<Edit />}
                onClick={() => router.push(`/forms/new?edit=${formId}`)}
              >
                Edit Questions
              </Button>
            </Box>
            {form.questions
              .sort((a: any, b: any) => a.order - b.order)
              .map((q: any, index: number) => (
                <Box key={q._id} sx={{ py: 1.5, borderBottom: index < form.questions.length - 1 ? `1px solid ${mongoColors.gray[200]}` : 'none' }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Typography
                      variant="caption"
                      sx={{
                        bgcolor: mongoColors.darkGreen,
                        color: '#fff',
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      {index + 1}
                    </Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {q.label}
                        {q.required && <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                        <Chip label={q.type} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                        {q.mapsToInsightField && (
                          <Chip label={`-> ${q.mapsToInsightField}`} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: `${mongoColors.green}20` }} />
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              ))}
          </CardContent>
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
