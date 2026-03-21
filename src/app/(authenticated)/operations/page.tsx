'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Build as BuildIcon,
  Backup as BackupIcon,
  Download as DownloadIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';
import { PageHelp } from '@/components/help';

interface CollectionStats {
  name: string;
  count: number;
  size: number;
  indexes: number;
  lastModified: string | null;
}

interface DbStats {
  database: string;
  collections: CollectionStats[];
  totalDocuments: number;
  totalSize: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

export default function OperationsPage() {
  const router = useRouter();
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: '',
  });
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin status
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject('Not authenticated')))
      .then((data) => {
        const admin = data.isAdmin === true || data.role === 'admin';
        setIsAdmin(admin);
        if (!admin) {
          router.push('/dashboard');
        }
      })
      .catch(() => {
        setIsAdmin(false);
        router.push('/login');
      });
  }, [router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/operations/stats');
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load database stats' });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
      setMessage({ type: 'error', text: 'Failed to load database stats' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) {
      fetchStats();
    }
  }, [isAdmin]);

  // Download backup as JSON
  const handleBackup = async () => {
    setActionLoading('backup');
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/operations/backup');
      if (!res.ok) throw new Error('Backup failed');

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `builder-insights-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Backup downloaded successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Backup failed' });
    } finally {
      setActionLoading('');
    }
  };

  // Export insights as CSV
  const handleExportCSV = async () => {
    setActionLoading('csv');
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/insights?limit=10000');
      if (!res.ok) throw new Error('Export failed');

      const data = await res.json();
      const insights = data.insights || [];

      // Build CSV
      const headers = [
        'ID',
        'Event',
        'Advocate',
        'Contact Name',
        'Contact Email',
        'Company',
        'Sentiment',
        'Summary',
        'Created At',
      ];
      const rows = insights.map((i: Record<string, unknown>) =>
        [
          i._id,
          i.eventId || '',
          i.advocateName || '',
          i.contactName || '',
          i.contactEmail || '',
          i.company || '',
          i.sentiment || '',
          String(i.summary || '').replace(/"/g, '""'),
          i.createdAt || '',
        ]
          .map((v) => `"${v}"`)
          .join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `builder-insights-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `Exported ${insights.length} insights to CSV!` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Export failed' });
    } finally {
      setActionLoading('');
    }
  };

  if (isAdmin === null || loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  if (isAdmin === false) return null;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <BuildIcon sx={{ fontSize: 32, color: mongoColors.green }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Operations
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Database management, backups, and system maintenance
          </Typography>
        </Box>
      </Box>

      <PageHelp page="operations" />

      {/* Status Message */}
      {message.text && (
        <Alert
          severity={message.type || 'info'}
          sx={{ mb: 3 }}
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      {/* Database Stats */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <StorageIcon sx={{ color: mongoColors.green }} />
            <Typography variant="h6">Database Statistics</Typography>
            <Button size="small" startIcon={<RefreshIcon />} onClick={fetchStats} sx={{ ml: 'auto' }}>
              Refresh
            </Button>
          </Box>

          {dbStats ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Collection</TableCell>
                    <TableCell align="right">Documents</TableCell>
                    <TableCell align="right">Est. Size</TableCell>
                    <TableCell align="right">Indexes</TableCell>
                    <TableCell>Last Modified</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dbStats.collections?.map((col) => (
                    <TableRow key={col.name}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TableChartIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {col.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={col.count.toLocaleString()} size="small" sx={{ minWidth: 60 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatBytes(col.size)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {col.indexes}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDate(col.lastModified)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">Unable to load stats</Typography>
          )}

          {dbStats && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<StorageIcon sx={{ fontSize: 16 }} />}
                label={`Total: ${formatBytes(dbStats.totalSize || 0)}`}
                variant="outlined"
              />
              <Chip
                label={`${dbStats.totalDocuments?.toLocaleString() || 0} documents`}
                variant="outlined"
              />
              <Chip label={`Database: ${dbStats.database || 'builder-insights'}`} variant="outlined" color="primary" />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Backup & Export */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Backup */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BackupIcon sx={{ color: '#10b981' }} />
              <Typography variant="h6">Full Backup</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Download a complete backup of all data including events, insights, advocates, bugs, and users as a JSON
              file.
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={
                actionLoading === 'backup' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />
              }
              onClick={handleBackup}
              disabled={!!actionLoading}
            >
              Download Backup
            </Button>
          </CardContent>
        </Card>

        {/* Export CSV */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TableChartIcon sx={{ color: '#3b82f6' }} />
              <Typography variant="h6">Export Insights to CSV</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Export all insights to a CSV spreadsheet for reporting or analysis in Excel/Google Sheets.
            </Typography>
            <Button
              variant="contained"
              startIcon={actionLoading === 'csv' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
              onClick={handleExportCSV}
              disabled={!!actionLoading}
            >
              Export CSV
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* Info card */}
      <Card sx={{ bgcolor: `${mongoColors.green}08`, border: `1px solid ${mongoColors.green}30` }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: mongoColors.darkGreen, mb: 1 }}>
            💡 Backup Tips
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            • Run backups regularly before making major changes
            <br />
            • JSON backups include all collections and can be used for full restore
            <br />
            • CSV exports are useful for sharing data with stakeholders
            <br />• Backups are downloaded locally — store them in a safe location
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
