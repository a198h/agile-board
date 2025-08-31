// src/core/layout/layoutValidator24.ts

import { LayoutBox, LayoutFile } from "./layoutFileRepo";
import { createContextLogger } from "../logger";
import { GRID_CONSTANTS, VALIDATION_CONSTANTS } from '../constants';

/**
 * Résultat de validation d'un layout
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Information sur une collision détectée
 */
export interface CollisionInfo {
  readonly box1: LayoutBox;
  readonly box2: LayoutBox;
  readonly message: string;
}

/**
 * Résultat de détection de collision
 */
export interface CollisionResult {
  readonly hasCollisions: boolean;
  readonly collisions: readonly CollisionInfo[];
}

/**
 * Validateur pour les layouts 24x24 avec détection avancée de collisions
 */
export class LayoutValidator24 {
  private readonly logger = createContextLogger('LayoutValidator24');

  /**
   * Valide un fichier de layout complet
   */
  public validateLayout(layout: LayoutFile): ValidationResult {
    const errors: string[] = [];

    // Validation de la structure de base
    if (!layout.name || typeof layout.name !== 'string') {
      errors.push('Le nom du layout est requis');
    }

    // Version supprimée - plus de validation de version nécessaire

    if (!Array.isArray(layout.boxes)) {
      errors.push('La liste des boxes est requise');
      return { isValid: false, errors };
    }

    // Validation des noms uniques
    const nameValidation = this.validateUniqueNames(layout.boxes);
    errors.push(...nameValidation.errors);

    // Validation des IDs uniques
    const idValidation = this.validateUniqueIds(layout.boxes);
    errors.push(...idValidation.errors);

    // Validation de chaque box individuellement
    for (let i = 0; i < layout.boxes.length; i++) {
      const boxValidation = this.validateBox(layout.boxes[i], i);
      errors.push(...boxValidation.errors);
    }

    // Détection des collisions
    const collisionResult = this.detectCollisions(layout.boxes);
    if (collisionResult.hasCollisions) {
      collisionResult.collisions.forEach(collision => {
        errors.push(collision.message);
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide une box individuelle
   */
  public validateBox(box: LayoutBox, index?: number): ValidationResult {
    const errors: string[] = [];
    const prefix = index !== undefined ? `Box ${index + 1}` : 'Box';

    // Validation des types
    if (typeof box.id !== 'string' || box.id.length === 0) {
      errors.push(`${prefix}: ID requis et non vide`);
    }

    if (typeof box.title !== 'string' || box.title.trim().length === 0) {
      errors.push(`${prefix}: Titre requis et non vide`);
    }

    if (!Number.isInteger(box.x) || box.x < 0 || box.x > GRID_CONSTANTS.MAX_INDEX) {
      errors.push(`${prefix}: x doit être un entier entre 0 et ${GRID_CONSTANTS.MAX_INDEX} (actuel: ${box.x})`);
    }

    if (!Number.isInteger(box.y) || box.y < 0 || box.y > GRID_CONSTANTS.MAX_INDEX) {
      errors.push(`${prefix}: y doit être un entier entre 0 et ${GRID_CONSTANTS.MAX_INDEX} (actuel: ${box.y})`);
    }

    if (!Number.isInteger(box.w) || box.w < GRID_CONSTANTS.MIN_SIZE || box.w > GRID_CONSTANTS.SIZE) {
      errors.push(`${prefix}: w doit être un entier entre 1 et 24 (actuel: ${box.w})`);
    }

    if (!Number.isInteger(box.h) || box.h < GRID_CONSTANTS.MIN_SIZE || box.h > GRID_CONSTANTS.SIZE) {
      errors.push(`${prefix}: h doit être un entier entre 1 et 24 (actuel: ${box.h})`);
    }

    // Validation des débordements
    if (box.x + box.w > GRID_CONSTANTS.SIZE) {
      errors.push(`${prefix}: débordement horizontal (x=${box.x} + w=${box.w} > ${GRID_CONSTANTS.SIZE})`);
    }

    if (box.y + box.h > GRID_CONSTANTS.SIZE) {
      errors.push(`${prefix}: débordement vertical (y=${box.y} + h=${box.h} > ${GRID_CONSTANTS.SIZE})`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Vérifie les collisions entre boxes
   */
  public detectCollisions(boxes: readonly LayoutBox[]): CollisionResult {
    const collisions: CollisionInfo[] = [];

    // Approche O(n²) simple mais efficace pour 24x24
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const box1 = boxes[i];
        const box2 = boxes[j];

        if (this.boxesOverlap(box1, box2)) {
          collisions.push({
            box1,
            box2,
            message: `Collision détectée entre "${box1.title}" et "${box2.title}"`
          });
        }
      }
    }

    return {
      hasCollisions: collisions.length > 0,
      collisions
    };
  }

  /**
   * Vérifie si une nouvelle box entrerait en collision avec les existantes
   */
  public wouldCollide(newBox: LayoutBox, existingBoxes: readonly LayoutBox[], excludeId?: string): CollisionResult {
    const relevantBoxes = excludeId 
      ? existingBoxes.filter(box => box.id !== excludeId)
      : existingBoxes;

    const collisions: CollisionInfo[] = [];

    for (const existingBox of relevantBoxes) {
      if (this.boxesOverlap(newBox, existingBox)) {
        collisions.push({
          box1: newBox,
          box2: existingBox,
          message: `Collision avec "${existingBox.title}"`
        });
      }
    }

    return {
      hasCollisions: collisions.length > 0,
      collisions
    };
  }

  /**
   * Trouve une position libre pour une nouvelle box
   */
  public findFreePosition(
    width: number, 
    height: number, 
    existingBoxes: readonly LayoutBox[]
  ): { x: number; y: number } | null {
    // Créer une grille d'occupation
    const grid = Array.from({ length: GRID_CONSTANTS.SIZE }, () => Array(GRID_CONSTANTS.SIZE).fill(false));
    
    // Marquer les cellules occupées
    for (const box of existingBoxes) {
      for (let x = box.x; x < box.x + box.w; x++) {
        for (let y = box.y; y < box.y + box.h; y++) {
          if (x >= 0 && x < GRID_CONSTANTS.SIZE && y >= 0 && y < GRID_CONSTANTS.SIZE) {
            grid[x][y] = true;
          }
        }
      }
    }

    // Chercher une position libre (de gauche à droite, de haut en bas)
    for (let y = 0; y <= GRID_CONSTANTS.SIZE - height; y++) {
      for (let x = 0; x <= GRID_CONSTANTS.SIZE - width; x++) {
        if (this.isAreaFree(grid, x, y, width, height)) {
          return { x, y };
        }
      }
    }

    return null; // Pas de place libre trouvée
  }

  /**
   * Normalise les coordonnées d'une box (arrondit et clamp)
   */
  public normalizeBox(box: LayoutBox): LayoutBox {
    const normalized = {
      ...box,
      x: Math.max(0, Math.min(GRID_CONSTANTS.MAX_INDEX, Math.round(box.x))),
      y: Math.max(0, Math.min(GRID_CONSTANTS.MAX_INDEX, Math.round(box.y))),
      w: Math.max(1, Math.min(24, Math.round(box.w))),
      h: Math.max(1, Math.min(24, Math.round(box.h)))
    };

    // Ajuster si débordement après normalisation
    if (normalized.x + normalized.w > GRID_CONSTANTS.SIZE) {
      normalized.w = 24 - normalized.x;
    }
    if (normalized.y + normalized.h > GRID_CONSTANTS.SIZE) {
      normalized.h = 24 - normalized.y;
    }

    return normalized;
  }

  // Méthodes privées

  private validateUniqueNames(boxes: readonly LayoutBox[]): ValidationResult {
    const names = new Set<string>();
    const errors: string[] = [];

    for (const box of boxes) {
      const trimmedTitle = box.title.trim().toLowerCase();
      if (names.has(trimmedTitle)) {
        errors.push(`Titre dupliqué: "${box.title}"`);
      }
      names.add(trimmedTitle);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateUniqueIds(boxes: readonly LayoutBox[]): ValidationResult {
    const ids = new Set<string>();
    const errors: string[] = [];

    for (const box of boxes) {
      if (ids.has(box.id)) {
        errors.push(`ID dupliqué: "${box.id}"`);
      }
      ids.add(box.id);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private boxesOverlap(box1: LayoutBox, box2: LayoutBox): boolean {
    // Les rectangles ne se chevauchent pas si:
    // - box1 est complètement à gauche de box2
    // - box1 est complètement à droite de box2  
    // - box1 est complètement au-dessus de box2
    // - box1 est complètement en-dessous de box2
    
    return !(
      box1.x + box1.w <= box2.x ||  // box1 à gauche de box2
      box2.x + box2.w <= box1.x ||  // box2 à gauche de box1
      box1.y + box1.h <= box2.y ||  // box1 au-dessus de box2
      box2.y + box2.h <= box1.y     // box2 au-dessus de box1
    );
  }

  private isAreaFree(
    grid: boolean[][], 
    startX: number, 
    startY: number, 
    width: number, 
    height: number
  ): boolean {
    for (let x = startX; x < startX + width; x++) {
      for (let y = startY; y < startY + height; y++) {
        if (grid[x][y]) {
          return false;
        }
      }
    }
    return true;
  }
}