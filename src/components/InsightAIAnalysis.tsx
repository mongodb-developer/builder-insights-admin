'use client';

/**
 * AI Analysis Panel for Insights
 * 
 * Shows AI-generated summary, interpretation, and suggested actions.
 * Can trigger analysis if not yet generated.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Stack,
  Skeleton,
  Alert,
  Collapse,
  IconButton,
  Divider,
  LinearProgress,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as ActionIcon,
  Psychology as ThinkIcon,
  LocalOffer as TagIcon,
  Speed as ConfidenceIcon,
  PriorityHigh as PriorityIcon,
  SentimentSatisfied as SentimentIcon,
  Inventory as ProductIcon,
} from '@mui/icons-material';
import { InsightAIAnalysis as AIAnalysisType } from '@/types';
import { mongoColors } from '@/theme';

interface Props {
  insightId: string;
  initialAnalysis?: AIAnalysisType | null;
  compact?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#EF4444',
  High: '#F97316',
  Medium: '#FFC010',
  Low: '#14B8A6',
};

export default function InsightAIAnalysis({ insightId, initialAnalysis, compact = false }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysisType | null>(initialAnalysis || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const [generatedIn, setGeneratedIn] = useState<number | null>(null);

  // Fetch existing analysis on mount if not provided
  useEffect(() => {
    if (!initialAnalysis) {
      fetchAnalysis();
    }
  }, [insightId, initialAnalysis]);

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/insights/${insightId}/analyze`);
      const data = await res.json();
      if (data.hasAnalysis) {
        setAnalysis(data.analysis);
      }
    } catch (err) {
      // Silent fail - just means no analysis yet
    }
  }, [insightId]);

  const generateAnalysis = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/insights/${insightId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate analysis');
      }
      
      setAnalysis(data.analysis);
      setTokensUsed(data.tokensUsed || null);
      setGeneratedIn(data.generatedIn || null);
      setExpanded(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [insightId]);

  // No analysis yet - show generate button
  if (!analysis && !loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: `1px dashed ${mongoColors.gray[300]}`,
          borderRadius: 2,
          textAlign: 'center',
          bgcolor: 'background.default',
        }}
      >
        <AIIcon sx={{ fontSize: 40, color: mongoColors.gray[400], mb: 1 }} />
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No AI analysis yet
        </Typography>
        <Button
          variant="contained"
          startIcon={<AIIcon />}
          onClick={() => generateAnalysis()}
          sx={{ mt: 1 }}
        >
          Generate AI Analysis
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: `1px solid ${mongoColors.green}30`, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon sx={{ color: mongoColors.green }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Analyzing with AI...
            </Typography>
          </Box>
          <LinearProgress sx={{ borderRadius: 1 }} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
        </Stack>
      </Paper>
    );
  }

  // Analysis ready
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${mongoColors.green}30`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: `${mongoColors.green}10`,
          borderBottom: `1px solid ${mongoColors.green}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon sx={{ color: mongoColors.darkGreen }} />
          <Typography variant="subtitle1" fontWeight={600}>
            AI Analysis
          </Typography>
          {analysis?.confidence && (
            <Tooltip title={`${Math.round(analysis.confidence * 100)}% confidence`}>
              <Chip
                icon={<ConfidenceIcon sx={{ fontSize: 14 }} />}
                label={`${Math.round(analysis.confidence * 100)}%`}
                size="small"
                sx={{ height: 22, fontSize: 11 }}
              />
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Regenerate analysis">
            <IconButton size="small" onClick={() => generateAnalysis(true)} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Summary */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Summary
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {analysis?.summary}
            </Typography>
          </Box>

          {/* Interpretation */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <ThinkIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                Interpretation
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              {analysis?.interpretation}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Suggested Actions */}
          {analysis?.suggestedActions && analysis.suggestedActions.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Suggested Actions
              </Typography>
              <List dense disablePadding>
                {analysis.suggestedActions.map((action, i) => (
                  <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ActionIcon sx={{ fontSize: 18, color: mongoColors.green }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={action} 
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Themes */}
          {analysis?.themes && analysis.themes.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <TagIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Themes
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {analysis.themes.map((theme, i) => (
                  <Chip
                    key={i}
                    label={theme}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Priority & Sentiment Row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}>
            {/* Priority Suggestion */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <PriorityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Suggested Priority
                </Typography>
              </Box>
              <Chip
                label={analysis?.prioritySuggestion}
                size="small"
                sx={{
                  bgcolor: PRIORITY_COLORS[analysis?.prioritySuggestion || 'Medium'] + '20',
                  color: PRIORITY_COLORS[analysis?.prioritySuggestion || 'Medium'],
                  fontWeight: 600,
                }}
              />
            </Box>

            {/* Sentiment Reason */}
            <Box sx={{ flex: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <SentimentIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Sentiment Analysis
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {analysis?.sentimentReason}
              </Typography>
            </Box>
          </Stack>

          {/* Related Product Areas */}
          {analysis?.relatedProductAreas && analysis.relatedProductAreas.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <ProductIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Additional Product Areas Mentioned
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {analysis.relatedProductAreas.map((area, i) => (
                  <Chip
                    key={i}
                    label={area}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${mongoColors.gray[200]}` }}>
            <Typography variant="caption" color="text.disabled">
              Analyzed {analysis?.analyzedAt ? new Date(analysis.analyzedAt).toLocaleString() : 'just now'}
              {' • '}Model: {analysis?.model || 'gpt-4o-mini'}
              {tokensUsed && ` • ${tokensUsed} tokens`}
              {generatedIn && ` • ${generatedIn}ms`}
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}
