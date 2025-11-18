// src/ui/editor/dragDropHandler.ts

import { GRID_CONSTANTS } from "../../core/constants";
import { DragState, EditorConfig, EditorEvents, EventHandler } from "./types";
import { LayoutValidator24 } from "../../core/layout/layoutValidator24";
import { LayoutBox } from "../../core/layout/layoutFileRepo";

/**
 * Gestionnaire des interactions drag & drop pour l'éditeur.
 * Responsabilité unique : gestion des événements de souris et touches.
 * Pattern State Machine pour les différents modes (drag, resize, create).
 */
export class DragDropHandler implements EventHandler {
  private dragState: DragState = this.createInitialDragState();
  private container: HTMLElement | null = null;
  private readonly cellSize = GRID_CONSTANTS.CELL_SIZE_PX;
  private readonly validator = new LayoutValidator24();

  // Éléments temporaires pour feedback visuel
  private previewBox: HTMLElement | null = null;
  private resizePreview: HTMLElement | null = null;
  private originalBoxState: { element: HTMLElement; style: string; box: LayoutBox } | null = null;
  private lastValidPosition: { x: number; y: number; w: number; h: number } | null = null;

  // Event listeners (pour le nettoyage)
  private readonly boundHandlers = {
    mouseMove: this.handleMouseMove.bind(this),
    mouseUp: this.handleMouseUp.bind(this),
    keyDown: this.handleKeyDown.bind(this)
  };

  constructor(
    private readonly config: EditorConfig,
    private readonly events: EditorEvents,
    private readonly getAllBoxes: () => readonly LayoutBox[]
  ) {}

  /**
   * Initialise le gestionnaire avec un conteneur
   */
  public initialize(container: HTMLElement): void {
    this.container = container;
    this.attachEvents();
  }

  /**
   * Attache les event listeners
   */
  public attachEvents(): void {
    if (!this.container) return;

    // Événements de la grille
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    
    // Événements globaux (pour drag en cours)
    document.addEventListener('mousemove', this.boundHandlers.mouseMove);
    document.addEventListener('mouseup', this.boundHandlers.mouseUp);
    document.addEventListener('keydown', this.boundHandlers.keyDown);
  }

  /**
   * Détache les event listeners
   */
  public detachEvents(): void {
    if (!this.container) return;

    this.container.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    document.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    document.removeEventListener('mouseup', this.boundHandlers.mouseUp);
    document.removeEventListener('keydown', this.boundHandlers.keyDown);
  }

  /**
   * Début du drag (mousedown)
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.container) return;

    const target = event.target as HTMLElement;
    const boxElement = target.closest('.layout-box') as HTMLElement;
    const resizeHandle = target.closest('.resize-handle') as HTMLElement;

    // Déterminer le type d'interaction
    if (resizeHandle && boxElement) {
      this.startResize(event, boxElement, resizeHandle.dataset.handle!);
    } else if (boxElement) {
      this.startDrag(event, boxElement);
    } else {
      this.startCreate(event);
    }

    event.preventDefault();
  }

  /**
   * Mouvement de la souris
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.dragState.isActive) return;

    const gridPos = this.getGridPosition(event.clientX, event.clientY);
    
    this.dragState = {
      ...this.dragState,
      currentX: event.clientX,
      currentY: event.clientY,
      currentGridX: gridPos.x,
      currentGridY: gridPos.y
    };

    // Dispatcher selon le type
    switch (this.dragState.type) {
      case 'drag':
        this.updateDragPreview();
        break;
      case 'resize':
        this.updateResizePreview();
        break;
      case 'create':
        this.updateCreatePreview();
        break;
    }

    // Notifier les événements
    this.events.onDragMove(this.dragState);
  }

  /**
   * Fin du drag (mouseup)
   */
  private handleMouseUp(event: MouseEvent): void {
    if (!this.dragState.isActive) return;

    switch (this.dragState.type) {
      case 'drag':
        this.finishDrag();
        break;
      case 'resize':
        this.finishResize();
        break;
      case 'create':
        this.finishCreate();
        break;
    }

    this.resetDragState();
    this.events.onDragEnd();
  }

