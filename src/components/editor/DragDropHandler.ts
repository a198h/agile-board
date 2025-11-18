// src/components/editor/DragDropHandler.ts
import { LayoutBox } from "../../core/layout/layoutFileRepo";
import { LayoutValidator24 } from "../../core/layout/layoutValidator24";
import { GRID_CONSTANTS } from "../../core/constants";
import { BoxState } from "./BoxManager";
import { GridCanvas } from "./GridCanvas";

/**
 * État du drag & drop
 */
interface DragState {
  isActive: boolean;
  isPending: boolean; // true = mousedown mais pas encore de mouvement significatif
  startX: number;
  startY: number;
  gridStartX: number;
  gridStartY: number;
  type: 'move' | 'resize' | 'create';
  handle?: string;
}

/**
 * Composant responsable de la gestion des interactions drag & drop.
 * Gère le déplacement, redimensionnement et création de boxes.
 */
export class DragDropHandler {
  private readonly validator = new LayoutValidator24();
  private readonly GRID_SIZE = GRID_CONSTANTS.SIZE;
  private readonly DRAG_THRESHOLD = 5; // pixels - minimum pour démarrer un drag réel

  private dragState: DragState = {
    isActive: false,
    isPending: false,
    startX: 0,
    startY: 0,
    gridStartX: 0,
    gridStartY: 0,
    type: 'move'
  };

  private previewBox: HTMLElement | null = null;
  private resizePreview: HTMLElement | null = null;
  private originalBoxState: LayoutBox | null = null;
  private pendingBoxState: BoxState | null = null;

  constructor(
    private gridCanvas: GridCanvas,
    private onDragStart: (type: 'move' | 'resize' | 'create', box?: BoxState, handle?: string) => void,
    private onDragMove: (deltaX: number, deltaY: number, type: 'move' | 'resize' | 'create') => void,
    private onDragEnd: (type: 'move' | 'resize' | 'create') => void
  ) {
    this.setupGlobalEventListeners();
  }

