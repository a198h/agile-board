/**
 * Utilitaires pour les calculs de position et de grille
 */

import { GRID_CONSTANTS } from "../../core/constants";
import { LayoutBox } from "../../core/layout/layoutFileRepo";

export interface GridPosition {
    x: number;
    y: number;
}

export interface GridSize {
    width: number;
    height: number;
}

export interface PixelPosition {
    left: number;
    top: number;
}

export interface PixelSize {
    width: number;
    height: number;
}

export class PositionCalculator {
    /**
     * Convertit des coordonnées grille en pixels
     */
    static gridToPixels(gridX: number, gridY: number): PixelPosition {
        return {
            left: gridX * GRID_CONSTANTS.CELL_SIZE_PX,
            top: gridY * GRID_CONSTANTS.CELL_SIZE_PX
        };
    }

    /**
     * Convertit des pixels en coordonnées grille
     */
    static pixelsToGrid(pixelX: number, pixelY: number): GridPosition {
        return {
            x: Math.round(pixelX / GRID_CONSTANTS.CELL_SIZE_PX),
            y: Math.round(pixelY / GRID_CONSTANTS.CELL_SIZE_PX)
        };
    }

    /**
     * Convertit une taille grille en pixels
     */
    static gridSizeToPixels(gridWidth: number, gridHeight: number): PixelSize {
        return {
            width: gridWidth * GRID_CONSTANTS.CELL_SIZE_PX,
            height: gridHeight * GRID_CONSTANTS.CELL_SIZE_PX
        };
    }

    /**
     * Convertit une taille pixels en grille
     */
    static pixelSizeToGrid(pixelWidth: number, pixelHeight: number): GridSize {
        return {
            width: Math.round(pixelWidth / GRID_CONSTANTS.CELL_SIZE_PX),
            height: Math.round(pixelHeight / GRID_CONSTANTS.CELL_SIZE_PX)
        };
    }

    /**
     * Contraint une position dans les limites de la grille
     */
    static constrainToGrid(x: number, y: number, width?: number, height?: number): GridPosition {
        const maxX = width ? GRID_CONSTANTS.SIZE - width : GRID_CONSTANTS.MAX_INDEX;
        const maxY = height ? GRID_CONSTANTS.SIZE - height : GRID_CONSTANTS.MAX_INDEX;

        return {
            x: Math.max(0, Math.min(maxX, Math.round(x))),
            y: Math.max(0, Math.min(maxY, Math.round(y)))
        };
    }

    /**
     * Contraint une taille dans les limites de la grille
     */
    static constrainSize(width: number, height: number, x?: number, y?: number): GridSize {
        const maxWidth = x !== undefined ? GRID_CONSTANTS.SIZE - x : GRID_CONSTANTS.SIZE;
        const maxHeight = y !== undefined ? GRID_CONSTANTS.SIZE - y : GRID_CONSTANTS.SIZE;

        return {
            width: Math.max(GRID_CONSTANTS.MIN_SIZE, Math.min(maxWidth, Math.round(width))),
            height: Math.max(GRID_CONSTANTS.MIN_SIZE, Math.min(maxHeight, Math.round(height)))
        };
    }

    /**
     * Vérifie si un cadre est dans les limites de la grille
     */
    static isWithinGrid(box: LayoutBox): boolean {
        return box.x >= 0 
            && box.y >= 0 
            && box.x + box.w <= GRID_CONSTANTS.SIZE 
            && box.y + box.h <= GRID_CONSTANTS.SIZE;
    }

    /**
     * Calcule la position CSS pour un cadre avec espacement moderne (comme l'ancien système)
     */
    static getBoxCSSPosition(box: LayoutBox): { left: string; top: string; width: string; height: string } {
        const pixel = this.gridToPixels(box.x, box.y);
        const size = this.gridSizeToPixels(box.w, box.h);

        // Appliquer le même espacement que l'ancien système : gap de 4px
        return {
            left: `${pixel.left + 2}px`,
            top: `${pixel.top + 2}px`,
            width: `${size.width - 4}px`,
            height: `${size.height - 4}px`
        };
    }

    /**
     * Calcule l'index de couleur séquentiel pour un cadre
     * IMPORTANT: Utilise l'ordre original des cadres (comme l'ancien système)
     */
    static calculateColorIndex(boxes: LayoutBox[], currentBox: LayoutBox): number {
        // Ne PAS trier - utiliser l'ordre original du fichier JSON pour compatibilité
        const index = boxes.findIndex(box => box.id === currentBox.id);
        return index >= 0 ? index : 0;
    }
}