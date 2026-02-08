'use client';

/**
 * World Map - Active Users Dashboard
 * 
 * Shows where DevRel Insights users are around the world.
 */

import React, { useState, useEffect, memo } from 'react';
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
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Public as GlobeIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingIcon,
  LocationOn as LocationIcon,
  Android as AndroidIcon,
  Apple as AppleIcon,
} from '@mui/icons-material';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import PageHelp from '@/components/help/PageHelp';
import { useHelp } from '@/components/help';

// World map TopoJSON
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

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
  pingCount: number;
}

interface CountryStat {
  _id: string;
  country: string;
  count: number;
  users: { name: string; city: string }[];
}

interface AnalyticsData {
  activeUsers: UserLocation[];
  countryStats: CountryStat[];
  totalPings: number;
  since: string;
  hours: number;
}

// Country flag emoji from country code
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Memoized map component for performance
const WorldMapChart = memo(function WorldMapChart({ 
  users, 
  onSelectUser 
}: { 
  users: UserLocation[]; 
  onSelectUser: (user: UserLocation | null) => void;
}) {
  const [hoveredUser, setHoveredUser] = useState<UserLocation | null>(null);

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{
        scale: 130,
        center: [0, 30],
      }}
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

        {/* User markers */}
        {users.map((user) => {
          if (!user.lastLocation?.lat || !user.lastLocation?.lon) return null;
          
          const isHovered = hoveredUser?.userId === user.userId;
          
          return (
            <Marker
              key={user.userId}
              coordinates={[user.lastLocation.lon, user.lastLocation.lat]}
              onMouseEnter={() => setHoveredUser(user)}
              onMouseLeave={() => setHoveredUser(null)}
              onClick={() => onSelectUser(user)}
            >
              {/* Pulse animation for recent users */}
              <circle
                r={isHovered ? 12 : 8}
                fill={user.platform === 'ios' ? '#007AFF' : '#3DDC84'}
                fillOpacity={0.3}
                stroke={user.platform === 'ios' ? '#007AFF' : '#3DDC84'}
                strokeWidth={2}
              />
              <circle
                r={isHovered ? 6 : 4}
                fill={user.platform === 'ios' ? '#007AFF' : '#3DDC84'}
              />
              
              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={10}
                    y={-25}
                    width={Math.max(100, (user.userName?.length || 10) * 7 + 20)}
                    height={50}
                    fill="white"
                    stroke="#ccc"
                    strokeWidth={1}
                    rx={4}
                  />
                  <text
                    x={15}
                    y={-10}
                    fontSize={11}
                    fontWeight="bold"
                    fill="#333"
                  >
                    {user.userName || 'Anonymous'}
                  </text>
                  <text
                    x={15}
                    y={5}
                    fontSize={10}
                    fill="#666"
                  >
                    {user.lastLocation.city}, {user.lastLocation.country}
                  </text>
                  <text
                    x={15}
                    y={18}
                    fontSize={9}
                    fill="#999"
                  >
                    {formatTimeAgo(user.lastSeen)}
                  </text>
                </g>
              )}
            </Marker>
          );
        })}
      </ZoomableGroup>
    </ComposableMap>
  );
});

export default function WorldPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24');
  const [selectedUser, setSelectedUser] = useState<UserLocation | null>(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/ping?hours=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newRange: string | null
  ) => {
    if (newRange) setTimeRange(newRange);
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const { openHelp } = useHelp();

  return (
    <Box sx={{ p: 3 }}>
      <PageHelp page="world" onOpenDrawer={openHelp} />
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <GlobeIcon color="primary" /> Users Around the World
          </Typography>
          <Typography variant="body2" color="text.secondary">
            See where DevRel Insights is being used
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
        >
          <ToggleButton value="1">1h</ToggleButton>
          <ToggleButton value="24">24h</ToggleButton>
          <ToggleButton value="168">7d</ToggleButton>
          <ToggleButton value="720">30d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {data?.activeUsers.length || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GlobeIcon color="success" />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {data?.countryStats.length || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Countries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingIcon color="info" />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {data?.totalPings || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Pings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon color="warning" />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {timeRange}h
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Time Window
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Interactive World Map */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              🗺️ Live User Map
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#007AFF' }} />
                <Typography variant="caption">iOS</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3DDC84' }} />
                <Typography variant="caption">Android</Typography>
              </Box>
            </Box>
          </Box>
          
          <Paper 
            variant="outlined" 
            sx={{ 
              height: 400, 
              bgcolor: '#F5F9FF',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {data?.activeUsers && data.activeUsers.length > 0 ? (
              <WorldMapChart 
                users={data.activeUsers} 
                onSelectUser={setSelectedUser}
              />
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                color: 'text.secondary',
              }}>
                <GlobeIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                <Typography>No active users in this time range</Typography>
                <Typography variant="body2">Users will appear here when they open the app</Typography>
              </Box>
            )}
          </Paper>
          
          {/* Selected user detail */}
          {selectedUser && (
            <Alert 
              severity="info" 
              sx={{ mt: 2 }}
              onClose={() => setSelectedUser(null)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedUser.platform === 'ios' ? <AppleIcon /> : <AndroidIcon />}
                <strong>{selectedUser.userName}</strong> — {selectedUser.lastLocation?.city}, {selectedUser.lastLocation?.country}
                <Typography variant="caption" sx={{ ml: 'auto' }}>
                  Last seen: {formatTimeAgo(selectedUser.lastSeen)} • {selectedUser.pingCount} pings
                </Typography>
              </Box>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Countries List */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                🌍 By Country
              </Typography>
              {data?.countryStats.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No data yet. Users will appear here when they open the app.
                </Typography>
              ) : (
                <List>
                  {data?.countryStats.map((stat, index) => (
                    <React.Fragment key={stat._id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'transparent', fontSize: '2rem' }}>
                            {getFlagEmoji(stat._id)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={stat.country}
                          secondary={stat.users.slice(0, 3).map(u => u.city).filter(Boolean).join(', ')}
                        />
                        <Chip
                          label={stat.count}
                          size="small"
                          color={index === 0 ? 'primary' : 'default'}
                        />
                      </ListItem>
                      {index < (data?.countryStats.length || 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Users */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                👥 Recent Activity
              </Typography>
              {data?.activeUsers.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No recent activity. Check back later!
                </Typography>
              ) : (
                <List>
                  {data?.activeUsers
                    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
                    .slice(0, 10)
                    .map((user, index) => (
                      <React.Fragment key={user.userId}>
                        <ListItem 
                          sx={{ px: 0, cursor: 'pointer' }}
                          onClick={() => setSelectedUser(user)}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {user.userName?.[0]?.toUpperCase() || '?'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {user.userName || 'Anonymous'}
                                {user.platform === 'ios' && <AppleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                                {user.platform === 'android' && <AndroidIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationIcon sx={{ fontSize: 14 }} />
                                {user.lastLocation?.city}, {user.lastLocation?.country}
                              </Box>
                            }
                          />
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(user.lastSeen)}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {user.pingCount} pings
                            </Typography>
                          </Box>
                        </ListItem>
                        {index < Math.min((data?.activeUsers.length || 0), 10) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
