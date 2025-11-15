// src/ui/editor/layoutEditor.ts

import { Modal, App } from "obsidian";
import { LayoutBox, LayoutFile } from "../../core/layout/layoutFileRepo";
import { GRID_CONSTANTS, UI_CONSTANTS } from "../../core/constants";

// Composants modulaires
import { GridCanvas } from "./gridCanvas";
import { BoxManager } from "./boxManager";
import { DragDropHandler } from "./dragDropHandler";
import { SelectionManager } from "./selectionManager";
import { Sidebar } from "./sidebar";

// Types
import { LayoutEditorCallbacks, EditorConfig, EditorEvents } from "./types";

/**
 * Éditeur de layout refactorisé - Orchestrateur principal.
 * 
 * Responsabilité unique : coordination des composants modulaires.
 * Architecture SOLID avec injection de dépendances et séparation claire.
 * 
 * Pattern Composite : Combine GridCanvas + BoxManager + DragDropHandler + SelectionManager + Sidebar
 * Pattern Observer : Communication via événements typés
 * Pattern Command : Actions découplées via callbacks
 * 
 * @example
 * ```typescript
 * const editor = new LayoutEditor(app, layout, {
 *   onSave: (layout) => console.log('Saved:', layout),
 *   onCancel: () => console.log('Cancelled')
 * });
 * editor.open();
 * ```
 */
export class LayoutEditor extends Modal {
  // Configuration immutable
  private readonly config: EditorConfig = {
    gridSize: GRID_CONSTANTS.SIZE,
    cellSize: GRID_CONSTANTS.CELL_SIZE_PX,
    width: UI_CONSTANTS.EDITOR_WIDTH_PX,
    height: UI_CONSTANTS.EDITOR_HEIGHT_PX,
    minBoxSize: 2 // Contrainte v0.7.3
  };

  // Composants modulaires (injection de dépendances)
  private readonly gridCanvas: GridCanvas;
  private readonly boxManager: BoxManager;
  private readonly dragDropHandler: DragDropHandler;
  private readonly selectionManager: SelectionManager;
  private readonly sidebar: Sidebar;

  // État de l'éditeur
  private layout: LayoutFile;
  private isInitialized = false;

  constructor(
    app: App,
    layout: LayoutFile,
    private readonly callbacks: LayoutEditorCallbacks
  ) {
    super(app);
    
    this.layout = { ...layout, boxes: [...layout.boxes] }; // Clone immutable
    
    // Injection des événements (Pattern Observer)
    const events: EditorEvents = {
      onBoxSelect: this.handleBoxSelect.bind(this),
      onBoxUpdate: this.handleBoxUpdate.bind(this),
      onBoxDelete: this.handleBoxDelete.bind(this),
      onBoxCreate: this.handleBoxCreate.bind(this),
      onValidationError: this.handleValidationError.bind(this),
      onDragStart: this.handleDragStart.bind(this),
      onDragMove: this.handleDragMove.bind(this),
      onDragEnd: this.handleDragEnd.bind(this)
    };

    // Instanciation des composants avec injection
    this.gridCanvas = new GridCanvas(this.config);
    this.boxManager = new BoxManager(this.config, events);
    this.dragDropHandler = new DragDropHandler(this.config, events);
    this.selectionManager = new SelectionManager(events);
    this.sidebar = new Sidebar(events);
  }

  /**
   * Point d'entrée : configure l'interface et initialise les composants
   */
  public onOpen(): void {
    this.setupModalLayout();
    this.initializeComponents();
    this.renderLayout();
    this.isInitialized = true;
  }

  /**
   * Nettoyage des ressources à la fermeture
   */
  public onClose(): void {
    if (this.isInitialized) {
      this.gridCanvas.dispose();
      this.boxManager.dispose();
      this.dragDropHandler.dispose();
      this.selectionManager.dispose();
      this.sidebar.dispose();
    }
  }

  /**
   * Configure la structure principale de la modal
   */
  private setupModalLayout(): void {
    // Configuration de la modal
    this.modalEl.style.cssText = `
      width: 970px;
      max-width: 95vw;
      height: auto;
      max-height: 90vh;
      min-height: auto;
    `;

    // Titre
    this.titleEl.textContent = `Édition du tableau : ${this.layout.name}`;

    // Container principal horizontal
    const mainContainer = this.contentEl.createDiv();
    mainContainer.style.cssText = `
      display: flex;
      height: ${UI_CONSTANTS.EDITOR_HEIGHT_PX}px;
      margin-bottom: 15px;
    `;

    // Zone de grille
    const gridWrapper = mainContainer.createDiv();
    gridWrapper.style.cssText = `
      width: ${UI_CONSTANTS.EDITOR_WIDTH_PX}px;
      height: ${UI_CONSTANTS.EDITOR_HEIGHT_PX}px;
      position: relative;
      margin-right: 20px;
    `;

    // Zone sidebar
    const sidebarWrapper = mainContainer.createDiv();

    // Boutons de validation
    this.createActionButtons();

    // Stocker les références pour l'initialisation
    this.gridWrapper = gridWrapper;
    this.sidebarWrapper = sidebarWrapper;
  }

