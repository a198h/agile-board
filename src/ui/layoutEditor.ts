// src/ui/layoutEditor.ts

import { Modal, App, ButtonComponent, Notice } from "obsidian";
import { LayoutBox, LayoutFile } from "../core/layout/layoutFileRepo";
import { LayoutValidator24 } from "../core/layout/layoutValidator24";

/**
 * Interface pour les interactions avec l'éditeur
 */
export interface LayoutEditorCallbacks {
  onSave: (layout: LayoutFile) => void;
  onCancel: () => void;
}

/**
 * État d'une box pendant l'édition
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
  private readonly GRID_SIZE = 24;
  
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
    this.titleEl.setText(`Édition du layout: ${this.layout.name}`);
    
    // Container principal avec taille optimisée
    const mainContainer = this.contentEl.createDiv('layout-editor-container');
    mainContainer.style.position = 'relative';
    mainContainer.style.height = '650px'; // Hauteur pour avoir une grille carrée
    mainContainer.style.marginBottom = '15px'; // Espace pour les boutons
    
    // Ajuster la taille de la modal pour être compacte - éliminer l'espace gris inutile
    this.modalEl.style.width = '970px'; // Largeur fixe calculée pour grille + sidebar + marges
    this.modalEl.style.maxWidth = '95vw'; // Limite pour les petits écrans
    this.modalEl.style.height = 'auto'; // Hauteur automatique
    this.modalEl.style.maxHeight = '90vh'; // Limite pour éviter le débordement
    this.modalEl.style.minHeight = 'auto'; // Pas de hauteur minimale forcée

    // Zone de grille optimisée pour un carré
    const gridWrapper = mainContainer.createDiv('grid-wrapper');
    gridWrapper.style.position = 'absolute';
    gridWrapper.style.left = '0';
    gridWrapper.style.top = '0';
    gridWrapper.style.width = '650px'; // Largeur fixe pour avoir un carré parfait
    gridWrapper.style.height = '650px'; // Hauteur fixe pour avoir un carré parfait
    gridWrapper.style.overflow = 'hidden';
    gridWrapper.style.border = '1px solid var(--background-modifier-border)';
    gridWrapper.style.borderRadius = '4px';
    gridWrapper.style.backgroundColor = 'var(--background-secondary)';

    this.gridContainer = gridWrapper.createDiv('layout-grid');
    this.setupGrid();

    // Sidebar avec position absolue - ajustée pour le nouveau layout
    this.sidebar = mainContainer.createDiv('layout-sidebar');
    this.sidebar.style.position = 'absolute';
    this.sidebar.style.left = '665px'; // Positionné après la grille (650px + 15px de marge)
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
    // GRILLE ADAPTIVE : calculer la taille depuis l'espace disponible
    this.gridContainer.style.position = 'absolute';
    this.gridContainer.style.top = '0';
    this.gridContainer.style.left = '0';
    this.gridContainer.style.right = '0';
    this.gridContainer.style.bottom = '0';
    this.gridContainer.style.cursor = 'crosshair';
    this.gridContainer.style.paddingTop = '25px'; // Espace pour les numéros
    this.gridContainer.style.paddingLeft = '25px'; // Espace pour les numéros
    this.gridContainer.style.boxSizing = 'border-box';
    
    // Calculer la taille des cellules depuis l'espace disponible
    setTimeout(() => {
      const containerRect = this.gridContainer.getBoundingClientRect();
      const availableWidth = containerRect.width - 25; // Soustraire le padding
      const availableHeight = containerRect.height - 25; // Soustraire le padding
      
      // Prendre la plus petite dimension pour avoir un carré parfait
      const availableSpace = Math.min(availableWidth, availableHeight);
      this.cellSize = Math.floor(availableSpace / this.GRID_SIZE);
      
      // Créer la grille avec la taille calculée
      this.createAdaptiveGrid();
    }, 0);
  }
  
  private createAdaptiveGrid(): void {
    // Grille interne avec dimensions calculées
    const gridInner = this.gridContainer.createDiv('grid-inner');
    gridInner.style.position = 'relative';
    const gridSize = this.cellSize * this.GRID_SIZE;
    gridInner.style.width = `${gridSize}px`; 
    gridInner.style.height = `${gridSize}px`;  
    gridInner.style.backgroundColor = 'var(--background-secondary)';
    gridInner.style.border = '1px solid var(--background-modifier-border)';
    
    // Dessiner la grille avec la nouvelle taille de cellules
    this.drawGridLines(gridInner);
    
    // Ajouter les numéros avec la nouvelle taille
    this.addGridNumbers();
    
    // Stocker la référence
    this.gridInner = gridInner;
    
    // Rendre le layout existant avec la nouvelle taille
    this.renderLayout();
  }

  private cellSize = 24; // Taille calculée dynamiquement selon l'espace disponible
  
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
      label.style.left = `${25 + i * this.cellSize + this.cellSize / 2 - 6}px`;
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
      label.style.top = `${25 + i * this.cellSize + this.cellSize / 2 - 6}px`;
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
      label.style.zIndex = '10';
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
      label.style.zIndex = '10';
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
    title.textContent = 'Éditeur de Layout';
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
    infoContent.innerHTML = '<p style="color: var(--text-muted); margin: 0;">Aucune box sélectionnée</p>';
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
    deleteButton.style.backgroundColor = 'var(--background-modifier-error)';
    deleteButton.style.color = 'var(--text-error)';
    deleteButton.style.border = '1px solid var(--background-modifier-error-hover)';
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
      ${this.layout.boxes.length} box(es) • Grille 24×24
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
    
    // Positionnement absolu simple en pixels - PARFAITEMENT ALIGNÉ
    element.style.position = 'absolute';
    element.style.left = `${box.x * this.cellSize}px`;
    element.style.top = `${box.y * this.cellSize}px`;
    element.style.width = `${box.w * this.cellSize}px`;
    element.style.height = `${box.h * this.cellSize}px`;
    element.style.zIndex = '10'; // Au-dessus des lignes de grille
    
    // Sauvegarder l'ID et les dimensions dans les data attributes
    element.dataset.boxId = box.id;
    element.dataset.width = box.w.toString();
    element.dataset.height = box.h.toString();
    // Système de couleurs aléatoires mais cohérentes
    const colors = [
      { bg: '#6366f1', border: '#4f46e5' }, // Indigo
      { bg: '#8b5cf6', border: '#7c3aed' }, // Violet
      { bg: '#06b6d4', border: '#0891b2' }, // Cyan
      { bg: '#10b981', border: '#059669' }, // Emerald
      { bg: '#f59e0b', border: '#d97706' }, // Amber
      { bg: '#ef4444', border: '#dc2626' }, // Red
      { bg: '#ec4899', border: '#db2777' }, // Pink
      { bg: '#84cc16', border: '#65a30d' }  // Lime
    ];
    const colorIndex = Math.abs(box.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
    const color = colors[colorIndex];
    
    element.style.backgroundColor = color.bg;
    element.style.border = `2px solid ${color.border}`;
    element.style.borderRadius = '6px';
    element.style.cursor = 'move';
    element.style.display = 'flex';
    element.style.flexDirection = 'column';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
    element.style.overflow = 'hidden';
    element.style.opacity = '0.9';
    element.style.transition = 'all 0.2s ease';
    element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    element.style.boxSizing = 'border-box'; // Inclure les bordures dans les dimensions

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
    
    // Effet hover
    element.addEventListener('mouseenter', () => {
      element.style.opacity = '1';
      element.style.transform = 'scale(1.02)';
      element.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });
    
    element.addEventListener('mouseleave', () => {
      if (!boxState.isSelected) {
        element.style.opacity = '0.9';
        element.style.transform = 'scale(1)';
        element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }
    });

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
      handleEl.style.zIndex = '10';
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
    
    // Désélection en cliquant ailleurs
    document.addEventListener('click', (e) => {
      if (!this.gridContainer.contains(e.target as Node)) {
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
    
    // Calcul simple avec les pixels fixes - chaque cellule fait exactement CELL_SIZE pixels
    const gridX = Math.floor(relativeX / this.cellSize);
    const gridY = Math.floor(relativeY / this.cellSize);
    
    if (gridX < 0 || gridX >= this.GRID_SIZE || gridY < 0 || gridY >= this.GRID_SIZE) {
      return null;
    }
    
    return { x: gridX, y: gridY };
  }

  private selectBox(boxState: BoxState): void {
    this.deselectAll();
    
    boxState.isSelected = true;
    boxState.element.style.opacity = '1';
    boxState.element.style.boxShadow = '0 0 0 2px var(--interactive-accent-hover)';
    
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
      boxState.element.style.opacity = '0.8';
      boxState.element.style.boxShadow = 'none';
      
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
      infoContent.innerHTML = '<p style="color: var(--text-muted);">Aucune box sélectionnée</p>';
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
          placeholder="Titre de la box" 
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
      title: `Box ${this.layout.boxes.length + 1}`,
      x: freePosition.x,
      y: freePosition.y,
      w: 4,
      h: 3
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
    this.layout = {
      ...this.layout,
      boxes: this.layout.boxes.map(box => 
        box.id === boxId ? { ...box, title: newTitle.trim() || 'Sans titre' } : box
      )
    };

    const boxState = this.boxes.get(boxId);
    if (boxState) {
      const titleElement = boxState.element.querySelector('.box-title') as HTMLElement;
      titleElement.textContent = newTitle.trim() || 'Sans titre';
    }
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
    if (!this.selectedBox) return;

    const box = this.selectedBox.box;
    const newX = Math.max(0, Math.min(this.GRID_SIZE - box.w, box.x + deltaX));
    const newY = Math.max(0, Math.min(this.GRID_SIZE - box.h, box.y + deltaY));

    const movedBox = { ...box, x: newX, y: newY };
    
    const collisionResult = this.validator.wouldCollide(
      movedBox, 
      this.layout.boxes, 
      box.id
    );

    const hasCollisions = collisionResult.hasCollisions;
    this.updateBoxPosition(this.selectedBox.element, newX, newY, hasCollisions);
    
    this.selectedBox.box = movedBox;
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
        newW = Math.max(1, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        newH = Math.max(1, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      case 'nw': { // Nord-Ouest (coin haut-gauche)
        const maxMoveX = originalBox.x; // Ne peut pas dépasser 0
        const maxMoveY = originalBox.y; // Ne peut pas dépasser 0
        const maxShrinkX = originalBox.w - 1; // Taille min de 1
        const maxShrinkY = originalBox.h - 1; // Taille min de 1
        
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
        const maxShrinkYNE = originalBox.h - 1;
        const clampedDeltaYNE = Math.max(-maxMoveYNE, Math.min(maxShrinkYNE, deltaY));
        
        newY = originalBox.y + clampedDeltaYNE;
        newW = Math.max(1, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        newH = originalBox.h - clampedDeltaYNE;
        break;
      }
      case 'sw': { // Sud-Ouest
        const maxMoveXSW = originalBox.x;
        const maxShrinkXSW = originalBox.w - 1;
        const clampedDeltaXSW = Math.max(-maxMoveXSW, Math.min(maxShrinkXSW, deltaX));
        
        newX = originalBox.x + clampedDeltaXSW;
        newW = originalBox.w - clampedDeltaXSW;
        newH = Math.max(1, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      }
      case 'n': { // Nord
        const maxMoveYN = originalBox.y;
        const maxShrinkYN = originalBox.h - 1;
        const clampedDeltaYN = Math.max(-maxMoveYN, Math.min(maxShrinkYN, deltaY));
        
        newY = originalBox.y + clampedDeltaYN;
        newH = originalBox.h - clampedDeltaYN;
        break;
      }
      case 's': // Sud
        newH = Math.max(1, Math.min(this.GRID_SIZE - originalBox.y, originalBox.h + deltaY));
        break;
      case 'e': // Est
        newW = Math.max(1, Math.min(this.GRID_SIZE - originalBox.x, originalBox.w + deltaX));
        break;
      case 'w': { // Ouest
        const maxMoveXW = originalBox.x;
        const maxShrinkXW = originalBox.w - 1;
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

    // Récupérer les valeurs CSS Grid de la preview box
    const gridColumnStart = parseInt(this.previewBox.style.gridColumnStart) - 1; // Convertir en 0-indexé
    const gridColumnEnd = parseInt(this.previewBox.style.gridColumnEnd) - 1;
    const gridRowStart = parseInt(this.previewBox.style.gridRowStart) - 1;
    const gridRowEnd = parseInt(this.previewBox.style.gridRowEnd) - 1;
    
    const gridX = gridColumnStart;
    const gridY = gridRowStart;
    const gridW = gridColumnEnd - gridColumnStart;
    const gridH = gridRowEnd - gridRowStart;

    if (gridW >= 1 && gridH >= 1) {
      const newBox: LayoutBox = {
        id: this.generateBoxId(),
        title: `Box ${this.layout.boxes.length + 1}`,
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

    if (collisionResult.hasCollisions) {
      this.revertBoxToOriginalPosition();
    } else {
      this.layout = {
        ...this.layout,
        boxes: this.layout.boxes.map(b => 
          b.id === box.id ? box : b
        )
      };
      this.updateBoxPosition(this.selectedBox.element, box.x, box.y, false);
    }

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
    return `box-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private createPreviewBox(): HTMLElement {
    const preview = this.gridInner.createDiv('preview-box');
    preview.style.position = 'absolute';
    preview.style.border = '2px dashed var(--interactive-accent)';
    preview.style.backgroundColor = 'var(--interactive-accent)';
    preview.style.opacity = '0.3';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '5';
    preview.style.borderRadius = '4px';
    return preview;
  }

  private updatePreviewBox(x: number, y: number, w: number, h: number): void {
    if (!this.previewBox) return;
    
    // Positionnement simple en pixels pour la preview
    this.previewBox.style.left = `${x * this.cellSize}px`;
    this.previewBox.style.top = `${y * this.cellSize}px`;
    this.previewBox.style.width = `${w * this.cellSize}px`;
    this.previewBox.style.height = `${h * this.cellSize}px`;
  }

  private updateBoxPosition(element: HTMLElement, x: number, y: number, hasCollision: boolean): void {
    // Positionnement simple en pixels
    element.style.left = `${x * this.cellSize}px`;
    element.style.top = `${y * this.cellSize}px`;
    
    if (hasCollision) {
      element.style.backgroundColor = 'var(--background-modifier-error)';
      element.style.borderColor = 'var(--text-error)';
    } else {
      // Restaurer la couleur d'origine basée sur l'ID
      const colors = [
        { bg: '#6366f1', border: '#4f46e5' }, // Indigo
        { bg: '#8b5cf6', border: '#7c3aed' }, // Violet
        { bg: '#06b6d4', border: '#0891b2' }, // Cyan
        { bg: '#10b981', border: '#059669' }, // Emerald
        { bg: '#f59e0b', border: '#d97706' }, // Amber
        { bg: '#ef4444', border: '#dc2626' }, // Red
        { bg: '#ec4899', border: '#db2777' }, // Pink
        { bg: '#84cc16', border: '#65a30d' }  // Lime
      ];
      const boxId = element.dataset.boxId || '';
      const colorIndex = Math.abs(boxId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
      const color = colors[colorIndex];
      element.style.backgroundColor = color.bg;
      element.style.borderColor = color.border;
    }
  }

  private updateBoxSizeAndPosition(element: HTMLElement, x: number, y: number, w: number, h: number, hasCollision: boolean): void {
    // Positionnement et taille simples en pixels
    element.style.left = `${x * this.cellSize}px`;
    element.style.top = `${y * this.cellSize}px`;
    element.style.width = `${w * this.cellSize}px`;
    element.style.height = `${h * this.cellSize}px`;
    
    // Sauvegarder les dimensions dans les data attributes
    element.dataset.width = w.toString();
    element.dataset.height = h.toString();
    
    if (hasCollision) {
      element.style.backgroundColor = 'var(--background-modifier-error)';
      element.style.borderColor = 'var(--text-error)';
    } else {
      // Restaurer la couleur d'origine basée sur l'ID
      const colors = [
        { bg: '#6366f1', border: '#4f46e5' }, // Indigo
        { bg: '#8b5cf6', border: '#7c3aed' }, // Violet
        { bg: '#06b6d4', border: '#0891b2' }, // Cyan
        { bg: '#10b981', border: '#059669' }, // Emerald
        { bg: '#f59e0b', border: '#d97706' }, // Amber
        { bg: '#ef4444', border: '#dc2626' }, // Red
        { bg: '#ec4899', border: '#db2777' }, // Pink
        { bg: '#84cc16', border: '#65a30d' }  // Lime
      ];
      const boxId = element.dataset.boxId || '';
      const colorIndex = Math.abs(boxId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
      const color = colors[colorIndex];
      element.style.backgroundColor = color.bg;
      element.style.borderColor = color.border;
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
      this.resizePreview.style.zIndex = '100';
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