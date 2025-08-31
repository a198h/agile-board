/**
 * Gestionnaire pour le drag & drop des boxes
 */

import { LayoutBox } from "../../core/layout/layoutFileRepo";
import { GRID_CONSTANTS } from "../../core/constants";
import { PositionCalculator, GridPosition } from "../utils/PositionCalculator";
import { DOMHelper } from "../utils/DOMHelper";
import { BoxState } from "./BoxRenderer";

export interface DragState {
    isActive: boolean;
    startX: number;
    startY: number;
    gridStartX: number;
    gridStartY: number;
    originalBox: LayoutBox | null;
    currentBox: BoxState | null;
    mode: 'move' | 'create' | null;
}

export interface DragCallbacks {
    onDragStart?: (boxState: BoxState) => void;
    onDragMove?: (boxState: BoxState, newPosition: GridPosition) => void;
    onDragEnd?: (boxState: BoxState, finalPosition: GridPosition) => void;
    onCreate?: (box: LayoutBox) => void;
    onCollision?: (movingBox: LayoutBox, collidingBoxes: LayoutBox[]) => boolean;
}

export class DragDropHandler {
    private dragState: DragState = {
        isActive: false,
        startX: 0,
        startY: 0,
        gridStartX: 0,
        gridStartY: 0,
        originalBox: null,
        currentBox: null,
        mode: null
    };

    private gridContainer: HTMLElement;
    private callbacks: DragCallbacks;
    private cleanup: (() => void)[] = [];

    constructor(gridContainer: HTMLElement, callbacks: DragCallbacks = {}) {
        this.gridContainer = gridContainer;
        this.callbacks = callbacks;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Événements de création par sélection
        DOMHelper.addEventListenerWithCleanup(
            this.gridContainer, 
            'mousedown', 
            this.handleGridMouseDown.bind(this),
            this.cleanup
        );

        // Événements globaux de drag
        DOMHelper.addEventListenerWithCleanup(
            document, 
            'mousemove', 
            this.handleMouseMove.bind(this),
            this.cleanup
        );

        DOMHelper.addEventListenerWithCleanup(
            document, 
            'mouseup', 
            this.handleMouseUp.bind(this),
            this.cleanup
        );
    }

    startBoxDrag(boxState: BoxState, startEvent: MouseEvent): void {
        startEvent.preventDefault();
        startEvent.stopPropagation();

        const rect = this.gridContainer.getBoundingClientRect();
        const gridPosition = PositionCalculator.pixelsToGrid(
            startEvent.clientX - rect.left,
            startEvent.clientY - rect.top
        );

        this.dragState = {
            isActive: true,
            startX: startEvent.clientX,
            startY: startEvent.clientY,
            gridStartX: gridPosition.x,
            gridStartY: gridPosition.y,
            originalBox: { ...boxState.box },
            currentBox: boxState,
            mode: 'move'
        };

        boxState.isDragging = true;
        
        // Style pendant le drag
        DOMHelper.applyStyles(boxState.element, {
            opacity: '0.7',
            transform: 'scale(1.02)',
            cursor: 'grabbing'
        });

        if (this.callbacks.onDragStart) {
            this.callbacks.onDragStart(boxState);
        }
    }

    private handleGridMouseDown(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        
        // Ignorer si c'est déjà une box
        if (target.classList.contains('layout-box') || target.closest('.layout-box')) {
            return;
        }

        // Création d'une nouvelle box par sélection
        const cell = target.closest('.grid-cell') as HTMLElement;
        if (cell) {
            this.startCreateDrag(event, cell);
        }
    }

    private startCreateDrag(event: MouseEvent, startCell: HTMLElement): void {
        event.preventDefault();
        
        const startX = parseInt(startCell.dataset.gridX || '0');
        const startY = parseInt(startCell.dataset.gridY || '0');

        this.dragState = {
            isActive: true,
            startX: event.clientX,
            startY: event.clientY,
            gridStartX: startX,
            gridStartY: startY,
            originalBox: null,
            currentBox: null,
            mode: 'create'
        };

        this.updateCreatePreview(startX, startY, startX, startY);
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.dragState.isActive) return;

