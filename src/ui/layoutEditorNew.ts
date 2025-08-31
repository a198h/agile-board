/**
 * Éditeur de layout refactorisé utilisant des composants séparés
 */

import { Modal, App, ButtonComponent, Notice } from "obsidian";
import { LayoutBox, LayoutFile } from "../core/layout/layoutFileRepo";

// Version mutable du LayoutFile pour l'éditeur
interface MutableLayoutFile {
    name: string;
    boxes: LayoutBox[];
}
import { LayoutValidator24 } from "../core/layout/layoutValidator24";
import { UI_CONSTANTS } from "../core/constants";
import { DOMHelper } from "./utils/DOMHelper";
import { UIErrorHandler } from "./utils/ErrorHandler";

// Composants
import { GridRenderer } from "./components/GridRenderer";
import { BoxRenderer, BoxState, BoxRenderOptions } from "./components/BoxRenderer";
import { DragDropHandler, DragCallbacks } from "./components/DragDropHandler";
import { ResizeHandler, ResizeCallbacks } from "./components/ResizeHandler";
import { SidebarManager, SidebarCallbacks } from "./components/SidebarManager";

/**
 * Interface pour les callbacks de l'éditeur
 */
export interface LayoutEditorCallbacks {
    onSave: (layout: LayoutFile) => void;
    onCancel: () => void;
}

/**
 * Éditeur de layout refactorisé et modulaire
 */
export class LayoutEditorNew extends Modal {
    private readonly validator = new LayoutValidator24();
    
    private layout: MutableLayoutFile;
    private readonly callbacks: LayoutEditorCallbacks;
    
    // Composants
    private gridRenderer!: GridRenderer;
    private boxRenderer!: BoxRenderer;
    private dragDropHandler!: DragDropHandler;
    private resizeHandler!: ResizeHandler;
    private sidebarManager!: SidebarManager;
    
    // Éléments DOM
    private mainContainer!: HTMLElement;
    private gridWrapper!: HTMLElement;

    constructor(app: App, layout: LayoutFile, callbacks: LayoutEditorCallbacks) {
        super(app);
        this.layout = { 
            name: layout.name,
            boxes: [...layout.boxes] as LayoutBox[]
        };
        this.callbacks = callbacks;
    }

    onOpen(): void {
        try {
            this.setupModalStructure();
            this.initializeComponents();
            this.renderLayout();
            this.setupToolbar();
        } catch (error) {
            UIErrorHandler.handleLayoutError('l\'ouverture de l\'éditeur', this.layout.name, error);
            this.close();
        }
    }

    onClose(): void {
        this.cleanup();
    }

    private setupModalStructure(): void {
        this.modalEl.addClass('layout-editor-modal');
        
        // Configuration du modal
        DOMHelper.applyStyles(this.modalEl, {
            maxWidth: '95vw',
            maxHeight: '95vh'
        });

        // Conteneur principal
        this.mainContainer = DOMHelper.createElement('div', 'main-container');
        DOMHelper.applyStyles(this.mainContainer, {
            position: 'relative',
            width: `${UI_CONSTANTS.EDITOR_WIDTH_PX + 300}px`,
            height: `${UI_CONSTANTS.EDITOR_HEIGHT_PX}px`,
            marginBottom: '15px'
        });

        // Wrapper pour la grille
        this.gridWrapper = DOMHelper.createElement('div', 'grid-wrapper');
        DOMHelper.applyStyles(this.gridWrapper, {
            width: `${UI_CONSTANTS.EDITOR_WIDTH_PX}px`,
            height: `${UI_CONSTANTS.EDITOR_HEIGHT_PX}px`,
            border: '2px solid #333',
            borderRadius: '8px',
            backgroundColor: '#fafafa',
            overflow: 'hidden',
            position: 'relative'
        });

        this.mainContainer.appendChild(this.gridWrapper);
        this.contentEl.appendChild(this.mainContainer);
    }

    private initializeComponents(): void {
        // Grid renderer
        this.gridRenderer = new GridRenderer(this.gridWrapper);

        // Box renderer avec callbacks
        const boxOptions: BoxRenderOptions = {
            onSelect: (boxState) => this.handleBoxSelection(boxState),
            onStartDrag: (boxState, event) => this.dragDropHandler.startBoxDrag(boxState, event),
            onStartResize: (boxState, direction, event) => {
                // Le resize sera géré différemment
            }
        };
        this.boxRenderer = new BoxRenderer(this.gridRenderer.getGridInner(), boxOptions);

        // Drag & drop handler avec callbacks
        const dragCallbacks: DragCallbacks = {
            onDragEnd: (boxState, finalPosition) => this.handleBoxMove(boxState, finalPosition),
            onCreate: (box) => this.handleBoxCreate(box),
            onCollision: (movingBox, collidingBoxes) => this.handleCollision(movingBox, collidingBoxes)
        };
        this.dragDropHandler = new DragDropHandler(this.gridRenderer.getGridInner(), dragCallbacks);

        // Resize handler avec callbacks
        const resizeCallbacks: ResizeCallbacks = {
            onResizeEnd: (boxState, finalBounds) => this.handleBoxResize(boxState, finalBounds)
        };
        this.resizeHandler = new ResizeHandler(resizeCallbacks);

        // Sidebar manager avec callbacks
        const sidebarCallbacks: SidebarCallbacks = {
            onTitleChange: (boxId, newTitle) => this.handleTitleChange(boxId, newTitle),
            onDeleteBox: (boxId) => this.handleBoxDelete(boxId)
        };
        this.sidebarManager = new SidebarManager(this.mainContainer, sidebarCallbacks);
    }

