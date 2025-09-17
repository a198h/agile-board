// src/ui/layoutEditor.ts

import { Modal, App, ButtonComponent, Notice } from "obsidian";
import { LayoutBox, LayoutFile } from "../core/layout/layoutFileRepo";
import { LayoutValidator24 } from "../core/layout/layoutValidator24";
import { GRID_CONSTANTS, UI_CONSTANTS, COLOR_CONSTANTS } from "../core/constants";
import { DOMHelper } from "./utils/DOMHelper";
import { PositionCalculator } from "./utils/PositionCalculator";

/**
 * Interface pour les interactions avec l'éditeur
 */
export interface LayoutEditorCallbacks {
  onSave: (layout: LayoutFile) => void;
  onCancel: () => void;
}

/**
 * État d'un cadre pendant l'édition
 */
interface BoxState {
  box: LayoutBox;
  element: HTMLElement;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
}

/**
 * Éditeur visuel pour les layouts 24x24
 */
export class LayoutEditor extends Modal {
  private readonly validator = new LayoutValidator24();
  
  private layout: LayoutFile;
  private readonly callbacks: LayoutEditorCallbacks;
  
  // Éléments DOM
  private gridContainer!: HTMLElement;
  private gridInner!: HTMLElement;
  private sidebar!: HTMLElement;
  private selectedBox: BoxState | null = null;
  private boxes: Map<string, BoxState> = new Map();
  
  // Constantes de grille
  private readonly GRID_SIZE = GRID_CONSTANTS.SIZE;
  
  // État du drag & drop
  private dragState: {
    isActive: boolean;
    startX: number;
    startY: number;
    gridStartX: number;
    gridStartY: number;
    type: 'move' | 'resize' | 'create';
    handle?: string; // pour le resize: 'nw', 'ne', 'sw', 'se', etc.
  } = {
    isActive: false,
    startX: 0,
    startY: 0,
    gridStartX: 0,
    gridStartY: 0,
    type: 'move'
  };

  // Éléments temporaires pour le drag & drop
  private previewBox: HTMLElement | null = null;
  private resizePreview: HTMLElement | null = null;
  private originalBoxState: LayoutBox | null = null;

  constructor(
    app: App,
    layout: LayoutFile,
    callbacks: LayoutEditorCallbacks
  ) {
    super(app);
    this.layout = { ...layout }; // Clone pour éviter les mutations
    this.callbacks = callbacks;
  }

  onOpen(): void {
    this.contentEl.empty();
    this.setupUI();
    this.renderLayout();
    this.setupEventListeners();
  }

  onClose(): void {
    this.cleanup();
  }

  // Configuration de l'interface

  private setupUI(): void {
    this.titleEl.setText(`Édition du tableau: ${this.layout.name}`);
    
    // Container principal avec taille optimisée
    const mainContainer = this.contentEl.createDiv('layout-editor-container');
    mainContainer.style.position = 'relative';
    mainContainer.style.height = `${UI_CONSTANTS.EDITOR_HEIGHT_PX}px`; // Hauteur pour avoir une grille carrée
    mainContainer.style.marginBottom = '15px'; // Espace pour les boutons
    
    // Ajuster la taille de la modal pour être compacte - éliminer l'espace gris inutile
    this.modalEl.style.width = '970px'; // Largeur fixe calculée pour grille + sidebar + marges
    this.modalEl.style.maxWidth = '95vw'; // Limite pour les petits écrans
    this.modalEl.style.height = 'auto'; // Hauteur automatique
    this.modalEl.style.maxHeight = '90vh'; // Limite pour éviter le débordement
    this.modalEl.style.minHeight = 'auto'; // Pas de hauteur minimale forcée

    // Zone de grille avec marges pour éviter le débordement
    const gridWrapper = mainContainer.createDiv('grid-wrapper');
    gridWrapper.style.position = 'absolute';
    gridWrapper.style.left = '0';
    gridWrapper.style.top = '0';
    gridWrapper.style.width = `${UI_CONSTANTS.EDITOR_WIDTH_PX}px`; // Largeur fixe pour avoir un carré parfait
    gridWrapper.style.height = `${UI_CONSTANTS.EDITOR_HEIGHT_PX}px`; // Hauteur fixe pour avoir un carré parfait
    gridWrapper.style.overflow = 'visible'; // Permet aux ombres d'être visibles
    gridWrapper.style.border = '1px solid var(--background-modifier-border)';
    gridWrapper.style.borderRadius = '4px';
    gridWrapper.style.backgroundColor = 'var(--background-secondary)';
    gridWrapper.style.paddingRight = '8px'; // Marge à droite uniquement pour éviter le débordement

    this.gridContainer = gridWrapper.createDiv('layout-grid');
    this.setupGrid();

    // Sidebar avec position absolue - ajustée pour le nouveau layout
    this.sidebar = mainContainer.createDiv('layout-sidebar');
    this.sidebar.style.position = 'absolute';
    this.sidebar.style.left = `${UI_CONSTANTS.EDITOR_WIDTH_PX + 15}px`; // Positionné après la grille + marge
    this.sidebar.style.top = '0';
    this.sidebar.style.bottom = '0';
    this.sidebar.style.width = '280px';
    this.sidebar.style.border = '1px solid var(--background-modifier-border)';
    this.sidebar.style.borderRadius = '4px';
    this.sidebar.style.padding = '15px';
    this.sidebar.style.backgroundColor = 'var(--background-primary)';
    this.sidebar.style.overflow = 'auto'; // Scroll si nécessaire
    this.sidebar.style.boxSizing = 'border-box';
    
    this.setupSidebar();
    this.setupToolbar();
  }

  private setupGrid(): void {
    // GRILLE FIXE : utiliser exactement tout l'espace disponible
    this.gridContainer.style.position = 'absolute';
    this.gridContainer.style.top = '0';
    this.gridContainer.style.left = '0';
    this.gridContainer.style.right = '0';
    this.gridContainer.style.bottom = '0';
    this.gridContainer.style.cursor = 'crosshair';
    this.gridContainer.style.paddingTop = `${GRID_CONSTANTS.PADDING_PX}px`; // Espace réduit pour les numéros
    this.gridContainer.style.paddingLeft = `${GRID_CONSTANTS.PADDING_PX}px`; // Espace réduit pour les numéros
    this.gridContainer.style.boxSizing = 'border-box';
    
    // Taille fixe calculée depuis les constantes
    const availableSpace = GRID_CONSTANTS.TOTAL_WIDTH_PX;
    this.cellSize = GRID_CONSTANTS.CELL_SIZE_PX; // Taille précalculée
    
    // Créer la grille immédiatement
    this.createFixedGrid();
  }
  
