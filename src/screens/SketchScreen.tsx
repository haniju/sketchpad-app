import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Dimensions,
  PanResponder,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { SkiaCanvas } from '../components/SkiaCanvas';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { SelectionPanel } from '../components/SelectionPanel';
import { useSketchpad } from '../hooks/useSketchpad';
import { useDrawingStorage } from '../hooks/useDrawingStorage';
import { generateSvgContent } from '../utils/drawingUtils';
import { Point, Stroke } from '../types';

const DRAG_THRESHOLD = 5;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SketchScreenProps {
  drawingId?: string;
  drawingName?: string;
  initialStrokes?: Stroke[];
}

function findNearestStrokeId(x: number, y: number, strokes: Stroke[], radius: number): string | null {
  let bestId: string | null = null;
  let bestDist = radius;
  for (const stroke of strokes) {
    for (const pt of stroke.points) {
      const d = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2);
      if (d < bestDist) { bestDist = d; bestId = stroke.id; }
    }
  }
  return bestId;
}

export function SketchScreen({ drawingId, drawingName = 'Sans titre', initialStrokes }: SketchScreenProps) {
  const [canvasLayout, setCanvasLayout] = useState({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const [currentDrawingId, setCurrentDrawingId] = useState<string | undefined>(drawingId);
  const [name] = useState(drawingName);
  const [isSaving, setIsSaving] = useState(false);

  const sketch = useSketchpad();
  const storage = useDrawingStorage();

  // Charger les tracés initiaux (mode édition)
  useEffect(() => {
    if (initialStrokes && initialStrokes.length > 0) {
      sketch.loadStrokes(initialStrokes);
    }
  }, []); // une seule fois au montage

  // Refs stables pour PanResponder (évite les closures périmées)
  const sketchRef = useRef(sketch);
  sketchRef.current = sketch;
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasLayoutRef = useRef(canvasLayout);
  canvasLayoutRef.current = canvasLayout;
  const setDragRectRef = useRef(setDragRect);
  const setDragStartRef = useRef(setDragStart);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { pageX, pageY, force } = evt.nativeEvent;
        const layout = canvasLayoutRef.current;
        const x = pageX - layout.x;
        const y = pageY - layout.y;
        const pressure = (Platform.OS === 'android' && force > 0) ? force : 0.5;
        const tool = sketchRef.current.currentTool;

        if (tool === 'select') {
          dragStartRef.current = { x, y };
          setDragStartRef.current({ x, y });
          setDragRectRef.current({ x, y, width: 0, height: 0 });
          return;
        }
        if (tool !== 'eraser') {
          sketchRef.current.startDrawing({ x, y, pressure });
        }
      },

      onPanResponderMove: (evt) => {
        const { pageX, pageY, force } = evt.nativeEvent;
        const layout = canvasLayoutRef.current;
        const x = pageX - layout.x;
        const y = pageY - layout.y;
        const pressure = (Platform.OS === 'android' && force > 0) ? force : 0.5;
        const tool = sketchRef.current.currentTool;

        if (tool === 'eraser') {
          const nearId = findNearestStrokeId(x, y, sketchRef.current.strokes, 20);
          if (nearId) sketchRef.current.removeStroke(nearId);
          return;
        }
        if (tool === 'select' && dragStartRef.current) {
          const ds = dragStartRef.current;
          setDragRectRef.current({
            x: Math.min(ds.x, x), y: Math.min(ds.y, y),
            width: Math.abs(x - ds.x), height: Math.abs(y - ds.y),
          });
          return;
        }
        sketchRef.current.continueDrawing({ x, y, pressure });
      },

      onPanResponderRelease: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const layout = canvasLayoutRef.current;
        const x = pageX - layout.x;
        const y = pageY - layout.y;
        const tool = sketchRef.current.currentTool;

        if (tool === 'select' && dragStartRef.current) {
          const ds = dragStartRef.current;
          const dist = Math.sqrt((x - ds.x) ** 2 + (y - ds.y) ** 2);
          if (dist < DRAG_THRESHOLD) {
            const nearId = findNearestStrokeId(x, y, sketchRef.current.strokes, 30);
            if (nearId) sketchRef.current.toggleSelection(nearId);
          } else {
            sketchRef.current.selectByRect({ x1: ds.x, y1: ds.y, x2: x, y2: y });
          }
          dragStartRef.current = null;
          setDragStartRef.current(null);
          setDragRectRef.current(null);
          return;
        }
        sketchRef.current.endDrawing();
      },

      onPanResponderTerminate: () => {
        dragStartRef.current = null;
        setDragStartRef.current(null);
        setDragRectRef.current(null);
        sketchRef.current.endDrawing();
      },
    })
  ).current;

  const handleExport = useCallback(async () => {
    const svgContent = generateSvgContent(sketch.strokes, canvasLayout.width, canvasLayout.height);
    const fileName = `${name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.svg`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, svgContent, { encoding: FileSystem.EncodingType.UTF8 });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, { mimeType: 'image/svg+xml', dialogTitle: 'Exporter SVG' });
    } else {
      Alert.alert('Export', `Fichier SVG : ${filePath}`);
    }
  }, [sketch.strokes, canvasLayout, name]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const savedId = await storage.saveDrawing(sketch.strokes, canvasLayout.width, canvasLayout.height, name, currentDrawingId);
      setCurrentDrawingId(savedId);
      sketch.markClean();
      Alert.alert('Sauvegardé ✓', `"${name}" sauvegardé.`);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, sketch, storage, canvasLayout, name, currentDrawingId]);

  const handleClear = useCallback(() => {
    Alert.alert('Effacer tout', 'Supprimer tous les tracés ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: sketch.clear },
    ]);
  }, [sketch.clear]);

  const handleBack = useCallback(() => {
    if (sketch.isDirty) {
      Alert.alert('Modifications non sauvegardées', 'Sauvegarder avant de quitter ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => router.back() },
        { text: 'Sauvegarder', onPress: async () => { await handleSave(); router.back(); } },
      ]);
    } else {
      router.back();
    }
  }, [sketch.isDirty, handleSave]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#141824" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={20} color="#A0AEC0" />
        </TouchableOpacity>
        <Text style={styles.drawingName} numberOfLines={1}>{name}</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.topBarBtn} onPress={sketch.undo} disabled={!sketch.canUndo}>
            <Ionicons name="arrow-undo" size={18} color={sketch.canUndo ? '#A0AEC0' : '#3A4055'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBarBtn} onPress={sketch.redo} disabled={!sketch.canRedo}>
            <Ionicons name="arrow-redo" size={18} color={sketch.canRedo ? '#A0AEC0' : '#3A4055'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBarBtn} onPress={handleClear}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBarBtn} onPress={handleExport}>
            <Ionicons name="share-outline" size={18} color="#A0AEC0" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
            <Text style={styles.saveBtnText}>{isSaving ? '...' : 'Sauvegarder'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={styles.canvasArea}
        onLayout={e => {
          const { x, y, width, height } = e.nativeEvent.layout;
          setCanvasLayout({ x, y, width, height });
        }}
        {...panResponder.panHandlers}
      >
        <SkiaCanvas
          strokes={sketch.strokes}
          currentStroke={sketch.currentStroke}
          selection={sketch.selection}
          focusedId={sketch.focusedId}
          dragRect={dragRect}
          width={canvasLayout.width}
          height={canvasLayout.height}
        />
      </View>

      <SelectionPanel
        strokes={sketch.strokes}
        selection={sketch.selection}
        focusedId={sketch.focusedId}
        onToggleFocus={sketch.toggleFocused}
        onRemoveFromSelection={sketch.toggleSelection}
        onDeleteSelected={sketch.deleteSelected}
        onClearSelection={sketch.clearSelection}
        canvasWidth={canvasLayout.width}
        canvasHeight={canvasLayout.height}
      />

      <DrawingToolbar
        currentTool={sketch.currentTool}
        currentColor={sketch.currentColor}
        currentWidth={sketch.currentWidth}
        onToolChange={sketch.setCurrentTool}
        onColorChange={sketch.setCurrentColor}
        onWidthChange={sketch.setCurrentWidth}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#141824' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2035',
    paddingHorizontal: 8, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#2A3350',
  },
  topBarBtn: { padding: 8, borderRadius: 8 },
  drawingName: { flex: 1, color: '#E2E8F0', fontSize: 14, fontWeight: '600', marginHorizontal: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  saveBtn: { backgroundColor: '#FF8C00', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  canvasArea: { flex: 1, backgroundColor: '#FFFFFF' },
});
