/**
 * Responsable du rendu de la grille visuelle
 */

import { GRID_CONSTANTS, UI_CONSTANTS } from "../../core/constants";
import { DOMHelper } from "../utils/DOMHelper";

export class GridRenderer {
    private gridContainer: HTMLElement;
    private gridInner: HTMLElement;

    constructor(container: HTMLElement) {
        this.gridContainer = container;
        this.setupGrid();
    }

    private setupGrid(): void {
        // Configuration du conteneur principal
        DOMHelper.applyStyles(this.gridContainer, {
            paddingTop: DOMHelper.px(GRID_CONSTANTS.PADDING_PX),
            paddingLeft: DOMHelper.px(GRID_CONSTANTS.PADDING_PX),
            position: 'relative',
            overflow: 'hidden'
        });

        // Création de la grille interne
        this.gridInner = DOMHelper.createElement('div', 'grid-inner');
        DOMHelper.applyStyles(this.gridInner, {
            width: DOMHelper.px(GRID_CONSTANTS.TOTAL_WIDTH_PX),
            height: DOMHelper.px(GRID_CONSTANTS.TOTAL_WIDTH_PX + 8),
            position: 'relative'
        });

        this.gridContainer.appendChild(this.gridInner);
        this.createFixedGrid();
        this.addGridNumbers();
        this.addGridLabels();
        this.addGridBackground();
    }

    private createFixedGrid(): void {
        // Lignes verticales
        for (let i = 0; i <= GRID_CONSTANTS.SIZE; i++) {
            const line = DOMHelper.createElement('div', '', {
                position: 'absolute',
                left: DOMHelper.px(i * GRID_CONSTANTS.CELL_SIZE_PX),
                top: '0',
                width: '1px',
                height: '100%',
                backgroundColor: '#e0e0e0',
                pointerEvents: 'none'
            });
            this.gridInner.appendChild(line);
        }

        // Lignes horizontales
        for (let i = 0; i <= GRID_CONSTANTS.SIZE; i++) {
            const line = DOMHelper.createElement('div', '', {
                position: 'absolute',
                left: '0',
                top: DOMHelper.px(i * GRID_CONSTANTS.CELL_SIZE_PX),
                width: '100%',
                height: '1px',
                backgroundColor: '#e0e0e0',
                pointerEvents: 'none'
            });
            this.gridInner.appendChild(line);
        }
    }

    private addGridNumbers(): void {
        // Numéros de colonnes (en haut)
        for (let i = 1; i <= GRID_CONSTANTS.SIZE; i++) {
            const label = DOMHelper.createElement('div', '', {
                position: 'absolute',
                left: DOMHelper.px((i - 1) * GRID_CONSTANTS.CELL_SIZE_PX + GRID_CONSTANTS.CELL_SIZE_PX / 2 - 6),
                top: '-15px',
                fontSize: '11px',
                color: '#666',
                pointerEvents: 'none',
                textAlign: 'center',
                width: '12px'
            });
            DOMHelper.applyZIndex(label, 'SELECTED_BOX');
            label.textContent = i.toString();
            this.gridContainer.appendChild(label);
        }

        // Numéros de lignes (à gauche)
        for (let i = 1; i <= GRID_CONSTANTS.SIZE; i++) {
            const label = DOMHelper.createElement('div', '', {
                position: 'absolute',
                left: '-15px',
                top: DOMHelper.px((i - 1) * GRID_CONSTANTS.CELL_SIZE_PX + GRID_CONSTANTS.CELL_SIZE_PX / 2 - 6),
                fontSize: '11px',
                color: '#666',
                pointerEvents: 'none',
                textAlign: 'center',
                width: '12px',
                height: '12px'
            });
            DOMHelper.applyZIndex(label, 'SELECTED_BOX');
            label.textContent = i.toString();
            this.gridContainer.appendChild(label);
        }
    }

    private addGridLabels(): void {
        const style = document.createElement('style');
        style.textContent = `
        .agile-board-grid .grid-cell {
            position: absolute;
            border: 1px solid transparent;
            box-sizing: border-box;
            z-index: 0;
        }
        .agile-board-grid .grid-cell:hover {
            border-color: #007acc;
            background-color: rgba(0, 122, 204, 0.1);
            z-index: 2;
        }
        .agile-board-grid .grid-cell.creating {
            background-color: rgba(0, 122, 204, 0.2);
            border-color: #007acc;
            z-index: 5;
        }
        `;
        document.head.appendChild(style);
    }

    private addGridBackground(): void {
        this.gridContainer.classList.add('agile-board-grid');
        
        // Ajouter les cellules interactives
        for (let y = 0; y < GRID_CONSTANTS.SIZE; y++) {
            for (let x = 0; x < GRID_CONSTANTS.SIZE; x++) {
                const cell = DOMHelper.createElement('div', 'grid-cell');
                DOMHelper.applyStyles(cell, {
                    left: DOMHelper.px(x * GRID_CONSTANTS.CELL_SIZE_PX),
                    top: DOMHelper.px(y * GRID_CONSTANTS.CELL_SIZE_PX),
                    width: DOMHelper.px(GRID_CONSTANTS.CELL_SIZE_PX),
                    height: DOMHelper.px(GRID_CONSTANTS.CELL_SIZE_PX)
                });
                
                cell.dataset.gridX = x.toString();
                cell.dataset.gridY = y.toString();
                
                this.gridInner.appendChild(cell);
            }
        }
    }

    getGridContainer(): HTMLElement {
        return this.gridContainer;
    }

    getGridInner(): HTMLElement {
        return this.gridInner;
    }

    getCellSize(): number {
        return GRID_CONSTANTS.CELL_SIZE_PX;
    }
}