  /**
   * Gestion des touches (ESC pour annuler)
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.dragState.isActive) {
      this.cancelDrag();
      event.preventDefault();
    }
  }

  /**
   * Démarre un drag de box existante
   */
  private startDrag(event: MouseEvent, boxElement: HTMLElement): void {
    const boxId = boxElement.dataset.boxId!;
    const rect = boxElement.getBoundingClientRect();
    const containerRect = this.container!.getBoundingClientRect();

    // Trouver la box correspondante
    const currentBox = this.getAllBoxes().find(b => b.id === boxId);
    if (!currentBox) return;

    this.dragState = {
      ...this.createInitialDragState(),
      isActive: true,
      type: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      startGridX: Math.floor((rect.left - containerRect.left) / this.cellSize),
      startGridY: Math.floor((rect.top - containerRect.top) / this.cellSize),
      currentGridX: Math.floor((rect.left - containerRect.left) / this.cellSize),
      currentGridY: Math.floor((rect.top - containerRect.top) / this.cellSize),
      boxId
    };

    // Sauvegarder l'état original et créer le feedback visuel
    this.originalBoxState = {
      element: boxElement,
      style: boxElement.style.cssText,
      box: currentBox
    };

    // Sauvegarder la position valide initiale
    this.lastValidPosition = {
      x: currentBox.x,
      y: currentBox.y,
      w: currentBox.w,
      h: currentBox.h
    };

    boxElement.style.opacity = '0.7';
    boxElement.style.zIndex = '999';

    this.events.onDragStart(boxId, 'drag');
  }

  /**
   * Démarre un resize de box
   */
  private startResize(event: MouseEvent, boxElement: HTMLElement, handle: string): void {
    const boxId = boxElement.dataset.boxId!;
    const rect = boxElement.getBoundingClientRect();
    const containerRect = this.container!.getBoundingClientRect();

    // Trouver la box correspondante
    const currentBox = this.getAllBoxes().find(b => b.id === boxId);
    if (!currentBox) return;

    this.dragState = {
      ...this.createInitialDragState(),
      isActive: true,
      type: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      startGridX: Math.floor((rect.left - containerRect.left) / this.cellSize),
      startGridY: Math.floor((rect.top - containerRect.top) / this.cellSize),
      currentGridX: Math.floor((rect.left - containerRect.left) / this.cellSize),
      currentGridY: Math.floor((rect.top - containerRect.top) / this.cellSize),
      boxId,
      handle
    };

    this.originalBoxState = {
      element: boxElement,
      style: boxElement.style.cssText,
      box: currentBox
    };

    // Sauvegarder la taille/position valide initiale
    this.lastValidPosition = {
      x: currentBox.x,
      y: currentBox.y,
      w: currentBox.w,
      h: currentBox.h
    };

    this.events.onDragStart(boxId, 'resize');
  }

  /**
   * Démarre la création d'une nouvelle box
   */
  private startCreate(event: MouseEvent): void {
    const gridPos = this.getGridPosition(event.clientX, event.clientY);

    this.dragState = {
      ...this.createInitialDragState(),
      isActive: true,
      type: 'create',
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      startGridX: gridPos.x,
      startGridY: gridPos.y,
      currentGridX: gridPos.x,
      currentGridY: gridPos.y
    };

    this.createPreviewBox();
  }

  /**
   * Met à jour le preview pendant le drag
   */
  private updateDragPreview(): void {
    if (!this.originalBoxState) return;

    const originalBox = this.originalBoxState.box;
    const deltaGridX = this.dragState.currentGridX - this.dragState.startGridX;
    const deltaGridY = this.dragState.currentGridY - this.dragState.startGridY;

    const newX = originalBox.x + deltaGridX;
    const newY = originalBox.y + deltaGridY;

    // Contraintes de grille (empêcher débordement)
    const boxWidth = originalBox.w;
    const boxHeight = originalBox.h;
    const clampedX = Math.max(0, Math.min(newX, this.config.gridSize - boxWidth));
    const clampedY = Math.max(0, Math.min(newY, this.config.gridSize - boxHeight));

    // Créer la box hypothétique pour validation
    const hypotheticalBox: LayoutBox = {
      ...originalBox,
      x: clampedX,
      y: clampedY
    };

    // Vérifier les collisions avec les autres boxes
    const otherBoxes = this.getAllBoxes().filter(b => b.id !== originalBox.id);
    const collisionResult = this.validator.wouldCollide(hypotheticalBox, otherBoxes);

    const element = this.originalBoxState.element;

    // Si collision, bloquer le mouvement et indiquer visuellement
    if (collisionResult.hasCollisions) {
      // Rester à la dernière position valide
      if (this.lastValidPosition) {
        element.style.setProperty('left', `${this.lastValidPosition.x * this.cellSize}px`);
        element.style.setProperty('top', `${this.lastValidPosition.y * this.cellSize}px`);
      }
      element.style.borderColor = 'var(--text-error)';
      element.style.backgroundColor = 'var(--background-modifier-error)';
    } else {
      // Mouvement valide - appliquer la nouvelle position et sauvegarder
      element.style.setProperty('left', `${clampedX * this.cellSize}px`);
      element.style.setProperty('top', `${clampedY * this.cellSize}px`);
      element.style.borderColor = 'var(--interactive-accent)';
      element.style.backgroundColor = '';

      // Sauvegarder cette position comme dernière position valide
      this.lastValidPosition = { x: clampedX, y: clampedY, w: originalBox.w, h: originalBox.h };
    }
  }

