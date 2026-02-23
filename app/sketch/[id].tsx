import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SketchScreen } from '../../src/screens/SketchScreen';
import { useDrawingStorage } from '../../src/hooks/useDrawingStorage';
import { Stroke } from '../../src/types';

export default function EditSketch() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { loadDrawingById } = useDrawingStorage();
  const [initialStrokes, setInitialStrokes] = useState<Stroke[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadDrawingById(id).then(drawing => {
      setInitialStrokes(drawing?.strokes ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  return (
    <SketchScreen
      drawingId={id}
      drawingName={name || 'Sans titre'}
      initialStrokes={initialStrokes || []}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141824',
  },
});
