'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Rating,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormHelperText,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
} from '@mui/icons-material';
import ThemeProvider from '@/theme/ThemeProvider';
import { mongoColors } from '@/theme';

// ============================================================================
// TYPES (local to this component — no auth-gated imports)
// ============================================================================

interface FormQuestion {
  _id: string;
  order: number;
  type: string;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  mapsToInsightField?: string;
}

interface FormData {
  _id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
  settings: {
    collectName: boolean;
    collectEmail: boolean;
    thankYouMessage?: string;
  };
  eventName?: string;
  sessionTitle?: string;
  advocateName?: string;
}

type AnswerMap = Record<string, string | string[] | number>;

// ============================================================================
// PRODUCT AREA & INSIGHT TYPE OPTIONS (duplicated to avoid server imports)
// ============================================================================

const PRODUCT_AREAS = [
  'Atlas', 'Atlas Search', 'Atlas Vector Search', 'Atlas Stream Processing',
  'Atlas Data Federation', 'Atlas Device Sync', 'Charts', 'Compass',
  'Driver', 'Server', 'Aggregation', 'Atlas Triggers', 'Atlas Functions',
  'Data API', 'App Services', 'Other',
];

const INSIGHT_TYPES = [
  'Pain Point', 'Feature Request', 'Praise', 'Question',
  'Use Case', 'Competition', 'Documentation', 'Other',
];

const SENTIMENTS = [
  { value: 'Positive', icon: <SentimentSatisfied />, color: '#4caf50' },
  { value: 'Neutral', icon: <SentimentNeutral />, color: '#ff9800' },
  { value: 'Negative', icon: <SentimentDissatisfied />, color: '#f44336' },
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// ============================================================================
// QUESTION RENDERERS
// ============================================================================

function QuestionRenderer({
  question,
  value,
  onChange,
  error,
}: {
  question: FormQuestion;
  value: string | string[] | number | undefined;
  onChange: (value: string | string[] | number) => void;
  error?: string;
}) {
  switch (question.type) {
    case 'rating':
      return (
        <Box>
          <Rating
            value={typeof value === 'number' ? value : 0}
            onChange={(_, newValue) => onChange(newValue || 0)}
            size="large"
            sx={{
              '& .MuiRating-iconFilled': { color: mongoColors.darkGreen },
              '& .MuiRating-iconHover': { color: mongoColors.green },
            }}
          />
          {error && <FormHelperText error>{error}</FormHelperText>}
        </Box>
      );

    case 'free_text':
      return (
        <TextField
          multiline
          rows={3}
          fullWidth
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your response..."
          error={!!error}
          helperText={error}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': { borderColor: mongoColors.darkGreen },
            },
          }}
        />
      );

    case 'sentiment':
      return (
        <Box>
          <Stack direction="row" spacing={2}>
            {SENTIMENTS.map((s) => (
              <Chip
                key={s.value}
                icon={s.icon}
                label={s.value}
                onClick={() => onChange(s.value)}
                variant={value === s.value ? 'filled' : 'outlined'}
                sx={{
                  px: 1,
                  py: 2.5,
                  fontSize: '0.95rem',
                  ...(value === s.value
                    ? { bgcolor: s.color, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }
                    : {}),
                }}
              />
            ))}
          </Stack>
          {error && <FormHelperText error>{error}</FormHelperText>}
        </Box>
      );

    case 'priority':
      return (
        <Box>
          <FormControl component="fieldset" error={!!error}>
            <RadioGroup
              row
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <FormControlLabel key={p} value={p} control={<Radio />} label={p} />
              ))}
            </RadioGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        </Box>
      );

    case 'insight_type':
      return (
        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {INSIGHT_TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                onClick={() => onChange(t)}
                variant={value === t ? 'filled' : 'outlined'}
                sx={{
                  mb: 0.5,
                  ...(value === t
                    ? { bgcolor: mongoColors.darkGreen, color: '#fff' }
                    : {}),
                }}
              />
            ))}
          </Stack>
          {error && <FormHelperText error>{error}</FormHelperText>}
        </Box>
      );

    case 'product_area':
      return (
        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {PRODUCT_AREAS.map((area) => {
              const selected = Array.isArray(value) ? value.includes(area) : false;
              return (
                <Chip
                  key={area}
                  label={area}
                  onClick={() => {
                    const current = Array.isArray(value) ? value : [];
                    if (selected) {
                      onChange(current.filter((v) => v !== area));
                    } else {
                      onChange([...current, area]);
                    }
                  }}
                  variant={selected ? 'filled' : 'outlined'}
                  sx={{
                    mb: 0.5,
                    ...(selected
                      ? { bgcolor: mongoColors.darkGreen, color: '#fff' }
                      : {}),
                  }}
                />
              );
            })}
          </Stack>
          {error && <FormHelperText error>{error}</FormHelperText>}
        </Box>
      );

    case 'single_choice':
      return (
        <Box>
          <FormControl component="fieldset" error={!!error}>
            <RadioGroup
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
            >
              {question.options?.map((opt) => (
                <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
              ))}
            </RadioGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        </Box>
      );

    case 'multi_choice':
      return (
        <Box>
          <FormControl component="fieldset" error={!!error}>
            <FormGroup>
              {question.options?.map((opt) => {
                const checked = Array.isArray(value) ? value.includes(opt) : false;
                return (
                  <FormControlLabel
                    key={opt}
                    control={
                      <Checkbox
                        checked={checked}
                        onChange={() => {
                          const current = Array.isArray(value) ? value : [];
                          if (checked) {
                            onChange(current.filter((v) => v !== opt));
                          } else {
                            onChange([...current, opt]);
                          }
                        }}
                      />
                    }
                    label={opt}
                  />
                );
              })}
            </FormGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        </Box>
      );

    default:
      return (
        <TextField
          fullWidth
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          helperText={error}
        />
      );
  }
}

