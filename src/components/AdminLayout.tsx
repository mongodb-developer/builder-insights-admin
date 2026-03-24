'use client';

import { useState, useEffect } from 'react';
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
  Chip,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Event as EventIcon,
  Lightbulb as InsightIcon,
  People as PeopleIcon,
  Upload as ImportIcon,
  Settings as SettingsIcon,
  EmojiEvents as EmojiEventsIcon,
  Logout as LogoutIcon,
  PhoneIphone as PhoneIcon,
  OpenInNew as OpenInNewIcon,
  BugReport as BugReportIcon,
  Public as PublicIcon,
  AdminPanelSettings as AdminIcon,
  Help as HelpIcon,
  Search as SearchIcon,
  Build as BuildIcon,
  AccountTree as ProgramIcon,
  Monitor as MonitoringIcon,
  VpnKey as ApiKeyIcon,
  Code as DeveloperIcon,
  Person as PersonIcon,
  DynamicForm as FormsIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';
import BugReportFab from './BugReportFab';
import { HelpProvider, useHelp } from './help';
import ProfileCompletenessBanner from './ProfileCompletenessBanner';
import ProfileEditDialog from './ProfileEditDialog';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon />, highlight: true },
  { label: 'Search', href: '/search', icon: <SearchIcon /> },
  { divider: true },
  { label: 'Events', href: '/events', icon: <EventIcon /> },
  { label: 'Insights', href: '/insights', icon: <InsightIcon /> },
  { label: 'Feedback Forms', href: '/forms', icon: <FormsIcon />, minRole: 'advocate' },
  { label: 'Advocates', href: '/advocates', icon: <PeopleIcon /> },
  { label: 'Leaderboard', href: '/leaderboard', icon: <EmojiEventsIcon /> },
  { label: 'World Map', href: '/world', icon: <PublicIcon /> },
  { divider: true },
  { label: 'Program', href: '/program', icon: <ProgramIcon />, minRole: 'manager' },
  { label: 'Bug Reports', href: '/bugs', icon: <BugReportIcon /> },
  { label: 'PMO Import', href: '/import', icon: <ImportIcon />, minRole: 'manager' },
  { label: 'Developer API', href: '/developer/api-keys', icon: <DeveloperIcon /> },
  { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
  { divider: true, adminOnly: true },
  { label: 'API Keys', href: '/admin/api-keys', icon: <ApiKeyIcon />, adminOnly: true },
  { label: 'Monitoring', href: '/monitoring', icon: <MonitoringIcon />, adminOnly: true },
  { label: 'Operations', href: '/operations', icon: <BuildIcon />, adminOnly: true },
  { label: 'User Management', href: '/admin/users', icon: <AdminIcon />, adminOnly: true },
];

// Role hierarchy for nav filtering
const ROLE_LEVELS: Record<string, number> = {
  admin: 100,
  manager: 75,
  advocate: 50,
  viewer: 25,
};

interface Props {
  children: React.ReactNode;
}

interface UserInfo {
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

// Inner layout component that can use useHelp
function AdminLayoutInner({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const { openHelp } = useHelp();

  // Check user info
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject('Not authenticated'))
      .then(data => setUser({
        email: data.email,
        name: data.name,
        role: data.role || 'viewer',
        isAdmin: data.isAdmin === true || data.role === 'admin',
      }))
      .catch(() => setUser(null));
  }, []);

  const isAdmin = user?.isAdmin ?? false;
  const userRoleLevel = ROLE_LEVELS[user?.role || 'viewer'] || 25;

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => {
    // Admin-only items
    if ('adminOnly' in item && item.adminOnly) {
      if (user === null) return true; // Show while loading
      return isAdmin;
    }
    // Items with minimum role requirement
    if ('minRole' in item && item.minRole) {
      if (user === null) return true; // Show while loading
      const requiredLevel = ROLE_LEVELS[item.minRole as string] || 0;
      return userRoleLevel >= requiredLevel;
    }
    return true;
  });

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            component="img"
            src="/logo.svg"
            alt="Builder Insights"
            sx={{
              width: 40,
              height: 40,
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1.2 }}>
            Builder Insights
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Admin Portal
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Help (?)">
              <IconButton
                size="small"
                onClick={() => openHelp()}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: mongoColors.darkGreen,
                    bgcolor: `${mongoColors.green}10`,
                  },
                }}
              >
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Chip 
              label={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Loading...'} 
              size="small" 
              color={isAdmin ? 'error' : user?.role === 'viewer' ? 'default' : 'primary'}
              sx={{ height: 20, fontSize: 11 }} 
            />
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {visibleNavItems.map((item, index) =>
          'divider' in item ? (
            <Divider key={index} sx={{ my: 1 }} />
          ) : (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                data-tour={`nav-${item.href?.replace('/', '')}`}
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

      {/* Footer with Profile & Logout */}
      <Box sx={{ p: 2, borderTop: `1px solid ${mongoColors.gray[200]}` }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<PersonIcon />}
          onClick={() => setProfileDialogOpen(true)}
          sx={{
            mb: 1,
            color: mongoColors.darkGreen,
            borderColor: `${mongoColors.green}60`,
            '&:hover': {
              borderColor: mongoColors.darkGreen,
              bgcolor: `${mongoColors.green}10`,
            },
          }}
        >
          My Profile
        </Button>
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
          MongoDB Builder Tools
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
            Builder Insights
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
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <ProfileCompletenessBanner onEditProfile={() => setProfileDialogOpen(true)} />
          {children}
        </Box>
      </Box>

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      />

      {/* Bug Report FAB */}
      <BugReportFab />
    </Box>
  );
}

// Wrap with HelpProvider so help context is available
export default function AdminLayout({ children }: Props) {
  return (
    <HelpProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </HelpProvider>
  );
}