    private renderLayout(): void {
        // Effacer les boxes existantes
        this.boxRenderer.clearAll();

        // Rendre chaque box
        this.layout.boxes.forEach(box => {
            const boxState = this.boxRenderer.renderBox(box, this.layout.boxes);
            
            // Ajouter les poignées de redimensionnement
            this.resizeHandler.addResizeHandles(boxState);
            
            // Masquer les poignées par défaut
            this.resizeHandler.hideResizeHandles(boxState.element);
            
            // Événements de survol pour les poignées
            boxState.element.addEventListener('mouseenter', () => {
                if (boxState.isSelected) {
                    this.resizeHandler.showResizeHandles(boxState.element);
                }
            });
            
            boxState.element.addEventListener('mouseleave', () => {
                if (!boxState.isResizing) {
                    this.resizeHandler.hideResizeHandles(boxState.element);
                }
            });
        });
    }

    private setupToolbar(): void {
        const toolbar = DOMHelper.createElement('div', 'toolbar');
        DOMHelper.applyStyles(toolbar, {
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            padding: '10px 0'
        });

        // Bouton Annuler
        const cancelButton = new ButtonComponent(toolbar);
        cancelButton.setButtonText('Annuler')
            .onClick(() => {
                this.callbacks.onCancel();
                this.close();
            });

        // Bouton Sauvegarder
        const saveButton = new ButtonComponent(toolbar);
        saveButton.setButtonText('Sauvegarder')
            .setCta()
            .onClick(() => this.handleSave());

        this.contentEl.appendChild(toolbar);
    }

    private handleBoxSelection(boxState: BoxState): void {
        // Mettre à jour la sidebar
        this.sidebarManager.selectBox(boxState);
        
        // Afficher les poignées de redimensionnement
        this.resizeHandler.showResizeHandles(boxState.element);
        
        // Masquer les poignées des autres boxes
        this.boxRenderer.getAllBoxes().forEach(otherBoxState => {
            if (otherBoxState !== boxState) {
                this.resizeHandler.hideResizeHandles(otherBoxState.element);
            }
        });
    }

    private handleBoxMove(boxState: BoxState, finalPosition: { x: number; y: number }): void {
        const updatedBox: LayoutBox = {
            ...boxState.box,
            x: finalPosition.x,
            y: finalPosition.y
        };

        this.updateBox(updatedBox);
    }

    private handleBoxResize(boxState: BoxState, finalBounds: { x: number; y: number; w: number; h: number }): void {
        const updatedBox: LayoutBox = {
            ...boxState.box,
            x: finalBounds.x,
            y: finalBounds.y,
            w: finalBounds.w,
            h: finalBounds.h
        };

        this.updateBox(updatedBox);
    }

    private handleBoxCreate(box: LayoutBox): void {
        // Ajouter la nouvelle box au layout
        this.layout.boxes.push(box);
        
        // Rendre la nouvelle box
        const boxState = this.boxRenderer.renderBox(box, this.layout.boxes);
        this.resizeHandler.addResizeHandles(boxState);
        this.resizeHandler.hideResizeHandles(boxState.element);
        
        // Sélectionner la nouvelle box
        this.boxRenderer.selectBox(box.id);
        this.handleBoxSelection(boxState);

        UIErrorHandler.showSuccess(`Box "${box.title}" créée`);
    }

    private handleTitleChange(boxId: string, newTitle: string): void {
        const box = this.layout.boxes.find(b => b.id === boxId);
        if (box) {
            const updatedBox: LayoutBox = { ...box, title: newTitle };
            this.updateBox(updatedBox);
        }
    }

    private handleBoxDelete(boxId: string): void {
        // Supprimer du layout
        this.layout.boxes = this.layout.boxes.filter(box => box.id !== boxId);
        
        // Supprimer visuellement
        this.boxRenderer.removeBox(boxId);
        
        // Nettoyer la sidebar
        this.sidebarManager.clearSelection();

        UIErrorHandler.showSuccess('Box supprimée');
    }

    private updateBox(updatedBox: LayoutBox): void {
        // Mettre à jour dans le layout
        const index = this.layout.boxes.findIndex(box => box.id === updatedBox.id);
        if (index !== -1) {
            this.layout.boxes[index] = updatedBox;
            
            // Mettre à jour visuellement
            this.boxRenderer.updateBox(updatedBox, this.layout.boxes);
            
            // Mettre à jour la sidebar
            this.sidebarManager.updateBoxInfo(updatedBox);
        }
    }

    private handleCollision(movingBox: LayoutBox, collidingBoxes: LayoutBox[]): boolean {
        // Pour l'instant, on permet les chevauchements
        // On pourrait ajouter une logique de prévention ici
        return false;
    }

    private handleSave(): void {
        try {
            // Valider le layout (cast vers le type attendu)
            const layoutToValidate: LayoutFile = {
                name: this.layout.name,
                boxes: this.layout.boxes as readonly LayoutBox[]
            };
            const validation = this.validator.validateLayout(layoutToValidate);
            if (!validation.isValid) {
                UIErrorHandler.handleValidationError(validation.errors);
                return;
            }

            // Sauvegarder (conversion vers le type immutable)
            const finalLayout: LayoutFile = {
                name: this.layout.name,
                boxes: this.layout.boxes as readonly LayoutBox[]
            };
            this.callbacks.onSave(finalLayout);
            this.close();
            
        } catch (error) {
            UIErrorHandler.handleLayoutError('la sauvegarde', this.layout.name, error);
        }
    }

    private cleanup(): void {
        if (this.dragDropHandler) {
            this.dragDropHandler.destroy();
        }
        if (this.resizeHandler) {
            this.resizeHandler.destroy();
        }
    }
}