  /**
   * Met à jour le preview pendant le resize
   */
  private updateResizePreview(): void {
    if (!this.originalBoxState || !this.dragState.handle) return;

    const originalBox = this.originalBoxState.box;
    const deltaGridX = this.dragState.currentGridX - this.dragState.startGridX;
    const deltaGridY = this.dragState.currentGridY - this.dragState.startGridY;

    let newX = originalBox.x;
    let newY = originalBox.y;
    let newW = originalBox.w;
    let newH = originalBox.h;

    // Appliquer le resize selon le handle
    switch (this.dragState.handle) {
      case 'se': { // Sud-Est
        newW = Math.max(this.config.minBoxSize, originalBox.w + deltaGridX);
        newH = Math.max(this.config.minBoxSize, originalBox.h + deltaGridY);
        break;
      }
      case 'sw': { // Sud-Ouest
        const deltaW = -deltaGridX;
        newW = Math.max(this.config.minBoxSize, originalBox.w + deltaW);
        newH = Math.max(this.config.minBoxSize, originalBox.h + deltaGridY);
        newX = originalBox.x + originalBox.w - newW;
        break;
      }
      case 'ne': { // Nord-Est
        const deltaH = -deltaGridY;
        newW = Math.max(this.config.minBoxSize, originalBox.w + deltaGridX);
        newH = Math.max(this.config.minBoxSize, originalBox.h + deltaH);
        newY = originalBox.y + originalBox.h - newH;
        break;
      }
      case 'nw': { // Nord-Ouest
        const deltaW = -deltaGridX;
        const deltaH = -deltaGridY;
        newW = Math.max(this.config.minBoxSize, originalBox.w + deltaW);
        newH = Math.max(this.config.minBoxSize, originalBox.h + deltaH);
        newX = originalBox.x + originalBox.w - newW;
        newY = originalBox.y + originalBox.h - newH;
        break;
      }
    }

    // Contraintes de grille (empêcher débordement)
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);
    newW = Math.min(newW, this.config.gridSize - newX);
    newH = Math.min(newH, this.config.gridSize - newY);

    // Créer la box hypothétique pour validation
    const hypotheticalBox: LayoutBox = {
      ...originalBox,
      x: newX,
      y: newY,
      w: newW,
      h: newH
    };

    // Vérifier les collisions avec les autres boxes
    const otherBoxes = this.getAllBoxes().filter(b => b.id !== originalBox.id);
    const collisionResult = this.validator.wouldCollide(hypotheticalBox, otherBoxes);

    const element = this.originalBoxState.element;