  /**
   * Configure les gestionnaires d'événements globaux.
   */
  private setupGlobalEventListeners(): void {
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  /**
   * Démarre le drag depuis la grille (création).
   */
  startGridDrag(e: MouseEvent): void {
    const gridPos = this.gridCanvas.screenToGrid(e.clientX, e.clientY);
    if (!gridPos) return;

    this.dragState = {
      isActive: true,
      startX: e.clientX,
      startY: e.clientY,
      gridStartX: gridPos.x,
      gridStartY: gridPos.y,
      type: 'create'
    };

    this.onDragStart('create');
    e.preventDefault();
  }

  /**
   * Démarre le drag depuis une box (déplacement).
   */
  startBoxDrag(e: MouseEvent, boxState: BoxState): void {
    const gridPos = this.gridCanvas.screenToGrid(e.clientX, e.clientY);
    if (!gridPos) return;

    this.originalBoxState = { ...boxState.box };
    this.pendingBoxState = boxState;

    // Ne pas activer le drag immédiatement - attendre un mouvement significatif
    this.dragState = {
      isActive: false,
      isPending: true,
      startX: e.clientX,
      startY: e.clientY,
      gridStartX: gridPos.x,
      gridStartY: gridPos.y,
      type: 'move'
    };

    e.stopPropagation();
    e.preventDefault();
  }

  /**
   * Démarre le redimensionnement depuis une poignée.
   */
  startResizeDrag(e: MouseEvent, handle: string, boxState: BoxState): void {
    const gridPos = this.gridCanvas.screenToGrid(e.clientX, e.clientY);
    if (!gridPos) return;

    this.originalBoxState = { ...boxState.box };

    this.dragState = {
      isActive: true,
      startX: e.clientX,
      startY: e.clientY,
      gridStartX: gridPos.x,
      gridStartY: gridPos.y,
      type: 'resize',
      handle
    };

    boxState.isResizing = true;
    this.onDragStart('resize', boxState, handle);
    e.stopPropagation();
    e.preventDefault();
  }

  /**
   * Gestionnaire de mouvement de souris.
   */
  private onMouseMove(e: MouseEvent): void {
    // Si drag en attente (mousedown mais pas encore bougé assez)
    if (this.dragState.isPending && !this.dragState.isActive) {
      const deltaPixelsX = Math.abs(e.clientX - this.dragState.startX);
      const deltaPixelsY = Math.abs(e.clientY - this.dragState.startY);
      const distance = Math.sqrt(deltaPixelsX * deltaPixelsX + deltaPixelsY * deltaPixelsY);

      // Threshold dépassé - activer le drag réel
      if (distance >= this.DRAG_THRESHOLD && this.pendingBoxState) {
        this.dragState.isActive = true;
        this.dragState.isPending = false;
        this.pendingBoxState.isDragging = true;
        this.onDragStart('move', this.pendingBoxState);
      }
      return;
    }

    if (!this.dragState.isActive) return;

    const currentGridPos = this.gridCanvas.screenToGrid(e.clientX, e.clientY);
    if (!currentGridPos) return;

    const deltaX = currentGridPos.x - this.dragState.gridStartX;
    const deltaY = currentGridPos.y - this.dragState.gridStartY;

    this.onDragMove(deltaX, deltaY, this.dragState.type);
  }

  /**
   * Gestionnaire de relâchement de souris.
   */
  private onMouseUp(e: MouseEvent): void {
    // Si c'était juste un clic (pas de drag réel)
    if (this.dragState.isPending && !this.dragState.isActive) {
      this.resetDragState();
      return;
    }

    if (!this.dragState.isActive) return;

    this.onDragEnd(this.dragState.type);
    this.resetDragState();
  }

  /**
   * Crée une preview box pour la création.
   */
  createPreviewBox(): HTMLElement {
    const preview = this.gridCanvas.getGridInner().createDiv('preview-box');
    preview.style.position = 'absolute';
    preview.style.border = '2px dashed var(--interactive-accent)';
    preview.style.backgroundColor = 'var(--interactive-accent)';
    preview.style.opacity = '0.3';
    preview.style.pointerEvents = 'none';
    preview.style.borderRadius = '4px';
    
    this.previewBox = preview;
    return preview;
  }

  /**
   * Met à jour la preview box.
   */
  updatePreviewBox(x: number, y: number, w: number, h: number): void {
    if (!this.previewBox) return;
    
    const cellSize = this.gridCanvas.getCellSize();
    this.previewBox.style.left = `${x * cellSize + 2}px`;
    this.previewBox.style.top = `${y * cellSize + 2}px`;
    this.previewBox.style.width = `${w * cellSize - 4}px`;
    this.previewBox.style.height = `${h * cellSize - 4}px`;
  }

  /**
   * Affiche l'aide visuelle de redimensionnement.
   */
  showResizePreview(x: number, y: number, w: number, h: number): void {
    if (!this.resizePreview) {
      this.resizePreview = this.gridCanvas.getContainer().createDiv('resize-preview');
      this.resizePreview.style.position = 'absolute';
      this.resizePreview.style.backgroundColor = 'var(--interactive-accent)';
      this.resizePreview.style.color = 'white';
      this.resizePreview.style.padding = '2px 6px';
      this.resizePreview.style.borderRadius = '4px';
      this.resizePreview.style.fontSize = '11px';
      this.resizePreview.style.fontWeight = '600';
      this.resizePreview.style.pointerEvents = 'none';
      this.resizePreview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      this.resizePreview.style.zIndex = '9999';
    }
    
    this.resizePreview.textContent = `(${x + 1},${y + 1}) ${w}×${h}`;
    this.resizePreview.style.left = '10px';
    this.resizePreview.style.top = '10px';
    this.resizePreview.style.display = 'block';
  }

  /**
   * Cache l'aide visuelle de redimensionnement.
   */
  hideResizePreview(): void {
    if (this.resizePreview) {
      this.resizePreview.style.display = 'none';
    }
  }

  /**
   * Calcule les nouvelles dimensions pour la création.
   */
  calculateCreateDimensions(deltaX: number, deltaY: number): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    const startX = this.dragState.gridStartX;
    const startY = this.dragState.gridStartY;
    const endX = startX + deltaX;
    const endY = startY + deltaY;

    const normalizedX = Math.max(0, Math.min(startX, endX));
    const normalizedY = Math.max(0, Math.min(startY, endY));
    const width = Math.min(Math.abs(deltaX) + 1, this.GRID_SIZE - normalizedX);
    const height = Math.min(Math.abs(deltaY) + 1, this.GRID_SIZE - normalizedY);

    return { x: normalizedX, y: normalizedY, w: width, h: height };
  }

  /**
   * Obtient les dimensions actuelles de la preview box.
   */
  getCurrentPreviewDimensions(): { x: number; y: number; w: number; h: number } | null {
    if (!this.previewBox) return null;

    const cellSize = this.gridCanvas.getCellSize();
    const left = parseInt(this.previewBox.style.left) || 0;
    const top = parseInt(this.previewBox.style.top) || 0;
    const width = parseInt(this.previewBox.style.width) || 0;
    const height = parseInt(this.previewBox.style.height) || 0;

    return {
      x: Math.round((left - 2) / cellSize),
      y: Math.round((top - 2) / cellSize),
      w: Math.round((width + 4) / cellSize),
      h: Math.round((height + 4) / cellSize)
    };
  }

