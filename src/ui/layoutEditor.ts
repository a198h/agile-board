// src/ui/layoutEditor.ts
import { Modal, App, ButtonComponent, Notice } from "obsidian";
import { LayoutBox, LayoutFile } from "../core/layout/layoutFileRepo";
import { LayoutValidator24 } from "../core/layout/layoutValidator24";
import { UI_CONSTANTS } from "../core/constants";
import { t } from "../i18n";

// Composants modulaires
import { GridCanvas } from "../components/editor/GridCanvas";
import { BoxManager, BoxState } from "../components/editor/BoxManager";
import { DragDropHandler } from "../components/editor/DragDropHandler";
import { SelectionManager } from "../components/editor/SelectionManager";
import { Sidebar } from "../components/editor/Sidebar";

/**
 * Interface pour les interactions avec l'éditeur
 */
export interface LayoutEditorCallbacks {
  onSave: (layout: LayoutFile) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Éditeur visuel refactorisé pour les layouts 24x24.
 * Utilise une architecture modulaire avec séparation des responsabilités.
 */
export class LayoutEditor extends Modal {
  private readonly validator = new LayoutValidator24();
  private layout: LayoutFile;
  private readonly callbacks: LayoutEditorCallbacks;

  // Composants modulaires
  private gridCanvas!: GridCanvas;
  private boxManager!: BoxManager;
  private dragDropHandler!: DragDropHandler;
  private selectionManager!: SelectionManager;
  private sidebar!: Sidebar;

  // Système anti-collision : dernière position/taille valide
  private lastValidBoxState: { x: number; y: number; w: number; h: number } | null = null;