  private createFixedGrid(): void {
    // Grille interne avec dimensions ajustées pour les marges
    const gridInner = this.gridContainer.createDiv('grid-inner');
    gridInner.style.position = 'relative';
    gridInner.style.width = `${GRID_CONSTANTS.TOTAL_WIDTH_PX}px`; // Largeur grille
    gridInner.style.height = `${GRID_CONSTANTS.TOTAL_WIDTH_PX + 8}px`; // Hauteur grille + marge 
    gridInner.style.backgroundColor = 'var(--background-secondary)';
    gridInner.style.border = '1px solid var(--background-modifier-border)';
    
    // Dessiner la grille avec la taille fixe
    this.drawGridLines(gridInner);
    
    // Ajouter les numéros avec la taille fixe
    this.addGridNumbers();
    
    // Stocker la référence
    this.gridInner = gridInner;
    
    // Rendre le layout existant avec la nouvelle taille
    this.renderLayout();
  }

  private cellSize = GRID_CONSTANTS.CELL_SIZE_PX; // Taille des cellules
  
  private drawGridLines(gridInner: HTMLElement): void {
    // Dessiner les lignes verticales (colonnes)
    for (let i = 1; i < this.GRID_SIZE; i++) {
      const line = gridInner.createDiv('grid-line-vertical');
      line.style.position = 'absolute';
      line.style.left = `${i * this.cellSize}px`;
      line.style.top = '0';
      line.style.width = '1px';
      line.style.height = '100%';
      line.style.backgroundColor = 'var(--background-modifier-border)';
      line.style.pointerEvents = 'none';
    }
    
    // Dessiner les lignes horizontales (lignes)
    for (let i = 1; i < this.GRID_SIZE; i++) {
      const line = gridInner.createDiv('grid-line-horizontal');
      line.style.position = 'absolute';
      line.style.top = `${i * this.cellSize}px`;
      line.style.left = '0';
      line.style.height = '1px';
      line.style.width = '100%';
      line.style.backgroundColor = 'var(--background-modifier-border)';
      line.style.pointerEvents = 'none';
    }
  }
  
  private addGridNumbers(): void {
    // Numéros de colonnes (1-24)
    for (let i = 0; i < this.GRID_SIZE; i++) {
      const label = this.gridContainer.createDiv('grid-number-col');
      label.textContent = (i + 1).toString();
      label.style.position = 'absolute';
      label.style.left = `${18 + i * this.cellSize + this.cellSize / 2 - 6}px`;
      label.style.top = '2px';
      label.style.fontSize = '10px';
      label.style.color = 'var(--text-accent)';
      label.style.fontWeight = '600';
      label.style.textAlign = 'center';
      label.style.width = '12px';
      label.style.pointerEvents = 'none';
    }
    
    // Numéros de lignes (1-24)
    for (let i = 0; i < this.GRID_SIZE; i++) {
      const label = this.gridContainer.createDiv('grid-number-row');
      label.textContent = (i + 1).toString();
      label.style.position = 'absolute';
      label.style.left = '2px';
      label.style.top = `${18 + i * this.cellSize + this.cellSize / 2 - 6}px`;
      label.style.fontSize = '10px';
      label.style.color = 'var(--text-accent)';
      label.style.fontWeight = '600';
      label.style.textAlign = 'center';
      label.style.width = '20px';
      label.style.pointerEvents = 'none';
    }
  }

  private addGridLabels(): void {
    // Les dimensions sont maintenant fixes, on peut calculer directement
    const containerRect = this.gridContainer.getBoundingClientRect();
    const gridWidth = containerRect.width - 20; // Soustraire le padding
    const gridHeight = containerRect.height - 20; // Soustraire le padding
    
    const cellWidth = gridWidth / this.GRID_SIZE;
    const cellHeight = gridHeight / this.GRID_SIZE;

    // Labels pour les colonnes (1-24) - en haut
    for (let i = 0; i < this.GRID_SIZE; i++) {
      const label = this.gridContainer.createDiv('grid-label-col');
      label.textContent = (i + 1).toString();
      label.style.position = 'absolute';
      label.style.left = `${20 + i * cellWidth + cellWidth / 2 - 6}px`;
      label.style.top = '2px';
      label.style.fontSize = '10px';
      label.style.color = 'var(--text-accent)';
      label.style.fontWeight = '600';
      label.style.pointerEvents = 'none';
      DOMHelper.applyZIndex(label, 'SELECTED_BOX');
      label.style.textAlign = 'center';
      label.style.minWidth = '12px';
    }

    // Labels pour les lignes (1-24) - à gauche
    for (let i = 0; i < this.GRID_SIZE; i++) {
      const label = this.gridContainer.createDiv('grid-label-row');
      label.textContent = (i + 1).toString();
      label.style.position = 'absolute';
      label.style.left = '2px';
      label.style.top = `${20 + i * cellHeight + cellHeight / 2 - 6}px`;
      label.style.fontSize = '10px';
      label.style.color = 'var(--text-accent)';
      label.style.fontWeight = '600';
      label.style.pointerEvents = 'none';
      DOMHelper.applyZIndex(label, 'SELECTED_BOX');
      label.style.textAlign = 'center';
      label.style.minWidth = '15px';
    }
  }

  private addGridBackground(): void {
    // Créer un pseudo-élément avec background pour la grille sans interférer avec CSS Grid
    const style = document.createElement('style');
    style.textContent = `
      .layout-grid::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 0;
        background-color: var(--background-secondary);
      }
      
      .layout-grid > .layout-box {
        z-index: 2;
      }
      
      .layout-grid > .preview-box {
        z-index: 5;
      }
    `;
    document.head.appendChild(style);
    
    // Ajouter des labels pour les numéros de grille
    this.addGridLabels();
  }

