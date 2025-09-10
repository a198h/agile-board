// src/ui/editor/types.ts

import { LayoutBox } from "../../core/layout/layoutFileRepo";

/**
 * Interface pour les callbacks de l'éditeur
 */
export interface LayoutEditorCallbacks {
  readonly onSave: (layout: { name: string; boxes: readonly LayoutBox[] }) => void;
  readonly onCancel: () => void;
}

/**
 * État immutable d'une box pendant l'édition
 */
export interface BoxState {
  readonly box: LayoutBox;
  readonly element: HTMLElement;
  readonly isSelected: boolean;
  readonly isDragging: boolean;
  readonly isResizing: boolean;
}

/**
 * État immutable du drag & drop
 */
export interface DragState {
  readonly isActive: boolean;
  readonly type: 'drag' | 'resize' | 'create' | null;
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly startGridX: number;
  readonly startGridY: number;
  readonly currentGridX: number;
  readonly currentGridY: number;
  readonly boxId?: string;
  readonly handle?: string; // pour le resize: 'nw', 'ne', 'sw', 'se', etc.
}

/**
 * Position dans la grille (immutable)
 */
export interface GridPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Événements de l'éditeur (pattern Observer)
 */
export interface EditorEvents {
  readonly onBoxSelect: (boxId: string | null) => void;
  readonly onBoxUpdate: (boxId: string, updates: Partial<LayoutBox>) => void;
  readonly onBoxDelete: (boxId: string) => void;
  readonly onBoxCreate: (box: LayoutBox) => void;
  readonly onValidationError: (message: string) => void;
  readonly onDragStart: (boxId: string, type: 'drag' | 'resize') => void;
  readonly onDragMove: (dragState: DragState) => void;
  readonly onDragEnd: () => void;
}

/**
 * Configuration immutable du composant éditeur
 */
export interface EditorConfig {
  readonly gridSize: number;
  readonly cellSize: number;
  readonly width: number;
  readonly height: number;
  readonly minBoxSize: number;
}

/**
 * Interface pour les composants modulaires
 */
export interface EditorComponent {
  readonly render: (container: HTMLElement) => void;
  readonly dispose: () => void;
}

/**
 * Interface pour les gestionnaires d'événements
 */
export interface EventHandler {
  readonly attachEvents: () => void;
  readonly detachEvents: () => void;
}