export type BrushType = 'pen' | 'marker' | 'calligraphy' | 'eraser' | 'select';

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
  brushType: BrushType;
  pathData: string;
}

export interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Drawing {
  id: string;
  name: string;
  strokes: Stroke[];
  canvasWidth: number;
  canvasHeight: number;
  thumbnailSvg: string;
  createdAt: string;
  updatedAt: string;
}