  private setupSidebar(): void {
    // Header du sidebar
    const header = this.sidebar.createDiv('sidebar-header');
    header.style.borderBottom = '1px solid var(--background-modifier-border)';
    header.style.paddingBottom = '12px';
    header.style.marginBottom = '16px';
    
    const title = header.createEl('h2');
    title.textContent = 'Éditeur de Tableau';
    title.style.margin = '0';
    title.style.fontSize = '16px';
    title.style.color = 'var(--text-normal)';
    
    const subtitle = header.createDiv();
    subtitle.textContent = `Grille ${this.GRID_SIZE}×${this.GRID_SIZE}`;
    subtitle.style.color = 'var(--text-muted)';
    subtitle.style.fontSize = '12px';
    subtitle.style.marginTop = '4px';

    // Section Box sélectionnée
    this.createSelectionSection();
    
    // Section Actions rapides
    this.createActionsSection();
    
    // Section Aide
    this.createHelpSection();
    
    // Bouton pour effacer toutes les boxes (en dehors de la frame d'aide)
    this.createClearAllButton();
  }

  private createSelectionSection(): void {
    const selectionSection = this.sidebar.createDiv('selection-section');
    selectionSection.style.marginBottom = '20px';
    selectionSection.style.padding = '12px';
    selectionSection.style.backgroundColor = 'var(--background-secondary)';
    selectionSection.style.borderRadius = '6px';
    selectionSection.style.border = '1px solid var(--background-modifier-border)';
    
    const sectionTitle = selectionSection.createEl('h3');
    sectionTitle.textContent = '📦 Box sélectionnée';
    sectionTitle.style.margin = '0 0 12px 0';
    sectionTitle.style.fontSize = '14px';
    sectionTitle.style.color = 'var(--text-normal)';
    
    const infoContent = selectionSection.createDiv('info-content');
    infoContent.innerHTML = '<p style="color: var(--text-muted); margin: 0;">Aucun cadre sélectionné</p>';
  }

  private createActionsSection(): void {
    const actionsSection = this.sidebar.createDiv('actions-section');
    actionsSection.style.marginBottom = '20px';
    
    const sectionTitle = actionsSection.createEl('h3');
    sectionTitle.textContent = '⚡ Actions';
    sectionTitle.style.margin = '0 0 12px 0';
    sectionTitle.style.fontSize = '14px';
    sectionTitle.style.color = 'var(--text-normal)';
    
    // Bouton Ajouter
    const addButton = actionsSection.createEl('button');
    addButton.textContent = '+ Ajouter une box';
    addButton.style.width = '100%';
    addButton.style.padding = '8px 12px';
    addButton.style.marginBottom = '8px';
    addButton.style.backgroundColor = 'var(--interactive-accent)';
    addButton.style.color = 'white';
    addButton.style.border = 'none';
    addButton.style.borderRadius = '4px';
    addButton.style.cursor = 'pointer';
    addButton.style.fontSize = '13px';
    addButton.style.fontWeight = '500';
    addButton.addEventListener('click', () => this.createNewBox());
    
    // Bouton Supprimer
    const deleteButton = actionsSection.createEl('button');
    deleteButton.textContent = '🗑️ Supprimer la box';
    deleteButton.style.width = '100%';
    deleteButton.style.padding = '8px 12px';
    deleteButton.style.backgroundColor = '#fee2e2';
    deleteButton.style.color = '#dc2626';
    deleteButton.style.border = '1px solid #fca5a5';
    deleteButton.style.borderRadius = '4px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.fontSize = '13px';
    deleteButton.style.fontWeight = '500';
    deleteButton.addEventListener('click', () => this.deleteSelectedBox());
  }

  private createHelpSection(): void {
    const helpSection = this.sidebar.createDiv('help-section');
    helpSection.style.padding = '12px';
    helpSection.style.backgroundColor = 'var(--background-secondary)';
    helpSection.style.borderRadius = '6px';
    helpSection.style.border = '1px solid var(--background-modifier-border)';
    
    const sectionTitle = helpSection.createEl('h3');
    sectionTitle.textContent = '💡 Aide';
    sectionTitle.style.margin = '0 0 8px 0';
    sectionTitle.style.fontSize = '14px';
    sectionTitle.style.color = 'var(--text-normal)';
    
    const helpText = helpSection.createDiv();
    helpText.innerHTML = `
      <div style="font-size: 12px; line-height: 1.4; color: var(--text-muted);">
        <p style="margin: 0 0 6px 0;"><strong>Créer:</strong> Cliquez et glissez sur la grille</p>
        <p style="margin: 0 0 6px 0;"><strong>Déplacer:</strong> Glissez une box</p>
        <p style="margin: 0 0 6px 0;"><strong>Redimensionner:</strong> Utilisez les poignées circulaires</p>
        <p style="margin: 0;"><strong>Sélectionner:</strong> Cliquez sur une box</p>
      </div>
    `;
  }

  private createClearAllButton(): void {
    // Bouton pour effacer toutes les boxes
    const clearAllButton = this.sidebar.createEl('button');
    clearAllButton.textContent = '🗑️ Effacer toutes les boxes';
    clearAllButton.style.width = '100%';
    clearAllButton.style.padding = '10px 12px';
    clearAllButton.style.marginTop = '16px';
    clearAllButton.style.backgroundColor = '#dc2626';
    clearAllButton.style.color = 'white';
    clearAllButton.style.border = 'none';
    clearAllButton.style.borderRadius = '4px';
    clearAllButton.style.cursor = 'pointer';
    clearAllButton.style.fontSize = '13px';
    clearAllButton.style.fontWeight = '600';
    clearAllButton.style.transition = 'background-color 0.2s ease';
    
    // Effet hover
    clearAllButton.addEventListener('mouseenter', () => {
      clearAllButton.style.backgroundColor = '#b91c1c';
    });
    clearAllButton.addEventListener('mouseleave', () => {
      clearAllButton.style.backgroundColor = '#dc2626';
    });
    
    clearAllButton.addEventListener('click', () => this.clearAllBoxes());
  }

