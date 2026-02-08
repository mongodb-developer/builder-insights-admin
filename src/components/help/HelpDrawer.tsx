'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
  Collapse,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Lightbulb as TipIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { mongoColors } from '@/theme';
import { helpTopics, searchHelp, type HelpTopic } from './helpContent';

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
  initialTopic?: string;
}

export default function HelpDrawer({ open, onClose, initialTopic }: HelpDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [searchResults, setSearchResults] = useState<HelpTopic[]>(Object.values(helpTopics));

  // Handle initial topic selection
  useEffect(() => {
    if (open && initialTopic && helpTopics[initialTopic]) {
      setSelectedTopic(helpTopics[initialTopic]);
    }
  }, [open, initialTopic]);

  // Search as user types
  useEffect(() => {
    setSearchResults(searchHelp(searchQuery));
  }, [searchQuery]);

  // Keyboard shortcut: ? to open help
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (event.key === '?' && !open) {
        // This would need to be handled by parent component
      }
      if (event.key === 'Escape' && open) {
        onClose();
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleClose = () => {
    setSearchQuery('');
    setSelectedTopic(null);
    onClose();
  };

  const handleTopicClick = (topic: HelpTopic) => {
    setSelectedTopic(topic);
  };

  const handleBack = () => {
    setSelectedTopic(null);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400 },
          maxWidth: '100vw',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${mongoColors.gray[200]}`,
            background: `linear-gradient(135deg, ${mongoColors.green}10 0%, ${mongoColors.darkGreen}05 100%)`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectedTopic ? (
                <>
                  <IconButton size="small" onClick={handleBack} sx={{ mr: 0.5 }}>
                    <ArrowIcon sx={{ transform: 'rotate(180deg)', fontSize: 20 }} />
                  </IconButton>
                  {selectedTopic.icon} {selectedTopic.title}
                </>
              ) : (
                <>📚 Help & Documentation</>
              )}
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Search - only show on topic list */}
          {!selectedTopic && (
            <TextField
              fullWidth
              size="small"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                },
              }}
            />
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {selectedTopic ? (
            <TopicDetail topic={selectedTopic} onNavigate={handleTopicClick} />
          ) : (
            <TopicList topics={searchResults} onSelect={handleTopicClick} />
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${mongoColors.gray[200]}`,
            bgcolor: mongoColors.gray[100],
          }}
        >
          <Typography variant="caption" color="text.secondary">
            💡 Press <Chip label="?" size="small" sx={{ height: 20, fontSize: 11 }} /> anywhere to open help
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}

// Topic list view
function TopicList({
  topics,
  onSelect,
}: {
  topics: HelpTopic[];
  onSelect: (topic: HelpTopic) => void;
}) {
  // Group topics by category
  const categories = {
    'Core Concepts': ['insights', 'events', 'advocates', 'sentiment', 'priority'],
    Features: ['dashboard', 'leaderboard', 'world-map', 'pmo-import'],
    'Mobile App': ['mobile-app', 'voice-recording'],
    Admin: ['user-management'],
  };

  return (
    <List sx={{ py: 0 }}>
      {Object.entries(categories).map(([category, topicIds]) => {
        const categoryTopics = topicIds
          .map((id) => topics.find((t) => t.id === id))
          .filter(Boolean) as HelpTopic[];

        if (categoryTopics.length === 0) return null;

        return (
          <Box key={category}>
            <Typography
              variant="overline"
              sx={{
                px: 2,
                py: 1,
                display: 'block',
                color: 'text.secondary',
                fontWeight: 600,
                bgcolor: mongoColors.gray[100],
              }}
            >
              {category}
            </Typography>
            {categoryTopics.map((topic) => (
              <ListItemButton
                key={topic.id}
                onClick={() => onSelect(topic)}
                sx={{
                  px: 2,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: `${mongoColors.green}10`,
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{topic.icon}</span>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {topic.title}
                      </Typography>
                    </Box>
                  }
                  secondary={topic.summary}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    sx: { mt: 0.5 },
                  }}
                />
                <ArrowIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
              </ListItemButton>
            ))}
          </Box>
        );
      })}
    </List>
  );
}

// Topic detail view
function TopicDetail({
  topic,
  onNavigate,
}: {
  topic: HelpTopic;
  onNavigate: (topic: HelpTopic) => void;
}) {
  const [tipsExpanded, setTipsExpanded] = useState(true);

  return (
    <Box sx={{ p: 2 }}>
      {/* Summary */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: `${mongoColors.green}08`,
          border: `1px solid ${mongoColors.green}20`,
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {topic.summary}
        </Typography>
      </Paper>

      {/* Main content */}
      <Typography
        variant="body2"
        sx={{
          whiteSpace: 'pre-line',
          lineHeight: 1.7,
          '& strong': {
            fontWeight: 600,
            color: mongoColors.darkGreen,
          },
        }}
        dangerouslySetInnerHTML={{
          __html: topic.content
            .trim()
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br />'),
        }}
      />

      {/* Tips */}
      {topic.tips && topic.tips.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box
            onClick={() => setTipsExpanded(!tipsExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              mb: 1,
            }}
          >
            <TipIcon sx={{ color: mongoColors.green, fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Pro Tips
            </Typography>
            {tipsExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
          <Collapse in={tipsExpanded}>
            <Box
              sx={{
                pl: 3.5,
                borderLeft: `2px solid ${mongoColors.green}30`,
              }}
            >
              {topic.tips.map((tip, i) => (
                <Typography
                  key={i}
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1, '&:last-child': { mb: 0 } }}
                >
                  • {tip}
                </Typography>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Screenshots */}
      {topic.screenshots && topic.screenshots.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            📸 App Screenshots
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1.5,
            }}
          >
            {topic.screenshots.map((screenshot, idx) => (
              <Box
                key={idx}
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: `1px solid ${mongoColors.gray[200]}`,
                  bgcolor: mongoColors.gray[100],
                }}
              >
                <Box
                  component="img"
                  src={screenshot.src}
                  alt={screenshot.alt}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.02)',
                    },
                  }}
                  onClick={() => window.open(screenshot.src, '_blank')}
                />
                {screenshot.caption && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      p: 1,
                      textAlign: 'center',
                      bgcolor: 'background.paper',
                    }}
                  >
                    {screenshot.caption}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Related topics */}
      {topic.relatedTopics && topic.relatedTopics.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Related Topics
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {topic.relatedTopics.map((relatedId) => {
              const relatedTopic = helpTopics[relatedId];
              if (!relatedTopic) return null;
              return (
                <Chip
                  key={relatedId}
                  label={`${relatedTopic.icon} ${relatedTopic.title}`}
                  size="small"
                  onClick={() => onNavigate(relatedTopic)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: `${mongoColors.green}20`,
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
