// src/ui/editor/boxManager.ts

import { LayoutBox } from "../../core/layout/layoutFileRepo";
import { LayoutValidator24 } from "../../core/layout/layoutValidator24";
import { GRID_CONSTANTS, COLOR_CONSTANTS } from "../../core/constants";
import { BoxState, EditorConfig, EditorEvents } from "./types";

/**
 * Gestionnaire des boxes dans l'éditeur.
 * Responsable du rendu, création, suppression et mise à jour des boxes.
 * Pattern: État immutable + événements pour découplage.
 */
export class BoxManager {
  private readonly validator = new LayoutValidator24();
  private readonly boxes = new Map<string, BoxState>();
  private container: HTMLElement | null = null;
  private readonly cellSize = GRID_CONSTANTS.CELL_SIZE_PX;

  constructor(
    private readonly config: EditorConfig,
    private readonly events: EditorEvents
  ) {}

  /**
   * Initialise le gestionnaire avec un conteneur
   */
  public initialize(container: HTMLElement): void {
    this.container = container;
  }

  /**
   * Rend tous les boxes du layout
   */
  public renderLayout(boxes: readonly LayoutBox[]): void {
    this.clearAllBoxes();
    
    boxes.forEach(box => {
      this.createBoxElement(box);
    });
  }

  /**
   * Crée une nouvelle box à la position spécifiée
   */
  public createNewBox(x: number, y: number, width: number = 2, height: number = 2): LayoutBox | null {
    if (!this.container) return null;

    // Contraintes de taille minimale
    const finalWidth = Math.max(this.config.minBoxSize, width);
    const finalHeight = Math.max(this.config.minBoxSize, height);

    // Validation des limites de grille
    if (x + finalWidth > this.config.gridSize || y + finalHeight > this.config.gridSize) {
      this.events.onValidationError('Box trop proche du bord de la grille');
      return null;
    }

    const newBox: LayoutBox = {
      id: this.generateBoxId(),
      title: `Cadre ${this.boxes.size + 1}`,
      x,
      y,
      w: finalWidth,
      h: finalHeight
    };

    // Validation anti-collision
    const layoutFile = { name: 'temp', boxes: [...this.getBoxes(), newBox] };
    const validationResult = this.validator.validateLayout(layoutFile);
    if (!validationResult.isValid) {
      this.events.onValidationError(validationResult.errors[0] || 'Conflit de position détecté');
      return null;
    }

    this.createBoxElement(newBox);
    this.events.onBoxCreate(newBox);
    return newBox;
  }

  /**
   * Supprime une box par son ID
   */
  public deleteBox(boxId: string): void {
    const boxState = this.boxes.get(boxId);
    if (!boxState) return;

    // Supprimer du DOM
    boxState.element.remove();
    
    // Supprimer de l'état
    this.boxes.delete(boxId);
    
    // Notifier
    this.events.onBoxDelete(boxId);
  }

  /**
   * Met à jour une box existante
   */
  public updateBox(boxId: string, updates: Partial<LayoutBox>): void {
    const boxState = this.boxes.get(boxId);
    if (!boxState) return;

    const updatedBox = { ...boxState.box, ...updates };
    
    // Validation
    const otherBoxes = this.getBoxes().filter(b => b.id !== boxId);
    const layoutFile = { name: 'temp', boxes: [...otherBoxes, updatedBox] };
    const validationResult = this.validator.validateLayout(layoutFile);
    
    if (!validationResult.isValid) {
      this.events.onValidationError(validationResult.errors[0] || 'Mise à jour invalide');
      return;
    }

    // Mettre à jour l'état
    this.boxes.set(boxId, {
      ...boxState,
      box: updatedBox
    });

    // Mettre à jour le rendu
    this.updateBoxElement(boxState.element, updatedBox);
    
    // Notifier
    this.events.onBoxUpdate(boxId, updates);
  }

  /**
   * Efface toutes les boxes
   */
  public clearAllBoxes(): void {
    this.boxes.forEach(boxState => {
      boxState.element.remove();
    });
    this.boxes.clear();
  }

  /**
   * Récupère toutes les boxes actuelles
   */
  public getBoxes(): readonly LayoutBox[] {
    return Array.from(this.boxes.values()).map(state => state.box);
  }

  /**
   * Récupère une box par son ID
   */
  public getBox(boxId: string): LayoutBox | undefined {
    return this.boxes.get(boxId)?.box;
  }

  /**
   * Marque une box comme sélectionnée
   */
  public selectBox(boxId: string): void {
    this.boxes.forEach((boxState, id) => {
      const isSelected = id === boxId;
      this.boxes.set(id, { ...boxState, isSelected });
      this.updateBoxSelection(boxState.element, isSelected);
    });
  }

