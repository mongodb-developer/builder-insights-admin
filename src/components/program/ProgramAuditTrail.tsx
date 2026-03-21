'use client';

import { useMemo, useState } from 'react';
import {
  alpha,
  Box,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { ExpandLess, ExpandMore, History } from '@mui/icons-material';
import { mongoColors } from '@/theme';
import type { ProgramAudit } from '@/types/program';

interface ProgramAuditTrailProps {
  audit: ProgramAudit;
  title?: string;
}

export default function ProgramAuditTrail({ audit, title = 'Activity Timeline' }: ProgramAuditTrailProps) {
  const [expanded, setExpanded] = useState(false);

  const activity = useMemo(() => audit.activity.slice(0, 8), [audit.activity]);

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <History sx={{ color: mongoColors.darkGreen, fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Chip label={`Updated ${new Date(audit.updatedAt).toLocaleString()}`} size="small" variant="outlined" />
        </Stack>
        <IconButton size="small" onClick={() => setExpanded((value) => !value)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Created by {audit.createdBy} on {new Date(audit.createdAt).toLocaleString()} · Last updated by {audit.updatedBy}
          </Typography>

          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {activity.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: alpha(mongoColors.black, 0.03),
                  border: `1px solid ${mongoColors.gray[200]}`,
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.summary}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.actorName} · {entry.actorEmail}
                    </Typography>
                  </Box>
                  <Chip label={new Date(entry.createdAt).toLocaleString()} size="small" sx={{ width: 'fit-content' }} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
