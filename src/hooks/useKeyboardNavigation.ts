import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardNavigationOptions {
  items: readonly unknown[];
  onSelect?: (index: number, item: unknown) => void;
  onEscape?: () => void;
  loop?: boolean;
  disabled?: boolean;
}

export interface KeyboardNavigationResult {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  getItemProps: (index: number) => {
    'aria-selected': boolean;
    tabIndex: number;
    onFocus: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
  };
  containerProps: {
    role: string;
    'aria-label': string;
    onKeyDown: (event: React.KeyboardEvent) => void;
  };
}

export const useKeyboardNavigation = (
  options: KeyboardNavigationOptions
): KeyboardNavigationResult => {
  const { items, onSelect, onEscape, loop = true, disabled = false } = options;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLElement | null>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled || items.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => {
          if (loop) {
            return (prev + 1) % items.length;
          }
          return Math.min(prev + 1, items.length - 1);
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => {
          if (loop) {
            return prev === 0 ? items.length - 1 : prev - 1;
          }
          return Math.max(prev - 1, 0);
        });
        break;

      case 'Home':
        event.preventDefault();
        setSelectedIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setSelectedIndex(items.length - 1);
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onSelect && selectedIndex >= 0 && selectedIndex < items.length) {
          onSelect(selectedIndex, items[selectedIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        if (onEscape) {
          onEscape();
        }
        break;
    }
  }, [disabled, items, loop, onSelect, onEscape, selectedIndex]);

  // Reset selection when items change
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // Focus management
  const focusSelectedItem = useCallback(() => {
    if (containerRef.current) {
      const selectedElement = containerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      ) as HTMLElement;
      if (selectedElement) {
        selectedElement.focus();
      }
    }
  }, [selectedIndex]);

  // Use the focus function
  useEffect(() => {
    focusSelectedItem();
  }, [focusSelectedItem]);

  const getItemProps = useCallback((index: number) => ({
    'aria-selected': index === selectedIndex,
    'tabIndex': index === selectedIndex ? 0 : -1,
    'data-index': index,
    onFocus: () => setSelectedIndex(index),
    onKeyDown: handleKeyDown,
  }), [selectedIndex, handleKeyDown]);

  const containerProps = {
    role: 'listbox' as const,
    'aria-label': 'Navigatable list',
    onKeyDown: handleKeyDown,
    ref: (element: HTMLElement | null) => {
      containerRef.current = element;
    },
  };

  return {
    selectedIndex,
    setSelectedIndex,
    getItemProps,
    containerProps,
  };
};

// Hook for managing focus trap
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Focus first element when trap is activated
    firstElement.focus();

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
};

// Hook for managing announcement regions
export const useAnnouncer = () => {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<number>(0);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message);
    
    // Clear announcement after a delay to allow screen readers to read it
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      setAnnouncement('');
    }, priority === 'assertive' ? 1000 : 3000);
  }, []);

  const announcementProps = {
    'aria-live': 'polite' as const,
    'aria-atomic': true,
    className: 'sr-only',
    children: announcement,
  };

  return { announce, announcementProps };
};

// Hook for skip links
export const useSkipLinks = () => {
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      (mainContent as HTMLElement).focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('nav');
    if (navigation) {
      (navigation as HTMLElement).focus();
      navigation.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return { skipToContent, skipToNavigation };
};