  /**
   * Déselectionne toutes les boxes
   */
  public deselectAll(): void {
    this.boxes.forEach((boxState, id) => {
      this.boxes.set(id, { ...boxState, isSelected: false });
      this.updateBoxSelection(boxState.element, false);
    });
  }

  /**
   * Crée l'élément DOM pour une box
   */
  private createBoxElement(box: LayoutBox): void {
    if (!this.container) return;

    const element = document.createElement('div');
    element.className = 'layout-box';
    element.dataset.boxId = box.id;
    
    this.updateBoxElement(element, box);
    this.setupBoxContent(element, box);
    this.container.appendChild(element);

    // Créer l'état de la box
    const boxState: BoxState = {
      box,
      element,
      isSelected: false,
      isDragging: false,
      isResizing: false
    };

    this.boxes.set(box.id, boxState);
  }

  /**
   * Met à jour l'élément DOM d'une box
   */
  private updateBoxElement(element: HTMLElement, box: LayoutBox): void {
    const pixelX = box.x * this.cellSize;
    const pixelY = box.y * this.cellSize;
    const pixelW = box.w * this.cellSize;
    const pixelH = box.h * this.cellSize;

    element.style.cssText = `
      position: absolute;
      left: ${pixelX}px;
      top: ${pixelY}px;
      width: ${pixelW}px;
      height: ${pixelH}px;
      border: 2px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-primary-alt);
      cursor: move;
      user-select: none;
      transition: box-shadow 0.2s ease;
      z-index: 1;
    `;
  }

  /**
   * Configure le contenu d'une box (titre + handles de resize)
   */
  private setupBoxContent(element: HTMLElement, box: LayoutBox): void {
    // Titre de la box
    const title = document.createElement('div');
    title.className = 'box-title';
    title.textContent = box.title;
    title.style.cssText = `
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-normal);
      background: var(--background-primary-alt);
      border-radius: 4px 4px 0 0;
      cursor: move;
      user-select: none;
    `;
    element.appendChild(title);

    // Handles de resize
    this.createResizeHandles(element);
  }

  /**
   * Crée les handles de resize pour une box
   */
  private createResizeHandles(element: HTMLElement): void {
    const handles = ['nw', 'ne', 'sw', 'se'];
    
    handles.forEach(position => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-${position}`;
      handle.dataset.handle = position;
      
      const styles = this.getHandleStyles(position);
      handle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: var(--interactive-accent);
        border: 1px solid var(--background-primary);
        border-radius: 2px;
        opacity: 0;
        transition: opacity 0.2s ease;
        cursor: ${this.getResizeCursor(position)};
        z-index: 2;
        ${styles}
      `;
      
      element.appendChild(handle);
    });

    // Afficher les handles au survol
    element.addEventListener('mouseenter', () => {
      element.querySelectorAll('.resize-handle').forEach(handle => {
        (handle as HTMLElement).style.opacity = '1';
      });
    });

    element.addEventListener('mouseleave', () => {
      element.querySelectorAll('.resize-handle').forEach(handle => {
        (handle as HTMLElement).style.opacity = '0';
      });
    });
  }

  /**
   * Styles CSS pour les handles selon leur position
   */
  private getHandleStyles(position: string): string {
    switch (position) {
      case 'nw': return 'top: -4px; left: -4px;';
      case 'ne': return 'top: -4px; right: -4px;';
      case 'sw': return 'bottom: -4px; left: -4px;';
      case 'se': return 'bottom: -4px; right: -4px;';
      default: return '';
    }
  }

  /**
   * Curseur approprié pour chaque handle de resize
   */
  private getResizeCursor(position: string): string {
    switch (position) {
      case 'nw':
      case 'se': return 'nwse-resize';
      case 'ne':
      case 'sw': return 'nesw-resize';
      default: return 'default';
    }
  }

  /**
   * Met à jour l'apparence de sélection d'une box
   */
  private updateBoxSelection(element: HTMLElement, isSelected: boolean): void {
    if (isSelected) {
      element.style.boxShadow = `0 0 0 2px var(--interactive-accent)`;
      element.style.borderColor = 'var(--interactive-accent)';
    } else {
      element.style.boxShadow = 'none';
      element.style.borderColor = 'var(--background-modifier-border)';
    }
  }

  /**
   * Génère un ID unique pour une nouvelle box
   */
  private generateBoxId(): string {
    return `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    this.clearAllBoxes();
    this.container = null;
  }
}