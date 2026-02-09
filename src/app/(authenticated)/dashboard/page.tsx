'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Chip,
  Stack,
  Avatar,
  Paper,
  alpha,
  useTheme,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  IconButton,
  Tooltip as MuiTooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';

// Dynamic import for Leaflet (no SSR)
const EventMap = dynamic(() => import('@/components/EventMap'), {
  ssr: false,
  loading: () => (
    <Box sx={{ height: 350, bgcolor: 'background.default', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="text.secondary">Loading map...</Typography>
    </Box>
  ),
});

import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Event,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
  EmojiEvents,
  Warning,
  Speed,
  AutoAwesome,
  ContentCopy,
  Check,
  PictureAsPdf,
  Print,
  Download,
  Refresh,
  People,
  Assessment,
  Summarize,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import { PageHelp, HelpButton, useHelp } from '@/components/help';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

// MongoDB brand colors
const COLORS = {
  primary: '#00ED64',
  secondary: '#016BF8',
  dark: '#001E2B',
  success: '#00ED64',
  warning: '#FFC010',
  error: '#EF4444',
  purple: '#7C3AED',
  teal: '#14B8A6',
};

const CHART_COLORS = ['#00ED64', '#016BF8', '#7C3AED', '#14B8A6', '#FFC010', '#EF4444', '#EC4899', '#F97316'];

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: '#00ED64',
  Neutral: '#016BF8',
  Negative: '#EF4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#EF4444',
  High: '#F97316',
  Medium: '#FFC010',
  Low: '#14B8A6',
};

interface DashboardData {
  summary: {
    totalInsights: number;
    totalEvents: number;
    last30Days: number;
    trend: number;
    sentimentScore: number;
    avgInsightsPerEvent: number;
  };
  charts: {
    insightsByDay: Array<{ date: string; total: number; positive: number; negative: number; neutral: number }>;
    sentiment: Array<{ name: string; value: number }>;
    types: Array<{ name: string; value: number }>;
    productAreas: Array<{ name: string; count: number }>;
    priority: Array<{ name: string; value: number }>;
    topEvents: Array<{ name: string; insights: number; positive: number; negative: number }>;
  };
  lists: {
    criticalItems: Array<{ id: string; text: string; type: string; priority: string; event: string; capturedAt: string }>;
    topAdvocates: Array<{ id: string; name: string; count: number }>;
  };
}

interface ExecutiveData {
  summary: {
    totalInsights: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    totalEvents: number;
    activeAdvocates: number;
  };
  sentiment: { positive: number; neutral: number; negative: number };
  byType: Record<string, number>;
  byProductArea: Record<string, number>;
  byPriority: Record<string, number>;
  topAdvocates: Array<{ name: string; count: number }>;
  recentHighPriority: Array<{
    _id: string;
    text: string;
    type: string;
    priority: string;
    sentiment: string;
    advocateName: string;
    eventName?: string;
    capturedAt: string;
  }>;
}

interface AISummary {
  summary: string;
  themes: string[];
  stats: { total: number; events: number; advocates: number };
  period: string;
  generatedAt: string;
  fromCache?: boolean;
}

// Tab panel component
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, subtitle, icon, trend, color = COLORS.primary }: {
  title: string; value: string | number; subtitle?: string; icon: React.ReactNode; trend?: number; color?: string;
}) {
  const theme = useTheme();
  return (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`, border: `1px solid ${alpha(color, 0.2)}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>{title}</Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{value}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                {trend >= 0 ? <TrendingUp sx={{ color: COLORS.success, fontSize: 18 }} /> : <TrendingDown sx={{ color: COLORS.error, fontSize: 18 }} />}
                <Typography variant="body2" sx={{ color: trend >= 0 ? COLORS.success : COLORS.error, fontWeight: 600 }}>
                  {trend >= 0 ? '+' : ''}{trend}% vs last month
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ bgcolor: alpha(color, 0.15), borderRadius: 2, p: 1.5 }}>
            <Box sx={{ color }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <Paper sx={{ p: 1.5, bgcolor: 'background.paper', boxShadow: 3 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Typography>
      {payload.map((entry: any, idx: number) => (
        <Typography key={idx} variant="body2" sx={{ color: entry.color }}>{entry.name}: {entry.value}</Typography>
      ))}
    </Paper>
  );
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return CHART_COLORS[Math.abs(hash) % CHART_COLORS.length];
}

export default function DashboardPage() {
  const { openHelp } = useHelp();
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState<DashboardData | null>(null);
  const [execData, setExecData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [execLoading, setExecLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [cachedSummary, setCachedSummary] = useState<AISummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPeriod, setSummaryPeriod] = useState<string>('quarter');
  const [copied, setCopied] = useState(false);
  const [trendChartMode, setTrendChartMode] = useState<'total' | 'sentiment'>('total');
  const theme = useTheme();

  // Load dashboard data
  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // Load executive data
  const loadExecData = useCallback(async () => {
    try {
      const [insightsRes, eventsRes, advocatesRes] = await Promise.all([
        fetch('/api/insights?limit=500'),
        fetch('/api/events?limit=200'),
        fetch('/api/advocates'),
      ]);
      const [insightsData, eventsData, advocatesData] = await Promise.all([
        insightsRes.json(), eventsRes.json(), advocatesRes.json(),
      ]);

      const insights = insightsData.insights || [];
      const events = eventsData.events || [];
      const advocates = advocatesData.advocates || [];

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const thisWeek = insights.filter((i: any) => new Date(i.capturedAt) >= oneWeekAgo).length;
      const lastWeek = insights.filter((i: any) => {
        const date = new Date(i.capturedAt);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      }).length;
      const thisMonth = insights.filter((i: any) => new Date(i.capturedAt) >= oneMonthAgo).length;

      const sentiment = { positive: 0, neutral: 0, negative: 0 };
      const byType: Record<string, number> = {};
      const byProductArea: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const advocateCounts: Record<string, number> = {};

      insights.forEach((i: any) => {
        if (i.sentiment === 'Positive') sentiment.positive++;
        else if (i.sentiment === 'Negative') sentiment.negative++;
        else sentiment.neutral++;
        byType[i.type] = (byType[i.type] || 0) + 1;
        (i.productAreas || []).forEach((area: string) => { byProductArea[area] = (byProductArea[area] || 0) + 1; });
        byPriority[i.priority] = (byPriority[i.priority] || 0) + 1;
        const name = i.advocateName || 'Unknown';
        advocateCounts[name] = (advocateCounts[name] || 0) + 1;
      });

      const topAdvocates = Object.entries(advocateCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
      const recentHighPriority = insights.filter((i: any) => i.priority === 'Critical' || i.priority === 'High')
        .sort((a: any, b: any) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()).slice(0, 10);

      setExecData({
        summary: { totalInsights: insights.length, thisWeek, lastWeek, thisMonth, totalEvents: events.length, activeAdvocates: advocates.filter((a: any) => a.isActive).length },
        sentiment, byType, byProductArea, byPriority, topAdvocates, recentHighPriority,
      });
    } catch (error) {
      console.error('Failed to load executive data:', error);
    } finally {
      setExecLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadExecData(); }, [loadExecData]);

  // AI Summary functions
  useEffect(() => {
    async function checkCache() {
      try {
        const res = await fetch(`/api/insights/summary?period=${summaryPeriod}`);
        if (res.ok) {
          const { cached } = await res.json();
          setCachedSummary(cached);
        }
      } catch (err) { console.error('Failed to check cache:', err); }
    }
    checkCache();
  }, [summaryPeriod]);

  const loadCachedSummary = () => { if (cachedSummary) setAiSummary({ ...cachedSummary, fromCache: true }); };

  const generateSummary = async (forceNew = false) => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/insights/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: summaryPeriod, forceNew }),
      });
      if (res.ok) {
        const json = await res.json();
        setAiSummary(json);
        if (!json.fromCache) setCachedSummary({ ...json, fromCache: false });
      }
    } catch (err) { console.error('Failed to generate summary:', err); }
    finally { setSummaryLoading(false); }
  };

  const copyToClipboard = () => {
    if (aiSummary?.summary) {
      navigator.clipboard.writeText(aiSummary.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/insights?limit=1000');
      const data = await res.json();
      const insights = data.insights || [];
      const headers = ['Date', 'Type', 'Sentiment', 'Priority', 'Product Areas', 'Text', 'Event', 'Advocate', 'Tags'];
      const rows = insights.map((i: any) => [
        new Date(i.capturedAt).toISOString().split('T')[0], i.type, i.sentiment, i.priority,
        (i.productAreas || []).join('; '), `"${(i.text || '').replace(/"/g, '""')}"`,
        i.eventName || '', i.advocateName || '', (i.tags || []).join('; '),
      ]);
      const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insights-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) { console.error('Export failed:', error); }
  };

  const downloadPDF = () => {
    if (!aiSummary || !data) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;

    // MongoDB green header bar
    pdf.setFillColor(0, 237, 100);
    pdf.rect(0, 0, pageWidth, 25, 'F');

    // Title
    pdf.setTextColor(0, 30, 43);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DevRel Insights Executive Summary', margin, 17);

    yPos = 35;

    // Period and date
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${aiSummary.period} Report`, margin, yPos);
    pdf.text(`Generated: ${new Date(aiSummary.generatedAt).toLocaleDateString()}`, pageWidth - margin - 50, yPos);
    
    yPos += 12;

    // Stats boxes
    const boxWidth = (contentWidth - 10) / 3;
    const statsData = [
      { label: 'Insights', value: aiSummary.stats.total, color: [0, 237, 100] as [number, number, number] },
      { label: 'Events', value: aiSummary.stats.events, color: [1, 107, 248] as [number, number, number] },
      { label: 'Advocates', value: aiSummary.stats.advocates, color: [124, 58, 237] as [number, number, number] },
    ];
    
    statsData.forEach((stat, idx) => {
      const boxX = margin + idx * (boxWidth + 5);
      pdf.setFillColor(250, 250, 250);
      pdf.roundedRect(boxX, yPos, boxWidth, 18, 2, 2, 'F');
      pdf.setFillColor(...stat.color);
      pdf.rect(boxX, yPos, 3, 18, 'F');
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...stat.color);
      pdf.text(String(stat.value), boxX + 8, yPos + 12);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(stat.label, boxX + 28, yPos + 12);
    });
    
    yPos += 28;

    // Key Themes
    if (aiSummary.themes && aiSummary.themes.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 30, 43);
      pdf.text('Key Themes', margin, yPos);
      yPos += 7;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      let chipX = margin;
      aiSummary.themes.forEach((theme) => {
        const chipWidth = pdf.getTextWidth(theme) + 8;
        if (chipX + chipWidth > pageWidth - margin) {
          chipX = margin;
          yPos += 8;
        }
        pdf.setFillColor(240, 230, 255);
        pdf.roundedRect(chipX, yPos - 4, chipWidth, 7, 2, 2, 'F');
        pdf.setTextColor(124, 58, 237);
        pdf.setFontSize(8);
        pdf.text(theme, chipX + 4, yPos);
        chipX += chipWidth + 3;
      });
      yPos += 12;
    }

    // Charts summary section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 30, 43);
    pdf.text('Insights Overview', margin, yPos);
    yPos += 8;

    // Sentiment breakdown
    const sentimentData = data.charts.sentiment;
    const total = sentimentData.reduce((sum, s) => sum + s.value, 0);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    sentimentData.forEach((s, idx) => {
      const colors: Record<string, [number, number, number]> = {
        Positive: [0, 237, 100],
        Neutral: [1, 107, 248],
        Negative: [239, 68, 68],
      };
      const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
      pdf.setFillColor(...(colors[s.name] || [150, 150, 150]));
      pdf.rect(margin, yPos + idx * 8, 4, 5, 'F');
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${s.name}: ${s.value} (${pct}%)`, margin + 8, yPos + idx * 8 + 4);
    });
    yPos += 30;

    // Top Product Areas
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 30, 43);
    pdf.text('Top Product Areas', margin, yPos);
    yPos += 6;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    data.charts.productAreas.slice(0, 5).forEach((area, idx) => {
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${idx + 1}. ${area.name}: ${area.count}`, margin, yPos + idx * 6);
    });
    yPos += 38;

    // Summary content
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 30, 43);
    pdf.text('Executive Summary', margin, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);
    
    const lines = pdf.splitTextToSize(aiSummary.summary, contentWidth);
    const lineHeight = 5;
    
    lines.forEach((line: string) => {
      if (yPos > pageHeight - margin - 15) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text(line, margin, yPos);
      yPos += lineHeight;
    });

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('MongoDB Developer Relations • devrel-insights-admin.vercel.app', margin, pageHeight - 10);

    // Download
    const filename = `devrel-insights-${aiSummary.period.toLowerCase().replace(' ', '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  };

  const handlePrint = () => {
    if (!aiSummary) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DevRel Insights - ${aiSummary.period}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #001E2B; }
          .header { background: #00ED64; padding: 20px; margin: -40px -40px 30px -40px; }
          .header h1 { margin: 0; font-size: 24px; }
          .meta { color: #666; margin-bottom: 20px; display: flex; justify-content: space-between; }
          .stats { background: #f5f5f5; padding: 10px 15px; border-radius: 4px; margin-bottom: 20px; }
          .themes { margin-bottom: 20px; }
          .themes h3 { font-size: 14px; margin-bottom: 8px; }
          .theme-chip { display: inline-block; background: #f0e6ff; color: #7C3AED; padding: 4px 12px; border-radius: 16px; margin: 4px 4px 4px 0; font-size: 12px; }
          .summary { line-height: 1.8; }
          .summary p { margin-bottom: 16px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
          @media print { .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header"><h1>DevRel Insights Executive Summary</h1></div>
        <div class="meta">
          <span>${aiSummary.period} Report</span>
          <span>Generated: ${new Date(aiSummary.generatedAt).toLocaleDateString()}</span>
        </div>
        <div class="stats">
          <strong>${aiSummary.stats.total}</strong> Insights &nbsp;•&nbsp;
          <strong>${aiSummary.stats.events}</strong> Events &nbsp;•&nbsp;
          <strong>${aiSummary.stats.advocates}</strong> Advocates
        </div>
        ${aiSummary.themes?.length ? `
          <div class="themes">
            <h3>Key Themes</h3>
            ${aiSummary.themes.map((t) => `<span class="theme-chip">${t}</span>`).join('')}
          </div>
        ` : ''}
        <div class="summary">
          ${aiSummary.summary.split('\n\n').map((p) => `<p>${p}</p>`).join('')}
        </div>
        <div class="footer">MongoDB Developer Relations • devrel-insights-admin.vercel.app</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadExecPDF = () => {
    if (!execData) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;

    // Header
    pdf.setFillColor(0, 237, 100);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setTextColor(0, 30, 43);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DevRel Insights Executive Report', margin, 17);

    yPos = 35;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Key Metrics
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 30, 43);
    pdf.text('Key Metrics', margin, yPos);
    yPos += 10;

    const metrics = [
      { label: 'Total Insights', value: execData.summary.totalInsights, sub: `${execData.summary.thisMonth} this month` },
      { label: 'This Week', value: execData.summary.thisWeek, sub: `${weekTrendPct >= 0 ? '+' : ''}${weekTrendPct}% vs last week` },
      { label: 'Events Tracked', value: execData.summary.totalEvents, sub: 'across all regions' },
      { label: 'Active Advocates', value: execData.summary.activeAdvocates, sub: 'capturing insights' },
    ];

    const boxWidth = (contentWidth - 15) / 4;
    metrics.forEach((m, idx) => {
      const boxX = margin + idx * (boxWidth + 5);
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(boxX, yPos, boxWidth, 25, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(m.label, boxX + 3, yPos + 6);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 30, 43);
      pdf.text(String(m.value), boxX + 3, yPos + 16);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(m.sub, boxX + 3, yPos + 22);
    });
    yPos += 35;

    // Sentiment
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 30, 43);
    pdf.text('Sentiment Breakdown', margin, yPos);
    yPos += 8;

    const sentColors: Record<string, [number, number, number]> = {
      positive: [0, 237, 100], neutral: [1, 107, 248], negative: [239, 68, 68]
    };
    ['positive', 'neutral', 'negative'].forEach((key, idx) => {
      const count = execData.sentiment[key as keyof typeof execData.sentiment];
      const pct = totalSentiment > 0 ? Math.round((count / totalSentiment) * 100) : 0;
      pdf.setFillColor(...sentColors[key]);
      pdf.rect(margin, yPos + idx * 7, 4, 5, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${count} (${pct}%)`, margin + 8, yPos + idx * 7 + 4);
    });
    yPos += 30;

    // Priority
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 30, 43);
    pdf.text('Priority Breakdown', margin, yPos);
    yPos += 8;

    ['Critical', 'High', 'Medium', 'Low'].forEach((p, idx) => {
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${p}: ${execData.byPriority[p] || 0}`, margin, yPos + idx * 6);
    });
    yPos += 30;

    // Top Advocates
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 30, 43);
    pdf.text('Top Advocates', margin, yPos);
    yPos += 8;

    execData.topAdvocates.forEach((a, idx) => {
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${idx + 1}. ${a.name}: ${a.count} insights`, margin, yPos + idx * 6);
    });
    yPos += 40;

    // Product Areas
    if (yPos > pageHeight - 60) { pdf.addPage(); yPos = margin; }
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 30, 43);
    pdf.text('Product Areas', margin, yPos);
    yPos += 8;

    Object.entries(execData.byProductArea).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([area, count], idx) => {
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${area}: ${count}`, margin, yPos + idx * 6);
    });
    yPos += 55;

    // High Priority Insights
    if (execData.recentHighPriority.length > 0) {
      if (yPos > pageHeight - 80) { pdf.addPage(); yPos = margin; }
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 30, 43);
      pdf.text('Recent High-Priority Insights', margin, yPos);
      yPos += 10;

      execData.recentHighPriority.slice(0, 5).forEach((insight) => {
        if (yPos > pageHeight - 30) { pdf.addPage(); yPos = margin; }
        pdf.setFillColor(insight.priority === 'Critical' ? 239 : 249, insight.priority === 'Critical' ? 68 : 115, insight.priority === 'Critical' ? 68 : 22);
        pdf.rect(margin, yPos, 3, 12, 'F');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`[${insight.priority}] ${insight.type}`, margin + 5, yPos + 4);
        pdf.setFontSize(9);
        pdf.setTextColor(40, 40, 40);
        const text = insight.text.length > 80 ? insight.text.slice(0, 80) + '...' : insight.text;
        pdf.text(text, margin + 5, yPos + 10);
        yPos += 16;
      });
    }

    // AI Executive Summary (if available)
    if (aiSummary) {
      pdf.addPage();
      yPos = margin;

      // Section header with purple accent
      pdf.setFillColor(124, 58, 237);
      pdf.rect(margin, yPos, 4, 10, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 30, 43);
      pdf.text('AI Executive Summary', margin + 8, yPos + 7);
      yPos += 15;

      // Period info
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${aiSummary.period} Analysis • Generated ${new Date(aiSummary.generatedAt).toLocaleDateString()}`, margin, yPos);
      yPos += 10;

      // Key themes
      if (aiSummary.themes && aiSummary.themes.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 30, 43);
        pdf.text('Key Themes:', margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        let chipX = margin;
        aiSummary.themes.forEach((theme) => {
          const chipWidth = pdf.getTextWidth(theme) + 8;
          if (chipX + chipWidth > pageWidth - margin) {
            chipX = margin;
            yPos += 8;
          }
          pdf.setFillColor(240, 230, 255);
          pdf.roundedRect(chipX, yPos - 4, chipWidth, 7, 2, 2, 'F');
          pdf.setTextColor(124, 58, 237);
          pdf.setFontSize(8);
          pdf.text(theme, chipX + 4, yPos);
          chipX += chipWidth + 3;
        });
        yPos += 12;
      }

      // Summary content
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);

      const summaryLines = pdf.splitTextToSize(aiSummary.summary, contentWidth);
      const lineHeight = 5;

      summaryLines.forEach((line: string) => {
        if (yPos > pageHeight - margin - 15) {
          pdf.addPage();
          yPos = margin;
        }
        pdf.text(line, margin, yPos);
        yPos += lineHeight;
      });

      yPos += 8;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Based on ${aiSummary.stats.total} insights from ${aiSummary.stats.events} events`, margin, yPos);
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('MongoDB Developer Relations • devrel-insights-admin.vercel.app', margin, pageHeight - 10);

    pdf.save(`devrel-exec-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExecPrint = () => {
    if (!execData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DevRel Insights Executive Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #001E2B; }
          .header { background: #00ED64; padding: 20px; margin: -40px -40px 30px -40px; }
          .header h1 { margin: 0; font-size: 24px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .metric { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          .metric-value { font-size: 24px; font-weight: 700; }
          .metric-label { font-size: 12px; color: #666; }
          .section { margin-bottom: 25px; }
          .section h3 { font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .insight { padding: 10px; margin-bottom: 10px; border-left: 3px solid #F97316; background: #fff8f5; }
          .insight.critical { border-color: #EF4444; background: #fef2f2; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
          @media print { .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header"><h1>DevRel Insights Executive Report</h1></div>
        <div class="grid">
          <div class="metric"><div class="metric-label">Total Insights</div><div class="metric-value">${execData.summary.totalInsights}</div></div>
          <div class="metric"><div class="metric-label">This Week</div><div class="metric-value">${execData.summary.thisWeek}</div></div>
          <div class="metric"><div class="metric-label">Events</div><div class="metric-value">${execData.summary.totalEvents}</div></div>
          <div class="metric"><div class="metric-label">Advocates</div><div class="metric-value">${execData.summary.activeAdvocates}</div></div>
        </div>
        <div class="section">
          <h3>Sentiment</h3>
          <p>Positive: ${execData.sentiment.positive} • Neutral: ${execData.sentiment.neutral} • Negative: ${execData.sentiment.negative}</p>
        </div>
        <div class="section">
          <h3>Top Advocates</h3>
          <ol>${execData.topAdvocates.map(a => `<li>${a.name} (${a.count})</li>`).join('')}</ol>
        </div>
        ${execData.recentHighPriority.length > 0 ? `
          <div class="section">
            <h3>High-Priority Insights</h3>
            ${execData.recentHighPriority.slice(0, 5).map(i => `
              <div class="insight ${i.priority === 'Critical' ? 'critical' : ''}">
                <strong>[${i.priority}]</strong> ${i.type}<br/>
                ${i.text.slice(0, 150)}${i.text.length > 150 ? '...' : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div class="footer">MongoDB Developer Relations • Generated ${new Date().toLocaleDateString()}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleRefresh = () => { setRefreshing(true); loadExecData(); };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Dashboard</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const weekTrend = execData ? execData.summary.thisWeek - execData.summary.lastWeek : 0;
  const weekTrendPct = execData && execData.summary.lastWeek > 0
    ? Math.round((weekTrend / execData.summary.lastWeek) * 100)
    : execData?.summary.thisWeek ? 100 : 0;
  const totalSentiment = execData ? execData.sentiment.positive + execData.sentiment.neutral + execData.sentiment.negative : 0;
  const maxProductArea = execData ? Math.max(...Object.values(execData.byProductArea), 1) : 1;

  return (
    <Box>
      {/* Page Help */}
      <PageHelp page="dashboard" onOpenDrawer={() => openHelp('dashboard')} />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Dashboard</Typography>
            <Typography color="text.secondary">Developer insights from the field</Typography>
          </Box>
          <HelpButton topic="dashboard" onOpenDrawer={openHelp} />
        </Box>
        <Stack direction="row" spacing={1}>
          <MuiTooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh className={refreshing ? 'spinning' : ''} />
            </IconButton>
          </MuiTooltip>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExportCSV}>
            CSV
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<PictureAsPdf />} 
            onClick={tabValue === 0 ? downloadPDF : downloadExecPDF}
            disabled={tabValue === 0 ? !aiSummary : !execData}
          >
            PDF
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Print />} 
            onClick={tabValue === 0 ? handlePrint : handleExecPrint}
            disabled={tabValue === 0 ? !aiSummary : !execData}
          >
            Print
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<Assessment />} iconPosition="start" label="Overview" />
          <Tab icon={<Summarize />} iconPosition="start" label="Executive Reports" />
        </Tabs>
      </Box>

      {/* Tab 0: Overview */}
      <TabPanel value={tabValue} index={0}>
        {/* AI Executive Summary */}
        <Card sx={{ mb: 4, background: `linear-gradient(135deg, ${alpha(COLORS.purple, 0.1)} 0%, ${alpha(COLORS.secondary, 0.05)} 100%)`, border: `1px solid ${alpha(COLORS.purple, 0.2)}` }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome sx={{ color: COLORS.purple }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>AI Executive Summary</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <ToggleButtonGroup value={summaryPeriod} exclusive onChange={(_, v) => v && setSummaryPeriod(v)} size="small">
                  <ToggleButton value="week">Week</ToggleButton>
                  <ToggleButton value="month">Month</ToggleButton>
                  <ToggleButton value="quarter">Quarter</ToggleButton>
                </ToggleButtonGroup>
                <Stack direction="row" spacing={1}>
                  {cachedSummary && !aiSummary && (
                    <Button variant="outlined" onClick={loadCachedSummary} size="small" sx={{ borderColor: COLORS.purple, color: COLORS.purple }}>
                      Load Cached
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={() => generateSummary(!!aiSummary)}
                    disabled={summaryLoading}
                    startIcon={summaryLoading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesome />}
                    sx={{ bgcolor: COLORS.purple, '&:hover': { bgcolor: alpha(COLORS.purple, 0.85) } }}
                  >
                    {summaryLoading ? 'Generating...' : aiSummary ? 'Regenerate' : 'Generate Summary'}
                  </Button>
                </Stack>
              </Box>
            </Box>

            {aiSummary ? (
              <Box>
                {aiSummary.themes?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Key Themes:</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {aiSummary.themes.map((theme, idx) => (
                        <Chip key={idx} label={theme} size="small" sx={{ bgcolor: alpha(COLORS.purple, 0.15), color: COLORS.purple, fontWeight: 500 }} />
                      ))}
                    </Stack>
                  </Box>
                )}
                <Paper sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, position: 'relative' }}>
                  <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <MuiTooltip title={copied ? 'Copied!' : 'Copy'}>
                      <IconButton onClick={copyToClipboard} size="small">
                        {copied ? <Check color="success" /> : <ContentCopy fontSize="small" />}
                      </IconButton>
                    </MuiTooltip>
                    <MuiTooltip title="Download PDF"><IconButton size="small" onClick={downloadPDF}><PictureAsPdf fontSize="small" /></IconButton></MuiTooltip>
                    <MuiTooltip title="Print"><IconButton size="small" onClick={handlePrint}><Print fontSize="small" /></IconButton></MuiTooltip>
                  </Stack>
                  <Typography variant="body1" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap', pr: 4 }}>{aiSummary.summary}</Typography>
                </Paper>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Based on <strong>{aiSummary.stats.total}</strong> insights from <strong>{aiSummary.stats.events}</strong> events
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Generated: {new Date(aiSummary.generatedAt).toLocaleString()}</Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Click "Generate Summary" to create an AI-powered executive brief.</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Metrics */}
        {data && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Total Insights" value={data.summary.totalInsights.toLocaleString()} subtitle="All time" icon={<Lightbulb fontSize="large" />} trend={data.summary.trend} color={COLORS.primary} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Events Covered" value={data.summary.totalEvents} subtitle={`${data.summary.avgInsightsPerEvent} insights/event avg`} icon={<Event fontSize="large" />} color={COLORS.secondary} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Last 30 Days" value={data.summary.last30Days} subtitle="New insights" icon={<Speed fontSize="large" />} color={COLORS.purple} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Sentiment Score" value={`${data.summary.sentimentScore}%`} subtitle="Developer satisfaction" icon={<SentimentSatisfied fontSize="large" />} color={data.summary.sentimentScore >= 60 ? COLORS.success : COLORS.warning} />
            </Grid>
          </Grid>
        )}

        {/* Charts */}
        {data && (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Insights Trend (90 Days)</Typography>
                      <ToggleButtonGroup
                        size="small"
                        value={trendChartMode}
                        exclusive
                        onChange={(_, v) => v && setTrendChartMode(v)}
                      >
                        <ToggleButton value="total">
                          <MuiTooltip title="Total Insights"><Assessment sx={{ fontSize: 18 }} /></MuiTooltip>
                        </ToggleButton>
                        <ToggleButton value="sentiment">
                          <MuiTooltip title="By Sentiment"><SentimentSatisfied sx={{ fontSize: 18 }} /></MuiTooltip>
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={data.charts.insightsByDay}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SENTIMENT_COLORS.Positive} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={SENTIMENT_COLORS.Positive} stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SENTIMENT_COLORS.Neutral} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={SENTIMENT_COLORS.Neutral} stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SENTIMENT_COLORS.Negative} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={SENTIMENT_COLORS.Negative} stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                        <XAxis dataKey="date" stroke={theme.palette.text.secondary} tick={{ fontSize: 12 } as any} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                        <YAxis stroke={theme.palette.text.secondary} tick={{ fontSize: 12 } as any} />
                        <Tooltip content={<CustomTooltip />} />
                        {trendChartMode === 'total' ? (
                          <Area type="monotone" dataKey="total" stroke={COLORS.primary} strokeWidth={2} fill="url(#colorTotal)" name="Total" />
                        ) : (
                          <>
                            <Area type="monotone" dataKey="positive" stackId="1" stroke={SENTIMENT_COLORS.Positive} strokeWidth={1.5} fill="url(#colorPositive)" name="Positive" />
                            <Area type="monotone" dataKey="neutral" stackId="1" stroke={SENTIMENT_COLORS.Neutral} strokeWidth={1.5} fill="url(#colorNeutral)" name="Neutral" />
                            <Area type="monotone" dataKey="negative" stackId="1" stroke={SENTIMENT_COLORS.Negative} strokeWidth={1.5} fill="url(#colorNegative)" name="Negative" />
                            <Legend />
                          </>
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Sentiment Distribution</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={data.charts.sentiment} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                          label={({ name, percent }: any) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                          {data.charts.sentiment.map((entry, idx) => <Cell key={idx} fill={SENTIMENT_COLORS[entry.name] || CHART_COLORS[idx]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Top Product Areas</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.charts.productAreas} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                        <XAxis type="number" stroke={theme.palette.text.secondary} tick={{ fontSize: 12 } as any} />
                        <YAxis type="category" dataKey="name" stroke={theme.palette.text.secondary} tick={{ fontSize: 12 } as any} width={120} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Mentions" radius={[0, 4, 4, 0]}>
                          {data.charts.productAreas.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Insight Types</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.charts.types}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                        <XAxis dataKey="name" stroke={theme.palette.text.secondary} tick={{ fontSize: 11, angle: -45, textAnchor: 'end' } as any} height={80} />
                        <YAxis stroke={theme.palette.text.secondary} tick={{ fontSize: 12 } as any} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Count" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Map and Top Contributors */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Event Locations</Typography>
                    <EventMap height={350} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <EmojiEvents sx={{ color: '#FFD700' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Top Contributors</Typography>
                    </Box>
                    <Stack spacing={2}>
                      {data.lists.topAdvocates.map((advocate, idx) => (
                        <Box key={advocate.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, bgcolor: idx === 0 ? alpha('#FFD700', 0.1) : 'background.default' }}>
                          <Typography sx={{ width: 24, fontWeight: 700, color: idx < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][idx] : 'text.secondary' }}>#{idx + 1}</Typography>
                          <Avatar sx={{ bgcolor: stringToColor(advocate.name), width: 36, height: 36 }}>{getInitials(advocate.name)}</Avatar>
                          <Box sx={{ flex: 1 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{advocate.name}</Typography></Box>
                          <Chip label={advocate.count} size="small" sx={{ bgcolor: COLORS.primary, color: COLORS.dark, fontWeight: 700 }} />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </TabPanel>

      {/* Tab 1: Executive Reports */}
      <TabPanel value={tabValue} index={1}>
        {/* Export Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, gap: 1 }}>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={downloadExecPDF}>
            Export PDF
          </Button>
          <Button variant="outlined" startIcon={<Print />} onClick={handleExecPrint}>
            Print Report
          </Button>
        </Box>
        
        {execLoading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((i) => <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}><Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} /></Grid>)}
          </Grid>
        ) : execData && (
          <>
            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography color="text.secondary" variant="body2">Total Insights</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>{execData.summary.totalInsights}</Typography>
                        <Typography variant="body2" color="text.secondary">{execData.summary.thisMonth} this month</Typography>
                      </Box>
                      <Lightbulb sx={{ fontSize: 40, color: '#00ED64', opacity: 0.7 }} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography color="text.secondary" variant="body2">This Week</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>{execData.summary.thisWeek}</Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {weekTrend >= 0 ? <TrendingUp sx={{ fontSize: 16, color: '#00ED64' }} /> : <TrendingDown sx={{ fontSize: 16, color: '#F44336' }} />}
                          <Typography variant="body2" color={weekTrend >= 0 ? 'success.main' : 'error.main'}>{weekTrend >= 0 ? '+' : ''}{weekTrendPct}% vs last week</Typography>
                        </Stack>
                      </Box>
                      <TrendingUp sx={{ fontSize: 40, color: '#2196F3', opacity: 0.7 }} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography color="text.secondary" variant="body2">Events Tracked</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>{execData.summary.totalEvents}</Typography>
                        <Typography variant="body2" color="text.secondary">across all regions</Typography>
                      </Box>
                      <Event sx={{ fontSize: 40, color: '#9C27B0', opacity: 0.7 }} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography color="text.secondary" variant="body2">Active Advocates</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>{execData.summary.activeAdvocates}</Typography>
                        <Typography variant="body2" color="text.secondary">capturing insights</Typography>
                      </Box>
                      <People sx={{ fontSize: 40, color: '#FF9800', opacity: 0.7 }} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Sentiment & Priority & Top Advocates */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Sentiment Breakdown</Typography>
                    <Stack spacing={2}>
                      {[{ label: 'Positive', count: execData.sentiment.positive, icon: <SentimentSatisfied color="success" />, color: 'success' as const },
                        { label: 'Neutral', count: execData.sentiment.neutral, icon: <SentimentNeutral color="action" />, color: 'inherit' as const },
                        { label: 'Negative', count: execData.sentiment.negative, icon: <SentimentDissatisfied color="error" />, color: 'error' as const }].map((s) => (
                        <Box key={s.label}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>{s.icon}<Typography>{s.label}</Typography></Stack>
                            <Typography fontWeight={600}>{s.count} ({totalSentiment > 0 ? Math.round((s.count / totalSentiment) * 100) : 0}%)</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={totalSentiment > 0 ? (s.count / totalSentiment) * 100 : 0} color={s.color} sx={{ height: 8, borderRadius: 4 }} />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>By Priority</Typography>
                    <Stack spacing={1.5}>
                      {['Critical', 'High', 'Medium', 'Low'].map((priority) => (
                        <Stack key={priority} direction="row" justifyContent="space-between" alignItems="center">
                          <Chip label={priority} size="small" sx={{ bgcolor: `${PRIORITY_COLORS[priority]}20`, color: PRIORITY_COLORS[priority], fontWeight: 600, minWidth: 70 }} />
                          <Typography fontWeight={600}>{execData.byPriority[priority] || 0}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Top Advocates</Typography>
                    <Stack spacing={1.5}>
                      {execData.topAdvocates.map((advocate, idx) => (
                        <Stack key={advocate.name} direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{idx + 1}</Typography>
                            <Typography>{advocate.name}</Typography>
                          </Stack>
                          <Chip label={advocate.count} size="small" />
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Product Areas */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Insights by Product Area</Typography>
                <Grid container spacing={2}>
                  {Object.entries(execData.byProductArea).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([area, count]) => (
                    <Grid key={area} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2">{area}</Typography>
                          <Typography variant="body2" fontWeight={600}>{count}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={(count / maxProductArea) * 100} sx={{ height: 6, borderRadius: 3, bgcolor: '#E0E0E0', '& .MuiLinearProgress-bar': { bgcolor: '#00ED64' } }} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Recent High Priority */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Recent High-Priority Insights</Typography>
                {execData.recentHighPriority.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No critical or high priority insights yet</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Priority</TableCell>
                          <TableCell>Insight</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Event</TableCell>
                          <TableCell>Advocate</TableCell>
                          <TableCell>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {execData.recentHighPriority.map((insight) => (
                          <TableRow key={insight._id} hover>
                            <TableCell><Chip label={insight.priority} size="small" sx={{ bgcolor: `${PRIORITY_COLORS[insight.priority]}20`, color: PRIORITY_COLORS[insight.priority], fontWeight: 600 }} /></TableCell>
                            <TableCell sx={{ maxWidth: 400 }}><Typography variant="body2">{insight.text.length > 120 ? `${insight.text.slice(0, 120)}...` : insight.text}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{insight.type}</Typography></TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{insight.eventName || '-'}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{insight.advocateName}</Typography></TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{new Date(insight.capturedAt).toLocaleDateString()}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </TabPanel>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; }
      `}</style>
    </Box>
  );
}
