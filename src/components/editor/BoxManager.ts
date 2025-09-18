// src/components/editor/BoxManager.ts
import { LayoutBox, LayoutFile } from "../../core/layout/layoutFileRepo";
import { LayoutValidator24 } from "../../core/layout/layoutValidator24";
import { COLOR_CONSTANTS } from "../../core/constants";
import { DOMHelper } from "../../ui/utils/DOMHelper";
import { t } from "../../i18n";

/**
 * État d'un cadre pendant l'édition
 */
export interface BoxState {
  box: LayoutBox;
  element: HTMLElement;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
}

/**
 * Composant responsable de la gestion CRUD des boxes.
 * Crée, met à jour, supprime et valide les boxes du layout.
 */
export class BoxManager {
  private readonly validator = new LayoutValidator24();
  private boxes: Map<string, BoxState> = new Map();
  private cellSize: number;

  constructor(
    private gridInner: HTMLElement,
    cellSize: number,
    private onLayoutChange: (layout: LayoutFile) => void
  ) {
    this.cellSize = cellSize;
  }

  /**
   * Crée un élément visuel pour une box.
   */
  createBoxElement(box: LayoutBox, layout: LayoutFile): BoxState {
    const element = this.gridInner.createDiv('layout-box');
    
    // Positionnement avec espacement moderne
    element.style.position = 'absolute';
    element.style.left = `${box.x * this.cellSize + 2}px`;
    element.style.top = `${box.y * this.cellSize + 2}px`;
    element.style.width = `${box.w * this.cellSize - 4}px`;
    element.style.height = `${box.h * this.cellSize - 4}px`;
    DOMHelper.applyZIndex(element, 'SELECTED_BOX');
    
    // Données de la box
    element.dataset.boxId = box.id;
    element.dataset.width = box.w.toString();
    element.dataset.height = box.h.toString();
    element.dataset.boxX = box.x.toString();
    element.dataset.boxY = box.y.toString();
    
    // Attribution séquentielle des couleurs
    const boxIndex = layout.boxes.findIndex(b => b.id === box.id);
    const colorIndex = boxIndex % COLOR_CONSTANTS.TOTAL_COLORS;
    
    const bgColor = DOMHelper.getColorFromPalette(colorIndex);
    const borderColor = DOMHelper.getBorderColorFromPalette(colorIndex);
    
    this.applyBoxStyles(element, bgColor, borderColor);
    this.createBoxContent(element, box);
    this.addResizeHandles(element);
    
    const boxState: BoxState = {
      box,
      element,
      isSelected: false,
      isDragging: false,
      isResizing: false
    };

    this.boxes.set(box.id, boxState);
    return boxState;
  }