// ============================================================================
// MAIN FORM PAGE
// ============================================================================

function FeedbackFormPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  // Form state
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Honeypot
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    async function fetchForm() {
      try {
        const res = await fetch(`/api/feedback/${slug}`);
        if (res.status === 410) {
          const data = await res.json();
          setError(data.error || 'This form is no longer accepting responses.');
          setClosed(true);
          return;
        }
        if (!res.ok) {
          setError('Form not found');
          return;
        }
        const data = await res.json();
        setForm(data);
      } catch {
        setError('Failed to load form');
      } finally {
        setLoading(false);
      }
    }
    fetchForm();
  }, [slug]);

  const setAnswer = useCallback((questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Clear error for this field
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    if (!form) return false;
    const errors: Record<string, string> = {};

    for (const question of form.questions) {
      if (!question.required) continue;

      const value = answers[question._id];
      if (value === undefined || value === null || value === '') {
        errors[question._id] = 'This field is required';
      } else if (Array.isArray(value) && value.length === 0) {
        errors[question._id] = 'Please select at least one option';
      } else if (question.type === 'rating' && value === 0) {
        errors[question._id] = 'Please provide a rating';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, answers]);

  const handleSubmit = useCallback(async () => {
    if (!form || !validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        })),
        respondentName: respondentName || undefined,
        respondentEmail: respondentEmail || undefined,
        website: honeypot || undefined, // Honeypot
      };

      const res = await fetch(`/api/feedback/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setSubmitError('Too many submissions. Please try again later.');
        } else {
          setSubmitError(data.error || 'Failed to submit. Please try again.');
        }
        return;
      }

      setThankYouMessage(data.message || 'Thank you for your feedback!');
      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, answers, respondentName, respondentEmail, honeypot, slug, validate]);

  // Progress indicator
  const totalRequired = form?.questions.filter((q) => q.required).length || 0;
  const answeredRequired = form?.questions.filter((q) => {
    if (!q.required) return false;
    const val = answers[q._id];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (q.type === 'rating' && val === 0) return false;
    return true;
  }).length || 0;
  const progress = totalRequired > 0 ? (answeredRequired / totalRequired) * 100 : 0;

  // Loading state
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: mongoColors.gray[100] }}>
        <CircularProgress sx={{ color: mongoColors.darkGreen }} />
      </Box>
    );
  }

  // Error / closed state
  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: mongoColors.gray[100], p: 3 }}>
        <Card sx={{ maxWidth: 500, width: '100%', textAlign: 'center', p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: mongoColors.black }}>
            {closed ? 'Form Closed' : 'Form Not Found'}
          </Typography>
          <Typography color="text.secondary">{error}</Typography>
        </Card>
      </Box>
    );
  }

  // Thank you state
  if (submitted) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: mongoColors.gray[100], p: 3 }}>
        <Card sx={{ maxWidth: 500, width: '100%', textAlign: 'center', p: 4 }}>
          <CheckCircle sx={{ fontSize: 64, color: mongoColors.darkGreen, mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: mongoColors.black }}>
            Thank You!
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1.1rem' }}>
            {thankYouMessage}
          </Typography>
        </Card>
      </Box>
    );
  }

  if (!form) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: mongoColors.gray[100], py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 700, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            component="img"
            src="/logo.svg"
            alt="MongoDB"
            sx={{ width: 48, height: 48, mb: 2 }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700, color: mongoColors.black, mb: 1 }}>
            {form.title}
          </Typography>
          {form.eventName && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
              {form.eventName}
              {form.sessionTitle && ` - ${form.sessionTitle}`}
            </Typography>
          )}
          {form.description && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {form.description}
            </Typography>
          )}
        </Box>

        {/* Progress bar */}
        {totalRequired > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {answeredRequired} / {totalRequired} required
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: mongoColors.gray[200],
                '& .MuiLinearProgress-bar': { bgcolor: mongoColors.darkGreen, borderRadius: 3 },
              }}
            />
          </Box>
        )}

        {/* Respondent info */}
        {(form.settings.collectName || form.settings.collectEmail) && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: mongoColors.gray[600] }}>
                About You (optional)
              </Typography>
              <Stack spacing={2}>
                {form.settings.collectName && (
                  <TextField
                    label="Your Name"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    size="small"
                    fullWidth
                  />
                )}
                {form.settings.collectEmail && (
                  <TextField
                    label="Your Email"
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => setRespondentEmail(e.target.value)}
                    size="small"
                    fullWidth
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Honeypot field — hidden from real users */}
        <Box sx={{ position: 'absolute', left: -9999, opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
          <TextField
            label="Website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </Box>

        {/* Questions */}
        {form.questions
          .sort((a, b) => a.order - b.order)
          .map((question, index) => (
            <Card key={question._id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      bgcolor: mongoColors.darkGreen,
                      color: '#fff',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 700,
                      mt: 0.25,
                    }}
                  >
                    {index + 1}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <FormLabel sx={{ fontWeight: 600, color: mongoColors.black, fontSize: '1rem' }}>
                      {question.label}
                      {question.required && (
                        <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                      )}
                    </FormLabel>
                    {question.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {question.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ pl: 4, mt: 1.5 }}>
                  <QuestionRenderer
                    question={question}
                    value={answers[question._id]}
                    onChange={(val) => setAnswer(question._id, val)}
                    error={fieldErrors[question._id]}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}

        {/* Submit error */}
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        {/* Submit button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 700,
            bgcolor: mongoColors.darkGreen,
            '&:hover': { bgcolor: mongoColors.green, color: mongoColors.black },
            mb: 4,
          }}
        >
          {submitting ? (
            <CircularProgress size={24} sx={{ color: '#fff' }} />
          ) : (
            'Submit Feedback'
          )}
        </Button>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', pb: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Powered by Builder Insights
            {form.advocateName && ` | Created by ${form.advocateName}`}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// Wrap in ThemeProvider since this is a standalone page outside the admin layout
export default function FeedbackFormWrapper() {
  return (
    <ThemeProvider>
      <FeedbackFormPage />
    </ThemeProvider>
  );
}
