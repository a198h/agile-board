// src/core/layout/layoutValidator.ts

import { 
  LayoutBlock, 
  LayoutValidator as ILayoutValidator, 
  ValidationResult,
  PLUGIN_CONSTANTS 
} from "../../types";

/**
 * Service de validation des modèles de layout.
 * Vérifie la structure, les types et les collisions dans la grille.
 */
export class LayoutValidator implements ILayoutValidator {
  private readonly gridColumns = PLUGIN_CONSTANTS.GRID.COLUMNS;
  private readonly gridRows = PLUGIN_CONSTANTS.GRID.ROWS;

  /**
   * Valide un modèle complet avec détection des collisions.
   * @param name Nom du modèle pour les messages d'erreur
   * @param blocks Blocs à valider
   * @returns Résultat de validation avec détails des erreurs
   */
  public validateModel(name: string, blocks: readonly unknown[]): ValidationResult {
    const errors: string[] = [];
    const validBlocks: LayoutBlock[] = [];

    // Validation de chaque bloc individuellement
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      if (!this.validateBlock(block)) {
        errors.push(`[${name}] Bloc ${i + 1}: structure invalide`);
        continue;
      }

      const blockValidation = this.validateBlockConstraints(block);
      if (!blockValidation.isValid) {
        errors.push(...blockValidation.errors.map(err => `[${name}] Bloc "${block.title}": ${err}`));
        continue;
      }

      validBlocks.push(block);
    }

    // Validation des collisions entre blocs valides
    const collisionErrors = this.detectCollisions(name, validBlocks);
    errors.push(...collisionErrors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Vérifie qu'un objet a la structure d'un LayoutBlock valide.
   * @param block Objet à valider
   * @returns true si l'objet est un LayoutBlock valide
   */
  public validateBlock(block: unknown): block is LayoutBlock {
    if (!block || typeof block !== 'object') {
      return false;
    }

    const obj = block as Record<string, unknown>;

    return (
      typeof obj.title === 'string' &&
      typeof obj.x === 'number' &&
      typeof obj.y === 'number' &&
      typeof obj.w === 'number' &&
      typeof obj.h === 'number'
    );
  }

  /**
   * Valide les contraintes d'un bloc individuel.
   * @param block Bloc à valider
   * @returns Résultat de validation
   */
  private validateBlockConstraints(block: LayoutBlock): ValidationResult {
    const errors: string[] = [];

    // Validation du titre
    if (!block.title.trim()) {
      errors.push('titre vide');
    }

    // Validation des coordonnées
    if (block.x < 0) {
      errors.push(`x=${block.x} (doit être ≥ 0)`);
    }
    
    if (block.y < 0) {
      errors.push(`y=${block.y} (doit être ≥ 0)`);
    }

    // Validation des dimensions
    if (block.w <= 0) {
      errors.push(`w=${block.w} (doit être > 0)`);
    }
    
    if (block.h <= 0) {
      errors.push(`h=${block.h} (doit être > 0)`);
    }

    // Validation des limites de grille
    if (block.x + block.w > this.gridColumns) {
      errors.push(`déborde horizontalement (x=${block.x} + w=${block.w} > ${this.gridColumns})`);
    }
    
    if (block.y + block.h > this.gridRows) {
      errors.push(`déborde verticalement (y=${block.y} + h=${block.h} > ${this.gridRows})`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Détecte les collisions entre blocs dans la grille.
   * @param modelName Nom du modèle pour les messages d'erreur
   * @param blocks Blocs à tester
   * @returns Liste des erreurs de collision
   */
  private detectCollisions(modelName: string, blocks: readonly LayoutBlock[]): string[] {
    const grid = this.createEmptyGrid();
    const errors: string[] = [];

    for (const block of blocks) {
      const collision = this.findCollisionInGrid(grid, block);
      
      if (collision) {
        errors.push(
          `[${modelName}] Collision détectée: "${block.title}" chevauche avec une autre zone à (${collision.x}, ${collision.y})`
        );
      } else {
        this.markBlockInGrid(grid, block);
      }
    }

    return errors;
  }

  /**
   * Crée une grille vide pour la détection de collisions.
   * @returns Grille 2D initialisée à false
   */
  private createEmptyGrid(): boolean[][] {
    return Array.from(
      { length: this.gridColumns }, 
      () => Array(this.gridRows).fill(false)
    );
  }

  /**
   * Cherche une collision pour un bloc dans la grille.
   * @param grid Grille de collision
   * @param block Bloc à tester
   * @returns Coordonnées de la première collision trouvée, ou null
   */
  private findCollisionInGrid(
    grid: readonly (readonly boolean[])[],
    block: LayoutBlock
  ): { x: number; y: number } | null {
    for (let x = block.x; x < block.x + block.w; x++) {
      for (let y = block.y; y < block.y + block.h; y++) {
        if (grid[x]?.[y]) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * Marque les cellules occupées par un bloc dans la grille.
   * @param grid Grille de collision (modifiée en place)
   * @param block Bloc à marquer
   */
  private markBlockInGrid(grid: boolean[][], block: LayoutBlock): void {
    for (let x = block.x; x < block.x + block.w; x++) {
      for (let y = block.y; y < block.y + block.h; y++) {
        if (grid[x] && y < grid[x].length) {
          grid[x][y] = true;
        }
      }
    }
  }
}