import { useCallback, useState } from "react";

type HistoryState = {
  past: string[];
  present: string;
  future: string[];
};

export function useDocumentHistory(initialValue: string) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialValue,
    future: [],
  });

  const setDocument = useCallback((next: string | ((current: string) => string)) => {
    setHistory((current) => {
      const resolved = typeof next === "function" ? next(current.present) : next;
      if (resolved === current.present) return current;
      return {
        past: [...current.past, current.present],
        present: resolved,
        future: [],
      };
    });
  }, []);

  const replaceDocument = useCallback((next: string) => {
    setHistory((current) => ({ ...current, present: next }));
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) return current;
      const previous = current.past[current.past.length - 1];
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current;
      const next = current.future[0];
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    src: history.present,
    setDocument,
    replaceDocument,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
