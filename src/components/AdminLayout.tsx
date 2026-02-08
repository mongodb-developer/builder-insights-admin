'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Avatar,
  Chip,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Event as EventIcon,
  Lightbulb as InsightIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Upload as ImportIcon,
  Settings as SettingsIcon,
  EmojiEvents as EmojiEventsIcon,
  Logout as LogoutIcon,
  PhoneIphone as PhoneIcon,
  OpenInNew as OpenInNewIcon,
  BugReport as BugReportIcon,
  Public as PublicIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';
import BugReportFab from './BugReportFab';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon />, highlight: true },
  { label: 'Events', href: '/events', icon: <EventIcon /> },
  { label: 'Insights', href: '/insights', icon: <InsightIcon /> },
  { label: 'Advocates', href: '/advocates', icon: <PeopleIcon /> },
  { label: 'Leaderboard', href: '/leaderboard', icon: <EmojiEventsIcon /> },
  { label: 'World Map', href: '/world', icon: <PublicIcon /> },
  { divider: true },
  { label: 'Bug Reports', href: '/bugs', icon: <BugReportIcon /> },
  { label: 'PMO Import', href: '/import', icon: <ImportIcon /> },
  { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
  { divider: true },
  { label: 'User Management', href: '/admin/users', icon: <AdminIcon /> },
];

interface Props {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2 }}>
        <Box
          component="img"
          src="/banner-light.png"
          alt="DevRel Insights"
          sx={{
            width: '100%',
            height: 'auto',
            borderRadius: 1,
            mb: 1,
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Admin Portal
          </Typography>
          <Chip label="Admin" size="small" sx={{ height: 20, fontSize: 11 }} />
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {navItems.map((item, index) =>
          'divider' in item ? (
            <Divider key={index} sx={{ my: 1 }} />
          ) : (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                onClick={() => handleNavClick(item.href!)}
                selected={pathname === item.href}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: `${mongoColors.green}20`,
                    '&:hover': {
                      bgcolor: `${mongoColors.green}30`,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: pathname === item.href ? mongoColors.darkGreen : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: pathname === item.href ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        )}
      </List>

      {/* Mobile App Banner */}
      <Box
        sx={{
          mx: 2,
          mb: 2,
          p: 2,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${mongoColors.green}15 0%, ${mongoColors.darkGreen}10 100%)`,
          border: `1px solid ${mongoColors.green}30`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PhoneIcon sx={{ color: mongoColors.darkGreen, fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: mongoColors.darkGreen }}>
            Get the Mobile App
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Capture insights at conferences with our iOS app.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
          href="https://testflight.apple.com/join/rAqHXs1Y"
          target="_blank"
          sx={{
            bgcolor: mongoColors.darkGreen,
            '&:hover': { bgcolor: mongoColors.green, color: mongoColors.black },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Join TestFlight Beta
        </Button>
      </Box>

      {/* Footer with Logout */}
      <Box sx={{ p: 2, borderTop: `1px solid ${mongoColors.gray[200]}` }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            mb: 1,
            color: 'text.secondary',
            borderColor: mongoColors.gray[300],
            '&:hover': {
              borderColor: mongoColors.gray[500],
              bgcolor: mongoColors.gray[100],
            },
          }}
        >
          Sign Out
        </Button>
        <Typography variant="caption" color="text.secondary">
          MongoDB DevRel Tools
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar (mobile) */}
      <AppBar
        position="fixed"
        sx={{
          display: { md: 'none' },
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            DevRel Insights
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer (mobile) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Drawer (desktop) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: `1px solid ${mongoColors.gray[200]}`,
          },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          pt: { xs: 8, md: 0 },
        }}
      >
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>

      {/* Bug Report FAB */}
      <BugReportFab />
    </Box>
  );
}