  private gridWrapper!: HTMLElement;
  private sidebarWrapper!: HTMLElement;

  /**
   * Initialise tous les composants modulaires
   */
  private initializeComponents(): void {
    // Rendu de la grille (fond)
    this.gridCanvas.render(this.gridWrapper);
    
    // Initialisation du gestionnaire de boxes
    this.boxManager.initialize(this.gridWrapper);
    
    // Initialisation du drag & drop
    this.dragDropHandler.initialize(this.gridWrapper);
    
    // Rendu du sidebar
    this.sidebar.render(this.sidebarWrapper);
  }

  /**
   * Rend le layout initial
   */
  private renderLayout(): void {
    this.boxManager.renderLayout(this.layout.boxes);
  }

  /**
   * Crée les boutons d'action (Sauvegarder/Annuler)
   */
  private createActionButtons(): void {
    const buttonContainer = this.contentEl.createDiv();
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-top: 15px;
      border-top: 1px solid var(--background-modifier-border);
    `;

    // Bouton Sauvegarder
    const saveButton = buttonContainer.createEl('button');
    saveButton.textContent = 'Sauvegarder';
    saveButton.className = 'mod-cta';
    saveButton.addEventListener('click', () => this.handleSave());

    // Bouton Annuler
    const cancelButton = buttonContainer.createEl('button');
    cancelButton.textContent = 'Annuler';
    cancelButton.addEventListener('click', () => this.handleCancel());
  }

  /**
   * === EVENT HANDLERS (Pattern Observer) ===
   */

  private handleBoxSelect(boxId: string | null): void {
    if (boxId) {
      const box = this.boxManager.getBox(boxId);
      if (box) {
        this.selectionManager.selectBox(boxId, box);
        this.boxManager.selectBox(boxId);
      }
    } else {
      this.selectionManager.deselectAll();
      this.boxManager.deselectAll();
    }
    
    // Mettre à jour le sidebar
    this.sidebar.updateSelection(this.selectionManager.getSelectionInfo());
  }

  private handleBoxUpdate(boxId: string, updates: Partial<LayoutBox>): void {
    // Récupérer l'ID réel si vide (pour les actions depuis le sidebar)
    const actualBoxId = boxId || this.selectionManager.getSelectedBoxId();
    if (!actualBoxId) return;

    this.boxManager.updateBox(actualBoxId, updates);
    
    // Mettre à jour la sélection si c'est la box sélectionnée
    if (this.selectionManager.isSelected(actualBoxId)) {
      const updatedBox = this.boxManager.getBox(actualBoxId);
      if (updatedBox) {
        this.selectionManager.selectBox(actualBoxId, updatedBox);
        this.sidebar.updateSelection(this.selectionManager.getSelectionInfo());
      }
    }
  }

  private handleBoxDelete(boxId: string): void {
    // Récupérer l'ID réel si vide (pour les actions depuis le sidebar)
    const actualBoxId = boxId || this.selectionManager.getSelectedBoxId();
    if (!actualBoxId) return;

    this.boxManager.deleteBox(actualBoxId);
    
    // Déselectionner si c'était la box sélectionnée
    if (this.selectionManager.isSelected(actualBoxId)) {
      this.selectionManager.deselectAll();
      this.sidebar.updateSelection(this.selectionManager.getSelectionInfo());
    }
  }

  private handleBoxCreate(box: LayoutBox): void {
    const createdBox = this.boxManager.createNewBox(box.x, box.y, box.w, box.h);
    if (createdBox) {
      // Sélectionner la nouvelle box
      this.handleBoxSelect(createdBox.id);
    }
  }

  private handleValidationError(message: string): void {
    // Afficher l'erreur à l'utilisateur
    const notice = document.createElement('div');
    notice.textContent = message;
    notice.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--background-modifier-error);
      color: var(--text-error);
      padding: 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      box-shadow: var(--shadow-s);
    `;
    
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 3000);
  }

  private handleDragStart(boxId: string, type: 'drag' | 'resize'): void {
    // Sélectionner la box pendant le drag
    this.handleBoxSelect(boxId);
  }

  private handleDragMove(): void {
    // Optionnel : feedback pendant le drag
  }

  private handleDragEnd(): void {
    // Optionnel : nettoyage après le drag
  }

  /**
   * === ACTIONS PRINCIPALES ===
   */

  private handleSave(): void {
    const boxes = this.boxManager.getBoxes();
    const savedLayout = {
      name: this.layout.name,
      boxes
    };
    
    this.callbacks.onSave(savedLayout);
    this.close();
  }

  private handleCancel(): void {
    this.callbacks.onCancel();
    this.close();
  }
}