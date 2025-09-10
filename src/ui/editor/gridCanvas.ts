// src/ui/editor/gridCanvas.ts

import { GRID_CONSTANTS, UI_CONSTANTS } from "../../core/constants";
import { EditorComponent, EditorConfig } from "./types";

/**
 * Composant responsable du rendu de la grille de l'éditeur.
 * Gère l'affichage des lignes de grille, numéros et arrière-plan.
 * Composant pur sans état - responsabilité unique de rendu.
 */
export class GridCanvas implements EditorComponent {
  private container: HTMLElement | null = null;
  private readonly cellSize = GRID_CONSTANTS.CELL_SIZE_PX;
  
  constructor(private readonly config: EditorConfig) {}

  /**
   * Rend la grille complète dans le conteneur fourni
   */
  public render(container: HTMLElement): void {
    this.container = container;
    this.setupGridContainer();
    this.createFixedGrid();
  }

  /**
   * Configure le conteneur principal de la grille
   */
  private setupGridContainer(): void {
    if (!this.container) return;

    this.container.style.cssText = `
      position: relative;
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      border: 2px solid var(--background-modifier-border);
      border-radius: 8px;
      background: var(--background-primary);
      overflow: hidden;
      user-select: none;
    `;
  }

  /**
   * Crée la grille fixe avec lignes, numéros et arrière-plan
   */
  private createFixedGrid(): void {
    if (!this.container) return;

    const gridInner = this.createGridInner();
    this.container.appendChild(gridInner);
    
    this.drawGridLines(gridInner);
    this.addGridNumbers(gridInner);
    this.addGridLabels(gridInner);
    this.addGridBackground(gridInner);
  }

  /**
   * Crée le conteneur interne de la grille
   */
  private createGridInner(): HTMLElement {
    const gridInner = document.createElement('div');
    gridInner.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    return gridInner;
  }

  /**
   * Dessine les lignes de la grille (24x24)
   */
  private drawGridLines(gridInner: HTMLElement): void {
    // Lignes verticales
    for (let x = 0; x <= this.config.gridSize; x++) {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        left: ${x * this.cellSize}px;
        top: 0;
        width: 1px;
        height: 100%;
        background: var(--background-modifier-border);
        opacity: ${x % 4 === 0 ? '0.6' : '0.3'};
      `;
      gridInner.appendChild(line);
    }

    // Lignes horizontales
    for (let y = 0; y <= this.config.gridSize; y++) {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        top: ${y * this.cellSize}px;
        left: 0;
        height: 1px;
        width: 100%;
        background: var(--background-modifier-border);
        opacity: ${y % 4 === 0 ? '0.6' : '0.3'};
      `;
      gridInner.appendChild(line);
    }
  }

  /**
   * Ajoute les numéros de colonnes (0-23)
   */
  private addGridNumbers(gridInner: HTMLElement): void {
    for (let x = 0; x < this.config.gridSize; x++) {
      const number = document.createElement('div');
      number.textContent = x.toString();
      number.style.cssText = `
        position: absolute;
        left: ${x * this.cellSize + this.cellSize / 2}px;
        top: 2px;
        transform: translateX(-50%);
        font-size: 10px;
        color: var(--text-muted);
        pointer-events: none;
        user-select: none;
        font-family: var(--font-monospace);
      `;
      gridInner.appendChild(number);
    }
  }

  /**
   * Ajoute les lettres de lignes (A-X pour 24 lignes)
   */
  private addGridLabels(gridInner: HTMLElement): void {
    for (let y = 0; y < this.config.gridSize; y++) {
      const letter = String.fromCharCode(65 + y); // A, B, C, ...
      const label = document.createElement('div');
      label.textContent = letter;
      label.style.cssText = `
        position: absolute;
        left: 2px;
        top: ${y * this.cellSize + this.cellSize / 2}px;
        transform: translateY(-50%);
        font-size: 10px;
        color: var(--text-muted);
        pointer-events: none;
        user-select: none;
        font-family: var(--font-monospace);
      `;
      gridInner.appendChild(label);
    }
  }

  /**
   * Ajoute l'arrière-plan avec zones alternées pour améliorer la lisibilité
   */
  private addGridBackground(gridInner: HTMLElement): void {
    for (let x = 0; x < this.config.gridSize; x += 4) {
      for (let y = 0; y < this.config.gridSize; y += 4) {
        const bg = document.createElement('div');
        bg.style.cssText = `
          position: absolute;
          left: ${x * this.cellSize}px;
          top: ${y * this.cellSize}px;
          width: ${4 * this.cellSize}px;
          height: ${4 * this.cellSize}px;
          background: var(--background-secondary);
          opacity: ${(x / 4 + y / 4) % 2 === 0 ? '0.1' : '0.05'};
          pointer-events: none;
        `;
        gridInner.appendChild(bg);
      }
    }
  }

  /**
   * Nettoie les ressources du composant
   */
  public dispose(): void {
    this.container = null;
  }
}