        if (this.dragState.mode === 'move') {
            this.handleMoveDrag(event);
        } else if (this.dragState.mode === 'create') {
            this.handleCreateDrag(event);
        }
    }

    private handleMoveDrag(event: MouseEvent): void {
        if (!this.dragState.currentBox || !this.dragState.originalBox) return;

        const deltaX = event.clientX - this.dragState.startX;
        const deltaY = event.clientY - this.dragState.startY;
        
        const gridDelta = PositionCalculator.pixelsToGrid(deltaX, deltaY);
        
        const newPosition = PositionCalculator.constrainToGrid(
            this.dragState.originalBox.x + gridDelta.x,
            this.dragState.originalBox.y + gridDelta.y,
            this.dragState.originalBox.w,
            this.dragState.originalBox.h
        );

        // Mettre à jour la position visuellement
        const pixelPos = PositionCalculator.gridToPixels(newPosition.x, newPosition.y);
        DOMHelper.applyStyles(this.dragState.currentBox.element, {
            left: DOMHelper.px(pixelPos.left),
            top: DOMHelper.px(pixelPos.top)
        });

        if (this.callbacks.onDragMove) {
            this.callbacks.onDragMove(this.dragState.currentBox, newPosition);
        }
    }

    private handleCreateDrag(event: MouseEvent): void {
        const rect = this.gridContainer.getBoundingClientRect();
        const currentGrid = PositionCalculator.pixelsToGrid(
            event.clientX - rect.left,
            event.clientY - rect.top
        );

        const startX = Math.min(this.dragState.gridStartX, currentGrid.x);
        const startY = Math.min(this.dragState.gridStartY, currentGrid.y);
        const endX = Math.max(this.dragState.gridStartX, currentGrid.x);
        const endY = Math.max(this.dragState.gridStartY, currentGrid.y);

        this.updateCreatePreview(startX, startY, endX, endY);
    }

    private updateCreatePreview(startX: number, startY: number, endX: number, endY: number): void {
        // Supprimer l'ancien preview
        const oldPreview = this.gridContainer.querySelector('.create-preview');
        if (oldPreview) {
            oldPreview.remove();
        }

        // Contraindre dans la grille
        const constrainedStart = PositionCalculator.constrainToGrid(startX, startY);
        const constrainedEnd = PositionCalculator.constrainToGrid(endX, endY);

        const width = constrainedEnd.x - constrainedStart.x + 1;
        const height = constrainedEnd.y - constrainedStart.y + 1;

        // Créer le nouveau preview
        const preview = DOMHelper.createElement('div', 'create-preview');
        const pixelPos = PositionCalculator.gridToPixels(constrainedStart.x, constrainedStart.y);
        const pixelSize = PositionCalculator.gridSizeToPixels(width, height);

        DOMHelper.applyStyles(preview, {
            position: 'absolute',
            left: DOMHelper.px(pixelPos.left),
            top: DOMHelper.px(pixelPos.top),
            width: DOMHelper.px(pixelSize.width),
            height: DOMHelper.px(pixelSize.height),
            backgroundColor: 'rgba(0, 122, 204, 0.2)',
            border: '2px dashed #007acc',
            borderRadius: '6px',
            pointerEvents: 'none'
        });

        DOMHelper.applyZIndex(preview, 'BOX');
        this.gridContainer.appendChild(preview);
    }

    private handleMouseUp(event: MouseEvent): void {
        if (!this.dragState.isActive) return;

        if (this.dragState.mode === 'move') {
            this.finishMoveDrag(event);
        } else if (this.dragState.mode === 'create') {
            this.finishCreateDrag(event);
        }

        this.resetDragState();
    }

    private finishMoveDrag(event: MouseEvent): void {
        if (!this.dragState.currentBox || !this.dragState.originalBox) return;

        const deltaX = event.clientX - this.dragState.startX;
        const deltaY = event.clientY - this.dragState.startY;
        
        const gridDelta = PositionCalculator.pixelsToGrid(deltaX, deltaY);
        
        const finalPosition = PositionCalculator.constrainToGrid(
            this.dragState.originalBox.x + gridDelta.x,
            this.dragState.originalBox.y + gridDelta.y,
            this.dragState.originalBox.w,
            this.dragState.originalBox.h
        );

        // Restaurer les styles
        this.dragState.currentBox.isDragging = false;
        DOMHelper.applyStyles(this.dragState.currentBox.element, {
            opacity: '1',
            cursor: 'pointer'
        });

        if (this.callbacks.onDragEnd) {
            this.callbacks.onDragEnd(this.dragState.currentBox, finalPosition);
        }
    }

    private finishCreateDrag(event: MouseEvent): void {
        // Supprimer le preview
        const preview = this.gridContainer.querySelector('.create-preview');
        if (preview) {
            preview.remove();
        }

        const rect = this.gridContainer.getBoundingClientRect();
        const endGrid = PositionCalculator.pixelsToGrid(
            event.clientX - rect.left,
            event.clientY - rect.top
        );

        const startX = Math.min(this.dragState.gridStartX, endGrid.x);
        const startY = Math.min(this.dragState.gridStartY, endGrid.y);
        const width = Math.abs(endGrid.x - this.dragState.gridStartX) + 1;
        const height = Math.abs(endGrid.y - this.dragState.gridStartY) + 1;

        const constrainedPos = PositionCalculator.constrainToGrid(startX, startY);
        const constrainedSize = PositionCalculator.constrainSize(width, height, constrainedPos.x, constrainedPos.y);

        // Créer la nouvelle box seulement si elle a une taille valide
        if (constrainedSize.width > 0 && constrainedSize.height > 0) {
            const newBox: LayoutBox = {
                id: `box-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                title: `Box ${constrainedPos.x + 1}-${constrainedPos.y + 1}`,
                x: constrainedPos.x,
                y: constrainedPos.y,
                w: constrainedSize.width,
                h: constrainedSize.height
            };

            if (this.callbacks.onCreate) {
                this.callbacks.onCreate(newBox);
            }
        }
    }

    private resetDragState(): void {
        this.dragState = {
            isActive: false,
            startX: 0,
            startY: 0,
            gridStartX: 0,
            gridStartY: 0,
            originalBox: null,
            currentBox: null,
            mode: null
        };
    }

    destroy(): void {
        this.cleanup.forEach(fn => fn());
        this.cleanup = [];
    }
}