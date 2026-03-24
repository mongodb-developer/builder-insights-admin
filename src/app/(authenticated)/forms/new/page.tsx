'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Paper,
} from '@mui/material';
import {
  ArrowBack,
  DragIndicator,
  Delete,
  Add,
  Description as DescriptionIcon,
  Poll as PollIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';

// ============================================================================
// TYPES
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

interface FormSettings {
  collectName: boolean;
  collectEmail: boolean;
  maxResponses?: number | null;
  closesAt?: string | null;
  thankYouMessage?: string;
}

interface EventOption {
  _id: string;
  name: string;
}

// Template info displayed in the selector
const TEMPLATES = [
  {
    id: 'session_feedback',
    name: 'Session Feedback',
    description: 'Collect feedback after a talk, workshop, or presentation',
    icon: <ChatIcon sx={{ fontSize: 40, color: mongoColors.darkGreen }} />,
  },
  {
    id: 'product_feedback',
    name: 'Product Feedback',
    description: 'Gather product-specific feedback from developers',
    icon: <PollIcon sx={{ fontSize: 40, color: mongoColors.darkGreen }} />,
  },
  {
    id: 'general_feedback',
    name: 'General Feedback',
    description: 'Broad community pulse check for events and meetups',
    icon: <DescriptionIcon sx={{ fontSize: 40, color: mongoColors.darkGreen }} />,
  },
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  rating: 'Rating (1-5)',
  free_text: 'Free Text',
  sentiment: 'Sentiment',
  priority: 'Priority',
  insight_type: 'Insight Type',
  product_area: 'Product Area',
  single_choice: 'Single Choice',
  multi_choice: 'Multiple Choice',
};

const ADDABLE_QUESTION_TYPES = [
  { type: 'free_text', label: 'Free Text', defaultLabel: 'Your question here' },
  { type: 'rating', label: 'Rating (1-5)', defaultLabel: 'How would you rate...?' },
  { type: 'single_choice', label: 'Single Choice', defaultLabel: 'Choose one option' },
  { type: 'multi_choice', label: 'Multiple Choice', defaultLabel: 'Select all that apply' },
  { type: 'sentiment', label: 'Sentiment', defaultLabel: 'How do you feel about...?' },
  { type: 'priority', label: 'Priority', defaultLabel: 'How important is this?' },
  { type: 'insight_type', label: 'Insight Type', defaultLabel: 'What type of feedback is this?' },
  { type: 'product_area', label: 'Product Area', defaultLabel: 'Which products are relevant?' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function NewFormPage() {
  const router = useRouter();
  const [step, setStep] = useState<'template' | 'customize'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [settings, setSettings] = useState<FormSettings>({
    collectName: true,
    collectEmail: true,
    maxResponses: null,
    closesAt: null,
    thankYouMessage: '',
  });
  const [eventId, setEventId] = useState('');
  const [eventName, setEventName] = useState('');

  // UI state
  const [events, setEvents] = useState<EventOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load events for the dropdown
  useEffect(() => {
    fetch('/api/events?limit=200')
      .then((res) => res.json())
      .then((data) => setEvents((data.events || []).map((e: any) => ({ _id: e._id, name: e.name }))))
      .catch(() => {});
  }, []);

  // When template is selected, load it
  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId);

    // Create a temporary form to get the template questions and defaults
    try {
      const res = await fetch('/api/feedback/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateId }),
      });
      const form = await res.json();

      setTitle(form.title || '');
      setDescription(form.description || '');
      setQuestions(form.questions || []);
      setSettings(form.settings || {
        collectName: true,
        collectEmail: true,
        maxResponses: null,
        closesAt: null,
        thankYouMessage: '',
      });

      // We created a draft — save its ID so we can update it instead of creating a new one
      sessionStorage.setItem('draft_form_id', form._id);

      setStep('customize');
    } catch {
      setSnackbar({ open: true, message: 'Failed to load template', severity: 'error' });
    }
  };

  const handleUpdateQuestion = (id: string, updates: Partial<FormQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q._id === id ? { ...q, ...updates } : q))
    );
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q._id !== id);
      return filtered.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  const handleAddQuestion = (type: string, defaultLabel: string) => {
    const newQuestion: FormQuestion = {
      _id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      order: questions.length + 1,
      type,
      label: defaultLabel,
      required: false,
      options: type === 'single_choice' || type === 'multi_choice'
        ? ['Option 1', 'Option 2', 'Option 3']
        : undefined,
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const arr = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= arr.length) return prev;
      [arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]];
      return arr.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  const handleSave = async (activate: boolean = false) => {
    if (!title.trim()) {
      setSnackbar({ open: true, message: 'Please enter a form title', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const draftId = sessionStorage.getItem('draft_form_id');
      const selectedEvent = events.find((e) => e._id === eventId);

      const payload = {
        title,
        description,
        questions,
        settings,
        eventId: eventId || null,
        eventName: selectedEvent?.name || null,
        status: activate ? 'active' : 'draft',
      };

      let res;
      if (draftId) {
        // Update the draft we created earlier
        res = await fetch(`/api/feedback/forms/${draftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        res = await fetch('/api/feedback/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            template: selectedTemplate,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save form');
      }

      const saved = await res.json();
      sessionStorage.removeItem('draft_form_id');

      setSnackbar({
        open: true,
        message: activate ? 'Form is live!' : 'Form saved as draft',
        severity: 'success',
      });

      // Navigate to form detail
      setTimeout(() => router.push(`/forms/${saved._id}`), 500);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save form', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // STEP 1: Template Selection
  // ============================================================================

  if (step === 'template') {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => router.push('/forms')} sx={{ mb: 2 }}>
          Back to Forms
        </Button>

        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Create Feedback Form</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Choose a template to get started. You can customize questions in the next step.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {TEMPLATES.map((tmpl) => (
            <Card
              key={tmpl.id}
              sx={{
                flex: 1,
                border: '2px solid',
                borderColor: 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: mongoColors.green,
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleSelectTemplate(tmpl.id)}
                sx={{ p: 3, height: '100%' }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  {tmpl.icon}
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
                    {tmpl.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tmpl.description}
                  </Typography>
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  // ============================================================================
  // STEP 2: Customize Form
  // ============================================================================

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => setStep('template')} sx={{ mb: 2 }}>
        Change Template
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Customize Form</Typography>
          <Typography color="text.secondary">
            Edit questions, add your own, and configure settings
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => handleSave(false)} disabled={saving}>
            Save Draft
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSave(true)}
            disabled={saving}
            sx={{ bgcolor: mongoColors.darkGreen, '&:hover': { bgcolor: mongoColors.green, color: mongoColors.black } }}
          >
            Save & Activate
          </Button>
        </Stack>
      </Box>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
        {/* Main form editor */}
        <Box sx={{ flex: 2 }}>
          {/* Title & Description */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Form Details</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Form Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Shown to respondents at the top of the form"
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Link to Event (optional)</InputLabel>
                  <Select
                    value={eventId}
                    label="Link to Event (optional)"
                    onChange={(e) => setEventId(e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {events.map((evt) => (
                      <MenuItem key={evt._id} value={evt._id}>{evt.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          {/* Questions */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
            Questions ({questions.length})
          </Typography>

          {questions
            .sort((a, b) => a.order - b.order)
            .map((question, index) => (
              <Paper key={question._id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
                    <Tooltip title="Move up">
                      <IconButton
                        size="small"
                        disabled={index === 0}
                        onClick={() => handleMoveQuestion(index, 'up')}
                      >
                        <DragIndicator fontSize="small" sx={{ transform: 'rotate(90deg)' }} />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: mongoColors.gray[400] }}>
                      {index + 1}
                    </Typography>
                    <Tooltip title="Move down">
                      <IconButton
                        size="small"
                        disabled={index === questions.length - 1}
                        onClick={() => handleMoveQuestion(index, 'down')}
                      >
                        <DragIndicator fontSize="small" sx={{ transform: 'rotate(-90deg)' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip
                        label={QUESTION_TYPE_LABELS[question.type] || question.type}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                      {question.mapsToInsightField && (
                        <Chip
                          label={`maps to: ${question.mapsToInsightField}`}
                          size="small"
                          sx={{ fontSize: '0.65rem', bgcolor: `${mongoColors.green}20` }}
                        />
                      )}
                    </Stack>

                    <TextField
                      value={question.label}
                      onChange={(e) => handleUpdateQuestion(question._id, { label: e.target.value })}
                      fullWidth
                      size="small"
                      variant="standard"
                      sx={{ mb: 1, '& .MuiInput-input': { fontWeight: 600 } }}
                    />

                    <TextField
                      value={question.description || ''}
                      onChange={(e) => handleUpdateQuestion(question._id, { description: e.target.value })}
                      fullWidth
                      size="small"
                      variant="standard"
                      placeholder="Add helper text (optional)"
                      sx={{ mb: 1, '& .MuiInput-input': { fontSize: '0.85rem', color: mongoColors.gray[500] } }}
                    />

                    {/* Options editor for choice-based questions */}
                    {(question.type === 'single_choice' || question.type === 'multi_choice') && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Options:
                        </Typography>
                        {(question.options || []).map((opt, optIndex) => (
                          <Stack key={optIndex} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <TextField
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...(question.options || [])];
                                newOpts[optIndex] = e.target.value;
                                handleUpdateQuestion(question._id, { options: newOpts });
                              }}
                              size="small"
                              variant="outlined"
                              sx={{ flex: 1 }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => {
                                const newOpts = (question.options || []).filter((_, i) => i !== optIndex);
                                handleUpdateQuestion(question._id, { options: newOpts });
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>
                        ))}
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={() => {
                            const newOpts = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
                            handleUpdateQuestion(question._id, { options: newOpts });
                          }}
                        >
                          Add Option
                        </Button>
                      </Box>
                    )}

                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={question.required}
                            onChange={(e) => handleUpdateQuestion(question._id, { required: e.target.checked })}
                          />
                        }
                        label={<Typography variant="caption">Required</Typography>}
                      />
                    </Stack>
                  </Box>

                  <Tooltip title="Remove question">
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveQuestion(question._id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            ))}

          {/* Add question buttons */}
          <Card sx={{ mt: 2, mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Add Question
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {ADDABLE_QUESTION_TYPES.map((qt) => (
                  <Chip
                    key={qt.type}
                    label={qt.label}
                    icon={<Add sx={{ fontSize: 16 }} />}
                    onClick={() => handleAddQuestion(qt.type, qt.defaultLabel)}
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: `${mongoColors.green}15` },
                    }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Settings sidebar */}
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Settings</Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.collectName}
                    onChange={(e) => setSettings({ ...settings, collectName: e.target.checked })}
                  />
                }
                label="Collect respondent name"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.collectEmail}
                    onChange={(e) => setSettings({ ...settings, collectEmail: e.target.checked })}
                  />
                }
                label="Collect respondent email"
              />

              <Divider sx={{ my: 2 }} />

              <TextField
                label="Max Responses"
                type="number"
                value={settings.maxResponses || ''}
                onChange={(e) => setSettings({ ...settings, maxResponses: e.target.value ? parseInt(e.target.value) : null })}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
                helperText="Leave empty for unlimited"
              />

              <TextField
                label="Close Date"
                type="datetime-local"
                value={settings.closesAt ? settings.closesAt.slice(0, 16) : ''}
                onChange={(e) => setSettings({ ...settings, closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Form auto-closes at this time"
              />

              <Divider sx={{ my: 2 }} />

              <TextField
                label="Thank You Message"
                value={settings.thankYouMessage || ''}
                onChange={(e) => setSettings({ ...settings, thankYouMessage: e.target.value })}
                fullWidth
                size="small"
                multiline
                rows={3}
                placeholder="Shown after submission"
              />
            </CardContent>
          </Card>
        </Box>
      </Stack>

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
