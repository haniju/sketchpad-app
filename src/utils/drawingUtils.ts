import { Point, Stroke, BoundingBox, SelectionRect } from './types';

/**
 * Génère un path SVG lissé (courbes de Bézier quadratiques) depuis une liste de points.
 */
export function getSvgPathFromPoints(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y + 0.1}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
  }
  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;

  return d;
}

/**
 * Calcule la bounding box d'un tracé.
 */
export function getStrokeBoundingBox(stroke: Stroke): BoundingBox {
  if (stroke.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of stroke.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Retourne les IDs des tracés dont la bounding box intersecte le rectangle de sélection.
 */
export function getStrokesInRect(strokes: Stroke[], rect: SelectionRect): string[] {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const maxY = Math.max(rect.y1, rect.y2);

  return strokes
    .filter(stroke => {
      const bb = getStrokeBoundingBox(stroke);
      return bb.maxX >= minX && bb.minX <= maxX && bb.maxY >= minY && bb.minY <= maxY;
    })
    .map(s => s.id);
}

/**
 * Génère le contenu SVG complet pour export.
 */
export function generateSvgContent(strokes: Stroke[], width: number, height: number): string {
  const renderStroke = (s: Stroke): string => {
    const isMarker = s.brushType === 'marker';
    if (isMarker && s.points.length > 1) {
      const segments = s.points.slice(0, -1).map((pt, i) => {
        const next = s.points[i + 1];
        return `<line x1="${pt.x.toFixed(2)}" y1="${pt.y.toFixed(2)}" x2="${next.x.toFixed(2)}" y2="${next.y.toFixed(2)}" stroke="${s.color}" stroke-width="${s.strokeWidth}" stroke-linecap="round" opacity="0.5" />`;
      });
      return segments.join('\n    ');
    }
    const opacity = isMarker ? ' opacity="0.5"' : '';
    return `<path d="${s.pathData}" stroke="${s.color}" stroke-width="${s.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"${opacity} />`;
  };

  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${strokes.map(renderStroke).join('\n  ')}
</svg>`;
}

/**
 * Génère un SVG miniature pour les thumbnails de la galerie.
 * N'utilise que les 10 premiers tracés pour la perf.
 */
export function generateThumbnailSvg(strokes: Stroke[], width: number, height: number): string {
  if (strokes.length === 0) return '';

  const topStrokes = strokes.slice(0, 10);

  const renderStroke = (s: Stroke): string => {
    const isMarker = s.brushType === 'marker';
    if (isMarker && s.points.length > 1) {
      const segments = s.points.slice(0, -1).map((pt, i) => {
        const next = s.points[i + 1];
        return `<line x1="${pt.x.toFixed(1)}" y1="${pt.y.toFixed(1)}" x2="${next.x.toFixed(1)}" y2="${next.y.toFixed(1)}" stroke="${s.color}" stroke-width="${s.strokeWidth}" stroke-linecap="round" opacity="0.5" />`;
      });
      return segments.join(' ');
    }
    return `<path d="${s.pathData}" stroke="${s.color}" stroke-width="${s.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${isMarker ? 'opacity="0.5"' : ''} />`;
  };

  // Calcul de la viewBox ajustée pour zoomer sur le contenu
  const allBB = topStrokes.reduce(
    (acc, stroke) => {
      const bb = getStrokeBoundingBox(stroke);
      return {
        minX: Math.min(acc.minX, bb.minX),
        minY: Math.min(acc.minY, bb.minY),
        maxX: Math.max(acc.maxX, bb.maxX),
        maxY: Math.max(acc.maxY, bb.maxY),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  let viewBox = `0 0 ${width} ${height}`;
  if (allBB.minX !== Infinity) {
    const padding = 20;
    const vW = Math.max(10, allBB.maxX - allBB.minX + padding * 2);
    const vH = Math.max(10, allBB.maxY - allBB.minY + padding * 2);
    viewBox = `${(allBB.minX - padding).toFixed(1)} ${(allBB.minY - padding).toFixed(1)} ${vW.toFixed(1)} ${vH.toFixed(1)}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%"><rect width="100%" height="100%" fill="#ffffff" />${topStrokes.map(renderStroke).join('')}</svg>`;
}