  /**
   * Calcule la nouvelle position pour le déplacement.
   */
  calculateMovePosition(originalBox: LayoutBox, deltaX: number, deltaY: number): {
    x: number;
    y: number;
  } {
    const newX = Math.max(0, Math.min(this.GRID_SIZE - originalBox.w, originalBox.x + deltaX));
    const newY = Math.max(0, Math.min(this.GRID_SIZE - originalBox.h, originalBox.y + deltaY));
    
    return { x: newX, y: newY };
  }

  /**
   * Calcule les nouvelles dimensions pour le redimensionnement.
   */
  calculateResizeDimensions(originalBox: LayoutBox, deltaX: number, deltaY: number, handle: string): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    let newX = originalBox.x;
    let newY = originalBox.y;
    let newW = originalBox.w;
    let newH = originalBox.h;

    switch (handle) {
      case 'se': // Sud-Est
        newW = Math.max(2, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        newH = Math.max(2, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      case 'nw': { // Nord-Ouest
        const maxMoveX = originalBox.x;
        const maxMoveY = originalBox.y;
        const maxShrinkX = originalBox.w - 2;
        const maxShrinkY = originalBox.h - 2;
        
        const clampedDeltaX = Math.max(-maxMoveX, Math.min(maxShrinkX, deltaX));
        const clampedDeltaY = Math.max(-maxMoveY, Math.min(maxShrinkY, deltaY));
        
        newX = originalBox.x + clampedDeltaX;
        newY = originalBox.y + clampedDeltaY;
        newW = originalBox.w - clampedDeltaX;
        newH = originalBox.h - clampedDeltaY;
        break;
      }
      case 'ne': { // Nord-Est
        const maxMoveY = originalBox.y;
        const maxShrinkY = originalBox.h - 2;
        const clampedDeltaY = Math.max(-maxMoveY, Math.min(maxShrinkY, deltaY));
        
        newY = originalBox.y + clampedDeltaY;
        newW = Math.max(2, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        newH = originalBox.h - clampedDeltaY;
        break;
      }
      case 'sw': { // Sud-Ouest
        const maxMoveX = originalBox.x;
        const maxShrinkX = originalBox.w - 2;
        const clampedDeltaX = Math.max(-maxMoveX, Math.min(maxShrinkX, deltaX));
        
        newX = originalBox.x + clampedDeltaX;
        newW = originalBox.w - clampedDeltaX;
        newH = Math.max(2, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      }
      case 'n': { // Nord
        const maxMoveY = originalBox.y;
        const maxShrinkY = originalBox.h - 2;
        const clampedDeltaY = Math.max(-maxMoveY, Math.min(maxShrinkY, deltaY));
        
        newY = originalBox.y + clampedDeltaY;
        newH = originalBox.h - clampedDeltaY;
        break;
      }
      case 's': // Sud
        newH = Math.max(2, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      case 'e': // Est
        newW = Math.max(2, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        break;
      case 'w': { // Ouest
        const maxMoveX = originalBox.x;
        const maxShrinkX = originalBox.w - 2;
        const clampedDeltaX = Math.max(-maxMoveX, Math.min(maxShrinkX, deltaX));
        
        newX = originalBox.x + clampedDeltaX;
        newW = originalBox.w - clampedDeltaX;
        break;
      }
    }

    return { x: newX, y: newY, w: newW, h: newH };
  }

  /**
   * Remet à zéro l'état du drag & drop.
   */
  private resetDragState(): void {
    this.dragState.isActive = false;
    this.dragState.isPending = false;
    this.originalBoxState = null;
    this.pendingBoxState = null;

    if (this.previewBox) {
      this.previewBox.remove();
      this.previewBox = null;
    }

    this.hideResizePreview();
  }

  /**
   * Récupère l'état original de la box.
   */
  getOriginalBoxState(): LayoutBox | null {
    return this.originalBoxState;
  }

  /**
   * Vérifie si un drag est actif.
   */
  isDragging(): boolean {
    return this.dragState.isActive;
  }

  /**
   * Récupère le type de drag actuel.
   */
  getCurrentDragType(): 'move' | 'resize' | 'create' | null {
    return this.dragState.isActive ? this.dragState.type : null;
  }

  /**
   * Récupère le handle de resize actuel.
   */
  getCurrentResizeHandle(): string | null {
    return this.dragState.handle || null;
  }

  /**
   * Nettoie les ressources.
   */
  cleanup(): void {
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    
    if (this.resizePreview) {
      this.resizePreview.remove();
    }
  }
}