  private setupToolbar(): void {
    const toolbar = this.contentEl.createDiv('layout-toolbar');
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'space-between';
    toolbar.style.alignItems = 'center';
    toolbar.style.marginTop = '0px'; // Pas de marge pour coller au container
    toolbar.style.padding = '12px 15px'; // Padding plus compact
    toolbar.style.borderTop = '1px solid var(--background-modifier-border)';
    toolbar.style.backgroundColor = 'var(--background-primary)';
    toolbar.style.borderRadius = '0 0 6px 6px'; // Coins arrondis en bas

    // Informations sur le layout
    const info = toolbar.createDiv('layout-info');
    info.innerHTML = `<span style="color: var(--text-muted);">
      ${this.layout.boxes.length} cadre${this.layout.boxes.length > 1 ? 's' : ''} • Grille 24×24
    </span>`;

    // Boutons d'action
    const actions = toolbar.createDiv('layout-actions');
    actions.style.display = 'flex';
    actions.style.gap = '10px';

    new ButtonComponent(actions)
      .setButtonText('Annuler')
      .onClick(() => {
        this.callbacks.onCancel();
        this.close();
      });

    new ButtonComponent(actions)
      .setButtonText('Sauvegarder')
      .setCta()
      .onClick(() => this.saveLayout());
  }

  // Rendu du layout

  private renderLayout(): void {
    // Vider les boxes existantes
    this.boxes.forEach(boxState => {
      boxState.element.remove();
    });
    this.boxes.clear();

    // Créer les elements pour chaque box
    this.layout.boxes.forEach(box => {
      this.createBoxElement(box);
    });
  }

