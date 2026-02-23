import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { Stroke } from '../types';
import { generateThumbnailSvg } from '../utils/drawingUtils';

interface SelectionPanelProps {
  strokes: Stroke[];
  selection: string[];
  focusedId: string | null;
  onToggleFocus: (id: string) => void;
  onRemoveFromSelection: (id: string) => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

const FOCUSED_BORDER = '#00CFFF';
const SELECTED_BORDER = '#FF8C00';

export function SelectionPanel({
  strokes,
  selection,
  focusedId,
  onToggleFocus,
  onRemoveFromSelection,
  onDeleteSelected,
  onClearSelection,
  canvasWidth,
  canvasHeight,
}: SelectionPanelProps) {
  const selectedStrokes = strokes.filter(s => selection.includes(s.id));

  if (selection.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selection.length} tracé{selection.length > 1 ? 's' : ''} sélectionné{selection.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDeleteSelected}>
            <Ionicons name="trash-outline" size={14} color="#FF3B30" />
            <Text style={styles.deleteBtnText}>Supprimer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClearSelection}>
            <Ionicons name="close" size={18} color="#A0AEC0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des vignettes */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        style={styles.listScroll}
      >
        {selectedStrokes.map(stroke => {
          const isFocused = focusedId === stroke.id;
          const thumbSvg = generateThumbnailSvg([stroke], canvasWidth, canvasHeight);
          const borderColor = isFocused ? FOCUSED_BORDER : SELECTED_BORDER;

          return (
            <TouchableOpacity
              key={stroke.id}
              style={[
                styles.thumbContainer,
                { borderColor },
                isFocused && styles.thumbFocused,
              ]}
              onPress={() => onToggleFocus(stroke.id)}
              activeOpacity={0.8}
            >
              {/* Miniature SVG */}
              <View style={styles.thumb}>
                {thumbSvg ? (
                  <SvgXml xml={thumbSvg} width="100%" height="100%" />
                ) : (
                  <View style={styles.thumbEmpty} />
                )}
              </View>

              {/* Indicateur de focus */}
              {isFocused && (
                <View style={styles.focusedBadge}>
                  <Ionicons name="eye" size={10} color="#00CFFF" />
                </View>
              )}

              {/* Bouton retirer de la sélection */}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemoveFromSelection(stroke.id)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Ionicons name="close-circle" size={16} color="#FF3B30" />
              </TouchableOpacity>

              {/* Label type de brush */}
              <Text style={styles.brushLabel}>
                {stroke.brushType === 'pen' ? 'Stylo' :
                 stroke.brushType === 'marker' ? 'Marker' :
                 stroke.brushType === 'calligraphy' ? 'Calligr.' : stroke.brushType}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141824',
    borderTopWidth: 1,
    borderTopColor: '#2A3350',
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF3B3040',
    backgroundColor: '#FF3B3015',
  },
  deleteBtnText: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  listScroll: {
    paddingBottom: 8,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 8,
  },
  thumbContainer: {
    width: 68,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#1E2535',
    padding: 4,
    position: 'relative',
  },
  thumbFocused: {
    backgroundColor: '#00CFFF12',
  },
  thumb: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbEmpty: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  focusedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#00CFFF20',
    borderRadius: 8,
    padding: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  brushLabel: {
    fontSize: 9,
    color: '#A0AEC0',
    marginTop: 4,
    textAlign: 'center',
  },
});
