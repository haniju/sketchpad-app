import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';
import { Drawing, Stroke } from '../types';
import { generateThumbnailSvg } from '../utils/drawingUtils';

const DRAWINGS_INDEX_KEY = 'drawings_index';
const DRAWING_PREFIX = 'drawing_';

/**
 * Hook de gestion de la persistance des dessins via AsyncStorage.
 * Les dessins sont stockés individuellement (clé par dessin) pour éviter
 * de charger toutes les données en mémoire d'un coup.
 */
export function useDrawingStorage() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Charge la liste de tous les dessins (métadonnées + thumbnail) */
  const loadDrawings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const indexJson = await AsyncStorage.getItem(DRAWINGS_INDEX_KEY);
      if (!indexJson) {
        setDrawings([]);
        return;
      }
      const ids: string[] = JSON.parse(indexJson);
      const loadedDrawings: Drawing[] = [];

      for (const id of ids) {
        const drawingJson = await AsyncStorage.getItem(DRAWING_PREFIX + id);
        if (drawingJson) {
          const drawing: Drawing = JSON.parse(drawingJson);
          // On ne charge PAS les strokes complets pour la liste (perf)
          loadedDrawings.push({
            ...drawing,
            strokes: [], // strokes chargés seulement à l'ouverture
          });
        }
      }

      // Tri par date de mise à jour décroissante
      loadedDrawings.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setDrawings(loadedDrawings);
    } catch (e) {
      setError('Erreur lors du chargement des dessins');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Charge un dessin complet avec ses strokes */
  const loadDrawingById = useCallback(async (id: string): Promise<Drawing | null> => {
    try {
      const drawingJson = await AsyncStorage.getItem(DRAWING_PREFIX + id);
      if (!drawingJson) return null;
      return JSON.parse(drawingJson) as Drawing;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  /** Crée ou met à jour un dessin */
  const saveDrawing = useCallback(
    async (
      strokes: Stroke[],
      canvasWidth: number,
      canvasHeight: number,
      name: string,
      existingId?: string
    ): Promise<string> => {
      const id = existingId || nanoid();
      const now = new Date().toISOString();

      const thumbnailSvg = generateThumbnailSvg(strokes, canvasWidth, canvasHeight);

      const drawing: Drawing = {
        id,
        name,
        strokes,
        canvasWidth,
        canvasHeight,
        thumbnailSvg,
        createdAt: existingId
          ? drawings.find(d => d.id === existingId)?.createdAt || now
          : now,
        updatedAt: now,
      };

      // Sauvegarde le dessin complet
      await AsyncStorage.setItem(DRAWING_PREFIX + id, JSON.stringify(drawing));

      // Met à jour l'index
      const indexJson = await AsyncStorage.getItem(DRAWINGS_INDEX_KEY);
      const ids: string[] = indexJson ? JSON.parse(indexJson) : [];
      if (!ids.includes(id)) {
        ids.push(id);
        await AsyncStorage.setItem(DRAWINGS_INDEX_KEY, JSON.stringify(ids));
      }

      // Met à jour l'état local (sans les strokes complets)
      const drawingForList: Drawing = { ...drawing, strokes: [] };
      setDrawings(prev => {
        const filtered = prev.filter(d => d.id !== id);
        return [drawingForList, ...filtered];
      });

      return id;
    },
    [drawings]
  );

  /** Supprime un dessin */
  const deleteDrawing = useCallback(async (id: string) => {
    try {
      await AsyncStorage.removeItem(DRAWING_PREFIX + id);
      const indexJson = await AsyncStorage.getItem(DRAWINGS_INDEX_KEY);
      const ids: string[] = indexJson ? JSON.parse(indexJson) : [];
      const newIds = ids.filter(i => i !== id);
      await AsyncStorage.setItem(DRAWINGS_INDEX_KEY, JSON.stringify(newIds));
      setDrawings(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error(e);
    }
  }, []);

  /** Renomme un dessin */
  const renameDrawing = useCallback(async (id: string, newName: string) => {
    try {
      const drawingJson = await AsyncStorage.getItem(DRAWING_PREFIX + id);
      if (!drawingJson) return;
      const drawing: Drawing = JSON.parse(drawingJson);
      drawing.name = newName;
      drawing.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(DRAWING_PREFIX + id, JSON.stringify(drawing));
      setDrawings(prev =>
        prev.map(d => (d.id === id ? { ...d, name: newName, updatedAt: drawing.updatedAt } : d))
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    drawings,
    isLoading,
    error,
    loadDrawings,
    loadDrawingById,
    saveDrawing,
    deleteDrawing,
    renameDrawing,
  };
}