  constructor(
    app: App,
    layout: LayoutFile,
    callbacks: LayoutEditorCallbacks
  ) {
    super(app);
    this.layout = { ...layout };
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

  /**
   * Configure l'interface utilisateur principale.
   */
  private setupUI(): void {
    this.titleEl.setText(t('editor.subtitle', { name: this.layout.name }));
    
    const mainContainer = this.createMainContainer();
    const gridWrapper = this.createGridWrapper(mainContainer);
    
    this.initializeComponents(gridWrapper, mainContainer);
    this.setupToolbar();
  }

  /**
   * Crée le container principal.
   */
  private createMainContainer(): HTMLElement {
    const mainContainer = this.contentEl.createDiv('layout-editor-container');
    mainContainer.style.position = 'relative';
    mainContainer.style.height = `${UI_CONSTANTS.EDITOR_HEIGHT_PX}px`;
    mainContainer.style.marginBottom = '15px';
    
    this.modalEl.style.width = '970px';
    this.modalEl.style.maxWidth = '95vw';
    this.modalEl.style.height = 'auto';
    this.modalEl.style.maxHeight = '90vh';
    this.modalEl.style.minHeight = 'auto';
    
    return mainContainer;
  }

  /**
   * Crée le wrapper de la grille.
   */
  private createGridWrapper(mainContainer: HTMLElement): HTMLElement {
    const gridWrapper = mainContainer.createDiv('grid-wrapper');
    gridWrapper.style.position = 'absolute';
    gridWrapper.style.left = '0';
    gridWrapper.style.top = '0';
    gridWrapper.style.width = `${UI_CONSTANTS.EDITOR_WIDTH_PX}px`;
    gridWrapper.style.height = `${UI_CONSTANTS.EDITOR_HEIGHT_PX}px`;
    gridWrapper.style.overflow = 'visible';
    gridWrapper.style.border = '1px solid var(--background-modifier-border)';
    gridWrapper.style.borderRadius = '4px';
    gridWrapper.style.backgroundColor = 'var(--background-secondary)';
    gridWrapper.style.paddingRight = '8px';
    
    return gridWrapper;
  }

  /**
   * Initialise tous les composants modulaires.
   */
  private initializeComponents(gridWrapper: HTMLElement, mainContainer: HTMLElement): void {
    const gridContainer = gridWrapper.createDiv('layout-grid');
    
    // Initialiser les composants dans l'ordre des dépendances
    this.gridCanvas = new GridCanvas(gridContainer);
    
    this.boxManager = new BoxManager(
      this.gridCanvas.getGridInner(),
      this.gridCanvas.getCellSize(),
      this.handleLayoutChange.bind(this)
    );
    
    // Initialiser le layout dans le BoxManager
    this.boxManager.updateCurrentLayout(this.layout);
    
    this.selectionManager = new SelectionManager(
      this.handleSelectionChange.bind(this)
    );
    
    this.dragDropHandler = new DragDropHandler(
      this.gridCanvas,
      this.handleDragStart.bind(this),
      this.handleDragMove.bind(this),
      this.handleDragEnd.bind(this)
    );
    
    this.sidebar = new Sidebar(mainContainer, this.layout, {
      onAddBox: this.createNewBox.bind(this),
      onDeleteBox: this.deleteSelectedBox.bind(this),
      onClearAll: this.clearAllBoxes.bind(this)
    });
  }

  /**
   * Configure la barre d'outils.
   */
  private setupToolbar(): void {
    const toolbar = this.contentEl.createDiv('layout-toolbar');
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'space-between';
    toolbar.style.alignItems = 'center';
    toolbar.style.marginTop = '0px';
    toolbar.style.padding = '12px 15px';
    toolbar.style.borderTop = '1px solid var(--background-modifier-border)';
    toolbar.style.backgroundColor = 'var(--background-primary)';
    toolbar.style.borderRadius = '0 0 6px 6px';

    const info = toolbar.createDiv('layout-info');
    const infoSpan = info.createEl('span', { cls: 'agile-toolbar-info' });
    infoSpan.textContent = t('editor.toolbar.info', { count: this.layout.boxes.length });

    const actions = toolbar.createDiv('layout-actions');
    actions.style.display = 'flex';
    actions.style.gap = '10px';

    new ButtonComponent(actions)
      .setButtonText(t('common.cancel'))
      .onClick(() => {
        this.callbacks.onCancel();
        this.close();
      });

    new ButtonComponent(actions)
      .setButtonText(t('common.save'))
      .setCta()
      .onClick(() => this.saveLayout());
  }

  /**
   * Rend le layout existant.
   */
  private renderLayout(): void {
    this.boxManager.clearAllBoxes();
    const boxStates = new Map<string, BoxState>();

    this.layout.boxes.forEach(box => {
      const boxState = this.boxManager.createBoxElement(box, this.layout);
      boxStates.set(box.id, boxState);
      
      // Configurer les gestionnaires d'événements
      this.setupBoxEventListeners(boxState);
    });

    this.selectionManager.updateBoxes(boxStates);
  }

  /**
   * Configure les gestionnaires d'événements pour une box.
   */
  private setupBoxEventListeners(boxState: BoxState): void {
    boxState.element.addEventListener('mousedown', (e) => {
      // Sélectionner la box AVANT de démarrer le drag pour que handleMoveDrag utilise la bonne box
      this.selectionManager.selectBox(boxState);
      this.dragDropHandler.startBoxDrag(e, boxState);
    });

    boxState.element.addEventListener('click', (e) => {
      e.stopPropagation();
      // La sélection est déjà faite dans mousedown
    });

    // Gestionnaires pour les poignées de redimensionnement
    const handles = boxState.element.querySelectorAll('.resize-handle');
    handles.forEach((handle) => {
      const handleEl = handle as HTMLElement;
      const handleType = handleEl.className.split(' ')[1].replace('resize-', '');

      handleEl.addEventListener('mousedown', (e) => {
        // Sélectionner la box AVANT de démarrer le resize pour que handleResizeDrag utilise la bonne box
        this.selectionManager.selectBox(boxState);
        this.dragDropHandler.startResizeDrag(e, handleType, boxState);
      });
    });
  }

  /**
   * Configure les gestionnaires d'événements globaux.
   */
  private setupEventListeners(): void {
    // Clic sur la grille pour créer
    this.gridCanvas.getGridInner().addEventListener('mousedown', (e) => {
      this.dragDropHandler.startGridDrag(e);
    });
    
    // Désélection en cliquant ailleurs
    document.addEventListener('click', (e) => {
      const target = e.target as Node;
      if (!this.gridCanvas.getContainer().contains(target) && !this.sidebar.getElement().contains(target)) {
        this.selectionManager.deselectAll();
      }
    });
  }

  /**
   * Gestionnaires des événements drag & drop.
   */
  private handleDragStart(type: 'move' | 'resize' | 'create', box?: BoxState): void {
    if (type === 'create') {
      this.dragDropHandler.createPreviewBox();
    } else if ((type === 'move' || type === 'resize') && box) {
      // Sauvegarder la position/taille valide initiale
      this.lastValidBoxState = {
        x: box.box.x,
        y: box.box.y,
        w: box.box.w,
        h: box.box.h
      };
    }
  }

  private handleDragMove(deltaX: number, deltaY: number, type: 'move' | 'resize' | 'create'): void {
    switch (type) {
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

  private handleDragEnd(type: 'move' | 'resize' | 'create'): void {
    switch (type) {
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
  }

  /**
   * Gestionnaires spécifiques de drag.
   */
  private handleCreateDrag(deltaX: number, deltaY: number): void {
    const dimensions = this.dragDropHandler.calculateCreateDimensions(deltaX, deltaY);
    this.dragDropHandler.updatePreviewBox(dimensions.x, dimensions.y, dimensions.w, dimensions.h);
  }

  private handleMoveDrag(deltaX: number, deltaY: number): void {
    const selectedBox = this.selectionManager.getSelectedBox();
    if (!selectedBox) return;

    const originalBox = this.dragDropHandler.getOriginalBoxState();
    if (!originalBox) return;

    const newPos = this.dragDropHandler.calculateMovePosition(originalBox, deltaX, deltaY);
    const movedBox = { ...originalBox, x: newPos.x, y: newPos.y };

    const collisionResult = this.validator.wouldCollide(movedBox, this.layout.boxes, originalBox.id);

    if (!collisionResult.hasCollisions) {
      // Mouvement valide - appliquer et sauvegarder
      this.boxManager.updateBoxPosition(selectedBox.box.id, newPos.x, newPos.y, false);
      selectedBox.box = movedBox;
      this.lastValidBoxState = { x: newPos.x, y: newPos.y, w: movedBox.w, h: movedBox.h };

      // Mettre à jour this.layout en temps réel pour que les prochaines vérifications soient correctes
      this.layout = {
        ...this.layout,
        boxes: this.layout.boxes.map(b =>
          b.id === selectedBox.box.id ? selectedBox.box : b
        )
      };
    }
    // Si collision: ne rien faire, rester à la dernière position valide
    // Pas besoin d'appeler updateBoxPosition car la box est déjà à lastValidBoxState
  }

  private handleResizeDrag(deltaX: number, deltaY: number): void {
    const selectedBox = this.selectionManager.getSelectedBox();
    if (!selectedBox) return;

    const originalBox = this.dragDropHandler.getOriginalBoxState();
    if (!originalBox) return;

    const handle = this.dragDropHandler.getCurrentResizeHandle();
    if (!handle) return;

    const newDimensions = this.dragDropHandler.calculateResizeDimensions(originalBox, deltaX, deltaY, handle);
    const resizedBox = { ...originalBox, ...newDimensions };

    const collisionResult = this.validator.wouldCollide(resizedBox, this.layout.boxes, originalBox.id);

    if (!collisionResult.hasCollisions) {
      // Resize valide - appliquer et sauvegarder
      this.boxManager.updateBoxSizeAndPosition(
        selectedBox.box.id,
        newDimensions.x,
        newDimensions.y,
        newDimensions.w,
        newDimensions.h,
        false
      );
      selectedBox.box = resizedBox;
      this.lastValidBoxState = { x: newDimensions.x, y: newDimensions.y, w: newDimensions.w, h: newDimensions.h };

      // Mettre à jour this.layout en temps réel pour que les prochaines vérifications soient correctes
      this.layout = {
        ...this.layout,
        boxes: this.layout.boxes.map(b =>
          b.id === selectedBox.box.id ? selectedBox.box : b
        )
      };
      this.dragDropHandler.showResizePreview(newDimensions.x, newDimensions.y, newDimensions.w, newDimensions.h);
    } else if (this.lastValidBoxState) {
      // Collision - afficher la preview à la dernière taille valide
      this.dragDropHandler.showResizePreview(
        this.lastValidBoxState.x,
        this.lastValidBoxState.y,
        this.lastValidBoxState.w,
        this.lastValidBoxState.h
      );
    }
    // Si collision: ne rien faire, rester à la dernière position/taille valide
    // Pas besoin d'appeler updateBoxSizeAndPosition car la box est déjà à lastValidBoxState
  }

  /**
   * Finalise les actions de drag.
   */
  private finishCreateDrag(): void {
    const dimensions = this.dragDropHandler.getCurrentPreviewDimensions();
    
    if (!dimensions || dimensions.w < 2 || dimensions.h < 2) {
      return; // Taille minimale non respectée
    }

    const newBox: LayoutBox = {
      id: this.boxManager.generateBoxId(this.layout.name, this.layout.boxes),
      title: `${t('common.frame')} ${this.layout.boxes.length + 1}`,
      x: dimensions.x,
      y: dimensions.y,
      w: dimensions.w,
      h: dimensions.h
    };

    const collisionResult = this.validator.wouldCollide(newBox, this.layout.boxes);
    
    if (!collisionResult.hasCollisions) {
      this.layout = {
        ...this.layout,
        boxes: [...this.layout.boxes, newBox]
      };
      
      this.boxManager.updateCurrentLayout(this.layout);

      const boxState = this.boxManager.createBoxElement(newBox, this.layout);
      this.setupBoxEventListeners(boxState);
      this.selectionManager.updateBoxes(this.boxManager.getAllBoxes());
      this.selectionManager.selectBox(boxState);
      this.sidebar.updateBoxCount(this.layout.boxes.length);
    }
  }

  private finishMoveDrag(): void {
    const selectedBox = this.selectionManager.getSelectedBox();
    if (!selectedBox) return;

    // selectedBox.box est déjà à une position valide garantie par handleMoveDrag()
    // Pas besoin de re-vérifier les collisions ici car this.layout.boxes n'est pas à jour
    // pendant le drag et donnerait un faux négatif

    this.updateLayoutFromBox(selectedBox);
    selectedBox.isDragging = false;
    this.lastValidBoxState = null; // Reset
  }

  private finishResizeDrag(): void {
    const selectedBox = this.selectionManager.getSelectedBox();
    if (!selectedBox) return;

    // selectedBox.box est déjà à une taille/position valide garantie par handleResizeDrag()
    // Pas besoin de re-vérifier les collisions ici car this.layout.boxes n'est pas à jour
    // pendant le drag et donnerait un faux négatif

    this.updateLayoutFromBox(selectedBox);
    this.dragDropHandler.hideResizePreview();
    selectedBox.isResizing = false;
    this.lastValidBoxState = null; // Reset
  }

  /**
   * Actions sur les boxes.
   */
  private createNewBox(): void {
    const freePosition = this.validator.findFreePosition(4, 3, this.layout.boxes) || { x: 0, y: 0 };

    const newBox: LayoutBox = {
      id: this.boxManager.generateBoxId(this.layout.name, this.layout.boxes),
      title: `${t('common.frame')} ${this.layout.boxes.length + 1}`,
      x: freePosition.x,
      y: freePosition.y,
      w: 4,
      h: 3
    };

    this.layout = {
      ...this.layout,
      boxes: [...this.layout.boxes, newBox]
    };
    
    this.boxManager.updateCurrentLayout(this.layout);

    const boxState = this.boxManager.createBoxElement(newBox, this.layout);
    this.setupBoxEventListeners(boxState);
    this.selectionManager.updateBoxes(this.boxManager.getAllBoxes());
    this.selectionManager.selectBox(boxState);
    this.sidebar.updateBoxCount(this.layout.boxes.length);
  }

  private deleteSelectedBox(): void {
    const selectedBox = this.selectionManager.getSelectedBox();
    if (!selectedBox) return;

    this.layout = {
      ...this.layout,
      boxes: this.layout.boxes.filter(box => box.id !== selectedBox.box.id)
    };
    
    this.boxManager.updateCurrentLayout(this.layout);

    this.boxManager.removeBox(selectedBox.box.id);
    this.selectionManager.updateBoxes(this.boxManager.getAllBoxes());
    this.selectionManager.deselectAll();
    this.sidebar.updateBoxCount(this.layout.boxes.length);
  }

  private clearAllBoxes(): void {
    if (this.layout.boxes.length === 0) return;

    const confirmed = confirm(
      t('editor.sidebar.actions.clearConfirm', { count: this.layout.boxes.length })
    );
    
    if (!confirmed) return;

    this.boxManager.clearAllBoxes();
    this.selectionManager.deselectAll();
    
    this.layout = {
      ...this.layout,
      boxes: []
    };
    
    this.boxManager.updateCurrentLayout(this.layout);
    this.selectionManager.updateBoxes(this.boxManager.getAllBoxes());
    this.sidebar.updateBoxCount(0);
  }

  /**
   * Gestionnaires d'événements.
   */
  private handleLayoutChange(layout: LayoutFile): void {
    this.layout = layout;
    this.boxManager.updateCurrentLayout(layout);
  }

  private handleSelectionChange(box: BoxState | null): void {
    const content = this.selectionManager.generateSelectionInfo();
    this.sidebar.updateSelectionInfo(content);
    
    if (box) {
      this.selectionManager.setupTitleInputHandlers(
        this.sidebar.getInfoContent(),
        this.handleTitleChange.bind(this)
      );
    }
  }

  private handleTitleChange(boxId: string, newTitle: string): void {
    const cleanTitle = newTitle.trim() || t('editor.sidebar.selection.placeholder');
    
    this.layout = {
      ...this.layout,
      boxes: this.layout.boxes.map(box => 
        box.id === boxId ? { ...box, title: cleanTitle } : box
      )
    };
    
    this.boxManager.updateCurrentLayout(this.layout);

    this.boxManager.updateBoxTitle(boxId, cleanTitle);
    
    const selectedBox = this.selectionManager.getSelectedBox();
    if (selectedBox && selectedBox.box.id === boxId) {
      selectedBox.box = { ...selectedBox.box, title: cleanTitle };
      this.selectionManager.updateSelectedBox(selectedBox);
    }
  }

  /**
   * Sauvegarde du layout.
   */
  private async saveLayout(): Promise<void> {
    const validation = this.validator.validateLayout(this.layout);

    if (!validation.isValid) {
      const errorMessage = validation.errors.join('\n');
      new Notice(t('error.validationError', { errors: errorMessage }), 5000);
      return;
    }

    await this.callbacks.onSave(this.layout);
    this.close();
  }

  /**
   * Met à jour le layout depuis une box modifiée.
   */
  private updateLayoutFromBox(boxState: BoxState): void {
    this.layout = {
      ...this.layout,
      boxes: this.layout.boxes.map(b => 
        b.id === boxState.box.id ? boxState.box : b
      )
    };
    
    this.boxManager.updateCurrentLayout(this.layout);
  }

  /**
   * Nettoie les ressources.
   */
  private cleanup(): void {
    this.dragDropHandler?.cleanup();
  }
}