    // Si collision, bloquer le resize et indiquer visuellement
    if (collisionResult.hasCollisions) {
      // Rester à la dernière taille/position valide
      if (this.lastValidPosition) {
        element.style.setProperty('left', `${this.lastValidPosition.x * this.cellSize}px`);
        element.style.setProperty('top', `${this.lastValidPosition.y * this.cellSize}px`);
        element.style.setProperty('width', `${this.lastValidPosition.w * this.cellSize}px`);
        element.style.setProperty('height', `${this.lastValidPosition.h * this.cellSize}px`);
      }
      element.style.borderColor = 'var(--text-error)';
      element.style.backgroundColor = 'var(--background-modifier-error)';
    } else {
      // Resize valide - appliquer les nouvelles dimensions et sauvegarder
      element.style.setProperty('left', `${newX * this.cellSize}px`);
      element.style.setProperty('top', `${newY * this.cellSize}px`);
      element.style.setProperty('width', `${newW * this.cellSize}px`);
      element.style.setProperty('height', `${newH * this.cellSize}px`);
      element.style.borderColor = 'var(--interactive-accent)';
      element.style.backgroundColor = '';

      // Sauvegarder cette configuration comme dernière valide
      this.lastValidPosition = { x: newX, y: newY, w: newW, h: newH };
    }
  }

  /**
   * Met à jour le preview pendant la création
   */
  private updateCreatePreview(): void {
    if (!this.previewBox) return;

    const startX = Math.min(this.dragState.startGridX, this.dragState.currentGridX);
    const startY = Math.min(this.dragState.startGridY, this.dragState.currentGridY);
    const endX = Math.max(this.dragState.startGridX, this.dragState.currentGridX);
    const endY = Math.max(this.dragState.startGridY, this.dragState.currentGridY);

    const width = Math.max(this.config.minBoxSize, endX - startX + 1);
    const height = Math.max(this.config.minBoxSize, endY - startY + 1);

    // Créer la box hypothétique pour validation
    const hypotheticalBox: LayoutBox = {
      id: 'temp-preview',
      title: 'Preview',
      x: startX,
      y: startY,
      w: width,
      h: height
    };

    // Vérifier les collisions avec toutes les boxes existantes
    const collisionResult = this.validator.wouldCollide(hypotheticalBox, this.getAllBoxes());

    // Déterminer la couleur selon la collision
    const borderColor = collisionResult.hasCollisions ? 'var(--text-error)' : 'var(--interactive-accent)';
    const bgColor = collisionResult.hasCollisions ? 'var(--background-modifier-error)' : 'var(--interactive-accent)';

    this.previewBox.style.cssText = `
      position: absolute;
      left: ${startX * this.cellSize}px;
      top: ${startY * this.cellSize}px;
      width: ${width * this.cellSize}px;
      height: ${height * this.cellSize}px;
      border: 2px dashed ${borderColor};
      background: ${bgColor};
      opacity: 0.2;
      pointer-events: none;
      z-index: 998;
    `;
  }

  /**
   * Finalise le drag
   */
  private finishDrag(): void {
    if (!this.originalBoxState || !this.dragState.boxId || !this.lastValidPosition) return;

    // Utiliser la dernière position valide (celle qui n'avait pas de collision)
    this.events.onBoxUpdate(this.dragState.boxId, {
      x: this.lastValidPosition.x,
      y: this.lastValidPosition.y
    });
  }

  /**
   * Finalise le resize
   */
  private finishResize(): void {
    if (!this.originalBoxState || !this.dragState.boxId || !this.lastValidPosition) return;

    // Utiliser la dernière taille/position valide (celle qui n'avait pas de collision)
    this.events.onBoxUpdate(this.dragState.boxId, {
      x: this.lastValidPosition.x,
      y: this.lastValidPosition.y,
      w: this.lastValidPosition.w,
      h: this.lastValidPosition.h
    });
  }

  /**
   * Finalise la création
   */
  private finishCreate(): void {
    const startX = Math.min(this.dragState.startGridX, this.dragState.currentGridX);
    const startY = Math.min(this.dragState.startGridY, this.dragState.currentGridY);
    const endX = Math.max(this.dragState.startGridX, this.dragState.currentGridX);
    const endY = Math.max(this.dragState.startGridY, this.dragState.currentGridY);

    const width = Math.max(this.config.minBoxSize, endX - startX + 1);
    const height = Math.max(this.config.minBoxSize, endY - startY + 1);

    // Création via l'événement
    this.events.onBoxCreate({
      id: '', // Sera généré par le BoxManager
      title: `Cadre ${Date.now()}`,
      x: startX,
      y: startY,
      w: width,
      h: height
    });
  }

  /**
   * Annule le drag en cours
   */
  private cancelDrag(): void {
    if (this.originalBoxState) {
      this.originalBoxState.element.style.cssText = this.originalBoxState.style;
    }
    this.resetDragState();
    this.events.onDragEnd();
  }

  /**
   * Crée la box de preview pour la création
   */
  private createPreviewBox(): void {
    if (!this.container) return;

    this.previewBox = document.createElement('div');
    this.container.appendChild(this.previewBox);
  }

  /**
   * Remet à zéro l'état de drag
   */
  private resetDragState(): void {
    // Nettoyer les éléments temporaires
    if (this.previewBox) {
      this.previewBox.remove();
      this.previewBox = null;
    }

    if (this.originalBoxState) {
      this.originalBoxState.element.style.cssText = this.originalBoxState.style;
      this.originalBoxState = null;
    }

    this.lastValidPosition = null;
    this.dragState = this.createInitialDragState();
  }

  /**
   * Crée l'état initial de drag
   */
  private createInitialDragState(): DragState {
    return {
      isActive: false,
      type: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      startGridX: 0,
      startGridY: 0,
      currentGridX: 0,
      currentGridY: 0
    };
  }

  /**
   * Convertit les coordonnées écran en position grille
   */
  private getGridPosition(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.container) return { x: 0, y: 0 };

    const rect = this.container.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / this.cellSize);
    const y = Math.floor((clientY - rect.top) / this.cellSize);

    return {
      x: Math.max(0, Math.min(x, this.config.gridSize - 1)),
      y: Math.max(0, Math.min(y, this.config.gridSize - 1))
    };
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    this.detachEvents();
    this.resetDragState();
    this.container = null;
  }
}