import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Paint,
  Circle,
  Line,
  vec,
  useCanvasRef,
  Group,
  Rect,
  DashPathEffect,
} from '@shopify/react-native-skia';
import { Stroke, BrushType } from '../types';

interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SkiaCanvasProps {
  strokes: Stroke[];
  currentStroke: Stroke | null;
  selection: string[];
  focusedId: string | null;
  dragRect: DragRect | null;
  width: number;
  height: number;
}

const SELECTION_COLOR = '#FF8C00';   // orange - tracés sélectionnés
const FOCUSED_COLOR = '#00CFFF';     // cyan - tracé focalisé dans le panneau
const DRAG_RECT_COLOR = '#3B82F6';   // bleu - rectangle de sélection en cours

/**
 * Rendu d'un tracé marker : segments individuels avec opacity 0.5
 * pour que les croisements s'accumulent visuellement.
 */
 function MarkerStroke({
   stroke,
   isSelected,
   isFocused,
 }: {
   stroke: Stroke;
   isSelected: boolean;
   isFocused: boolean;
 }) {
   const highlightColor = isFocused ? FOCUSED_COLOR : SELECTION_COLOR;

   return (
     <Group>
       {isSelected && stroke.points.length > 1 && (
         <Path
           path={stroke.pathData}
           style="stroke"
           strokeWidth={stroke.strokeWidth + 6}
           strokeCap="round"
           strokeJoin="round"
           color={highlightColor}
           opacity={0.6}
         >
           <DashPathEffect intervals={[4, 4]} />
         </Path>
       )}
       <Group opacity={0.5}>
         <Path
           path={stroke.pathData}
           style="stroke"
           strokeWidth={stroke.strokeWidth}
           strokeCap="round"
           strokeJoin="round"
           color={stroke.color}
         />
       </Group>
     </Group>
   );
 }
/**
 * Rendu d'un tracé pen ou calligraphie.
 * La calligraphie module l'épaisseur selon la pression — on approxime
 * en rendant des segments avec strokeWidth variable.
 */
function RegularStroke({
  stroke,
  isSelected,
  isFocused,
}: {
  stroke: Stroke;
  isSelected: boolean;
  isFocused: boolean;
}) {
  const highlightColor = isFocused ? FOCUSED_COLOR : SELECTION_COLOR;
  const isCalligraphy = stroke.brushType === 'calligraphy';

  return (
    <Group>
      {/* Halo de sélection */}
      {isSelected && (
        <Path
          path={stroke.pathData}
          style="stroke"
          strokeWidth={stroke.strokeWidth + 4}
          strokeCap="round"
          strokeJoin="round"
          color={highlightColor}
          opacity={0.6}
        >
          <DashPathEffect intervals={[4, 4]} />
        </Path>
      )}
      {/* Tracé principal */}
      {isCalligraphy && stroke.points.length > 1 ? (
        // Calligraphie : segments avec épaisseur variable selon pression
        stroke.points.slice(0, -1).map((pt, i) => {
          const next = stroke.points[i + 1];
          const avgPressure = (pt.pressure + next.pressure) / 2;
          const w = Math.max(1, stroke.strokeWidth * avgPressure * 1.5);
          return (
            <Line
              key={i}
              p1={vec(pt.x, pt.y)}
              p2={vec(next.x, next.y)}
              color={stroke.color}
              style="stroke"
              strokeWidth={w}
              strokeCap="round"
            />
          );
        })
      ) : (
        <Path
          path={stroke.pathData}
          style="stroke"
          strokeWidth={stroke.strokeWidth}
          strokeCap="round"
          strokeJoin="round"
          color={stroke.color}
        />
      )}
    </Group>
  );
}

export function SkiaCanvas({
  strokes,
  currentStroke,
  selection,
  focusedId,
  dragRect,
  width,
  height,
}: SkiaCanvasProps) {
  const renderStroke = (stroke: Stroke, isCurrent = false) => {
    const isSelected = !isCurrent && selection.includes(stroke.id);
    const isFocused = !isCurrent && focusedId === stroke.id;
    const key = isCurrent ? 'current' : stroke.id;

    if (stroke.brushType === 'marker') {
      return (
        <MarkerStroke
          key={key}
          stroke={stroke}
          isSelected={isSelected}
          isFocused={isFocused}
        />
      );
    }
    return (
      <RegularStroke
        key={key}
        stroke={stroke}
        isSelected={isSelected}
        isFocused={isFocused}
      />
    );
  };

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      {/* Fond blanc */}
      <Rect x={0} y={0} width={width} height={height} color="#FFFFFF" />

      {/* Tracés sauvegardés */}
      {strokes.map(s => renderStroke(s))}

      {/* Tracé en cours de dessin */}
      {currentStroke && renderStroke(currentStroke, true)}

      {/* Rectangle de sélection en cours de drag */}
      {dragRect && (
        <Group>
          <Rect
            x={dragRect.x}
            y={dragRect.y}
            width={dragRect.width}
            height={dragRect.height}
            color={`${DRAG_RECT_COLOR}15`}
          />
          <Rect
            x={dragRect.x}
            y={dragRect.y}
            width={dragRect.width}
            height={dragRect.height}
            style="stroke"
            strokeWidth={1.5}
            color={DRAG_RECT_COLOR}
          >
            <DashPathEffect intervals={[5, 3]} />
          </Rect>
        </Group>
      )}
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: '#FFFFFF',
  },
});
