'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from '@mui/material';
import {
  Upload,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  ExpandMore,
  Person,
  LocationOn,
  Refresh,
} from '@mui/icons-material';
import {
  mapColumns,
  transformRow,
  type ParsedEvent,
  type MappingResult,
  KNOWN_DAS,
} from '@/lib/schema-mapper';
import PageHelp from '@/components/help/PageHelp';
import { useHelp } from '@/components/help';

// ============================================================================
// CSV PARSER
// ============================================================================

function parseCSV(csv: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csv.split('\n').filter((line) => line.trim());
  
  // Skip header rows until we find the actual column headers
  // PMO sheet has metadata rows at top
  let headerIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('status') && line.includes('start date') && line.includes('location')) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex >= lines.length) {
    // Try first line as header
    headerIndex = 0;
  }
  
  const headers = parseCSVLine(lines[headerIndex]);
  
  // Parse data rows
  const rows = lines.slice(headerIndex + 1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  }).filter((row) => {
    // Filter out empty rows and header-like rows
    const hasData = Object.values(row).some((v) => v.trim() && !v.includes('PLEASE DON\'T'));
    return hasData;
  });

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

// Generate matching key for duplicate detection (must match server logic)
function generateEventKey(name: string, startDate: string | null): string {
  const normalizedName = (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
  const normalizedDate = startDate ? startDate.slice(0, 10) : 'nodate';
  return `${normalizedName}:${normalizedDate}`;
}

interface ParsedEventWithStatus extends ParsedEvent {
  isUpdate?: boolean;
  existingId?: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [parsedEvents, setParsedEvents] = useState<ParsedEventWithStatus[]>([]);
  const [existingKeys, setExistingKeys] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Geocoding state
  const [geoStatus, setGeoStatus] = useState<{ total: number; geocoded: number; pending: number; failed: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoResult, setGeoResult] = useState<{ geocoded: number; failed: number; remaining: number } | null>(null);
  const [geoLog, setGeoLog] = useState<Array<{
    eventName: string;
    location: string;
    success?: boolean;
    city?: string;
    country?: string;
    error?: string;
    status: 'pending' | 'geocoding' | 'success' | 'failed';
  }>>([]);
  const [geoProgress, setGeoProgress] = useState<{ current: number; total: number } | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setImportResult(null);

    // Fetch existing event keys for duplicate detection
    let keyMap: Record<string, string> = {};
    try {
      const res = await fetch('/api/events/upsert');
      if (res.ok) {
        const data = await res.json();
        keyMap = data.keyMap || {};
        setExistingKeys(keyMap);
      }
    } catch (err) {
      console.warn('Could not fetch existing events:', err);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const { headers: csvHeaders, rows: csvRows } = parseCSV(csv);
        
        setHeaders(csvHeaders);
        setRows(csvRows);
        
        // Map columns
        const result = mapColumns(csvHeaders);
        setMappingResult(result);
        
        // Transform all rows and mark updates
        const events: ParsedEventWithStatus[] = csvRows.map((row) => {
          const parsed = transformRow(row, result.mappings, result.daColumns);
          const key = generateEventKey(parsed.name, parsed.startDate);
          const existingId = keyMap[key];
          return {
            ...parsed,
            isUpdate: !!existingId,
            existingId,
          };
        });
        setParsedEvents(events);
        
      } catch (err) {
        console.error('Parse error:', err);
        setError(`Failed to parse CSV file: ${err instanceof Error ? err.message : String(err)}`);
        setHeaders([]);
        setRows([]);
        setMappingResult(null);
        setParsedEvents([]);
      }
    };
    reader.readAsText(selected);
  }, []);

  const handleImport = useCallback(async () => {
    if (parsedEvents.length === 0) return;
    
    const validEvents = parsedEvents.filter((e) => e.valid);
    if (validEvents.length === 0) return;
    
    setImporting(true);
    setError(null);

    // Transform to database format
    const dbEvents = validEvents.map((event) => {
      const dbEvent: any = {
        name: event.name,
        quarter: event.quarter,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        isVirtual: event.isVirtual,
        timezone: event.timezone,
        eventType: event.eventType,
        engagementType: event.engagementType,
        region: event.region || event.account?.region,
        isRegional: event.isRegional,
        language: event.language,
        slackChannel: event.slackChannel,
        customerTechStack: event.customerTechStack,
        travelStatus: event.travelStatus,
        dasNeeded: event.dasNeeded,
        assignments: event.assignments,
        notes: event.notes,
        calendarEventId: event.calendarEventId,
        eventPageUrl: event.eventPageUrl,
        agendaDetails: event.agendaDetails,
        wrikeTicket: event.wrikeTicket,
        sfdcLink: event.sfdcLink,
        projectTrackerUrl: event.projectTrackerUrl,
        badgeJiraTickets: event.badgeJiraTickets,
        badgeLinks: event.badgeLinks,
        marketer: event.marketer,
        importedFrom: 'pmo-csv',
      };
      
      if (event.account) {
        dbEvent.account = event.account;
      }
      
      if (event.champion) {
        dbEvent.champion = event.champion;
      }
      
      return dbEvent;
    });

    try {
      const res = await fetch('/api/events/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: dbEvents }),
      });

      if (!res.ok) {
        throw new Error('Upsert request failed');
      }

      const result = await res.json();
      setImportResult(result);
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    setImporting(false);
    
    // Refresh geocoding status after import
    fetchGeoStatus();
  }, [parsedEvents]);

  const fetchGeoStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/events/geocode');
      if (res.ok) {
        const data = await res.json();
        setGeoStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch geo status:', err);
    }
  }, []);

  const handleGeocode = useCallback(async () => {
    setGeocoding(true);
    setGeoResult(null);
    setGeoLog([]);
    setGeoProgress(null);
    
    try {
      const eventSource = new EventSource('/api/events/geocode/stream?limit=20');
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'start':
            setGeoProgress({ current: 0, total: data.total });
            break;
            
          case 'progress':
            setGeoProgress({ current: data.current, total: data.total });
            setGeoLog((prev) => {
              const updated = prev.filter((l) => l.eventName !== data.eventName);
              return [...updated, {
                eventName: data.eventName,
                location: data.location,
                status: 'geocoding' as const,
              }];
            });
            break;
            
          case 'result':
            setGeoProgress({ current: data.current, total: data.total });
            setGeoLog((prev) => {
              const updated = prev.filter((l) => l.eventName !== data.eventName);
              return [...updated, {
                eventName: data.eventName,
                location: data.location,
                success: data.success,
                city: data.city,
                country: data.country,
                error: data.error,
                status: data.success ? 'success' as const : 'failed' as const,
              }];
            });
            break;
            
          case 'complete':
            setGeoResult({
              geocoded: data.geocoded,
              failed: data.failed,
              remaining: data.remaining,
            });
            setGeocoding(false);
            fetchGeoStatus();
            eventSource.close();
            break;
            
          case 'error':
            setError(data.message);
            setGeocoding(false);
            eventSource.close();
            break;
        }
      };
      
      eventSource.onerror = () => {
        setGeocoding(false);
        eventSource.close();
      };
    } catch (err) {
      console.error('Geocoding failed:', err);
      setGeocoding(false);
    }
  }, [fetchGeoStatus]);

  const handleRetryFailed = useCallback(async () => {
    try {
      const res = await fetch('/api/events/geocode', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        alert(`Reset ${data.reset} failed geocodes. Click "Geocode" to retry.`);
        fetchGeoStatus();
        setGeoLog([]);
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    }
  }, [fetchGeoStatus]);

  // Fetch geo status on mount
  useEffect(() => {
    fetchGeoStatus();
  }, [fetchGeoStatus]);

  const validCount = parsedEvents.filter((e) => e.valid).length;
  const invalidCount = parsedEvents.filter((e) => !e.valid).length;
  const newCount = parsedEvents.filter((e) => e.valid && !e.isUpdate).length;
  const updateCount = parsedEvents.filter((e) => e.valid && e.isUpdate).length;
  const totalAssignments = parsedEvents.reduce((sum, e) => sum + e.assignments.length, 0);

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
      'Completed': 'success',
      'Delivered': 'success',
      'Confirmed': 'info',
      'Scheduled': 'info',
      'In Progress': 'warning',
      'In Queue': 'default',
      'In Hack Queue': 'default',
      'Cancelled': 'error',
      'Postponed': 'error',
      'SA_LED': 'default',
      'FYI': 'default',
    };
    return colors[status] || 'default';
  };

  const { openHelp } = useHelp();

  return (
    <Box>
      <PageHelp page="import" onOpenDrawer={openHelp} />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          PMO Import
        </Typography>
        <Typography color="text.secondary">
          Import events from the DevRel PMO spreadsheet
        </Typography>
      </Box>

      {/* Upload */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            1. Upload PMO CSV
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Export the PMO spreadsheet as CSV. The importer auto-detects columns including DA assignments.
          </Typography>
          <Button variant="outlined" component="label" startIcon={<Upload />}>
            Select CSV File
            <input type="file" accept=".csv" hidden onChange={handleFileChange} />
          </Button>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected: <strong>{file.name}</strong>
            </Typography>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {importResult && (
        <Alert severity={importResult.errors.length === 0 ? 'success' : 'warning'} sx={{ mb: 3 }}>
          Import complete: {importResult.created} created, {importResult.updated} updated
          {importResult.errors.length > 0 && `, ${importResult.errors.length} errors`}
        </Alert>
      )}

      {/* Mapping Info */}
      {mappingResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Column Detection
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip 
                label={`${mappingResult.mappings.length} fields mapped`} 
                color="success" 
                size="small" 
              />
              <Chip 
                label={`${mappingResult.daColumns.length} DA columns`} 
                color="info" 
                size="small"
                icon={<Person />}
              />
              {mappingResult.unmappedColumns.length > 0 && (
                <Chip 
                  label={`${mappingResult.unmappedColumns.length} unmapped`} 
                  color="warning" 
                  size="small" 
                />
              )}
            </Stack>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2">View detected DA columns</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {mappingResult.daColumns.map((da) => (
                    <Chip key={da} label={da} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {parsedEvents.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">
                  3. Preview ({parsedEvents.length} events)
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {newCount > 0 && (
                    <Chip label={`${newCount} new`} color="success" size="small" />
                  )}
                  {updateCount > 0 && (
                    <Chip label={`${updateCount} updates`} color="info" size="small" />
                  )}
                  {invalidCount > 0 && (
                    <Chip label={`${invalidCount} invalid`} color="error" size="small" />
                  )}
                  <Chip label={`${totalAssignments} assignments`} size="small" variant="outlined" />
                </Stack>
              </Box>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={importing || validCount === 0}
                startIcon={importing ? undefined : <CheckCircle />}
              >
                {importing ? 'Importing...' : `Import ${newCount} New, ${updateCount} Updates`}
              </Button>
            </Box>

            {importing && <LinearProgress sx={{ mb: 2 }} />}

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell width={40}></TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Assignments</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedEvents.slice(0, 50).map((event, i) => (
                    <TableRow 
                      key={i} 
                      sx={{ 
                        bgcolor: !event.valid ? 'error.light' : undefined,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <TableCell>
                        {!event.valid ? (
                          <ErrorIcon color="error" fontSize="small" />
                        ) : event.isUpdate ? (
                          <Chip label="UPD" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                        ) : (
                          <Chip label="NEW" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
                          {event.name}
                        </Typography>
                        {event.errors.length > 0 && (
                          <Typography variant="caption" color="error">
                            {event.errors.join(', ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={event.status} 
                          size="small" 
                          color={getStatusColor(event.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{event.eventType}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {event.startDate 
                            ? new Date(event.startDate).toLocaleDateString() 
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
                          {event.location}
                          {event.isVirtual && ' (Virtual)'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
                          {event.isRegional ? 'Regional' : event.account?.name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {event.assignments.slice(0, 2).map((a, j) => (
                            <Chip 
                              key={j}
                              label={a.advocateName.split(' ')[0]}
                              size="small"
                              color={a.assignmentType === 'ON_SITE' ? 'success' : 'default'}
                              variant="outlined"
                            />
                          ))}
                          {event.assignments.length > 2 && (
                            <Chip 
                              label={`+${event.assignments.length - 2}`}
                              size="small"
                            />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {parsedEvents.length > 50 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing 50 of {parsedEvents.length} events
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats by Status */}
      {parsedEvents.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Summary by Status
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {Object.entries(
                parsedEvents.reduce((acc, e) => {
                  acc[e.status] = (acc[e.status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <Chip
                  key={status}
                  label={`${status}: ${count}`}
                  color={getStatusColor(status)}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Debug / Diagnostic Panel */}
      {mappingResult && parsedEvents.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import Diagnostics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Debug information to help identify import issues.
            </Typography>

            {/* Column Mapping Details */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>Column Mappings</Typography>
                  <Chip label={`${mappingResult.mappings.length} mapped`} size="small" color="success" />
                  {mappingResult.unmappedColumns.length > 0 && (
                    <Chip label={`${mappingResult.unmappedColumns.length} unmapped`} size="small" color="warning" />
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>CSV Column</TableCell>
                        <TableCell>Mapped To</TableCell>
                        <TableCell>Confidence</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mappingResult.mappings.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell><Typography variant="caption" fontFamily="monospace">{m.csvColumn}</Typography></TableCell>
                          <TableCell><Chip label={m.field} size="small" variant="outlined" /></TableCell>
                          <TableCell>
                            <Chip 
                              label={m.confidence === 1 ? 'Exact' : `${Math.round(m.confidence * 100)}%`} 
                              size="small" 
                              color={m.confidence === 1 ? 'success' : m.confidence > 0.8 ? 'info' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {mappingResult.unmappedColumns.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" fontWeight={600} color="warning.main" gutterBottom>
                      Unmapped Columns (ignored during import):
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {mappingResult.unmappedColumns.map((col) => (
                        <Chip key={col} label={col} size="small" color="warning" variant="outlined" sx={{ mb: 0.5 }} />
                      ))}
                    </Stack>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Data Quality Summary */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>Data Quality</Typography>
                  {(() => {
                    const missingRegion = parsedEvents.filter(e => e.valid && !e.region).length;
                    const missingDates = parsedEvents.filter(e => e.valid && !e.startDate).length;
                    const missingType = parsedEvents.filter(e => e.valid && e.eventType === 'OTHER').length;
                    const hasIssues = missingRegion > 0 || missingDates > 0 || missingType > 0;
                    return hasIssues ? (
                      <Chip label="Issues found" size="small" color="warning" />
                    ) : (
                      <Chip label="All good" size="small" color="success" />
                    );
                  })()}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {(() => {
                    const issues: { label: string; count: number; severity: 'error' | 'warning' | 'info' }[] = [];
                    const missingRegion = parsedEvents.filter(e => e.valid && !e.region).length;
                    const missingDates = parsedEvents.filter(e => e.valid && !e.startDate).length;
                    const missingType = parsedEvents.filter(e => e.valid && e.eventType === 'OTHER').length;
                    const missingAccount = parsedEvents.filter(e => e.valid && !e.isRegional && !e.account?.name).length;
                    const noAssignments = parsedEvents.filter(e => e.valid && e.assignments.length === 0).length;
                    const withWarnings = parsedEvents.filter(e => e.warnings.length > 0).length;
                    const withErrors = parsedEvents.filter(e => e.errors.length > 0).length;

                    if (withErrors > 0) issues.push({ label: `${withErrors} events with errors (marked invalid)`, count: withErrors, severity: 'error' });
                    if (missingRegion > 0) issues.push({ label: `${missingRegion} events missing region`, count: missingRegion, severity: 'warning' });
                    if (missingDates > 0) issues.push({ label: `${missingDates} events missing start date`, count: missingDates, severity: 'warning' });
                    if (missingType > 0) issues.push({ label: `${missingType} events defaulted to "Other" type`, count: missingType, severity: 'info' });
                    if (missingAccount > 0) issues.push({ label: `${missingAccount} non-regional events missing account name`, count: missingAccount, severity: 'info' });
                    if (noAssignments > 0) issues.push({ label: `${noAssignments} events with no DA assignments`, count: noAssignments, severity: 'info' });
                    if (withWarnings > 0) issues.push({ label: `${withWarnings} events with warnings`, count: withWarnings, severity: 'info' });

                    if (issues.length === 0) {
                      return <Alert severity="success">All events passed quality checks.</Alert>;
                    }

                    return issues.map((issue, i) => (
                      <Alert key={i} severity={issue.severity} variant="outlined">
                        {issue.label}
                      </Alert>
                    ));
                  })()}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Region Distribution */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2" fontWeight={600}>Region Distribution</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(
                    parsedEvents.filter(e => e.valid).reduce((acc, e) => {
                      const r = e.region || e.account?.region || 'Unknown';
                      acc[r] = (acc[r] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
                    <Chip
                      key={region}
                      label={`${region}: ${count}`}
                      size="small"
                      sx={{
                        mb: 0.5,
                        bgcolor: region === 'Unknown' ? undefined : 
                          region === 'AMER' ? '#2196f3' :
                          region === 'EMEA' ? '#9c27b0' :
                          region === 'APAC' ? '#ff9800' :
                          region === 'LATAM' ? '#4caf50' : undefined,
                        color: region === 'Unknown' ? undefined : 'white',
                      }}
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Event Type Distribution */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2" fontWeight={600}>Event Type Distribution</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(
                    parsedEvents.filter(e => e.valid).reduce((acc, e) => {
                      acc[e.engagementType || e.eventType] = (acc[e.engagementType || e.eventType] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <Chip key={type} label={`${type}: ${count}`} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Invalid Events Detail */}
            {invalidCount > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>Invalid Events</Typography>
                    <Chip label={invalidCount} size="small" color="error" />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Row</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Errors</TableCell>
                          <TableCell>Raw Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedEvents.filter(e => !e.valid).map((event, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>
                              <Typography variant="caption" fontFamily="monospace">
                                {event.name || '(empty)'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {event.errors.map((err, j) => (
                                <Chip key={j} label={err} size="small" color="error" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                              ))}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {event.status}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Raw CSV Headers */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2" fontWeight={600}>Raw CSV Headers ({headers.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {headers.map((h, i) => (
                    <Chip 
                      key={i} 
                      label={h || `(empty col ${i})`} 
                      size="small" 
                      variant="outlined" 
                      sx={{ mb: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }} 
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Geocoding */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn /> Geocoding
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Convert event locations to map coordinates for visualization. Uses OpenStreetMap (1 req/sec rate limit).
          </Typography>
          
          {/* Status chips */}
          {geoStatus && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip 
                label={`${geoStatus.geocoded} geocoded`} 
                color="success" 
                size="small"
                icon={<CheckCircle />}
              />
              {geoStatus.pending > 0 && (
                <Chip 
                  label={`${geoStatus.pending} pending`} 
                  color="warning" 
                  size="small"
                />
              )}
              {geoStatus.failed > 0 && (
                <Chip 
                  label={`${geoStatus.failed} failed`} 
                  color="error" 
                  size="small" 
                />
              )}
              <Chip 
                label={`${geoStatus.total} total events`} 
                variant="outlined" 
                size="small" 
              />
            </Stack>
          )}
          
          {/* Progress bar */}
          {geocoding && geoProgress && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">
                  Processing {geoProgress.current} of {geoProgress.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round((geoProgress.current / geoProgress.total) * 100)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(geoProgress.current / geoProgress.total) * 100} 
              />
            </Box>
          )}
          
          {/* Result summary */}
          {geoResult && !geocoding && (
            <Alert severity={geoResult.failed === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
              Complete: {geoResult.geocoded} geocoded, {geoResult.failed} failed.
              {geoResult.remaining > 0 && ` ${geoResult.remaining} remaining — click Geocode again to continue.`}
            </Alert>
          )}
          
          {/* Live log */}
          {geoLog.length > 0 && (
            <Paper 
              variant="outlined" 
              sx={{ 
                mb: 2, 
                maxHeight: 300, 
                overflow: 'auto',
                bgcolor: 'background.default',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={40}>Status</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {geoLog.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {entry.status === 'geocoding' && (
                          <Chip label="..." size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                        {entry.status === 'success' && (
                          <CheckCircle color="success" fontSize="small" />
                        )}
                        {entry.status === 'failed' && (
                          <ErrorIcon color="error" fontSize="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {entry.eventName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
                          {entry.location}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {entry.status === 'geocoding' && (
                          <Typography variant="caption" color="text.secondary">Geocoding...</Typography>
                        )}
                        {entry.status === 'success' && (
                          <Typography variant="caption" color="success.main">
                            ✓ {entry.city && `${entry.city}, `}{entry.country}
                          </Typography>
                        )}
                        {entry.status === 'failed' && (
                          <Typography variant="caption" color="error.main">
                            {entry.error || 'Failed'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
          
          {/* Action buttons */}
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={geocoding ? undefined : <LocationOn />}
              onClick={handleGeocode}
              disabled={geocoding || (geoStatus?.pending === 0)}
            >
              {geocoding ? 'Geocoding...' : `Geocode ${geoStatus?.pending || 0} Events`}
            </Button>
            {geoStatus && geoStatus.failed > 0 && (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleRetryFailed}
                disabled={geocoding}
              >
                Retry {geoStatus.failed} Failed
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                fetchGeoStatus();
                setGeoLog([]);
                setGeoResult(null);
              }}
              disabled={geocoding}
            >
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