  private createBoxElement(box: LayoutBox): BoxState {
    const element = this.gridInner.createDiv('layout-box');
    
    // Positionnement avec espacement moderne (gap de 4px)
    element.style.position = 'absolute';
    element.style.left = `${box.x * this.cellSize + 2}px`;
    element.style.top = `${box.y * this.cellSize + 2}px`;
    element.style.width = `${box.w * this.cellSize - 4}px`;
    element.style.height = `${box.h * this.cellSize - 4}px`;
    DOMHelper.applyZIndex(element, 'SELECTED_BOX'); // Au-dessus des lignes de grille
    
    // Sauvegarder l'ID, dimensions et position dans les data attributes
    element.dataset.boxId = box.id;
    element.dataset.width = box.w.toString();
    element.dataset.height = box.h.toString();
    element.dataset.boxX = box.x.toString();
    element.dataset.boxY = box.y.toString();
    // Attribution séquentielle simple : ordre de création des boxes
    const boxIndex = this.layout.boxes.findIndex(b => b.id === box.id);
    const colorIndex = boxIndex % COLOR_CONSTANTS.TOTAL_COLORS; // Couleurs disponibles dans le CSS
    
    // Utiliser les variables CSS pour les couleurs (personnalisables par l'utilisateur)
    const bgColor = DOMHelper.getColorFromPalette(colorIndex);
    const borderColor = DOMHelper.getBorderColorFromPalette(colorIndex);
    
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

    // Titre
    const title = element.createDiv('box-title');
    title.textContent = box.title;
    title.style.color = 'white';
    title.style.fontSize = '12px';
    title.style.fontWeight = 'bold';
    title.style.textAlign = 'center';
    title.style.pointerEvents = 'none';
    title.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';

    // Coordonnées en petit
    const coords = element.createDiv('box-coords');
    coords.textContent = `${box.x + 1},${box.y + 1} (${box.w}×${box.h})`;
    coords.style.position = 'absolute';
    coords.style.bottom = '2px';
    coords.style.right = '4px';
    coords.style.color = 'rgba(255,255,255,0.7)';
    coords.style.fontSize = '9px';
    coords.style.pointerEvents = 'none';

    // Poignées de redimensionnement
    this.addResizeHandles(element);

    const boxState: BoxState = {
      box,
      element,
      isSelected: false,
      isDragging: false,
      isResizing: false
    };

    // Event listeners
    element.addEventListener('mousedown', (e) => this.onBoxMouseDown(e, boxState));
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectBox(boxState);
    });
    
    // Pas d'effet hover pour éviter la perte de focus pendant le redimensionnement

    this.boxes.set(box.id, boxState);
    return boxState;
  }

  private addResizeHandles(boxElement: HTMLElement): void {
    const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
    
    handles.forEach(handle => {
      const handleEl = boxElement.createDiv(`resize-handle resize-${handle}`);
      handleEl.style.position = 'absolute';
      handleEl.style.width = '10px';
      handleEl.style.height = '10px';
      handleEl.style.backgroundColor = '#ffffff';
      handleEl.style.border = '2px solid #3b82f6';
      handleEl.style.borderRadius = '50%'; // Cercles au lieu de carrés
      handleEl.style.opacity = '0';
      handleEl.style.transition = 'all 0.15s ease';
      DOMHelper.applyZIndex(handleEl, 'SELECTED_BOX');
      handleEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      
      // Effet hover pour les poignées
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
      
      // Positionnement selon le type de poignée
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

      handleEl.addEventListener('mousedown', (e) => this.onResizeHandleMouseDown(e, handle));
    });
  }

  // Event listeners et interactions

  private setupEventListeners(): void {
    // Clic sur la grille pour créer une nouvelle box
    this.gridInner.addEventListener('mousedown', (e) => this.onGridMouseDown(e));
    
    // Désélection en cliquant ailleurs (mais pas dans le sidebar)
    document.addEventListener('click', (e) => {
      const target = e.target as Node;
      if (!this.gridContainer.contains(target) && !this.sidebar.contains(target)) {
        this.deselectAll();
      }
    });

    // Gestion globale de la souris pour le drag & drop
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onGridMouseDown(e: MouseEvent): void {
    if (!this.gridInner.contains(e.target as Node)) return;
    
    const gridPos = this.screenToGrid(e.clientX, e.clientY);
    if (!gridPos) return;

    this.dragState = {
      isActive: true,
      startX: e.clientX,
      startY: e.clientY,
      gridStartX: gridPos.x,
      gridStartY: gridPos.y,
      type: 'create'
    };

    e.preventDefault();
  }

  private onBoxMouseDown(e: MouseEvent, boxState: BoxState): void {
    if (!boxState.isSelected) {
      this.selectBox(boxState);
    }

    const gridPos = this.screenToGrid(e.clientX, e.clientY);
    if (!gridPos) return;

    this.originalBoxState = { ...boxState.box };

    this.dragState = {
      isActive: true,
      startX: e.clientX,
      startY: e.clientY,
      gridStartX: gridPos.x,
      gridStartY: gridPos.y,
      type: 'move'
    };

    boxState.isDragging = true;
    e.stopPropagation();
    e.preventDefault();
  }

  private onResizeHandleMouseDown(e: MouseEvent, handle: string): void {
    const gridPos = this.screenToGrid(e.clientX, e.clientY);
    if (!gridPos) return;

    if (this.selectedBox) {
      this.originalBoxState = { ...this.selectedBox.box };
    }

    this.dragState = {
      isActive: true,
      startX: e.clientX,
      startY: e.clientY,
      gridStartX: gridPos.x,
      gridStartY: gridPos.y,
      type: 'resize',
      handle
    };

    if (this.selectedBox) {
      this.selectedBox.isResizing = true;
    }

    e.stopPropagation();
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragState.isActive) return;

    const currentGridPos = this.screenToGrid(e.clientX, e.clientY);
    if (!currentGridPos) return;

    const deltaX = currentGridPos.x - this.dragState.gridStartX;
    const deltaY = currentGridPos.y - this.dragState.gridStartY;

    switch (this.dragState.type) {
      case 'create':
        this.handleCreateDrag(deltaX, deltaY);
        break;
      case 'move':
        this.handleMoveDrag(deltaX, deltaY);
        break;
      case 'resize':
        this.handleResizeDrag(deltaX, deltaY);
        break;
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.dragState.isActive) return;

    switch (this.dragState.type) {
      case 'create':
        this.finishCreateDrag();
        break;
      case 'move':
        this.finishMoveDrag();
        break;
      case 'resize':
        this.finishResizeDrag();
        break;
    }

    this.resetDragState();
  }

  // Méthodes utilitaires

  private screenToGrid(screenX: number, screenY: number): { x: number; y: number } | null {
    const rect = this.gridInner.getBoundingClientRect();
    const relativeX = screenX - rect.left;
    const relativeY = screenY - rect.top;
    
    // Calcul précis avec la taille de grille fixe de 624px pour 24 cellules
    const gridX = Math.floor((relativeX * this.GRID_SIZE) / 624);
    const gridY = Math.floor((relativeY * this.GRID_SIZE) / 624);
    
    if (gridX < 0 || gridX >= this.GRID_SIZE || gridY < 0 || gridY >= this.GRID_SIZE) {
      return null;
    }
    
    return { x: gridX, y: gridY };
  }

  private selectBox(boxState: BoxState): void {
    this.deselectAll();
    
    boxState.isSelected = true;
    boxState.element.style.opacity = '1';
    boxState.element.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08), 0 0 0 2px var(--interactive-accent)';
    boxState.element.style.transform = 'translateZ(0)';
    
    // Afficher les poignées de redimensionnement
    const handles = boxState.element.querySelectorAll('.resize-handle') as NodeListOf<HTMLElement>;
    handles.forEach(handle => {
      handle.style.opacity = '1';
    });

    this.selectedBox = boxState;
    this.updateSelectionInfo();
  }

  private deselectAll(): void {
    this.boxes.forEach(boxState => {
      boxState.isSelected = false;
      boxState.element.style.opacity = '0.95';
      boxState.element.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)';
      boxState.element.style.transform = 'translateZ(0) scale(1)';
      
      const handles = boxState.element.querySelectorAll('.resize-handle') as NodeListOf<HTMLElement>;
      handles.forEach(handle => {
        handle.style.opacity = '0';
      });
    });
    
    this.selectedBox = null;
    this.updateSelectionInfo();
  }

  private updateSelectionInfo(): void {
    const infoContent = this.sidebar.querySelector('.info-content') as HTMLElement;
    
    if (!this.selectedBox) {
      infoContent.innerHTML = '<p style="color: var(--text-muted);">Aucun cadre sélectionné</p>';
      return;
    }

    const box = this.selectedBox.box;
    infoContent.innerHTML = `
      <div style="font-size: 14px; line-height: 1.4;">
        <div style="margin-bottom: 8px;">
          <strong>Titre:</strong> ${box.title}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>Position:</strong> (${box.x + 1}, ${box.y + 1})
        </div>
        <div style="margin-bottom: 8px;">
          <strong>Taille:</strong> ${box.w} × ${box.h}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>ID:</strong> <code style="font-size: 11px;">${box.id}</code>
        </div>
      </div>
      <div style="margin-top: 15px;">
        <input 
          type="text" 
          placeholder="Titre du cadre" 
          value="${box.title}"
          style="width: 100%; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;"
          class="box-title-input"
        />
      </div>
    `;

    // Event listener pour l'input du titre
    const titleInput = infoContent.querySelector('.box-title-input') as HTMLInputElement;
    titleInput.addEventListener('input', (e) => {
      const newTitle = (e.target as HTMLInputElement).value;
      this.updateBoxTitle(this.selectedBox!.box.id, newTitle);
    });

    // Sauvegarder le titre quand l'input perd le focus
    titleInput.addEventListener('blur', (e) => {
      const newTitle = (e.target as HTMLInputElement).value;
      this.updateBoxTitle(this.selectedBox!.box.id, newTitle);
    });
    
    // Empêcher la désélection quand on clique sur l'input
    titleInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Actions sur les boxes

  private createNewBox(): void {
    let freePosition = this.validator.findFreePosition(4, 3, this.layout.boxes);
    
    if (!freePosition) {
      // Pas de place libre, utiliser (0,0) et laisser l'utilisateur déplacer
      freePosition = { x: 0, y: 0 };
    }

    const newBox: LayoutBox = {
      id: this.generateBoxId(),
      title: `Cadre ${this.layout.boxes.length + 1}`,
      x: freePosition.x,
      y: freePosition.y,
      w: 4, // Taille par défaut (respecte le minimum de 2x2)
      h: 3  // Taille par défaut (respecte le minimum de 2x2)
    };

    this.layout = {
      ...this.layout,
      boxes: [...this.layout.boxes, newBox]
    };

    const boxState = this.createBoxElement(newBox);
    this.selectBox(boxState);
  }

  private deleteSelectedBox(): void {
    if (!this.selectedBox) return;

    const boxId = this.selectedBox.box.id;
    
    // Retirer du layout
    this.layout = {
      ...this.layout,
      boxes: this.layout.boxes.filter(box => box.id !== boxId)
    };

    // Retirer de l'UI
    this.selectedBox.element.remove();
    this.boxes.delete(boxId);
    this.selectedBox = null;
    
    this.updateSelectionInfo();
  }

  private updateBoxTitle(boxId: string, newTitle: string): void {
    const cleanTitle = newTitle.trim() || 'Sans titre';
    
    this.layout = {
      ...this.layout,
      boxes: this.layout.boxes.map(box => 
        box.id === boxId ? { ...box, title: cleanTitle } : box
      )
    };

    const boxState = this.boxes.get(boxId);
    if (boxState) {
      const titleElement = boxState.element.querySelector('.box-title') as HTMLElement;
      titleElement.textContent = cleanTitle;
      
      // Mettre à jour l'objet box de l'état local avec un nouvel objet
      boxState.box = { ...boxState.box, title: cleanTitle };
    }
  }

  private clearAllBoxes(): void {
    if (this.layout.boxes.length === 0) {
      return; // Rien à effacer
    }

    // Demander confirmation
    const confirmed = confirm(
      `Êtes-vous sûr de vouloir effacer tous les ${this.layout.boxes.length} cadre${this.layout.boxes.length > 1 ? 's' : ''} ?\n\nCette action ne peut pas être annulée.`
    );
    
    if (!confirmed) {
      return;
    }

    // Supprimer tous les éléments visuels
    this.boxes.forEach(boxState => {
      boxState.element.remove();
    });
    
    // Vider les structures de données
    this.boxes.clear();
    this.selectedBox = null;
    
    // Mettre à jour le layout
    this.layout = {
      ...this.layout,
      boxes: []
    };
    
    // Mettre à jour l'interface
    this.updateSelectionInfo();
  }

  // Drag & Drop handlers (simplifiés pour l'exemple)

  private handleCreateDrag(deltaX: number, deltaY: number): void {
    if (!this.previewBox) {
      this.previewBox = this.createPreviewBox();
    }

    const startX = this.dragState.gridStartX;
    const startY = this.dragState.gridStartY;
    const endX = startX + deltaX;
    const endY = startY + deltaY;

    const normalizedX = Math.max(0, Math.min(startX, endX));
    const normalizedY = Math.max(0, Math.min(startY, endY));
    const width = Math.min(Math.abs(deltaX) + 1, this.GRID_SIZE - normalizedX);
    const height = Math.min(Math.abs(deltaY) + 1, this.GRID_SIZE - normalizedY);

    this.updatePreviewBox(normalizedX, normalizedY, width, height);
  }

  private handleMoveDrag(deltaX: number, deltaY: number): void {
    if (!this.selectedBox || !this.originalBoxState) return;

    const originalBox = this.originalBoxState;
    const newX = Math.max(0, Math.min(this.GRID_SIZE - originalBox.w, originalBox.x + deltaX));
    const newY = Math.max(0, Math.min(this.GRID_SIZE - originalBox.h, originalBox.y + deltaY));

    // Optimisation : ne valider que si la position grille a changé
    const currentBox = this.selectedBox.box;
    if (newX === currentBox.x && newY === currentBox.y) {
      return; // Pas de changement, pas besoin de valider
    }

    const movedBox = { ...originalBox, x: newX, y: newY };
    
    const collisionResult = this.validator.wouldCollide(
      movedBox, 
      this.layout.boxes, 
      originalBox.id
    );

    // Si collision, ne pas bouger la box - garder la position précédente
    if (!collisionResult.hasCollisions) {
      this.updateBoxPosition(this.selectedBox.element, newX, newY, false);
      this.selectedBox.box = movedBox;
    }
    // Si collision, on ne fait rien - la box reste à sa position précédente
  }

  private handleResizeDrag(deltaX: number, deltaY: number): void {
    if (!this.selectedBox || !this.dragState.handle || !this.originalBoxState) return;

    const originalBox = this.originalBoxState;
    const handle = this.dragState.handle;
    let newX = originalBox.x, newY = originalBox.y, newW = originalBox.w, newH = originalBox.h;

    // Utiliser les deltas depuis le début du drag, pas les deltas accumulés
    switch (handle) {
      case 'se': // Sud-Est (coin bas-droite)
        // La box peut s'étendre jusqu'à la colonne/ligne 24 (index 23)
        // donc largeur max = GRID_SIZE - position_x
        newW = Math.max(2, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        newH = Math.max(2, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      case 'nw': { // Nord-Ouest (coin haut-gauche)
        const maxMoveX = originalBox.x; // Ne peut pas dépasser 0
        const maxMoveY = originalBox.y; // Ne peut pas dépasser 0
        const maxShrinkX = originalBox.w - 2; // Taille min de 2
        const maxShrinkY = originalBox.h - 2; // Taille min de 2
        
        const clampedDeltaX = Math.max(-maxMoveX, Math.min(maxShrinkX, deltaX));
        const clampedDeltaY = Math.max(-maxMoveY, Math.min(maxShrinkY, deltaY));
        
        newX = originalBox.x + clampedDeltaX;
        newY = originalBox.y + clampedDeltaY;
        newW = originalBox.w - clampedDeltaX;
        newH = originalBox.h - clampedDeltaY;
        break;
      }
      case 'ne': { // Nord-Est
        const maxMoveYNE = originalBox.y;
        const maxShrinkYNE = originalBox.h - 2;
        const clampedDeltaYNE = Math.max(-maxMoveYNE, Math.min(maxShrinkYNE, deltaY));
        
        newY = originalBox.y + clampedDeltaYNE;
        newW = Math.max(2, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        newH = originalBox.h - clampedDeltaYNE;
        break;
      }
      case 'sw': { // Sud-Ouest
        const maxMoveXSW = originalBox.x;
        const maxShrinkXSW = originalBox.w - 2;
        const clampedDeltaXSW = Math.max(-maxMoveXSW, Math.min(maxShrinkXSW, deltaX));
        
        newX = originalBox.x + clampedDeltaXSW;
        newW = originalBox.w - clampedDeltaXSW;
        newH = Math.max(2, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      }
      case 'n': { // Nord
        const maxMoveYN = originalBox.y;
        const maxShrinkYN = originalBox.h - 2;
        const clampedDeltaYN = Math.max(-maxMoveYN, Math.min(maxShrinkYN, deltaY));
        
        newY = originalBox.y + clampedDeltaYN;
        newH = originalBox.h - clampedDeltaYN;
        break;
      }
      case 's': // Sud
        newH = Math.max(2, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      case 'e': // Est
        newW = Math.max(2, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        break;
      case 'w': { // Ouest
        const maxMoveXW = originalBox.x;
        const maxShrinkXW = originalBox.w - 2;
        const clampedDeltaXW = Math.max(-maxMoveXW, Math.min(maxShrinkXW, deltaX));
        
        newX = originalBox.x + clampedDeltaXW;
        newW = originalBox.w - clampedDeltaXW;
        break;
      }
    }

    const resizedBox = { ...originalBox, x: newX, y: newY, w: newW, h: newH };
    const collisionResult = this.validator.wouldCollide(
      resizedBox, 
      this.layout.boxes, 
      originalBox.id
    );

    const hasCollisions = collisionResult.hasCollisions;
    this.updateBoxSizeAndPosition(this.selectedBox.element, newX, newY, newW, newH, hasCollisions);
    
    // Afficher les dimensions pendant le redimensionnement
    this.showResizePreview(newX, newY, newW, newH);
    
    this.selectedBox.box = resizedBox;
  }

  private finishCreateDrag(): void {
    if (!this.previewBox) return;

    // Récupérer les valeurs en pixels de la preview box
    const left = parseInt(this.previewBox.style.left);
    const top = parseInt(this.previewBox.style.top);
    const width = parseInt(this.previewBox.style.width);
    const height = parseInt(this.previewBox.style.height);
    
    // Convertir en coordonnées de grille
    const gridX = Math.round((left - 2) / this.cellSize); // -2 pour compenser l'espacement
    const gridY = Math.round((top - 2) / this.cellSize);
    const gridW = Math.round((width + 4) / this.cellSize); // +4 pour compenser l'espacement
    const gridH = Math.round((height + 4) / this.cellSize);

    if (gridW >= 2 && gridH >= 2) {
      const newBox: LayoutBox = {
        id: this.generateBoxId(),
        title: `Cadre ${this.layout.boxes.length + 1}`,
        x: gridX,
        y: gridY,
        w: gridW,
        h: gridH
      };

      const collisionResult = this.validator.wouldCollide(newBox, this.layout.boxes);
      
      if (!collisionResult.hasCollisions) {
        this.layout = {
          ...this.layout,
          boxes: [...this.layout.boxes, newBox]
        };

        const boxState = this.createBoxElement(newBox);
        this.selectBox(boxState);
      }
    }

    this.previewBox.remove();
    this.previewBox = null;
  }

  private finishMoveDrag(): void {
    if (!this.selectedBox) return;

    const box = this.selectedBox.box;
    const collisionResult = this.validator.wouldCollide(
      box, 
      this.layout.boxes, 
      box.id
    );

    // Toujours sauvegarder la position finale (même en cas de collision bloquée)
    this.layout = {
      ...this.layout,
      boxes: this.layout.boxes.map(b => 
        b.id === box.id ? box : b
      )
    };
    this.updateBoxPosition(this.selectedBox.element, box.x, box.y, false);

    this.selectedBox.isDragging = false;
  }

  private finishResizeDrag(): void {
    if (!this.selectedBox) return;

    const box = this.selectedBox.box;
    const collisionResult = this.validator.wouldCollide(
      box, 
      this.layout.boxes, 
      box.id
    );

    if (collisionResult.hasCollisions) {
      this.revertBoxToOriginalSize();
    } else {
      this.layout = {
        ...this.layout,
        boxes: this.layout.boxes.map(b => 
          b.id === box.id ? box : b
        )
      };
      this.updateBoxSizeAndPosition(
        this.selectedBox.element, 
        box.x, 
        box.y, 
        box.w, 
        box.h, 
        false
      );
    }

    // Cacher l'aide visuelle
    this.hideResizePreview();
    this.selectedBox.isResizing = false;
  }

  private resetDragState(): void {
    this.dragState.isActive = false;
    this.originalBoxState = null;
    
    if (this.previewBox) {
      this.previewBox.remove();
      this.previewBox = null;
    }
    
    // Cacher l'aide visuelle de resize
    this.hideResizePreview();
    
    this.boxes.forEach(boxState => {
      boxState.isDragging = false;
      boxState.isResizing = false;
    });
  }

  // Sauvegarde

  private saveLayout(): void {
    const validation = this.validator.validateLayout(this.layout);
    
    if (!validation.isValid) {
      // Afficher les erreurs
      const errorMessage = validation.errors.join('\n');
      new Notice(`Erreurs de validation:\n${errorMessage}`, 5000);
      return;
    }

    this.callbacks.onSave(this.layout);
    this.close();
  }

  // Helpers

  private generateBoxId(): string {
    // Nettoyer le nom du layout pour l'ID (supprimer espaces et caractères spéciaux)
    const cleanName = this.layout.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    return `${cleanName}-box-${this.layout.boxes.length + 1}`;
  }

  private createPreviewBox(): HTMLElement {
    const preview = this.gridInner.createDiv('preview-box');
    preview.style.position = 'absolute';
    preview.style.border = '2px dashed var(--interactive-accent)';
    preview.style.backgroundColor = 'var(--interactive-accent)';
    preview.style.opacity = '0.3';
    preview.style.pointerEvents = 'none';
    DOMHelper.applyZIndex(preview, 'BOX');
    preview.style.borderRadius = '4px';
    return preview;
  }

  private updatePreviewBox(x: number, y: number, w: number, h: number): void {
    if (!this.previewBox) return;
    
    // Positionnement avec espacement pour la preview
    this.previewBox.style.left = `${x * this.cellSize + 2}px`;
    this.previewBox.style.top = `${y * this.cellSize + 2}px`;
    this.previewBox.style.width = `${w * this.cellSize - 4}px`;
    this.previewBox.style.height = `${h * this.cellSize - 4}px`;
  }

  private updateBoxPosition(element: HTMLElement, x: number, y: number, hasCollision: boolean): void {
    // Positionnement avec espacement moderne
    element.style.left = `${x * this.cellSize + 2}px`;
    element.style.top = `${y * this.cellSize + 2}px`;
    
    if (hasCollision) {
      element.style.backgroundColor = 'var(--background-modifier-error)';
      element.style.borderColor = 'var(--text-error)';
    } else {
      // Restaurer la couleur d'origine depuis les variables CSS
      const boxId = element.dataset.boxId || '';
      // Attribution séquentielle cohérente
      const boxIndex = this.layout.boxes.findIndex(b => b.id === boxId);
      const colorIndex = boxIndex % COLOR_CONSTANTS.TOTAL_COLORS; // Couleurs disponibles dans le CSS
      
      // Utiliser les variables CSS pour les couleurs
      const bgColor = DOMHelper.getColorFromPalette(colorIndex);
      const borderColor = DOMHelper.getBorderColorFromPalette(colorIndex);
      
      element.style.backgroundColor = bgColor;
      element.style.borderColor = borderColor;
    }
  }

  private updateBoxSizeAndPosition(element: HTMLElement, x: number, y: number, w: number, h: number, hasCollision: boolean): void {
    // Positionnement et taille avec espacement moderne
    element.style.left = `${x * this.cellSize + 2}px`;
    element.style.top = `${y * this.cellSize + 2}px`;
    element.style.width = `${w * this.cellSize - 4}px`;
    element.style.height = `${h * this.cellSize - 4}px`;
    
    // Sauvegarder les dimensions et position dans les data attributes
    element.dataset.width = w.toString();
    element.dataset.height = h.toString();
    element.dataset.boxX = x.toString();
    element.dataset.boxY = y.toString();
    
    if (hasCollision) {
      element.style.backgroundColor = 'var(--background-modifier-error)';
      element.style.borderColor = 'var(--text-error)';
    } else {
      // Restaurer la couleur d'origine depuis les variables CSS
      const boxId = element.dataset.boxId || '';
      // Attribution séquentielle cohérente
      const boxIndex = this.layout.boxes.findIndex(b => b.id === boxId);
      const colorIndex = boxIndex % COLOR_CONSTANTS.TOTAL_COLORS; // Couleurs disponibles dans le CSS
      
      // Utiliser les variables CSS pour les couleurs
      const bgColor = DOMHelper.getColorFromPalette(colorIndex);
      const borderColor = DOMHelper.getBorderColorFromPalette(colorIndex);
      
      element.style.backgroundColor = bgColor;
      element.style.borderColor = borderColor;
    }
  }

  private revertBoxToOriginalPosition(): void {
    if (!this.selectedBox || !this.originalBoxState) return;
    
    const originalBox = this.originalBoxState;
    this.selectedBox.box = { ...originalBox };
    this.updateBoxPosition(this.selectedBox.element, originalBox.x, originalBox.y, false);
  }

  private revertBoxToOriginalSize(): void {
    if (!this.selectedBox || !this.originalBoxState) return;
    
    const originalBox = this.originalBoxState;
    this.selectedBox.box = { ...originalBox };
    this.updateBoxSizeAndPosition(
      this.selectedBox.element, 
      originalBox.x, 
      originalBox.y, 
      originalBox.w, 
      originalBox.h, 
      false
    );
  }

  private showResizePreview(x: number, y: number, w: number, h: number): void {
    if (!this.resizePreview) {
      this.resizePreview = this.gridContainer.createDiv('resize-preview');
      this.resizePreview.style.position = 'absolute';
      this.resizePreview.style.backgroundColor = 'var(--interactive-accent)';
      this.resizePreview.style.color = 'white';
      this.resizePreview.style.padding = '2px 6px';
      this.resizePreview.style.borderRadius = '4px';
      this.resizePreview.style.fontSize = '11px';
      this.resizePreview.style.fontWeight = '600';
      DOMHelper.applyZIndex(this.resizePreview, 'MODAL');
      this.resizePreview.style.pointerEvents = 'none';
      this.resizePreview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    }
    
    this.resizePreview.textContent = `(${x + 1},${y + 1}) ${w}×${h}`;
    this.resizePreview.style.left = '10px';
    this.resizePreview.style.top = '10px';
    this.resizePreview.style.display = 'block';
  }
  
  private hideResizePreview(): void {
    if (this.resizePreview) {
      this.resizePreview.style.display = 'none';
    }
  }

  private findBestPosition(targetBox: LayoutBox, originalBox: LayoutBox): { x: number; y: number } | null {
    // Essayer de placer la box au plus près de sa position cible
    const deltaX = targetBox.x - originalBox.x;
    const deltaY = targetBox.y - originalBox.y;
    
    // Déterminer la direction principale du mouvement
    const primaryDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    
    // Essayer différentes positions en se rapprochant de la cible
    for (let distance = 0; distance < this.GRID_SIZE; distance++) {
      // Essayer dans la direction principale d'abord
      if (primaryDirection === 'horizontal') {
        // Mouvement horizontal
        const xStep = deltaX > 0 ? 1 : -1;
        for (let i = 0; i <= distance; i++) {
          const testX = Math.max(0, Math.min(this.GRID_SIZE - targetBox.w, originalBox.x + (xStep * i)));
          const testY = Math.max(0, Math.min(this.GRID_SIZE - targetBox.h, originalBox.y + (deltaY > 0 ? distance - i : -(distance - i))));
          
          const testBox = { ...targetBox, x: testX, y: testY };
          if (!this.validator.wouldCollide(testBox, this.layout.boxes, targetBox.id).hasCollisions) {
            return { x: testX, y: testY };
          }
        }
      } else {
        // Mouvement vertical
        const yStep = deltaY > 0 ? 1 : -1;
        for (let i = 0; i <= distance; i++) {
          const testY = Math.max(0, Math.min(this.GRID_SIZE - targetBox.h, originalBox.y + (yStep * i)));
          const testX = Math.max(0, Math.min(this.GRID_SIZE - targetBox.w, originalBox.x + (deltaX > 0 ? distance - i : -(distance - i))));
          
          const testBox = { ...targetBox, x: testX, y: testY };
          if (!this.validator.wouldCollide(testBox, this.layout.boxes, targetBox.id).hasCollisions) {
            return { x: testX, y: testY };
          }
        }
      }
    }
    
    return null; // Aucune position valide trouvée
  }

  private cleanup(): void {
    // Nettoyer les event listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    
    // Nettoyer les éléments temporaires
    if (this.resizePreview) {
      this.resizePreview.remove();
    }
  }
}