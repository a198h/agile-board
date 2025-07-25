// src/core/business/gridCalculator.ts
import { LayoutBlock } from "../../types";

/**
 * Dimensions de la grille.
 */
export interface GridDimensions {
  readonly columns: number;
  readonly rows: number;
}

/**
 * Position dans la grille.
 */
export interface GridPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Résultat de collision entre blocs.
 */
export interface CollisionResult {
  readonly hasCollision: boolean;
  readonly collidingBlocks: readonly [LayoutBlock, LayoutBlock][];
  readonly errors: readonly string[];
}

/**
 * Calculateur pur pour les opérations de grille.
 * Logique métier testable sans dépendances externes.
 */
export class GridCalculator {
  private static readonly DEFAULT_GRID: GridDimensions = {
    columns: 24,
    rows: 100
  };

  /**
   * Vérifie si un bloc est dans les limites de la grille.
   * @param block Bloc à vérifier
   * @param grid Dimensions de la grille
   * @returns true si le bloc est valide
   */
  public static isBlockInBounds(
    block: LayoutBlock, 
    grid: GridDimensions = this.DEFAULT_GRID
  ): boolean {
    return (
      block.x >= 0 &&
      block.y >= 0 &&
      block.x + block.w <= grid.columns &&
      block.y + block.h <= grid.rows &&
      block.w > 0 &&
      block.h > 0
    );
  }

  /**
   * Convertit un bloc en position de grille.
   * @param block Bloc source
   * @returns Position calculée
   */
  public static blockToPosition(block: LayoutBlock): GridPosition {
    return {
      x: block.x,
      y: block.y,
      width: block.w,
      height: block.h
    };
  }

  /**
   * Calcule l'aire d'un bloc.
   * @param block Bloc à mesurer
   * @returns Aire en cellules de grille
   */
  public static calculateBlockArea(block: LayoutBlock): number {
    return block.w * block.h;
  }

  /**
   * Vérifie si deux blocs se chevauchent.
   * @param block1 Premier bloc
   * @param block2 Deuxième bloc
   * @returns true s'il y a collision
   */
  public static blocksOverlap(block1: LayoutBlock, block2: LayoutBlock): boolean {
    const pos1 = this.blockToPosition(block1);
    const pos2 = this.blockToPosition(block2);
    
    return !(
      pos1.x + pos1.width <= pos2.x ||
      pos2.x + pos2.width <= pos1.x ||
      pos1.y + pos1.height <= pos2.y ||
      pos2.y + pos2.height <= pos1.y
    );
  }

