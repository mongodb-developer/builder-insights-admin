'use client';

import { useState } from 'react';
import {
  Fab,
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
  Typography,
  Box,
  Snackbar,
  Alert,
  Tooltip,
  Zoom,
} from '@mui/material';
import { BugReport as BugReportIcon, Send } from '@mui/icons-material';

type BugPriority = 'low' | 'medium' | 'high' | 'critical';

export default function BugReportFab() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [priority, setPriority] = useState<BugPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleOpen = () => setOpen(true);
  
  const handleClose = () => {
    setOpen(false);
    // Reset form after close animation
    setTimeout(() => {
      setTitle('');
      setDescription('');
      setSteps('');
      setPriority('medium');
    }, 200);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setSnackbar({ open: true, message: 'Please enter a title', severity: 'error' });
      return;
    }
    if (!description.trim()) {
      setSnackbar({ open: true, message: 'Please describe the bug', severity: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          steps: steps.trim() || undefined,
          priority,
          reportedBy: 'Web Admin User',
          deviceInfo: `${navigator.userAgent.slice(0, 100)}`,
          appVersion: 'Admin Web',
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      setSnackbar({ open: true, message: 'Bug report submitted! Thank you.', severity: 'success' });
      handleClose();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to submit bug report', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Tooltip title="Report a Bug" placement="left" TransitionComponent={Zoom}>
        <Fab
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            bgcolor: 'grey.700',
            color: 'white',
            '&:hover': {
              bgcolor: 'grey.600',
            },
          }}
        >
          <BugReportIcon />
        </Fab>
      </Tooltip>

      {/* Bug Report Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <BugReportIcon color="error" />
            <Typography variant="h6">Report a Bug</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found an issue? Let us know and we'll fix it. Include as much detail as possible.
              </Typography>
            </Box>

            <TextField
              label="Bug Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect to happen?"
              multiline
              rows={4}
              fullWidth
              required
            />

            <TextField
              label="Steps to Reproduce (optional)"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
              multiline
              rows={3}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priority}
                label="Priority"
                onChange={(e) => setPriority(e.target.value as BugPriority)}
              >
                <MenuItem value="low">Low - Minor issue</MenuItem>
                <MenuItem value="medium">Medium - Affects workflow</MenuItem>
                <MenuItem value="high">High - Major problem</MenuItem>
                <MenuItem value="critical">Critical - App unusable</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={<Send />}
          >
            {submitting ? 'Submitting...' : 'Submit Bug Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
    </>
  );
}
