// src/ui/editor/dragDropHandler.ts

import { GRID_CONSTANTS } from "../../core/constants";
import { DragState, EditorConfig, EditorEvents, EventHandler } from "./types";

/**
 * Gestionnaire des interactions drag & drop pour l'éditeur.
 * Responsabilité unique : gestion des événements de souris et touches.
 * Pattern State Machine pour les différents modes (drag, resize, create).
 */
export class DragDropHandler implements EventHandler {
  private dragState: DragState = this.createInitialDragState();
  private container: HTMLElement | null = null;
  private readonly cellSize = GRID_CONSTANTS.CELL_SIZE_PX;
  
  // Éléments temporaires pour feedback visuel
  private previewBox: HTMLElement | null = null;
  private resizePreview: HTMLElement | null = null;
  private originalBoxState: { element: HTMLElement; style: string } | null = null;

  // Event listeners (pour le nettoyage)
  private readonly boundHandlers = {
    mouseMove: this.handleMouseMove.bind(this),
    mouseUp: this.handleMouseUp.bind(this),
    keyDown: this.handleKeyDown.bind(this)
  };

  constructor(
    private readonly config: EditorConfig,
    private readonly events: EditorEvents
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

    // Calculer la position relative dans la grille
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

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
      style: boxElement.style.cssText
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
      style: boxElement.style.cssText
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

    const deltaGridX = this.dragState.currentGridX - this.dragState.startGridX;
    const deltaGridY = this.dragState.currentGridY - this.dragState.startGridY;
    
    const newX = this.dragState.startGridX + deltaGridX;
    const newY = this.dragState.startGridY + deltaGridY;

    // Contraintes de grille
    const clampedX = Math.max(0, Math.min(newX, this.config.gridSize - 1));
    const clampedY = Math.max(0, Math.min(newY, this.config.gridSize - 1));

    const element = this.originalBoxState.element;
    element.style.setProperty('left', `${clampedX * this.cellSize}px`);
    element.style.setProperty('top', `${clampedY * this.cellSize}px`);
  }

  /**
   * Met à jour le preview pendant le resize
   */
  private updateResizePreview(): void {
    if (!this.originalBoxState || !this.dragState.handle) return;

    const deltaGridX = this.dragState.currentGridX - this.dragState.startGridX;
    const deltaGridY = this.dragState.currentGridY - this.dragState.startGridY;

    const element = this.originalBoxState.element;
    const currentRect = element.getBoundingClientRect();
    const containerRect = this.container!.getBoundingClientRect();

    let newX = Math.floor((currentRect.left - containerRect.left) / this.cellSize);
    let newY = Math.floor((currentRect.top - containerRect.top) / this.cellSize);
    let newW = Math.floor(currentRect.width / this.cellSize);
    let newH = Math.floor(currentRect.height / this.cellSize);

    // Appliquer le resize selon le handle
    switch (this.dragState.handle) {
      case 'se': { // Sud-Est
        newW = Math.max(this.config.minBoxSize, newW + deltaGridX);
        newH = Math.max(this.config.minBoxSize, newH + deltaGridY);
        break;
      }
      case 'sw': { // Sud-Ouest
        newW = Math.max(this.config.minBoxSize, newW - deltaGridX);
        newH = Math.max(this.config.minBoxSize, newH + deltaGridY);
        newX = Math.max(0, newX + deltaGridX);
        break;
      }
      case 'ne': { // Nord-Est
        newW = Math.max(this.config.minBoxSize, newW + deltaGridX);
        newH = Math.max(this.config.minBoxSize, newH - deltaGridY);
        newY = Math.max(0, newY + deltaGridY);
        break;
      }
      case 'nw': { // Nord-Ouest
        newW = Math.max(this.config.minBoxSize, newW - deltaGridX);
        newH = Math.max(this.config.minBoxSize, newH - deltaGridY);
        newX = Math.max(0, newX + deltaGridX);
        newY = Math.max(0, newY + deltaGridY);
        break;
      }
    }

    // Contraintes de grille
    newW = Math.min(newW, this.config.gridSize - newX);
    newH = Math.min(newH, this.config.gridSize - newY);

    element.style.setProperty('left', `${newX * this.cellSize}px`);
    element.style.setProperty('top', `${newY * this.cellSize}px`);
    element.style.setProperty('width', `${newW * this.cellSize}px`);
    element.style.setProperty('height', `${newH * this.cellSize}px`);
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

    this.previewBox.style.cssText = `
      position: absolute;
      left: ${startX * this.cellSize}px;
      top: ${startY * this.cellSize}px;
      width: ${width * this.cellSize}px;
      height: ${height * this.cellSize}px;
      border: 2px dashed var(--interactive-accent);
      background: var(--interactive-accent);
      opacity: 0.2;
      pointer-events: none;
      z-index: 998;
    `;
  }

  /**
   * Finalise le drag
   */
  private finishDrag(): void {
    if (!this.originalBoxState || !this.dragState.boxId) return;

    const element = this.originalBoxState.element;
    const rect = element.getBoundingClientRect();
    const containerRect = this.container!.getBoundingClientRect();

    const newX = Math.floor((rect.left - containerRect.left) / this.cellSize);
    const newY = Math.floor((rect.top - containerRect.top) / this.cellSize);

    this.events.onBoxUpdate(this.dragState.boxId, { x: newX, y: newY });
  }

  /**
   * Finalise le resize
   */
  private finishResize(): void {
    if (!this.originalBoxState || !this.dragState.boxId) return;

    const element = this.originalBoxState.element;
    const rect = element.getBoundingClientRect();
    const containerRect = this.container!.getBoundingClientRect();

    const newX = Math.floor((rect.left - containerRect.left) / this.cellSize);
    const newY = Math.floor((rect.top - containerRect.top) / this.cellSize);
    const newW = Math.floor(rect.width / this.cellSize);
    const newH = Math.floor(rect.height / this.cellSize);

    this.events.onBoxUpdate(this.dragState.boxId, {
      x: newX,
      y: newY,
      w: newW,
      h: newH
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