  /**
   * Applique les styles visuels à une box.
   */
  private applyBoxStyles(element: HTMLElement, bgColor: string, borderColor: string): void {
    element.style.backgroundColor = bgColor;
    element.style.border = `1px solid ${borderColor}`;
    element.style.borderRadius = '12px';
    element.style.cursor = 'move';
    element.style.display = 'flex';
    element.style.flexDirection = 'column';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
    element.style.overflow = 'hidden';
    element.style.opacity = '0.95';
    element.style.transition = 'all 0.2s ease';
    element.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)';
    element.style.boxSizing = 'border-box';
    element.style.background = `linear-gradient(135deg, ${bgColor}f0, ${bgColor}e0)`;
  }

  /**
   * Crée le contenu textuel d'une box.
   */
  private createBoxContent(element: HTMLElement, box: LayoutBox): void {
    // Titre
    const title = element.createDiv('box-title');
    title.textContent = box.title;
    title.style.color = 'white';
    title.style.fontSize = '12px';
    title.style.fontWeight = 'bold';
    title.style.textAlign = 'center';
    title.style.pointerEvents = 'none';
    title.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';

    // Coordonnées
    const coords = element.createDiv('box-coords');
    coords.textContent = `${box.x + 1},${box.y + 1} (${box.w}×${box.h})`;
    coords.style.position = 'absolute';
    coords.style.bottom = '2px';
    coords.style.right = '4px';
    coords.style.color = 'rgba(255,255,255,0.7)';
    coords.style.fontSize = '9px';
    coords.style.pointerEvents = 'none';
  }

  /**
   * Ajoute les poignées de redimensionnement.
   */
  private addResizeHandles(boxElement: HTMLElement): void {
    const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
    
    handles.forEach(handle => {
      const handleEl = boxElement.createDiv(`resize-handle resize-${handle}`);
      handleEl.style.position = 'absolute';
      handleEl.style.width = '10px';
      handleEl.style.height = '10px';
      handleEl.style.backgroundColor = '#ffffff';
      handleEl.style.border = '2px solid #3b82f6';
      handleEl.style.borderRadius = '50%';
      handleEl.style.opacity = '0';
      handleEl.style.transition = 'all 0.15s ease';
      DOMHelper.applyZIndex(handleEl, 'SELECTED_BOX');
      handleEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      
      this.positionResizeHandle(handleEl, handle);
      this.setupResizeHandleEvents(handleEl);
    });
  }

  /**
   * Positionne une poignée de redimensionnement.
   */
  private positionResizeHandle(handleEl: HTMLElement, handle: string): void {
    switch (handle) {
      case 'nw':
        handleEl.style.top = '-5px';
        handleEl.style.left = '-5px';
        handleEl.style.cursor = 'nw-resize';
        break;
      case 'ne':
        handleEl.style.top = '-5px';
        handleEl.style.right = '-5px';
        handleEl.style.cursor = 'ne-resize';
        break;
      case 'sw':
        handleEl.style.bottom = '-5px';
        handleEl.style.left = '-5px';
        handleEl.style.cursor = 'sw-resize';
        break;
      case 'se':
        handleEl.style.bottom = '-5px';
        handleEl.style.right = '-5px';
        handleEl.style.cursor = 'se-resize';
        break;
      case 'n':
        handleEl.style.top = '-5px';
        handleEl.style.left = '50%';
        handleEl.style.transform = 'translateX(-50%)';
        handleEl.style.cursor = 'n-resize';
        break;
      case 's':
        handleEl.style.bottom = '-5px';
        handleEl.style.left = '50%';
        handleEl.style.transform = 'translateX(-50%)';
        handleEl.style.cursor = 's-resize';
        break;
      case 'e':
        handleEl.style.right = '-5px';
        handleEl.style.top = '50%';
        handleEl.style.transform = 'translateY(-50%)';
        handleEl.style.cursor = 'e-resize';
        break;
      case 'w':
        handleEl.style.left = '-5px';
        handleEl.style.top = '50%';
        handleEl.style.transform = 'translateY(-50%)';
        handleEl.style.cursor = 'w-resize';
        break;
    }
  }

  /**
   * Configure les événements pour les poignées de redimensionnement.
   */
  private setupResizeHandleEvents(handleEl: HTMLElement): void {
    handleEl.addEventListener('mouseenter', () => {
      handleEl.style.opacity = '1';
      handleEl.style.transform = handleEl.style.transform.includes('translate') 
        ? handleEl.style.transform + ' scale(1.2)' 
        : 'scale(1.2)';
      handleEl.style.backgroundColor = '#3b82f6';
    });
    
    handleEl.addEventListener('mouseleave', () => {
      handleEl.style.transform = handleEl.style.transform.replace(' scale(1.2)', '');
      handleEl.style.backgroundColor = '#ffffff';
    });
  }

  /**
   * Met à jour la position d'une box.
   */
  updateBoxPosition(boxId: string, x: number, y: number, hasCollision: boolean = false): void {
    const boxState = this.boxes.get(boxId);
    if (!boxState) return;

    const element = boxState.element;
    element.style.left = `${x * this.cellSize + 2}px`;
    element.style.top = `${y * this.cellSize + 2}px`;
    
    element.dataset.boxX = x.toString();
    element.dataset.boxY = y.toString();
    
    this.updateBoxColors(element, hasCollision);
  }

  /**
   * Met à jour la taille et position d'une box.
   */
  updateBoxSizeAndPosition(boxId: string, x: number, y: number, w: number, h: number, hasCollision: boolean = false): void {
    const boxState = this.boxes.get(boxId);
    if (!boxState) return;

    const element = boxState.element;
    element.style.left = `${x * this.cellSize + 2}px`;
    element.style.top = `${y * this.cellSize + 2}px`;
    element.style.width = `${w * this.cellSize - 4}px`;
    element.style.height = `${h * this.cellSize - 4}px`;
    
    element.dataset.width = w.toString();
    element.dataset.height = h.toString();
    element.dataset.boxX = x.toString();
    element.dataset.boxY = y.toString();
    
    this.updateBoxColors(element, hasCollision);
  }

  /**
   * Met à jour les couleurs d'une box selon l'état de collision.
   */
  private updateBoxColors(element: HTMLElement, hasCollision: boolean): void {
    if (hasCollision) {
      element.style.backgroundColor = 'var(--background-modifier-error)';
      element.style.borderColor = 'var(--text-error)';
    } else {
      // Restaurer la couleur d'origine
      const boxId = element.dataset.boxId || '';
      const layout = this.getCurrentLayout();
      const boxIndex = layout.boxes.findIndex(b => b.id === boxId);
      const colorIndex = boxIndex % COLOR_CONSTANTS.TOTAL_COLORS;
      
      const bgColor = DOMHelper.getColorFromPalette(colorIndex);
      const borderColor = DOMHelper.getBorderColorFromPalette(colorIndex);
      
      element.style.backgroundColor = bgColor;
      element.style.borderColor = borderColor;
    }
  }

  /**
   * Met à jour le titre d'une box.
   */
  updateBoxTitle(boxId: string, newTitle: string): void {
    const boxState = this.boxes.get(boxId);
    if (!boxState) return;

    const titleElement = boxState.element.querySelector('.box-title') as HTMLElement;
    if (titleElement) {
      titleElement.textContent = newTitle;
    }
    
    boxState.box = { ...boxState.box, title: newTitle };
  }

  /**
   * Supprime une box.
   */
  removeBox(boxId: string): void {
    const boxState = this.boxes.get(boxId);
    if (!boxState) return;

    boxState.element.remove();
    this.boxes.delete(boxId);
  }

  /**
   * Génère un ID unique pour une nouvelle box.
   */
  generateBoxId(layoutName: string, existingBoxes: readonly LayoutBox[]): string {
    const cleanName = layoutName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    return `${cleanName}-box-${existingBoxes.length + 1}`;
  }

  /**
   * Retourne toutes les boxes.
   */
  getAllBoxes(): Map<string, BoxState> {
    return this.boxes;
  }

  /**
   * Retourne une box par ID.
   */
  getBox(boxId: string): BoxState | undefined {
    return this.boxes.get(boxId);
  }

  /**
   * Vide toutes les boxes.
   */
  clearAllBoxes(): void {
    this.boxes.forEach(boxState => {
      boxState.element.remove();
    });
    this.boxes.clear();
  }

  /**
   * Obtient le layout actuel (à implémenter par la classe parent).
   */
  private getCurrentLayout(): LayoutFile {
    // Cette méthode sera surchargée par injection de dépendance
    return { name: '', boxes: [] };
  }
}