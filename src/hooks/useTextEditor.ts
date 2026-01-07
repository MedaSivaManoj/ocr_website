import { useState, useCallback, useRef } from 'react';

interface HistoryState {
  past: string[];
  present: string;
  future: string[];
}

interface UseTextEditorOptions {
  initialText: string;
  maxHistory?: number;
}

interface UseTextEditorReturn {
  text: string;
  setText: (newText: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (newText: string) => void;
  historyLength: { past: number; future: number };
}

export function useTextEditor({
  initialText,
  maxHistory = 100,
}: UseTextEditorOptions): UseTextEditorReturn {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialText,
    future: [],
  });

  // Debounce timer for grouping rapid changes
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingText = useRef<string | null>(null);

  const commitChange = useCallback((newText: string) => {
    setHistory((prev) => {
      // Don't add to history if text hasn't changed
      if (newText === prev.present) return prev;

      const newPast = [...prev.past, prev.present];
      // Limit history size
      if (newPast.length > maxHistory) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: newText,
        future: [], // Clear future on new change
      };
    });
  }, [maxHistory]);

  const setText = useCallback((newText: string) => {
    pendingText.current = newText;

    // If this is the first change after an idle period, push current present to past immediately
    // so that undo is available immediately (avoids waiting for debounce).
    setHistory((prev) => {
      const alreadyPending = debounceTimer.current !== null;

      if (!alreadyPending) {
        const newPast = [...prev.past, prev.present];
        // Limit history size
        if (newPast.length > maxHistory) {
          newPast.shift();
        }

        return {
          past: newPast,
          present: newText,
          future: [],
        };
      }

      // If already pending, just update present
      return {
        ...prev,
        present: newText,
      };
    });

    // Debounce the history commit (300ms)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (pendingText.current !== null) {
        commitChange(pendingText.current);
        pendingText.current = null;
        debounceTimer.current = null;
      }
    }, 300);
  }, [commitChange, maxHistory]);

  const undo = useCallback(() => {
    // Clear any pending debounced changes
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    pendingText.current = null;

    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const newPast = [...prev.past];
      const previous = newPast.pop()!;

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    // Clear any pending debounced changes
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    pendingText.current = null;

    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const newFuture = [...prev.future];
      const next = newFuture.shift()!;

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newText: string) => {
    // Clear any pending debounced changes
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    pendingText.current = null;

    setHistory({
      past: [],
      present: newText,
      future: [],
    });
  }, []);

  return {
    text: history.present,
    setText,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    reset,
    historyLength: {
      past: history.past.length,
      future: history.future.length,
    },
  };
}
