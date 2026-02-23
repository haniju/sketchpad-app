import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  StatusBar,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { router } from 'expo-router';
import { useDrawingStorage } from '../hooks/useDrawingStorage';
import { Drawing } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 0.75;

function DrawingCard({
  drawing,
  onOpen,
  onDelete,
  onRename,
}: {
  drawing: Drawing;
  onOpen: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const date = new Date(drawing.updatedAt);
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.85}>
      {/* Thumbnail */}
      <View style={styles.cardThumb}>
        {drawing.thumbnailSvg ? (
          <SvgXml xml={drawing.thumbnailSvg} width="100%" height="100%" />
        ) : (
          <View style={styles.cardThumbEmpty}>
            <Ionicons name="image-outline" size={32} color="#3A4055" />
          </View>
        )}
      </View>

      {/* Infos */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{drawing.name}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardDate}>{dateStr}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={onRename}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={14} color="#A0AEC0" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
function RenameModal({
  visible,
  currentName,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  currentName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(currentName);

  useEffect(() => {
    setValue(currentName);
  }, [currentName]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={renameStyles.overlay} onPress={onCancel}>
        <Pressable style={renameStyles.panel} onPress={e => e.stopPropagation()}>
          <Text style={renameStyles.title}>Renommer</Text>
          <TextInput
            style={renameStyles.input}
            value={value}
            onChangeText={setValue}
            autoFocus
            selectTextOnFocus
            placeholderTextColor="#A0AEC0"
          />
          <View style={renameStyles.buttons}>
            <TouchableOpacity style={renameStyles.btnCancel} onPress={onCancel}>
              <Text style={renameStyles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={renameStyles.btnConfirm}
              onPress={() => value.trim() && onConfirm(value.trim())}
            >
              <Text style={renameStyles.btnConfirmText}>Renommer</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const renameStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 32 },
  panel: { backgroundColor: '#1A2035', borderRadius: 16, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', marginBottom: 16 },
  input: { backgroundColor: '#141824', borderRadius: 8, padding: 12, color: '#E2E8F0', fontSize: 15, borderWidth: 1, borderColor: '#2A3350', marginBottom: 16 },
  buttons: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2A3350', alignItems: 'center' },
  btnCancelText: { color: '#A0AEC0', fontWeight: '600' },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#FF8C00', alignItems: 'center' },
  btnConfirmText: { color: '#FFF', fontWeight: '700' },
});

export function GalleryScreen() {
  const { drawings, isLoading, loadDrawings, deleteDrawing, renameDrawing } = useDrawingStorage();

  useFocusEffect(
    useCallback(() => {
      loadDrawings();
    }, [loadDrawings])
  );

  const handleOpen = useCallback((drawing: Drawing) => {
    router.push({ pathname: '/sketch/[id]', params: { id: drawing.id, name: drawing.name } });
  }, []);

  const handleNew = useCallback(() => {
    router.push({ pathname: '/sketch/new' });
  }, []);

  const handleDelete = useCallback((drawing: Drawing) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${drawing.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteDrawing(drawing.id),
        },
      ]
    );
  }, [deleteDrawing]);

  const [renameTarget, setRenameTarget] = useState<Drawing | null>(null);

  const handleRename = useCallback((drawing: Drawing) => {
    setRenameTarget(drawing);
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#141824" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes dessins</Text>
        <TouchableOpacity style={styles.newBtn} onPress={handleNew} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.newBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Chargement...</Text>
        </View>
      ) : drawings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="pencil-outline" size={64} color="#3A4055" />
          <Text style={styles.emptyTitle}>Aucun dessin</Text>
          <Text style={styles.emptyText}>Crée ton premier dessin !</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handleNew}>
            <Text style={styles.emptyBtnText}>Commencer à dessiner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={drawings}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          onRefresh={loadDrawings}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <DrawingCard
              drawing={item}
              onOpen={() => handleOpen(item)}
              onDelete={() => handleDelete(item)}
              onRename={() => handleRename(item)}
            />
          )}
        />
      )}

      <RenameModal
        visible={!!renameTarget}
        currentName={renameTarget?.name || ''}
        onConfirm={(name) => {
          if (renameTarget) renameDrawing(renameTarget.id, name);
          setRenameTarget(null);
        }}
        onCancel={() => setRenameTarget(null)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#141824',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3350',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  grid: {
    padding: 16,
    gap: 12,
  },
  gridRow: {
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1A2035',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A3350',
  },
  cardThumb: {
    width: '100%',
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardThumbEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  cardInfo: {
    padding: 8,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDate: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionBtn: {
    padding: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  emptyText: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  emptyBtn: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
