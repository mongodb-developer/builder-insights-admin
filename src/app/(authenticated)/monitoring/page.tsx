'use client';

/**
 * App Monitoring Dashboard
 *
 * Four-tab observability view for the Builder Insights mobile app:
 *   Overview  — headline KPIs, activity timeline, version/platform split
 *   User Map  — geographic distribution of active users (world map)
 *   Features  — screen views and feature usage breakdown
 *   App Health — API success rates, latency, error breakdown
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Monitor as MonitoringIcon,
  Public as GlobeIcon,
  Person as PersonIcon,
  TrendingUp as TrendingIcon,
  Speed as SpeedIcon,
  TouchApp as TouchIcon,
  Visibility as ViewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
  Devices as DevicesIcon,
  Apple as AppleIcon,
  Android as AndroidIcon,
  Api as ApiIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { mongoColors } from '@/theme';

// ====================================================================
// TYPES
// ====================================================================

interface OverviewData {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  appVersions: { version: string; count: number }[];
  platformSplit: { platform: string; count: number }[];
  activityTimeline: { hour: string; count: number }[];
}

interface UserLocation {
  userId: string;
  userName: string;
  lastLocation: {
    country: string;
    countryCode: string;
    city: string;
    lat: number;
    lon: number;
  };
  lastSeen: string;
  platform: string;
  appVersion: string;
  pingCount: number;
}

interface CountryStat {
  _id: string;
  country: string;
  count: number;
  users: { name: string; city: string; platform: string }[];
}

interface UsersData {
  activeUsers: UserLocation[];
  countryStats: CountryStat[];
  totalPings: number;
}

interface FeaturesData {
  screenViews: { screen: string; views: number; uniqueUsers: number }[];
  featureUsage: { feature: string; count: number; uniqueUsers: number }[];
  topFeaturesByUser: { userName: string; feature: string; count: number }[];
}

interface HealthData {
  apiOverview: {
    totalCalls: number;
    successCount: number;
    failCount: number;
    avgLatency: number;
    p95Latency: number[];
  };
  endpointStats: {
    method: string;
    endpoint: string;
    calls: number;
    failures: number;
    successRate: number;
    avgLatency: number;
  }[];
  errorBreakdown: {
    endpoint: string;
    status: number;
    count: number;
    lastSeen: string;
    sampleError: string;
  }[];
  latencyTimeline: {
    hour: string;
    avgLatency: number;
    calls: number;
    failures: number;
  }[];
  syncEvents: { event: string; count: number }[];
}

interface DashboardData {
  overview?: OverviewData;
  users?: UsersData;
  features?: FeaturesData;
  health?: HealthData;
  since: string;
  hours: number;
}

// ====================================================================
// CONSTANTS
// ====================================================================

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const CHART_COLORS = [mongoColors.green, '#016BF8', '#FFC010', '#DB3030', mongoColors.darkGreen, '#8B5CF6'];
const PLATFORM_COLORS: Record<string, string> = { ios: '#007AFF', android: '#3DDC84' };

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

const formatTimeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatHour = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getFlagEmoji = (cc: string) => {
  if (!cc) return '';
  const codePoints = cc.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const friendlyFeatureName = (raw: string) =>
  raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ====================================================================
// STAT CARD
// ====================================================================

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color?: string }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: color || 'primary.main' }}>{icon}</Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}

// ====================================================================
// WORLD MAP (memoized)
// ====================================================================

const MonitoringMap = memo(function MonitoringMap({ users }: { users: UserLocation[] }) {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 130, center: [0, 30] }}
      style={{ width: '100%', height: '100%' }}
    >
      <ZoomableGroup>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#E8E8E8"
                stroke="#BDBDBD"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { fill: '#D5D5D5', outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
        {users.map((u) => {
          if (!u.lastLocation?.lat || !u.lastLocation?.lon) return null;
          const c = PLATFORM_COLORS[u.platform] || mongoColors.green;
          return (
            <Marker key={u.userId} coordinates={[u.lastLocation.lon, u.lastLocation.lat]}>
              <circle r={6} fill={c} fillOpacity={0.35} stroke={c} strokeWidth={2} />
              <circle r={3} fill={c} />
            </Marker>
          );
        })}
      </ZoomableGroup>
    </ComposableMap>
  );
});

// ====================================================================
// TAB PANELS
// ====================================================================

function OverviewTab({ data }: { data: OverviewData }) {
  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<PersonIcon />} value={data.uniqueUsers} label="Active Users" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<DevicesIcon />} value={data.uniqueSessions} label="Sessions" color={mongoColors.darkGreen} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<TrendingIcon />} value={data.totalEvents.toLocaleString()} label="Telemetry Events" color="#016BF8" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<SpeedIcon />} value={data.appVersions[0]?.version || '—'} label="Top App Version" color="#FFC010" />
        </Grid>
      </Grid>

      {/* Activity Timeline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Activity Timeline</Typography>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={data.activityTimeline}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={mongoColors.green} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={mongoColors.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDEB" />
                <XAxis dataKey="hour" tickFormatter={formatHour} fontSize={11} />
                <YAxis fontSize={11} />
                <RechartsTooltip labelFormatter={(l) => new Date(l).toLocaleString()} />
                <Area type="monotone" dataKey="count" stroke={mongoColors.green} fill="url(#colorEvents)" strokeWidth={2} name="Events" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Platform Split */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Platform Distribution</Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.platformSplit} dataKey="count" nameKey="platform" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {data.platformSplit.map((entry, i) => (
                        <Cell key={i} fill={PLATFORM_COLORS[entry.platform] || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* App Versions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>App Versions</Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={data.appVersions} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EDEB" />
                    <XAxis type="number" fontSize={11} />
                    <YAxis dataKey="version" type="category" width={60} fontSize={11} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill={mongoColors.darkGreen} radius={[0, 4, 4, 0]} name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

function UserMapTab({ data }: { data: UsersData }) {
  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<PersonIcon />} value={data.activeUsers.length} label="Active Users" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<GlobeIcon />} value={data.countryStats.length} label="Countries" color={mongoColors.darkGreen} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<TrendingIcon />} value={data.totalPings} label="Total Pings" color="#016BF8" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<DevicesIcon />}
            value={`${data.activeUsers.filter((u) => u.platform === 'ios').length} / ${data.activeUsers.filter((u) => u.platform === 'android').length}`}
            label="iOS / Android"
            color="#FFC010"
          />
        </Grid>
      </Grid>

      {/* Map */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Live User Map</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#007AFF' }} />
                <Typography variant="caption">iOS</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3DDC84' }} />
                <Typography variant="caption">Android</Typography>
              </Box>
            </Box>
          </Box>
          <Paper variant="outlined" sx={{ height: 380, bgcolor: '#F5F9FF', overflow: 'hidden' }}>
            {data.activeUsers.length > 0 ? (
              <MonitoringMap users={data.activeUsers} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                <GlobeIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                <Typography>No active users in this time range</Typography>
              </Box>
            )}
          </Paper>
        </CardContent>
      </Card>

      {/* Country list + Recent users */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 400, overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>By Country</Typography>
              <List dense>
                {data.countryStats.map((s, i) => (
                  <React.Fragment key={s._id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'transparent', fontSize: '1.5rem' }}>{getFlagEmoji(s._id)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={s.country} secondary={s.users.slice(0, 3).map((u) => u.city).filter(Boolean).join(', ')} />
                      <Chip label={s.count} size="small" color={i === 0 ? 'primary' : 'default'} />
                    </ListItem>
                    {i < data.countryStats.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                {data.countryStats.length === 0 && (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No data yet</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 400, overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Recent Activity</Typography>
              <List dense>
                {data.activeUsers
                  .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
                  .slice(0, 15)
                  .map((u, i) => (
                    <React.Fragment key={u.userId}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                            {u.userName?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {u.userName || 'Anonymous'}
                              {u.platform === 'ios' ? <AppleIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <AndroidIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                            </Box>
                          }
                          secondary={
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationIcon sx={{ fontSize: 12 }} />
                              {u.lastLocation?.city}, {u.lastLocation?.country}
                            </Box>
                          }
                        />
                        <Typography variant="caption" color="text.secondary">{formatTimeAgo(u.lastSeen)}</Typography>
                      </ListItem>
                      {i < Math.min(data.activeUsers.length, 15) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                {data.activeUsers.length === 0 && (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No recent activity</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

function FeaturesTab({ data }: { data: FeaturesData }) {
  return (
    <>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Screen Views Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                <ViewIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom' }} />
                Screen Views
              </Typography>
              {data.screenViews.length > 0 ? (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.screenViews} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EDEB" />
                      <XAxis type="number" fontSize={11} />
                      <YAxis dataKey="screen" type="category" width={130} fontSize={11} tickFormatter={(v: string) => v.replace('Screen', '')} />
                      <RechartsTooltip />
                      <Bar dataKey="views" fill={mongoColors.green} radius={[0, 4, 4, 0]} name="Views" />
                      <Bar dataKey="uniqueUsers" fill={mongoColors.darkGreen} radius={[0, 4, 4, 0]} name="Unique Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>No screen view data yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Usage Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                <TouchIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom' }} />
                Feature Usage
              </Typography>
              {data.featureUsage.length > 0 ? (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.featureUsage.slice(0, 12)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EDEB" />
                      <XAxis type="number" fontSize={11} />
                      <YAxis dataKey="feature" type="category" width={140} fontSize={10} tickFormatter={friendlyFeatureName} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#016BF8" radius={[0, 4, 4, 0]} name="Uses" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>No feature usage data yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Feature Detail Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Feature Detail</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Feature</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Total Uses</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Unique Users</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Avg per User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.featureUsage.map((f) => (
                  <TableRow key={f.feature} hover>
                    <TableCell>{friendlyFeatureName(f.feature)}</TableCell>
                    <TableCell align="right">{f.count}</TableCell>
                    <TableCell align="right">{f.uniqueUsers}</TableCell>
                    <TableCell align="right">{f.uniqueUsers > 0 ? (f.count / f.uniqueUsers).toFixed(1) : '—'}</TableCell>
                  </TableRow>
                ))}
                {data.featureUsage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      No feature data collected yet. Data will appear once users interact with the app.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </>
  );
}

function HealthTab({ data }: { data: HealthData }) {
  const overview = data.apiOverview;
  const successRate = overview.totalCalls > 0
    ? ((overview.successCount / overview.totalCalls) * 100).toFixed(1)
    : '—';

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<ApiIcon />} value={overview.totalCalls.toLocaleString()} label="API Calls" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SuccessIcon sx={{ color: Number(successRate) >= 99 ? mongoColors.green : Number(successRate) >= 95 ? '#FFC010' : '#DB3030' }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{successRate}%</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Success Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<SpeedIcon />} value={`${Math.round(overview.avgLatency || 0)}ms`} label="Avg Latency" color="#016BF8" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<ErrorIcon />}
            value={overview.failCount}
            label="Failed Calls"
            color={overview.failCount > 0 ? '#DB3030' : mongoColors.green}
          />
        </Grid>
      </Grid>

      {/* Latency + Error Timeline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>API Latency &amp; Errors Over Time</Typography>
          {data.latencyTimeline.length > 0 ? (
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={data.latencyTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDEB" />
                  <XAxis dataKey="hour" tickFormatter={formatHour} fontSize={11} />
                  <YAxis yAxisId="left" fontSize={11} label={{ value: 'ms', position: 'insideTopLeft', offset: -5 }} />
                  <YAxis yAxisId="right" orientation="right" fontSize={11} label={{ value: 'count', position: 'insideTopRight', offset: -5 }} />
                  <RechartsTooltip labelFormatter={(l) => new Date(l).toLocaleString()} />
                  <Line yAxisId="left" type="monotone" dataKey="avgLatency" stroke="#016BF8" strokeWidth={2} dot={false} name="Avg Latency (ms)" />
                  <Line yAxisId="right" type="monotone" dataKey="failures" stroke="#DB3030" strokeWidth={2} dot={false} name="Failures" />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>No API data yet</Typography>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Endpoint Stats */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Endpoint Performance</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Endpoint</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Calls</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Success</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Avg ms</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.endpointStats.map((ep, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Chip label={ep.method} size="small" sx={{ mr: 1, fontFamily: 'monospace', fontSize: 11 }} />
                          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>{ep.endpoint}</Typography>
                        </TableCell>
                        <TableCell align="right">{ep.calls}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={ep.successRate}
                              sx={{
                                width: 60,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#E8EDEB',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: ep.successRate >= 99 ? mongoColors.green : ep.successRate >= 95 ? '#FFC010' : '#DB3030',
                                },
                              }}
                            />
                            <Typography variant="caption">{ep.successRate.toFixed(0)}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{ep.avgLatency}ms</TableCell>
                      </TableRow>
                    ))}
                    {data.endpointStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No API calls recorded yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Breakdown */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                <ErrorIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom', color: '#DB3030' }} />
                Recent Errors
              </Typography>
              {data.errorBreakdown.length > 0 ? (
                <List dense>
                  {data.errorBreakdown.slice(0, 10).map((err, i) => (
                    <React.Fragment key={i}>
                      <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={err.status || 'ERR'} size="small" color="error" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{err.endpoint}</Typography>
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {err.count}x &middot; Last: {formatTimeAgo(err.lastSeen)}
                              {err.sampleError && <> &middot; {String(err.sampleError).slice(0, 80)}</>}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {i < Math.min(data.errorBreakdown.length, 10) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <SuccessIcon sx={{ fontSize: 48, color: mongoColors.green, opacity: 0.5, mb: 1 }} />
                  <Typography color="text.secondary">No errors in this time range</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

// ====================================================================
// MAIN PAGE
// ====================================================================

export default function MonitoringPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24');
  const [activeTab, setActiveTab] = useState(0);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Page-level admin check (defense-in-depth; middleware also blocks non-admins)
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const admin = data?.isAdmin === true || data?.role === 'admin';
        setIsAdmin(admin);
      })
      .catch(() => setIsAdmin(false));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/dashboard?hours=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch monitoring data');
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load monitoring data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isAdmin === null || (loading && !data)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAdmin === false) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Admin access required to view this page.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MonitoringIcon color="primary" /> App Monitoring
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time observability for Builder Insights mobile app
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, v) => v && setTimeRange(v)}
          size="small"
        >
          <ToggleButton value="1">1h</ToggleButton>
          <ToggleButton value="6">6h</ToggleButton>
          <ToggleButton value="24">24h</ToggleButton>
          <ToggleButton value="168">7d</ToggleButton>
          <ToggleButton value="720">30d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
          <Tab label="Overview" icon={<TrendingIcon />} iconPosition="start" />
          <Tab label="User Map" icon={<GlobeIcon />} iconPosition="start" />
          <Tab label="Features" icon={<TouchIcon />} iconPosition="start" />
          <Tab label="App Health" icon={<SpeedIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab content */}
      {activeTab === 0 && data?.overview && <OverviewTab data={data.overview} />}
      {activeTab === 1 && data?.users && <UserMapTab data={data.users} />}
      {activeTab === 2 && data?.features && <FeaturesTab data={data.features} />}
      {activeTab === 3 && data?.health && <HealthTab data={data.health} />}

      {/* Empty state when a section has no data */}
      {activeTab === 0 && !data?.overview && !loading && (
        <Alert severity="info">No overview data available for this time range. Telemetry events will appear here once users interact with the app.</Alert>
      )}
      {activeTab === 1 && !data?.users && !loading && (
        <Alert severity="info">No user location data available. Users will appear on the map once they open the app.</Alert>
      )}
      {activeTab === 2 && !data?.features && !loading && (
        <Alert severity="info">No feature usage data available yet. Data will populate as users navigate the app.</Alert>
      )}
      {activeTab === 3 && !data?.health && !loading && (
        <Alert severity="info">No API health data available yet. Metrics will appear after the app makes API calls.</Alert>
      )}
    </Box>
  );
}
