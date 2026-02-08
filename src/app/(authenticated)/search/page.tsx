'use client';

/**
 * Unified Search Page
 * 
 * Search across all data: events, insights, advocates, bugs
 */

import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Divider,
  Badge,
  Fade,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PersonIcon from '@mui/icons-material/Person';
import BugReportIcon from '@mui/icons-material/BugReport';
import ClearIcon from '@mui/icons-material/Clear';
import IconButton from '@mui/material/IconButton';

interface SearchResult {
  _id: string;
  type: 'event' | 'insight' | 'advocate' | 'bug';
  title: string;
  subtitle?: string;
  snippet?: string;
  url: string;
  meta?: Record<string, any>;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  counts: {
    events: number;
    insights: number;
    advocates: number;
    bugs: number;
    total: number;
  };
  took: number;
}

const TYPE_CONFIG = {
  event: { icon: EventIcon, color: '#00ED64', label: 'Events' },
  insight: { icon: LightbulbIcon, color: '#FFB800', label: 'Insights' },
  advocate: { icon: PersonIcon, color: '#00A4EF', label: 'Advocates' },
  bug: { icon: BugReportIcon, color: '#FF6B6B', label: 'Bugs' },
};

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [counts, setCounts] = useState({ events: 0, insights: 0, advocates: 0, bugs: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [took, setTook] = useState<number | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['event', 'insight', 'advocate', 'bug']);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (searchQuery: string, types: string[]) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setCounts({ events: 0, insights: 0, advocates: 0, bugs: 0, total: 0 });
      setTook(null);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        types: types.join(','),
        limit: '50',
      });

      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Search failed');
      }

      const data: SearchResponse = await res.json();
      setResults(data.results);
      setCounts(data.counts);
      setTook(data.took);

      // Update URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.set('q', searchQuery);
      window.history.replaceState({}, '', url.toString());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, selectedTypes);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedTypes, search]);

  // Initial search from URL
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleTypeChange = (_: React.MouseEvent<HTMLElement>, newTypes: string[]) => {
    if (newTypes.length > 0) {
      setSelectedTypes(newTypes);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setCounts({ events: 0, insights: 0, advocates: 0, bugs: 0, total: 0 });
    setTook(null);
    setHasSearched(false);
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          🔍 Search Everything
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Search across events, insights, advocates, and bug reports
        </Typography>
      </Box>

      {/* Search Box */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 3,
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          placeholder="Search for events, insights, people, bugs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  <SearchIcon color="action" />
                )}
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
            sx: { fontSize: '1.1rem' }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
        />

        {/* Type Filters */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={selectedTypes}
            onChange={handleTypeChange}
            size="small"
          >
            {Object.entries(TYPE_CONFIG).map(([type, config]) => (
              <ToggleButton 
                key={type} 
                value={type}
                sx={{ 
                  px: 2,
                  '&.Mui-selected': {
                    backgroundColor: `${config.color}20`,
                    borderColor: config.color,
                  }
                }}
              >
                <Badge 
                  badgeContent={counts[type as keyof typeof counts] || 0} 
                  color="primary"
                  max={99}
                  sx={{ mr: 1 }}
                >
                  <config.icon sx={{ fontSize: 20, color: config.color }} />
                </Badge>
                {config.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results Summary */}
      {hasSearched && !loading && (
        <Fade in>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {counts.total === 0 
                ? `No results found for "${query}"`
                : `Found ${counts.total} result${counts.total !== 1 ? 's' : ''} in ${took}ms`
              }
            </Typography>
          </Box>
        </Fade>
      )}

      {/* Results */}
      {Object.entries(groupedResults).map(([type, items]) => {
        const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
        if (!items.length) return null;

        return (
          <Fade in key={type}>
            <Paper sx={{ mb: 3, overflow: 'hidden' }}>
              {/* Section Header */}
              <Box 
                sx={{ 
                  px: 2, 
                  py: 1.5, 
                  backgroundColor: `${config.color}15`,
                  borderBottom: `2px solid ${config.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <config.icon sx={{ color: config.color }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  {config.label}
                </Typography>
                <Chip 
                  label={items.length} 
                  size="small" 
                  sx={{ 
                    ml: 'auto',
                    backgroundColor: config.color,
                    color: 'white',
                  }} 
                />
              </Box>

              {/* Results List */}
              <List disablePadding>
                {items.map((result, index) => (
                  <React.Fragment key={result._id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton 
                        onClick={() => handleResultClick(result)}
                        sx={{ py: 1.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <config.icon sx={{ color: config.color, fontSize: 24 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography 
                              variant="body1" 
                              fontWeight={500}
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {result.title}
                            </Typography>
                          }
                          secondary={
                            <Stack spacing={0.5}>
                              {result.subtitle && (
                                <Typography variant="body2" color="text.secondary">
                                  {result.subtitle}
                                </Typography>
                              )}
                              {result.snippet && (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontStyle: 'italic',
                                    opacity: 0.8,
                                  }}
                                >
                                  {result.snippet}
                                </Typography>
                              )}
                            </Stack>
                          }
                        />
                        {result.meta?.status && (
                          <Chip 
                            label={result.meta.status} 
                            size="small" 
                            variant="outlined"
                            sx={{ ml: 2 }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Fade>
        );
      })}

      {/* Empty State */}
      {!hasSearched && !query && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Start typing to search
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Search for event names, insight text, advocate names, bug reports, and more
          </Typography>
        </Box>
      )}
    </Container>
  );
}

// Wrap in Suspense for useSearchParams
export default function SearchPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
