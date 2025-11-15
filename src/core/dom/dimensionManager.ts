// src/core/dom/dimensionManager.ts

/**
 * Données de sauvegarde des dimensions d'un élément.
 */
export interface DimensionSnapshot {
  readonly width: string;
  readonly height: string;
  readonly minWidth: string;
  readonly minHeight: string;
  readonly maxWidth: string;
  readonly maxHeight: string;
}

/**
 * Gestionnaire pour les contraintes de dimensions des éléments DOM.
 * Permet de verrouiller et restaurer les tailles pour éviter les problèmes de layout.
 */
export class DimensionManager {
  private static snapshots = new WeakMap<HTMLElement, DimensionSnapshot>();

  /**
   * Verrouille les dimensions d'un élément à sa taille actuelle.
   * Utile pour empêcher les changements de taille pendant les transitions.
   * @param element Element à verrouiller
   * @returns true si le verrouillage a été effectué
   */
  public static lockDimensions(element: HTMLElement): boolean {
    if (!element) return false;

    // Sauvegarder l'état actuel
    this.saveSnapshot(element);

    // Obtenir les dimensions calculées
    const computed = getComputedStyle(element);
    const width = computed.width;
    const height = computed.height;

    // Appliquer les contraintes
    element.style.width = width;
    element.style.height = height;
    element.style.minWidth = width;
    element.style.minHeight = height;
    element.style.maxWidth = width;
    element.style.maxHeight = height;

    return true;
  }

  /**
   * Verrouille uniquement la hauteur d'un élément.
   * @param element Element à verrouiller
   * @returns true si le verrouillage a été effectué
   */
  public static lockHeight(element: HTMLElement): boolean {
    if (!element) return false;

    this.saveSnapshot(element);

    const computed = getComputedStyle(element);
    const height = computed.height;

    element.style.height = height;
    element.style.minHeight = height;
    element.style.maxHeight = height;

    return true;
  }

  /**
   * Verrouille uniquement la largeur d'un élément.
   * @param element Element à verrouiller
   * @returns true si le verrouillage a été effectué
   */
  public static lockWidth(element: HTMLElement): boolean {
    if (!element) return false;

    this.saveSnapshot(element);

    const computed = getComputedStyle(element);
    const width = computed.width;

    element.style.width = width;
    element.style.minWidth = width;
    element.style.maxWidth = width;

    return true;
  }

  /**
   * Restaure les dimensions d'origine d'un élément.
   * @param element Element à restaurer
   * @returns true si la restauration a été effectuée
   */
  public static unlockDimensions(element: HTMLElement): boolean {
    if (!element) return false;

    const snapshot = this.snapshots.get(element);
    if (!snapshot) return false;

    // Restaurer les valeurs d'origine
    element.style.width = snapshot.width;
    element.style.height = snapshot.height;
    element.style.minWidth = snapshot.minWidth;
    element.style.minHeight = snapshot.minHeight;
    element.style.maxWidth = snapshot.maxWidth;
    element.style.maxHeight = snapshot.maxHeight;

    // Nettoyer la sauvegarde
    this.snapshots.delete(element);

    return true;
  }

  /**
   * Restaure partiellement les dimensions (retire seulement les contraintes min/max).
   * @param element Element à assouplir
   * @returns true si l'opération a été effectuée
   */
  public static relaxDimensions(element: HTMLElement): boolean {
    if (!element) return false;

    const snapshot = this.snapshots.get(element);
    if (!snapshot) return false;

    // Garder width/height mais retirer les contraintes
    element.style.minWidth = snapshot.minWidth;
    element.style.minHeight = snapshot.minHeight;
    element.style.maxWidth = snapshot.maxWidth;
    element.style.maxHeight = snapshot.maxHeight;

    return true;
  }

  /**
   * Vérifie si un élément a ses dimensions verrouillées.
   * @param element Element à vérifier
   * @returns true si l'élément est verrouillé
   */
  public static isLocked(element: HTMLElement): boolean {
    return this.snapshots.has(element);
  }

  /**
   * Sauvegarde l'état actuel des dimensions d'un élément.
   * @param element Element à sauvegarder
   */
  private static saveSnapshot(element: HTMLElement): void {
    if (this.snapshots.has(element)) return; // Déjà sauvegardé

    const style = element.style;
    const snapshot: DimensionSnapshot = {
      width: style.width,
      height: style.height,
      minWidth: style.minWidth,
      minHeight: style.minHeight,
      maxWidth: style.maxWidth,
      maxHeight: style.maxHeight
    };

    this.snapshots.set(element, snapshot);
  }

  /**
   * Applique des dimensions spécifiques avec contraintes.
   * @param element Element cible
   * @param dimensions Dimensions à appliquer
   */
  public static applyConstrainedDimensions(
    element: HTMLElement,
    dimensions: {
      width?: string;
      height?: string;
      minWidth?: string;
      minHeight?: string;
      maxWidth?: string;
      maxHeight?: string;
    }
  ): void {
    if (!element) return;

    this.saveSnapshot(element);

    Object.entries(dimensions).forEach(([prop, value]) => {
      if (value !== undefined) {
        (element.style as unknown as Record<string, string>)[prop] = value;
      }
    });
  }

  /**
   * Obtient les dimensions calculées d'un élément.
   * @param element Element à mesurer
   * @returns Dimensions calculées
   */
  public static getComputedDimensions(element: HTMLElement): {
    width: number;
    height: number;
    contentWidth: number;
    contentHeight: number;
  } {
    if (!element) {
      return { width: 0, height: 0, contentWidth: 0, contentHeight: 0 };
    }

    const computed = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height,
      contentWidth: parseFloat(computed.width),
      contentHeight: parseFloat(computed.height)
    };
  }

  /**
   * Calcule l'espace disponible dans un container.
   * @param container Element container
   * @returns Espace disponible
   */
  public static getAvailableSpace(container: HTMLElement): {
    width: number;
    height: number;
  } {
    if (!container) {
      return { width: 0, height: 0 };
    }

    const computed = getComputedStyle(container);
    const rect = container.getBoundingClientRect();

    const paddingX = parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight);
    const paddingY = parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom);

    return {
      width: rect.width - paddingX,
      height: rect.height - paddingY
    };
  }

  /**
   * Nettoie toutes les sauvegardes de dimensions.
   * Utile lors de la destruction de composants.
   */
  public static clearAllSnapshots(): void {
    // Les WeakMap se nettoient automatiquement, mais on peut forcer
    this.snapshots = new WeakMap<HTMLElement, DimensionSnapshot>();
  }

  /**
   * Assure qu'un élément respecte un ratio d'aspect donné.
   * @param element Element à contraindre
   * @param ratio Ratio largeur/hauteur (ex: 16/9)
   * @param basedOn Dimension de référence ('width' ou 'height')
   */
  public static maintainAspectRatio(
    element: HTMLElement,
    ratio: number,
    basedOn: 'width' | 'height' = 'width'
  ): void {
    if (!element || ratio <= 0) return;

    this.saveSnapshot(element);

    const computed = getComputedStyle(element);

    if (basedOn === 'width') {
      const width = parseFloat(computed.width);
      const height = width / ratio;
      element.style.height = `${height}px`;
    } else {
      const height = parseFloat(computed.height);
      const width = height * ratio;
      element.style.width = `${width}px`;
    }
  }
}