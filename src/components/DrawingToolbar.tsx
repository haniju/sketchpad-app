import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { BrushType } from '../types';

// Palette de couleurs prédéfinies
const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF3B30', '#FF9500',
  '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF',
  '#5856D6', '#FF2D55', '#8B4513', '#808080',
];

interface ToolbarProps {
  currentTool: BrushType;
  currentColor: string;
  currentWidth: number;
  onToolChange: (tool: BrushType) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
}

interface ToolButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
  color?: string;
}

function ToolButton({ icon, label, isActive, onPress, color }: ToolButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.toolBtn, isActive && styles.toolBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={22}
        color={isActive ? '#FF8C00' : color || '#A0AEC0'}
      />
      <Text style={[styles.toolLabel, isActive && styles.toolLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function DrawingToolbar({
  currentTool,
  currentColor,
  currentWidth,
  onToolChange,
  onColorChange,
  onWidthChange,
}: ToolbarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const isDrawingTool = ['pen', 'marker', 'calligraphy'].includes(currentTool);

  return (
    <>
      <View style={styles.container}>
        {/* Outils de dessin */}
        <ToolButton
          icon="pencil-outline"
          label="Stylo"
          isActive={currentTool === 'pen'}
          onPress={() => onToolChange('pen')}
        />
        <ToolButton
          icon="brush-outline"
          label="Marker"
          isActive={currentTool === 'marker'}
          onPress={() => onToolChange('marker')}
        />
        <ToolButton
          icon="create-outline"
          label="Calligr."
          isActive={currentTool === 'calligraphy'}
          onPress={() => onToolChange('calligraphy')}
        />

        <View style={styles.divider} />

        <ToolButton
          icon="remove-circle-outline"
          label="Gomme"
          isActive={currentTool === 'eraser'}
          onPress={() => onToolChange('eraser')}
        />
        <ToolButton
          icon="move-outline"
          label="Sélect."
          isActive={currentTool === 'select'}
          onPress={() => onToolChange('select')}
        />

        <View style={styles.divider} />

        {/* Bouton couleur + épaisseur */}
        <TouchableOpacity
          style={[styles.colorBtn, !isDrawingTool && styles.colorBtnDisabled]}
          onPress={() => isDrawingTool && setShowSettings(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
          <Text style={styles.widthLabel}>{currentWidth}px</Text>
        </TouchableOpacity>
      </View>

      {/* Modal paramètres couleur + épaisseur */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSettings(false)}>
          <Pressable style={styles.settingsPanel} onPress={e => e.stopPropagation()}>
            <View style={styles.settingsHandle} />

            <Text style={styles.settingsTitle}>Couleur</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    c === currentColor && styles.colorDotSelected,
                    c === '#FFFFFF' && styles.colorDotWhite,
                  ]}
                  onPress={() => onColorChange(c)}
                />
              ))}
            </ScrollView>

            <Text style={styles.settingsTitle}>Épaisseur — {currentWidth}px</Text>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>1</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={40}
                step={1}
                value={currentWidth}
                onValueChange={onWidthChange}
                minimumTrackTintColor="#FF8C00"
                maximumTrackTintColor="#3A4055"
                thumbTintColor="#FF8C00"
              />
              <Text style={styles.sliderLabel}>40</Text>
            </View>

            {/* Aperçu du tracé */}
            <View style={styles.previewRow}>
              <View
                style={[
                  styles.previewLine,
                  {
                    height: Math.max(2, currentWidth),
                    backgroundColor: currentColor,
                    opacity: currentTool === 'marker' ? 0.5 : 1,
                    borderRadius: currentWidth / 2,
                  },
                ]}
              />
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2035',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#2A3350',
  },
  toolBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolBtnActive: {
    backgroundColor: '#FF8C0020',
  },
  toolLabel: {
    fontSize: 9,
    color: '#A0AEC0',
    marginTop: 2,
  },
  toolLabelActive: {
    color: '#FF8C00',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#2A3350',
    marginHorizontal: 4,
  },
  colorBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3350',
    minWidth: 50,
  },
  colorBtnDisabled: {
    opacity: 0.4,
  },
  colorPreview: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#3A4055',
  },
  widthLabel: {
    fontSize: 9,
    color: '#A0AEC0',
    marginTop: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  settingsPanel: {
    backgroundColor: '#1A2035',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  settingsHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#3A4055',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FF8C00',
  },
  colorDotWhite: {
    borderWidth: 1,
    borderColor: '#3A4055',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  sliderLabel: {
    color: '#A0AEC0',
    fontSize: 12,
    width: 24,
    textAlign: 'center',
  },
  previewRow: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF10',
    borderRadius: 8,
  },
  previewLine: {
    width: '100%',
  },
  closeBtn: {
    backgroundColor: '#FF8C00',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
