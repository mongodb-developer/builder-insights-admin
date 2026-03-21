'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Stack,
  Skeleton,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import { Person, Search, Email, Add } from '@mui/icons-material';
import PageHelp from '@/components/help/PageHelp';
import { useHelp } from '@/components/help';

interface Advocate {
  _id: string;
  name: string;
  email: string;
  title?: string;
  role: string;
  isManager?: boolean;
  insightCount?: number;
}

// Generate color from name
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#00ED64', '#016BF8', '#00684A', '#5C6BC0', '#26A69A', '#7E57C2', '#EF5350', '#FF7043'];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdvocatesPage() {
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { openHelp } = useHelp();

  useEffect(() => {
    async function loadAdvocates() {
      try {
        const res = await fetch('/api/advocates');
        if (res.ok) {
          const data = await res.json();
          setAdvocates(data.advocates || []);
        }
      } catch (err) {
        console.error('Failed to load advocates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdvocates();
  }, []);

  const filteredAdvocates = advocates.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.title?.toLowerCase().includes(search.toLowerCase())
  );

  const managers = filteredAdvocates.filter(a => a.isManager);
  const nonManagers = filteredAdvocates.filter(a => !a.isManager);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Advocates</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={56} height={56} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="70%" />
                      <Skeleton variant="text" width="50%" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <PageHelp page="advocates" onOpenDrawer={openHelp} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Advocates</Typography>
          <Typography color="text.secondary">
            {advocates.length} team members
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search advocates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            href="/admin/users"
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add Advocate
          </Button>
        </Box>
      </Box>

      {/* Managers Section */}
      {managers.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
            Leadership ({managers.length})
          </Typography>
          <Grid container spacing={3}>
            {managers.map((advocate) => (
              <Grid key={advocate._id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ borderLeft: 4, borderColor: '#7C3AED' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          width: 56, 
                          height: 56, 
                          bgcolor: stringToColor(advocate.name),
                          fontSize: '1.25rem',
                          fontWeight: 600,
                        }}
                      >
                        {getInitials(advocate.name)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" noWrap>{advocate.name}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {advocate.title || advocate.role}
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Email fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {advocate.email}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Advocates Section */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
          Advocates ({nonManagers.length})
        </Typography>
        <Grid container spacing={3}>
          {nonManagers.map((advocate) => (
            <Grid key={advocate._id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Avatar 
                      sx={{ 
                        width: 48, 
                        height: 48, 
                        bgcolor: stringToColor(advocate.name),
                        fontSize: '1rem',
                        fontWeight: 600,
                      }}
                    >
                      {getInitials(advocate.name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                        {advocate.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {advocate.title || 'Developer Advocate'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {advocate.email}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {filteredAdvocates.length === 0 && !loading && (
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {search ? 'No advocates match your search' : 'No advocates found'}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
