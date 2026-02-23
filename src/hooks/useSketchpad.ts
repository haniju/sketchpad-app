import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid/non-secure'; // version sans crypto, compatible RN
import { getSvgPathFromPoints, getStrokeBoundingBox } from '../utils/drawingUtils';
import { BrushType, Point, Stroke, SelectionRect } from '../types';

export function useSketchpad() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  const [currentTool, setCurrentTool] = useState<BrushType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [currentWidth, setCurrentWidth] = useState<number>(5);

  const [selection, setSelection] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const markClean = useCallback(() => setIsDirty(false), []);
  const markDirty = useCallback(() => setIsDirty(true), []);

  const loadStrokes = useCallback((newStrokes: Stroke[]) => {
    setStrokes(newStrokes);
    setUndoStack([]);
    setRedoStack([]);
    setSelection([]);
    setFocusedId(null);
    setCurrentStroke(null);
    setIsDirty(false);
  }, []);

  const saveStateToUndo = useCallback(
    (currentStrokes: Stroke[]) => {
      setUndoStack(prev => [...prev, currentStrokes].slice(-50));
      setRedoStack([]);
      markDirty();
    },
    [markDirty]
  );

  const startDrawing = useCallback(
    (point: Point) => {
      if (currentTool === 'eraser' || currentTool === 'select') return;
      const newStroke: Stroke = {
        id: nanoid(),
        points: [point],
        color: currentColor,
        strokeWidth: currentTool === 'calligraphy' ? currentWidth * 1.5 : currentWidth,
        brushType: currentTool,
        pathData: getSvgPathFromPoints([point]),
      };
      setCurrentStroke(newStroke);
    },
    [currentTool, currentColor, currentWidth]
  );

  const continueDrawing = useCallback((point: Point) => {
    setCurrentStroke(prev => {
      if (!prev) return prev;
      const newPoints = [...prev.points, point];
      return { ...prev, points: newPoints, pathData: getSvgPathFromPoints(newPoints) };
    });
  }, []);

  const endDrawing = useCallback(() => {
    setCurrentStroke(prev => {
      if (prev && prev.points.length > 0) {
        setStrokes(s => {
          const next = [...s, prev];
          saveStateToUndo(s); // sauvegarde AVANT ajout
          return next;
        });
      }
      return null;
    });
  }, [saveStateToUndo]);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const previousState = prev[prev.length - 1];
      setRedoStack(r => [...r, strokes]);
      setStrokes(previousState);
      setSelection([]);
      setFocusedId(null);
      markDirty();
      return prev.slice(0, -1);
    });
  }, [strokes, markDirty]);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const nextState = prev[prev.length - 1];
      setUndoStack(u => [...u, strokes]);
      setStrokes(nextState);
      setSelection([]);
      setFocusedId(null);
      markDirty();
      return prev.slice(0, -1);
    });
  }, [strokes, markDirty]);

  const clear = useCallback(() => {
    if (strokes.length === 0) return;
    saveStateToUndo(strokes);
    setStrokes([]);
    setSelection([]);
    setFocusedId(null);
  }, [strokes, saveStateToUndo]);

  const removeStroke = useCallback(
    (id: string) => {
      saveStateToUndo(strokes);
      setStrokes(prev => prev.filter(s => s.id !== id));
      setSelection(prev => prev.filter(sId => sId !== id));
      setFocusedId(prev => (prev === id ? null : prev));
    },
    [strokes, saveStateToUndo]
  );

  const toggleSelection = useCallback((id: string) => {
    setSelection(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
    setFocusedId(prev => (prev === id ? null : prev));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection([]);
    setFocusedId(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelection(strokes.map(s => s.id));
  }, [strokes]);

  const deleteSelected = useCallback(() => {
    if (selection.length === 0) return;
    saveStateToUndo(strokes);
    setStrokes(prev => prev.filter(s => !selection.includes(s.id)));
    setSelection([]);
    setFocusedId(null);
  }, [selection, strokes, saveStateToUndo]);

  const selectByRect = useCallback(
    (rect: SelectionRect) => {
      const minX = Math.min(rect.x1, rect.x2);
      const maxX = Math.max(rect.x1, rect.x2);
      const minY = Math.min(rect.y1, rect.y2);
      const maxY = Math.max(rect.y1, rect.y2);

      const selectedIds = strokes
        .filter(stroke => {
          const bb = getStrokeBoundingBox(stroke);
          return bb.maxX >= minX && bb.minX <= maxX && bb.maxY >= minY && bb.minY <= maxY;
        })
        .map(s => s.id);

      setSelection(selectedIds);
      setFocusedId(null);
    },
    [strokes]
  );

  const toggleFocused = useCallback((id: string) => {
    setFocusedId(prev => (prev === id ? null : id));
  }, []);

  return {
    strokes,
    currentStroke,
    currentTool,
    currentColor,
    currentWidth,
    selection,
    focusedId,
    isDirty,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    setCurrentTool,
    setCurrentColor,
    setCurrentWidth,
    setFocusedId,
    startDrawing,
    continueDrawing,
    endDrawing,
    undo,
    redo,
    clear,
    removeStroke,
    toggleSelection,
    toggleFocused,
    clearSelection,
    deleteSelected,
    selectAll,
    selectByRect,
    loadStrokes,
    markClean,
  };
}
