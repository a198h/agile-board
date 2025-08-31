/**
 * Responsable du rendu des boxes sur la grille
 */

import { LayoutBox } from "../../core/layout/layoutFileRepo";
import { COLOR_CONSTANTS } from "../../core/constants";
import { DOMHelper } from "../utils/DOMHelper";
import { PositionCalculator } from "../utils/PositionCalculator";

export interface BoxState {
    box: LayoutBox;
    element: HTMLElement;
    isSelected: boolean;
    isDragging: boolean;
    isResizing: boolean;
}

export interface BoxRenderOptions {
    onSelect?: (boxState: BoxState) => void;
    onStartDrag?: (boxState: BoxState, event: MouseEvent) => void;
    onStartResize?: (boxState: BoxState, direction: string, event: MouseEvent) => void;
}

export class BoxRenderer {
    private gridContainer: HTMLElement;
    private boxes: Map<string, BoxState> = new Map();
    private selectedBox: BoxState | null = null;
    private options: BoxRenderOptions;

    constructor(gridContainer: HTMLElement, options: BoxRenderOptions = {}) {
        this.gridContainer = gridContainer;
        this.options = options;
    }

    renderBox(box: LayoutBox, allBoxes: LayoutBox[]): BoxState {
        const existing = this.boxes.get(box.id);
        if (existing) {
            this.updateBoxElement(existing, allBoxes);
            return existing;
        }

        const element = this.createBoxElement(box, allBoxes);
        const boxState: BoxState = {
            box,
            element,
            isSelected: false,
            isDragging: false,
            isResizing: false
        };

        this.boxes.set(box.id, boxState);
        this.gridContainer.appendChild(element);
        
        return boxState;
    }

    private createBoxElement(box: LayoutBox, allBoxes: LayoutBox[]): HTMLElement {
        const element = DOMHelper.createElement('div', 'layout-box');
        
        // Calcul de la couleur séquentielle
        const colorIndex = PositionCalculator.calculateColorIndex(allBoxes, box);
        const bgColor = DOMHelper.getColorFromPalette(colorIndex);
        const borderColor = DOMHelper.getBorderColorFromPalette(colorIndex);

        // Positionnement et taille
        const cssPosition = PositionCalculator.getBoxCSSPosition(box);
        
        DOMHelper.applyStyles(element, {
            position: 'absolute',
            left: cssPosition.left,
            top: cssPosition.top,
            width: cssPosition.width,
            height: cssPosition.height,
            backgroundColor: bgColor,
            border: `2px solid ${borderColor}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '500',
            color: '#333',
            boxSizing: 'border-box',
            userSelect: 'none'
        });

        DOMHelper.applyZIndex(element, 'SELECTED_BOX');
        
        // Texte du titre
        const titleSpan = DOMHelper.createElement('span');
        titleSpan.textContent = box.title;
        DOMHelper.applyStyles(titleSpan, {
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '90%'
        });
        element.appendChild(titleSpan);

        // Event listeners
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectBox(box.id);
        });

        element.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click only
                const boxState = this.boxes.get(box.id);
                if (boxState && this.options.onStartDrag) {
                    this.options.onStartDrag(boxState, e);
                }
            }
        });

        element.dataset.boxId = box.id;
        return element;
    }

    private updateBoxElement(boxState: BoxState, allBoxes: LayoutBox[]): void {
        const { box, element } = boxState;
        
        // Mise à jour de la position et taille
        const cssPosition = PositionCalculator.getBoxCSSPosition(box);
        DOMHelper.applyStyles(element, {
            left: cssPosition.left,
            top: cssPosition.top,
            width: cssPosition.width,
            height: cssPosition.height
        });

        // Mise à jour du titre
        const titleSpan = element.querySelector('span');
        if (titleSpan) {
            titleSpan.textContent = box.title;
        }

        // Mise à jour de la couleur
        const colorIndex = PositionCalculator.calculateColorIndex(allBoxes, box);
        const bgColor = DOMHelper.getColorFromPalette(colorIndex);
        const borderColor = DOMHelper.getBorderColorFromPalette(colorIndex);
        
        DOMHelper.applyStyles(element, {
            backgroundColor: bgColor,
            borderColor: borderColor
        });
    }

    selectBox(boxId: string): void {
        // Désélectionner la box précédente
        if (this.selectedBox) {
            this.selectedBox.isSelected = false;
            this.updateSelectionStyles(this.selectedBox);
        }

        // Sélectionner la nouvelle box
        const boxState = this.boxes.get(boxId);
        if (boxState) {
            this.selectedBox = boxState;
            boxState.isSelected = true;
            this.updateSelectionStyles(boxState);
            
            if (this.options.onSelect) {
                this.options.onSelect(boxState);
            }
        }
    }

    private updateSelectionStyles(boxState: BoxState): void {
        const { element, isSelected } = boxState;
        
        if (isSelected) {
            DOMHelper.applyStyles(element, {
                boxShadow: '0 0 0 2px #007acc',
                transform: 'scale(1.02)'
            });
        } else {
            DOMHelper.applyStyles(element, {
                boxShadow: 'none',
                transform: 'scale(1)'
            });
        }
    }

    getSelectedBox(): BoxState | null {
        return this.selectedBox;
    }

    getAllBoxes(): Map<string, BoxState> {
        return this.boxes;
    }

    removeBox(boxId: string): void {
        const boxState = this.boxes.get(boxId);
        if (boxState) {
            if (boxState.element.parentNode) {
                boxState.element.parentNode.removeChild(boxState.element);
            }
            this.boxes.delete(boxId);
            
            if (this.selectedBox?.box.id === boxId) {
                this.selectedBox = null;
            }
        }
    }

    clearAll(): void {
        this.boxes.forEach(boxState => {
            if (boxState.element.parentNode) {
                boxState.element.parentNode.removeChild(boxState.element);
            }
        });
        this.boxes.clear();
        this.selectedBox = null;
    }

    updateBox(updatedBox: LayoutBox, allBoxes: LayoutBox[]): void {
        const boxState = this.boxes.get(updatedBox.id);
        if (boxState) {
            boxState.box = updatedBox;
            this.updateBoxElement(boxState, allBoxes);
        }
    }
}