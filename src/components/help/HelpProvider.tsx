'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import HelpDrawer from './HelpDrawer';
import OnboardingTour from './OnboardingTour';

interface HelpContextValue {
  openHelp: (topic?: string) => void;
  closeHelp: () => void;
  isHelpOpen: boolean;
  startTour: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}

interface HelpProviderProps {
  children: ReactNode;
  enableTour?: boolean;
}

/**
 * Provider that manages help drawer and onboarding tour state.
 * Wrap your app layout with this to enable help features.
 * 
 * Usage:
 * <HelpProvider>
 *   <AdminLayout>{children}</AdminLayout>
 * </HelpProvider>
 * 
 * Then in any component:
 * const { openHelp, startTour } = useHelp();
 */
export default function HelpProvider({ children, enableTour = true }: HelpProviderProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<string | undefined>();
  const [tourRunning, setTourRunning] = useState(false);

  const openHelp = useCallback((topic?: string) => {
    setHelpTopic(topic);
    setHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    setHelpTopic(undefined);
  }, []);

  const startTour = useCallback(() => {
    setTourRunning(true);
  }, []);

  // Global keyboard shortcut: ? to open help
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // ? key (Shift + /)
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        openHelp();
      }

      // Escape to close
      if (event.key === 'Escape' && helpOpen) {
        closeHelp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [helpOpen, openHelp, closeHelp]);

  return (
    <HelpContext.Provider value={{ openHelp, closeHelp, isHelpOpen: helpOpen, startTour }}>
      {children}
      <HelpDrawer
        open={helpOpen}
        onClose={closeHelp}
        initialTopic={helpTopic}
      />
      {enableTour && (
        <OnboardingTour
          forceShow={tourRunning}
          onComplete={() => setTourRunning(false)}
        />
      )}
    </HelpContext.Provider>
  );
}
