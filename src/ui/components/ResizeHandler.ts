/**
 * Gestionnaire pour le redimensionnement des boxes
 */

import { LayoutBox } from "../../core/layout/layoutFileRepo";
import { UI_CONSTANTS } from "../../core/constants";
import { PositionCalculator, GridPosition, GridSize } from "../utils/PositionCalculator";
import { DOMHelper } from "../utils/DOMHelper";
import { BoxState } from "./BoxRenderer";

export interface ResizeState {
    isActive: boolean;
    direction: string;
    startX: number;
    startY: number;
    originalBox: LayoutBox | null;
    currentBox: BoxState | null;
}

export interface ResizeCallbacks {
    onResizeStart?: (boxState: BoxState, direction: string) => void;
    onResizeMove?: (boxState: BoxState, newBounds: { x: number, y: number, w: number, h: number }) => void;
    onResizeEnd?: (boxState: BoxState, finalBounds: { x: number, y: number, w: number, h: number }) => void;
}

type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export class ResizeHandler {
    private resizeState: ResizeState = {
        isActive: false,
        direction: '',
        startX: 0,
        startY: 0,
        originalBox: null,
        currentBox: null
    };

    private callbacks: ResizeCallbacks;
    private cleanup: (() => void)[] = [];
    private resizePreview: HTMLElement | null = null;

    constructor(callbacks: ResizeCallbacks = {}) {
        this.callbacks = callbacks;
        this.setupGlobalListeners();
    }

    private setupGlobalListeners(): void {
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

    addResizeHandles(boxState: BoxState): void {
        const { element } = boxState;
        
        // Supprimer les anciennes poignées
        this.removeResizeHandles(element);

        const directions: ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
        
        directions.forEach(direction => {
            const handleEl = this.createResizeHandle(direction);
            handleEl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startResize(boxState, direction, e);
            });
            
            element.appendChild(handleEl);
        });
    }

    private createResizeHandle(direction: ResizeDirection): HTMLElement {
        const handleEl = DOMHelper.createElement('div', `resize-handle resize-${direction}`);
        const size = UI_CONSTANTS.RESIZE_HANDLE_SIZE_PX;

        DOMHelper.applyStyles(handleEl, {
            position: 'absolute',
            width: DOMHelper.px(size),
            height: DOMHelper.px(size),
            backgroundColor: '#007acc',
            borderRadius: '50%',
            cursor: this.getResizeCursor(direction),
            opacity: '0',
            transition: 'opacity 0.2s ease',
            pointerEvents: 'auto'
        });

        DOMHelper.applyZIndex(handleEl, 'SELECTED_BOX');

        // Positionnement selon la direction
        const positions = this.getHandlePosition(direction, size);
        DOMHelper.applyStyles(handleEl, positions);

        return handleEl;
    }

    private getHandlePosition(direction: ResizeDirection, size: number): Partial<CSSStyleDeclaration> {
        const half = size / 2;
        const positions: Record<ResizeDirection, Partial<CSSStyleDeclaration>> = {
            'n': { top: DOMHelper.px(-half), left: '50%', marginLeft: DOMHelper.px(-half) },
            'ne': { top: DOMHelper.px(-half), right: DOMHelper.px(-half) },
            'e': { top: '50%', right: DOMHelper.px(-half), marginTop: DOMHelper.px(-half) },
            'se': { bottom: DOMHelper.px(-half), right: DOMHelper.px(-half) },
            's': { bottom: DOMHelper.px(-half), left: '50%', marginLeft: DOMHelper.px(-half) },
            'sw': { bottom: DOMHelper.px(-half), left: DOMHelper.px(-half) },
            'w': { top: '50%', left: DOMHelper.px(-half), marginTop: DOMHelper.px(-half) },
            'nw': { top: DOMHelper.px(-half), left: DOMHelper.px(-half) }
        };

        return positions[direction];
    }

    private getResizeCursor(direction: ResizeDirection): string {
        const cursors: Record<ResizeDirection, string> = {
            'n': 'ns-resize',
            'ne': 'nesw-resize',
            'e': 'ew-resize',
            'se': 'nwse-resize',
            's': 'ns-resize',
            'sw': 'nesw-resize',
            'w': 'ew-resize',
            'nw': 'nwse-resize'
        };

        return cursors[direction];
    }

    showResizeHandles(element: HTMLElement): void {
        const handles = element.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            DOMHelper.applyStyles(handle as HTMLElement, { opacity: '1' });
        });
    }

    hideResizeHandles(element: HTMLElement): void {
        const handles = element.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            DOMHelper.applyStyles(handle as HTMLElement, { opacity: '0' });
        });
    }

    private removeResizeHandles(element: HTMLElement): void {
        const handles = element.querySelectorAll('.resize-handle');
        handles.forEach(handle => handle.remove());
    }

    private startResize(boxState: BoxState, direction: string, event: MouseEvent): void {
        this.resizeState = {
            isActive: true,
            direction,
            startX: event.clientX,
            startY: event.clientY,
            originalBox: { ...boxState.box },
            currentBox: boxState
        };

        boxState.isResizing = true;

        // Créer preview de redimensionnement
        this.createResizePreview();

        if (this.callbacks.onResizeStart) {
            this.callbacks.onResizeStart(boxState, direction);
        }
    }

    private createResizePreview(): void {
        if (!this.resizeState.originalBox) return;

        this.resizePreview = DOMHelper.createElement('div', 'resize-preview');
        const cssPosition = PositionCalculator.getBoxCSSPosition(this.resizeState.originalBox);

        DOMHelper.applyStyles(this.resizePreview, {
            position: 'absolute',
            left: cssPosition.left,
            top: cssPosition.top,
            width: cssPosition.width,
            height: cssPosition.height,
            border: '2px dashed #007acc',
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            borderRadius: '6px',
            pointerEvents: 'none'
        });

        DOMHelper.applyZIndex(this.resizePreview, 'MODAL');
        
        if (this.resizeState.currentBox) {
            this.resizeState.currentBox.element.parentNode?.appendChild(this.resizePreview);
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.resizeState.isActive || !this.resizeState.originalBox) return;

        const deltaX = event.clientX - this.resizeState.startX;
        const deltaY = event.clientY - this.resizeState.startY;
        
        const gridDelta = PositionCalculator.pixelsToGrid(deltaX, deltaY);
        const newBounds = this.calculateNewBounds(
            this.resizeState.originalBox,
            this.resizeState.direction,
            gridDelta
        );

        this.updateResizePreview(newBounds);

        if (this.callbacks.onResizeMove && this.resizeState.currentBox) {
            this.callbacks.onResizeMove(this.resizeState.currentBox, newBounds);
        }
    }

    private calculateNewBounds(
        originalBox: LayoutBox, 
        direction: string, 
        gridDelta: GridPosition
    ): { x: number, y: number, w: number, h: number } {
        let { x, y, w, h } = originalBox;

        switch (direction) {
            case 'n':
                y += gridDelta.y;
                h -= gridDelta.y;
                break;
            case 'ne':
                y += gridDelta.y;
                w += gridDelta.x;
                h -= gridDelta.y;
                break;
            case 'e':
                w += gridDelta.x;
                break;
            case 'se':
                w += gridDelta.x;
                h += gridDelta.y;
                break;
            case 's':
                h += gridDelta.y;
                break;
            case 'sw':
                x += gridDelta.x;
                w -= gridDelta.x;
                h += gridDelta.y;
                break;
            case 'w':
                x += gridDelta.x;
                w -= gridDelta.x;
                break;
            case 'nw':
                x += gridDelta.x;
                y += gridDelta.y;
                w -= gridDelta.x;
                h -= gridDelta.y;
                break;
        }

        // Contraindre les valeurs
        const constrainedPos = PositionCalculator.constrainToGrid(x, y);
        const constrainedSize = PositionCalculator.constrainSize(w, h, constrainedPos.x, constrainedPos.y);

        return {
            x: constrainedPos.x,
            y: constrainedPos.y,
            w: constrainedSize.width,
            h: constrainedSize.height
        };
    }

    private updateResizePreview(bounds: { x: number, y: number, w: number, h: number }): void {
        if (!this.resizePreview) return;

        const tempBox: LayoutBox = {
            id: 'temp',
            title: 'temp',
            x: bounds.x,
            y: bounds.y,
            w: bounds.w,
            h: bounds.h
        };

        const cssPosition = PositionCalculator.getBoxCSSPosition(tempBox);
        DOMHelper.applyStyles(this.resizePreview, {
            left: cssPosition.left,
            top: cssPosition.top,
            width: cssPosition.width,
            height: cssPosition.height
        });
    }

    private handleMouseUp(event: MouseEvent): void {
        if (!this.resizeState.isActive) return;

        const deltaX = event.clientX - this.resizeState.startX;
        const deltaY = event.clientY - this.resizeState.startY;
        
        const gridDelta = PositionCalculator.pixelsToGrid(deltaX, deltaY);
        
        if (this.resizeState.originalBox && this.resizeState.currentBox) {
            const finalBounds = this.calculateNewBounds(
                this.resizeState.originalBox,
                this.resizeState.direction,
                gridDelta
            );

            this.resizeState.currentBox.isResizing = false;

            if (this.callbacks.onResizeEnd) {
                this.callbacks.onResizeEnd(this.resizeState.currentBox, finalBounds);
            }
        }

        // Nettoyer
        if (this.resizePreview) {
            this.resizePreview.remove();
            this.resizePreview = null;
        }

        this.resizeState = {
            isActive: false,
            direction: '',
            startX: 0,
            startY: 0,
            originalBox: null,
            currentBox: null
        };
    }

    destroy(): void {
        this.cleanup.forEach(fn => fn());
        this.cleanup = [];
        
        if (this.resizePreview) {
            this.resizePreview.remove();
            this.resizePreview = null;
        }
    }
}