'use client';

import {
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AddLink, DeleteOutline, OpenInNew } from '@mui/icons-material';
import { mongoColors } from '@/theme';
import type { ProgramReference } from '@/types/program';
import { PROGRAM_REFERENCE_TYPE_LABELS } from '@/types/program';

interface ProgramReferenceListProps {
  references: ProgramReference[];
  canEdit: boolean;
  onChange: (references: ProgramReference[]) => void;
  onAdd: () => void;
}

export default function ProgramReferenceList({ references, canEdit, onChange, onAdd }: ProgramReferenceListProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AddLink sx={{ color: mongoColors.darkGreen, fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Linked References</Typography>
          <Chip label={`${references.length} linked`} size="small" variant="outlined" />
        </Stack>
        {canEdit && (
          <Button size="small" startIcon={<AddLink />} onClick={onAdd}>
            Add Reference
          </Button>
        )}
      </Stack>

      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
        {references.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No references yet. Link GitHub issues, PRs, docs, Slack threads, or any supporting artifact.
          </Typography>
        )}

        {references.map((reference) => (
          <Box key={reference.id} sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha(mongoColors.black, 0.03), border: `1px solid ${mongoColors.gray[200]}` }}>
            {canEdit ? (
              <Stack spacing={1.25}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    select
                    size="small"
                    value={reference.type}
                    onChange={(event) =>
                      onChange(references.map((item) => item.id === reference.id ? { ...item, type: event.target.value as ProgramReference['type'] } : item))
                    }
                    sx={{ minWidth: 150 }}
                  >
                    {Object.entries(PROGRAM_REFERENCE_TYPE_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    size="small"
                    label="Label"
                    value={reference.label}
                    onChange={(event) =>
                      onChange(references.map((item) => item.id === reference.id ? { ...item, label: event.target.value } : item))
                    }
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onChange(references.filter((item) => item.id !== reference.id))}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>
                <TextField
                  fullWidth
                  size="small"
                  label="URL"
                  value={reference.url}
                  onChange={(event) =>
                    onChange(references.map((item) => item.id === reference.id ? { ...item, url: event.target.value } : item))
                  }
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Notes"
                  value={reference.notes}
                  onChange={(event) =>
                    onChange(references.map((item) => item.id === reference.id ? { ...item, notes: event.target.value } : item))
                  }
                />
              </Stack>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.25}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Chip label={PROGRAM_REFERENCE_TYPE_LABELS[reference.type]} size="small" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{reference.label}</Typography>
                  </Stack>
                  {reference.url ? (
                    <Link href={reference.url} target="_blank" rel="noreferrer" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      Open link <OpenInNew sx={{ fontSize: 14 }} />
                    </Link>
                  ) : (
                    <Typography variant="caption" color="text.secondary">No URL provided</Typography>
                  )}
                  {reference.notes && <Typography variant="body2" sx={{ mt: 0.75 }}>{reference.notes}</Typography>}
                </Box>
              </Stack>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
