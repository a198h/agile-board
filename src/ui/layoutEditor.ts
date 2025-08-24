// src/ui/layoutEditor.ts

import { Modal, App, Setting, ButtonComponent, Notice } from "obsidian";
import { LayoutBox, LayoutFile } from "../core/layout/layoutFileRepo";
import { LayoutValidator24, CollisionResult } from "../core/layout/layoutValidator24";
import { createContextLogger } from "../core/logger";

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
  private readonly logger = createContextLogger('LayoutEditor');
  private readonly validator = new LayoutValidator24();
  
  private layout: LayoutFile;
  private readonly callbacks: LayoutEditorCallbacks;
  
  // Éléments DOM
  private gridContainer!: HTMLElement;
  private sidebar!: HTMLElement;
  private selectedBox: BoxState | null = null;
  private boxes: Map<string, BoxState> = new Map();
  
  // Constantes de grille
  private readonly GRID_SIZE = 24;
  private readonly CELL_SIZE = 16; // pixels (réduit pour que tout tienne)
  private readonly GAP_SIZE = 1; // pixels entre les cellules
  
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
    
    // Container principal
    const mainContainer = this.contentEl.createDiv('layout-editor-container');
    mainContainer.style.display = 'flex';
    mainContainer.style.height = '550px'; // Hauteur plus réduite pour laisser place aux boutons
    mainContainer.style.gap = '15px';
    mainContainer.style.marginBottom = '15px'; // Espace pour les boutons
    
    // Ajuster la taille de la modal pour être plus compacte
    this.modalEl.style.width = '80vw';
    this.modalEl.style.maxWidth = '1000px';
    this.modalEl.style.height = 'auto'; // Hauteur automatique
    this.modalEl.style.maxHeight = '85vh'; // Limite pour éviter le débordement

    // Zone de grille
    const gridWrapper = mainContainer.createDiv('grid-wrapper');
    gridWrapper.style.flex = '1';
    gridWrapper.style.minWidth = '500px'; // Largeur minimale pour utiliser l'espace
    gridWrapper.style.overflow = 'auto';
    gridWrapper.style.border = '1px solid var(--background-modifier-border)';
    gridWrapper.style.borderRadius = '4px';
    gridWrapper.style.padding = '20px'; // Padding réduit pour plus d'espace
    gridWrapper.style.backgroundColor = 'var(--background-secondary)';
    gridWrapper.style.height = '100%';
    gridWrapper.style.display = 'flex';
    gridWrapper.style.alignItems = 'flex-start';
    gridWrapper.style.justifyContent = 'center';

    this.gridContainer = gridWrapper.createDiv('layout-grid');
    this.setupGrid();

    // Sidebar
    this.sidebar = mainContainer.createDiv('layout-sidebar');
    this.sidebar.style.width = '280px'; // Réduit la largeur
    this.sidebar.style.minWidth = '280px'; // Largeur minimale
    this.sidebar.style.border = '1px solid var(--background-modifier-border)';
    this.sidebar.style.borderRadius = '4px';
    this.sidebar.style.padding = '15px';
    this.sidebar.style.backgroundColor = 'var(--background-primary)';
    this.sidebar.style.overflow = 'auto'; // Scroll si nécessaire
    
    this.setupSidebar();
    this.setupToolbar();
  }

  private setupGrid(): void {
    // Rendre la grille adaptive : utilise tout l'espace disponible
    this.gridContainer.style.position = 'relative';
    this.gridContainer.style.width = '100%'; // Prend toute la largeur disponible
    this.gridContainer.style.height = '100%'; // Prend toute la hauteur disponible
    this.gridContainer.style.minWidth = '400px'; // Largeur minimale
    this.gridContainer.style.minHeight = '400px'; // Hauteur minimale
    this.gridContainer.style.cursor = 'crosshair';
    
    // Utiliser CSS Grid pour créer la grille 24x24
    this.gridContainer.style.display = 'grid';
    this.gridContainer.style.gridTemplateColumns = 'repeat(24, 1fr)';
    this.gridContainer.style.gridTemplateRows = 'repeat(24, 1fr)';
    this.gridContainer.style.gap = '1px';
    this.gridContainer.style.backgroundColor = 'var(--background-modifier-border)'; // Couleur des lignes
    this.gridContainer.style.padding = '1px'; // Pour les bordures extérieures
    
    // Créer les cellules de grille visuelles
    this.createGridCells();
    
    // Pas de labels pour le moment avec CSS Grid (on les ajoutera différemment)
    // this.addGridLabels();
  }

  private addGridLabels(): void {
    // Labels pour les colonnes (0-23)
    for (let i = 0; i < this.GRID_SIZE; i++) {
      const label = this.gridContainer.createDiv('grid-label-col');
      label.textContent = i.toString();
      label.style.position = 'absolute';
      label.style.left = `${i * (this.CELL_SIZE + this.GAP_SIZE) + this.CELL_SIZE / 2 - 6}px`;
      label.style.top = '-18px'; // Ajusté pour le padding réduit
      label.style.fontSize = '11px';
      label.style.color = 'var(--text-muted)';
      label.style.pointerEvents = 'none';
      label.style.fontWeight = '500';
      label.style.textAlign = 'center';
      label.style.minWidth = '12px';
    }

    // Labels pour les lignes (0-23)
    for (let i = 0; i < this.GRID_SIZE; i++) {
      const label = this.gridContainer.createDiv('grid-label-row');
      label.textContent = i.toString();
      label.style.position = 'absolute';
      label.style.left = '-18px'; // Ajusté pour le padding réduit
      label.style.top = `${i * (this.CELL_SIZE + this.GAP_SIZE) + this.CELL_SIZE / 2 - 5}px`;
      label.style.fontSize = '11px';
      label.style.color = 'var(--text-muted)';
      label.style.pointerEvents = 'none';
      label.style.fontWeight = '500';
      label.style.textAlign = 'right';
      label.style.minWidth = '15px';
    }
  }

  private createGridCells(): void {
    // Créer 24x24 = 576 cellules pour la visualisation
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const cell = this.gridContainer.createDiv('grid-cell');
        cell.style.backgroundColor = 'var(--background-secondary)';
        cell.style.border = 'none'; // Le gap du CSS Grid fait les bordures
        cell.style.position = 'relative';
        
        // Ajouter les numéros de ligne/colonne sur les bordures
        if (row === 0) {
          // Numéros de colonnes en haut
          const colLabel = cell.createDiv('col-label');
          colLabel.textContent = col.toString();
          colLabel.style.position = 'absolute';
          colLabel.style.top = '-15px';
          colLabel.style.left = '50%';
          colLabel.style.transform = 'translateX(-50%)';
          colLabel.style.fontSize = '9px';
          colLabel.style.color = 'var(--text-muted)';
          colLabel.style.fontWeight = '500';
          colLabel.style.pointerEvents = 'none';
        }
        
        if (col === 0) {
          // Numéros de lignes à gauche
          const rowLabel = cell.createDiv('row-label');
          rowLabel.textContent = row.toString();
          rowLabel.style.position = 'absolute';
          rowLabel.style.left = '-12px';
          rowLabel.style.top = '50%';
          rowLabel.style.transform = 'translateY(-50%)';
          rowLabel.style.fontSize = '9px';
          rowLabel.style.color = 'var(--text-muted)';
          rowLabel.style.fontWeight = '500';
          rowLabel.style.pointerEvents = 'none';
        }
      }
    }
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
    const element = this.gridContainer.createDiv('layout-box');
    
    // Utiliser CSS Grid pour le positionnement (1-indexed pour CSS Grid)
    element.style.gridColumnStart = (box.x + 1).toString();
    element.style.gridColumnEnd = (box.x + box.w + 1).toString();
    element.style.gridRowStart = (box.y + 1).toString();
    element.style.gridRowEnd = (box.y + box.h + 1).toString();
    element.style.zIndex = '2'; // Au-dessus des cellules de grille
    
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
    coords.textContent = `${box.x},${box.y} (${box.w}×${box.h})`;
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
    this.gridContainer.addEventListener('mousedown', (e) => this.onGridMouseDown(e));
    
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
    if (e.target !== this.gridContainer) return;
    
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
    const rect = this.gridContainer.getBoundingClientRect();
    const relativeX = screenX - rect.left;
    const relativeY = screenY - rect.top;
    
    // Avec CSS Grid, chaque cellule fait 1/24 de la largeur/hauteur totale
    const cellWidth = rect.width / this.GRID_SIZE;
    const cellHeight = rect.height / this.GRID_SIZE;
    
    const gridX = Math.floor(relativeX / cellWidth);
    const gridY = Math.floor(relativeY / cellHeight);
    
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
          <strong>Position:</strong> (${box.x}, ${box.y})
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
    if (!this.selectedBox || !this.dragState.handle) return;

    const box = this.selectedBox.box;
    const handle = this.dragState.handle;
    let newX = box.x, newY = box.y, newW = box.w, newH = box.h;

    switch (handle) {
      case 'se': // Sud-Est (coin bas-droite)
        newW = Math.max(1, Math.min(this.GRID_SIZE - box.x, box.w + deltaX));
        newH = Math.max(1, Math.min(this.GRID_SIZE - box.y, box.h + deltaY));
        break;
      case 'nw': // Nord-Ouest (coin haut-gauche)
        const maxDeltaX = box.x;
        const maxDeltaY = box.y;
        const clampedDeltaX = Math.max(-maxDeltaX, Math.min(box.w - 1, deltaX));
        const clampedDeltaY = Math.max(-maxDeltaY, Math.min(box.h - 1, deltaY));
        newX = box.x + clampedDeltaX;
        newY = box.y + clampedDeltaY;
        newW = box.w - clampedDeltaX;
        newH = box.h - clampedDeltaY;
        break;
      case 'ne': // Nord-Est
        newY = Math.max(0, box.y + Math.min(box.h - 1, deltaY));
        newW = Math.max(1, Math.min(this.GRID_SIZE - box.x, box.w + deltaX));
        newH = box.h - (newY - box.y);
        break;
      case 'sw': // Sud-Ouest
        newX = Math.max(0, box.x + Math.min(box.w - 1, deltaX));
        newW = box.w - (newX - box.x);
        newH = Math.max(1, Math.min(this.GRID_SIZE - box.y, box.h + deltaY));
        break;
      case 'n': // Nord
        newY = Math.max(0, box.y + Math.min(box.h - 1, deltaY));
        newH = box.h - (newY - box.y);
        break;
      case 's': // Sud
        newH = Math.max(1, Math.min(this.GRID_SIZE - box.y, box.h + deltaY));
        break;
      case 'e': // Est
        newW = Math.max(1, Math.min(this.GRID_SIZE - box.x, box.w + deltaX));
        break;
      case 'w': // Ouest
        newX = Math.max(0, box.x + Math.min(box.w - 1, deltaX));
        newW = box.w - (newX - box.x);
        break;
    }

    const resizedBox = { ...box, x: newX, y: newY, w: newW, h: newH };
    const collisionResult = this.validator.wouldCollide(
      resizedBox, 
      this.layout.boxes, 
      box.id
    );

    const hasCollisions = collisionResult.hasCollisions;
    this.updateBoxSizeAndPosition(this.selectedBox.element, newX, newY, newW, newH, hasCollisions);
    
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

    this.selectedBox.isResizing = false;
  }

  private resetDragState(): void {
    this.dragState.isActive = false;
    this.originalBoxState = null;
    
    if (this.previewBox) {
      this.previewBox.remove();
      this.previewBox = null;
    }
    
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
    const preview = this.gridContainer.createDiv('preview-box');
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
    
    // Utiliser CSS Grid pour la preview box aussi
    this.previewBox.style.gridColumnStart = (x + 1).toString();
    this.previewBox.style.gridColumnEnd = (x + w + 1).toString();
    this.previewBox.style.gridRowStart = (y + 1).toString();
    this.previewBox.style.gridRowEnd = (y + h + 1).toString();
  }

  private updateBoxPosition(element: HTMLElement, x: number, y: number, hasCollision: boolean): void {
    // Utiliser CSS Grid pour le positionnement
    element.style.gridColumnStart = (x + 1).toString();
    const width = element.dataset.width ? parseInt(element.dataset.width) : 1;
    element.style.gridColumnEnd = (x + width + 1).toString();
    element.style.gridRowStart = (y + 1).toString();
    const height = element.dataset.height ? parseInt(element.dataset.height) : 1;
    element.style.gridRowEnd = (y + height + 1).toString();
    
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
    // Utiliser CSS Grid pour le positionnement et la taille
    element.style.gridColumnStart = (x + 1).toString();
    element.style.gridColumnEnd = (x + w + 1).toString();
    element.style.gridRowStart = (y + 1).toString();
    element.style.gridRowEnd = (y + h + 1).toString();
    
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

  private cleanup(): void {
    // Nettoyer les event listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}