  /**
   * Détecte toutes les collisions dans une liste de blocs.
   * @param blocks Liste des blocs à vérifier
   * @returns Résultat de collision détaillé
   */
  public static detectCollisions(blocks: readonly LayoutBlock[]): CollisionResult {
    const collidingBlocks: [LayoutBlock, LayoutBlock][] = [];
    const errors: string[] = [];

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const block1 = blocks[i];
        const block2 = blocks[j];

        if (this.blocksOverlap(block1, block2)) {
          collidingBlocks.push([block1, block2]);
          errors.push(
            `Collision entre "${block1.title}" (${block1.x},${block1.y},${block1.w}x${block1.h}) ` +
            `et "${block2.title}" (${block2.x},${block2.y},${block2.w}x${block2.h})`
          );
        }
      }
    }

    return {
      hasCollision: collidingBlocks.length > 0,
      collidingBlocks,
      errors
    };
  }

  /**
   * Calcule l'occupation totale de la grille.
   * @param blocks Liste des blocs
   * @param grid Dimensions de la grille
   * @returns Pourcentage d'occupation (0-1)
   */
  public static calculateGridOccupancy(
    blocks: readonly LayoutBlock[],
    grid: GridDimensions = this.DEFAULT_GRID
  ): number {
    const totalArea = grid.columns * grid.rows;
    const usedArea = blocks.reduce((sum, block) => sum + this.calculateBlockArea(block), 0);
    return Math.min(usedArea / totalArea, 1);
  }

  /**
   * Trouve l'espace libre le plus proche pour placer un bloc.
   * @param requestedSize Taille demandée
   * @param existingBlocks Blocs existants
   * @param grid Dimensions de la grille
   * @returns Position suggérée ou null si aucune place
   */
  public static findFreeSpace(
    requestedSize: { width: number; height: number },
    existingBlocks: readonly LayoutBlock[],
    grid: GridDimensions = this.DEFAULT_GRID
  ): GridPosition | null {
    for (let y = 0; y <= grid.rows - requestedSize.height; y++) {
      for (let x = 0; x <= grid.columns - requestedSize.width; x++) {
        const candidateBlock: LayoutBlock = {
          title: "test",
          x,
          y,
          w: requestedSize.width,
          h: requestedSize.height
        };

        const hasCollision = existingBlocks.some(existing => 
          this.blocksOverlap(candidateBlock, existing)
        );

        if (!hasCollision) {
          return {
            x,
            y,
            width: requestedSize.width,
            height: requestedSize.height
          };
        }
      }
    }

    return null;
  }

  /**
   * Optimise le placement des blocs pour minimiser l'espace perdu.
   * @param blocks Blocs à optimiser
   * @param grid Dimensions de la grille
   * @returns Blocs avec positions optimisées
   */
  public static optimizeLayout(
    blocks: readonly LayoutBlock[],
    grid: GridDimensions = this.DEFAULT_GRID
  ): readonly LayoutBlock[] {
    // Trier par aire décroissante (algorithme de bin packing)
    const sortedBlocks = [...blocks].sort((a, b) => 
      this.calculateBlockArea(b) - this.calculateBlockArea(a)
    );

    const optimized: LayoutBlock[] = [];

    for (const block of sortedBlocks) {
      const position = this.findFreeSpace(
        { width: block.w, height: block.h },
        optimized,
        grid
      );

      if (position) {
        optimized.push({
          ...block,
          x: position.x,
          y: position.y
        });
      } else {
        // Garder la position originale si pas de place trouvée
        optimized.push(block);
      }
    }

    return optimized;
  }

  /**
   * Valide qu'un ensemble de blocs forme un layout cohérent.
   * @param blocks Blocs à valider
   * @param grid Dimensions de la grille
   * @returns Erreurs de validation
   */
  public static validateLayout(
    blocks: readonly LayoutBlock[],
    grid: GridDimensions = this.DEFAULT_GRID
  ): readonly string[] {
    const errors: string[] = [];

    // Vérifier les limites de grille
    for (const block of blocks) {
      if (!this.isBlockInBounds(block, grid)) {
        errors.push(
          `Bloc "${block.title}" dépasse les limites de la grille ` +
          `(${block.x},${block.y},${block.w}x${block.h})`
        );
      }
    }

    // Vérifier les collisions
    const collisionResult = this.detectCollisions(blocks);
    errors.push(...collisionResult.errors);

    // Vérifier les titres uniques
    const titles = blocks.map(b => b.title);
    const duplicates = titles.filter((title, index) => titles.indexOf(title) !== index);
    if (duplicates.length > 0) {
      errors.push(`Titres dupliqués: ${[...new Set(duplicates)].join(', ')}`);
    }

    return errors;
  }

  /**
   * Calcule les statistiques d'un layout.
   * @param blocks Blocs du layout
   * @param grid Dimensions de la grille
   * @returns Statistiques détaillées
   */
  public static calculateLayoutStats(
    blocks: readonly LayoutBlock[],
    grid: GridDimensions = this.DEFAULT_GRID
  ): {
    totalBlocks: number;
    totalArea: number;
    averageBlockSize: number;
    occupancyRate: number;
    hasCollisions: boolean;
    validBlocks: number;
  } {
    const totalArea = blocks.reduce((sum, block) => sum + this.calculateBlockArea(block), 0);
    const validBlocks = blocks.filter(block => this.isBlockInBounds(block, grid)).length;
    const collisions = this.detectCollisions(blocks);

    return {
      totalBlocks: blocks.length,
      totalArea,
      averageBlockSize: blocks.length > 0 ? totalArea / blocks.length : 0,
      occupancyRate: this.calculateGridOccupancy(blocks, grid),
      hasCollisions: collisions.hasCollision,
      validBlocks
    };
  }
}