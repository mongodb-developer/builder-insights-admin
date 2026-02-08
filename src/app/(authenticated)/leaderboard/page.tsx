'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  LinearProgress,
  Stack,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  SentimentSatisfied,
  SentimentDissatisfied,
  EmojiEvents,
  Lightbulb,
  BugReport,
  Star,
} from '@mui/icons-material';
import PageHelp from '@/components/help/PageHelp';
import { useHelp } from '@/components/help';

interface Stats {
  byType: Record<string, number>;
  bySentiment: Record<string, number>;
  byPriority: Record<string, number>;
  byProductArea: Record<string, number>;
}

interface LeaderboardEntry {
  advocateId: string;
  advocateName: string;
  totalInsights: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  criticalCount: number;
  highCount: number;
  featureRequests: number;
  bugReports: number;
  useCases: number;
  eventCount: number;
  impactScore: number;
  lastCapturedAt: string;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  period: string;
  totalInsights: number;
  totalAdvocates: number;
}

// Rank badge component
function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; text: string; icon: string }> = {
    1: { bg: '#FFD700', text: '#000', icon: '🥇' },
    2: { bg: '#C0C0C0', text: '#000', icon: '🥈' },
    3: { bg: '#CD7F32', text: '#fff', icon: '🥉' },
  };
  const style = colors[rank] || { bg: 'transparent', text: 'inherit', icon: '' };

  if (rank <= 3) {
    return (
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: style.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1rem',
        }}
      >
        {style.icon}
      </Box>
    );
  }
  return (
    <Typography variant="body2" sx={{ width: 32, textAlign: 'center', fontWeight: 600 }}>
      #{rank}
    </Typography>
  );
}

// Get initials for avatar
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate consistent color from name
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#00ED64', '#016BF8', '#00684A', '#5C6BC0', '#26A69A', '#7E57C2', '#EF5350'];
  return colors[Math.abs(hash) % colors.length];
}

export default function LeaderboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('all');

  useEffect(() => {
    async function loadStats() {
      try {
        const [statsRes, leaderboardRes] = await Promise.all([
          fetch('/api/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stats' }),
          }),
          fetch(`/api/insights/leaderboard?period=${period}&limit=10`),
        ]);
        const statsData = await statsRes.json();
        const leaderboardData = await leaderboardRes.json();
        setStats(statsData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [period]);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Leaderboard</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={32} />
                  <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const hasData = stats && Object.values(stats).some((v) => Object.keys(v).length > 0);

  if (!hasData) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Leaderboard</Typography>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Data Yet
            </Typography>
            <Typography color="text.secondary">
              Leaderboard will populate as insights are captured from the mobile app.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const totalInsights = Object.values(stats.byType).reduce((a, b) => a + b, 0);
  const maxProductArea = Math.max(...Object.values(stats.byProductArea), 1);

  const { openHelp } = useHelp();

  return (
    <Box>
      <PageHelp page="leaderboard" onOpenDrawer={openHelp} />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Leaderboard</Typography>
        <Typography color="text.secondary">
          Insights breakdown and trends
        </Typography>
      </Box>

      {/* Leaderboard Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents sx={{ color: '#FFD700' }} />
              <Typography variant="h6">Advocate Leaderboard</Typography>
            </Box>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, v) => v && setPeriod(v)}
              size="small"
            >
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="year">Year</ToggleButton>
              <ToggleButton value="all">All Time</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {leaderboard?.leaderboard.length ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50 }}>Rank</TableCell>
                    <TableCell>Advocate</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Total Insights Captured">
                        <Lightbulb fontSize="small" />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Feature Requests">
                        <Star fontSize="small" />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Bug Reports">
                        <BugReport fontSize="small" />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">Events</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Impact Score (weighted by priority & type)">
                        <span>Impact</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>Sentiment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboard.leaderboard.map((entry, idx) => (
                    <TableRow
                      key={entry.advocateId}
                      sx={{
                        bgcolor: idx === 0 ? 'rgba(255, 215, 0, 0.08)' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <TableCell>
                        <RankBadge rank={idx + 1} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              bgcolor: stringToColor(entry.advocateName),
                              width: 36,
                              height: 36,
                              fontSize: '0.875rem',
                            }}
                          >
                            {getInitials(entry.advocateName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {entry.advocateName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Last active: {new Date(entry.lastCapturedAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {entry.totalInsights}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={entry.featureRequests} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={entry.bugReports} size="small" color="error" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{entry.eventCount}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={entry.impactScore}
                          size="small"
                          sx={{
                            bgcolor: '#00ED64',
                            color: '#001E2B',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={`Positive: ${entry.positiveCount}`}>
                            <Chip
                              icon={<SentimentSatisfied sx={{ fontSize: 14 }} />}
                              label={entry.positiveCount}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ minWidth: 50 }}
                            />
                          </Tooltip>
                          <Tooltip title={`Negative: ${entry.negativeCount}`}>
                            <Chip
                              icon={<SentimentDissatisfied sx={{ fontSize: 14 }} />}
                              label={entry.negativeCount}
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ minWidth: 50 }}
                            />
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No insights captured yet. The leaderboard will populate as advocates capture insights.
            </Typography>
          )}

          {leaderboard && leaderboard.totalAdvocates > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={4} justifyContent="center">
                <Typography variant="body2" color="text.secondary">
                  <strong>{leaderboard.totalAdvocates}</strong> advocates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>{leaderboard.totalInsights}</strong> total insights
                </Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Sentiment Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sentiment Distribution
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {['Positive', 'Neutral', 'Negative'].map((sentiment) => {
                  const count = stats.bySentiment[sentiment] || 0;
                  const pct = totalInsights > 0 ? (count / totalInsights) * 100 : 0;
                  return (
                    <Box key={sentiment}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {sentiment === 'Positive' ? (
                            <SentimentSatisfied color="success" fontSize="small" />
                          ) : sentiment === 'Negative' ? (
                            <SentimentDissatisfied color="error" fontSize="small" />
                          ) : (
                            <TrendingUp color="action" fontSize="small" />
                          )}
                          <Typography variant="body2">{sentiment}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {count} ({pct.toFixed(0)}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        color={
                          sentiment === 'Positive'
                            ? 'success'
                            : sentiment === 'Negative'
                            ? 'error'
                            : 'inherit'
                        }
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Type Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Insight Types
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {Object.entries(stats.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const pct = totalInsights > 0 ? (count / totalInsights) * 100 : 0;
                    return (
                      <Box key={type}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{type}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {count} ({pct.toFixed(0)}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    );
                  })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Priority Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Priority Breakdown
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
                {['Critical', 'High', 'Medium', 'Low'].map((priority) => {
                  const count = stats.byPriority[priority] || 0;
                  const colorMap: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
                    Critical: 'error',
                    High: 'warning',
                    Medium: 'info',
                    Low: 'default',
                  };
                  return (
                    <Chip
                      key={priority}
                      label={`${priority}: ${count}`}
                      color={colorMap[priority]}
                      sx={{ mb: 1 }}
                    />
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Product Areas */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Product Areas
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {Object.entries(stats.byProductArea)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([area, count]) => (
                    <Box key={area}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{area}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {count}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(count / maxProductArea) * 100}
                        color="primary"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
