// src/components/editor/GridCanvas.ts
import { GRID_CONSTANTS } from "../../core/constants";

/**
 * Composant responsable du rendu de la grille 24x24.
 * Gère la création de la grille, les lignes et la numérotation.
 */
export class GridCanvas {
  private gridContainer: HTMLElement;
  private gridInner: HTMLElement;
  private readonly GRID_SIZE = GRID_CONSTANTS.SIZE;
  private readonly cellSize = GRID_CONSTANTS.CELL_SIZE_PX;

  constructor(container: HTMLElement) {
    this.gridContainer = container;
    this.setupGrid();
    this.gridInner = this.createGridInner();
  }

  /**
   * Configure le container principal de la grille.
   */
  private setupGrid(): void {
    this.gridContainer.style.position = 'absolute';
    this.gridContainer.style.top = '0';
    this.gridContainer.style.left = '0';
    this.gridContainer.style.right = '0';
    this.gridContainer.style.bottom = '0';
    this.gridContainer.style.cursor = 'crosshair';
    this.gridContainer.style.paddingTop = `${GRID_CONSTANTS.PADDING_PX}px`;
    this.gridContainer.style.paddingLeft = `${GRID_CONSTANTS.PADDING_PX}px`;
    this.gridContainer.style.boxSizing = 'border-box';
  }

  /**
   * Crée la grille interne avec dimensions fixes.
   */
  private createGridInner(): HTMLElement {
    const gridInner = this.gridContainer.createDiv('grid-inner');
    gridInner.style.position = 'relative';
    gridInner.style.width = `${GRID_CONSTANTS.TOTAL_WIDTH_PX}px`;
    gridInner.style.height = `${GRID_CONSTANTS.TOTAL_WIDTH_PX + 8}px`;
    gridInner.style.backgroundColor = 'var(--background-secondary)';
    gridInner.style.border = '1px solid var(--background-modifier-border)';
    
    this.drawGridLines(gridInner);
    this.addGridNumbers();
    
    return gridInner;
  }

  /**
   * Dessine les lignes de la grille.
   */
  private drawGridLines(gridInner: HTMLElement): void {
    // Lignes verticales (colonnes)
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
    
    // Lignes horizontales (lignes)
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

  /**
   * Ajoute la numérotation des colonnes et lignes.
   */
  private addGridNumbers(): void {
    // Numéros de colonnes (1-24)
    for (let i = 0; i < this.GRID_SIZE; i++) {
      const label = this.gridContainer.createDiv('grid-number-col');
      label.textContent = (i + 1).toString();
      label.style.position = 'absolute';
      label.style.left = `${18 + i * this.cellSize + this.cellSize / 2 - 6}px`;
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
      label.style.top = `${18 + i * this.cellSize + this.cellSize / 2 - 6}px`;
      label.style.fontSize = '10px';
      label.style.color = 'var(--text-accent)';
      label.style.fontWeight = '600';
      label.style.textAlign = 'center';
      label.style.width = '20px';
      label.style.pointerEvents = 'none';
    }
  }

  /**
   * Convertit les coordonnées écran en coordonnées grille.
   */
  screenToGrid(screenX: number, screenY: number): { x: number; y: number } | null {
    const rect = this.gridInner.getBoundingClientRect();
    const relativeX = screenX - rect.left;
    const relativeY = screenY - rect.top;
    
    const gridX = Math.floor((relativeX * this.GRID_SIZE) / 624);
    const gridY = Math.floor((relativeY * this.GRID_SIZE) / 624);
    
    if (gridX < 0 || gridX >= this.GRID_SIZE || gridY < 0 || gridY >= this.GRID_SIZE) {
      return null;
    }
    
    return { x: gridX, y: gridY };
  }

  /**
   * Retourne le container de grille interne.
   */
  getGridInner(): HTMLElement {
    return this.gridInner;
  }

  /**
   * Retourne le container principal.
   */
  getContainer(): HTMLElement {
    return this.gridContainer;
  }

  /**
   * Retourne la taille des cellules.
   */
  getCellSize(): number {
    return this.cellSize;
  }
}