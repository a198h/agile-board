// src/types.ts

import { TFile, MarkdownView } from "obsidian";

/**
 * Configuration d'un bloc dans une grille de layout.
 * Utilise un système de grille 24x100 avec validation des contraintes.
 * 
 * @example
 * ```typescript
 * const block: LayoutBlock = {
 *   title: "Notes importantes",
 *   x: 0, y: 0, w: 12, h: 24
 * };
 * ```
 */
export interface LayoutBlock {
  /** Titre affiché dans l'en-tête du bloc */
  readonly title: string;
  /** Position horizontale dans la grille (0-23) */
  readonly x: number;
  /** Position verticale dans la grille (0-99) */
  readonly y: number;
  /** Largeur en colonnes (1-24) */
  readonly w: number;
  /** Hauteur en lignes (1-100) */
  readonly h: number;
}

/**
 * Collection immutable de blocs formant un modèle de layout complet.
 * Chaque modèle représente une configuration de grille prédéfinie.
 * 
 * @example
 * ```typescript
 * const eisenhowerModel: LayoutModel = [
 *   { title: "Urgent & Important", x: 0, y: 0, w: 12, h: 12 },
 *   { title: "Non Urgent & Important", x: 12, y: 0, w: 12, h: 12 }
 * ];
 * ```
 */
export type LayoutModel = readonly LayoutBlock[];

/**
 * Registry immuable de tous les modèles disponibles, indexés par nom.
 * Utilisé pour le chargement et la validation des layouts.
 * 
 * @example
 * ```typescript
 * const registry: LayoutRegistry = new Map([
 *   ['eisenhower', eisenhowerModel],
 *   ['swot', swotModel]
 * ]);
 * ```
 */
export type LayoutRegistry = ReadonlyMap<string, LayoutModel>;

/**
 * Données brutes des fichiers de layout avant validation.
 */
export type RawLayoutData = Record<string, unknown>;

/**
 * Informations immuables sur une section markdown extraite d'un fichier.
 * Contient les métadonnées de position et le contenu de la section.
 * 
 * @example
 * ```typescript
 * const section: SectionInfo = {
 *   title: "Introduction",
 *   start: 5, end: 12,
 *   lines: ["Contenu de la section", "Ligne suivante"]
 * };
 * ```
 */
export interface SectionInfo {
  /** Titre de la section (sans le préfixe #) */
  readonly title: string;
  /** Ligne de début dans le fichier (incluse) */
  readonly start: number;
  /** Ligne de fin dans le fichier (exclue) */
  readonly end: number;
  /** Contenu de la section, ligne par ligne */
  readonly lines: readonly string[];
}

/**
 * Registry de sections indexées par titre.
 * Structure optimisée pour la recherche rapide de sections par nom.
 * 
 * @example
 * ```typescript
 * const sections: SectionRegistry = {
 *   "Introduction": { title: "Introduction", start: 0, end: 5, lines: [...] },
 *   "Conclusion": { title: "Conclusion", start: 10, end: 15, lines: [...] }
 * };
 * ```
 */
export type SectionRegistry = Readonly<Record<string, SectionInfo>>;

/**
 * Résultat immuable de validation d'un modèle de layout.
 * Utilisé pour communiquer l'état de validation et les erreurs détaillées.
 * 
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   isValid: false,
 *   errors: ["Collision détectée entre les blocs A et B", "Bloc hors limites"]
 * };
 * ```
 */
export interface ValidationResult {
  /** Indique si la validation a réussi */
  readonly isValid: boolean;
  /** Liste des erreurs détectées (vide si isValid = true) */
  readonly errors: readonly string[];
}

/**
 * Configuration d'affichage des erreurs pour l'interface utilisateur.
 * Utilisée par le système de rendu pour afficher les problèmes de synchronisation.
 * 
 * @example
 * ```typescript
 * const errorConfig: ErrorDisplayConfig = {
 *   missingTitles: ["Introduction", "Conclusion"],
 *   layoutBlocks: eisenhowerModel,
 *   canAutoFix: true
 * };
 * ```
 */
export interface ErrorDisplayConfig {
  /** Titres de sections manquants dans le fichier markdown */
  readonly missingTitles: readonly string[];
  /** Modèle de layout concerné par l'erreur */
  readonly layoutBlocks: LayoutModel;
  /** Indique si une correction automatique est possible */
  readonly canAutoFix: boolean;
}

/**
 * État immutable du détecteur de modèle pour un fichier spécifique.
 * Utilisé pour gérer l'auto-switch et éviter les conflits avec les actions manuelles.
 * 
 * @example
 * ```typescript
 * const state: FileDetectionState = {
 *   filePath: "/vault/notes/project.md",
 *   lastProcessed: Date.now(),
 *   isManuallyChanged: false,
 *   modelName: "eisenhower"
 * };
 * ```
 */
export interface FileDetectionState {
  /** Chemin complet du fichier dans le vault */
  readonly filePath: string;
  /** Timestamp de la dernière analyse du fichier */
  readonly lastProcessed: number;
  /** Indique si l'utilisateur a changé la vue manuellement */
  readonly isManuallyChanged: boolean;
  /** Nom du modèle détecté dans le frontmatter (null si aucun) */
  readonly modelName: string | null;
}

/**
 * Configuration globale et immuable du plugin.
 * Définit les paramètres de fonctionnement et les contraintes du système.
 * 
 * @example
 * ```typescript
 * const config: PluginConfig = {
 *   layoutPath: "layouts/",
 *   gridColumns: 24,
 *   gridRows: 100,
 *   autoSwitchDelay: 150
 * };
 * ```
 */
export interface PluginConfig {
  /** Chemin vers le dossier contenant les fichiers de layout */
  readonly layoutPath: string;
  /** Nombre de colonnes dans la grille (fixé à 24) */
  readonly gridColumns: number;
  /** Nombre de lignes dans la grille (fixé à 100) */
  readonly gridRows: number;
  /** Délai en ms avant auto-switch pour stabiliser la vue */
  readonly autoSwitchDelay: number;
}

/**
 * Interface pour les services de chargement de layouts.
 * Contract pour l'implémentation de différentes sources de layouts (fichiers, API, etc.).
 * 
 * @example
 * ```typescript
 * class FileLayoutLoader implements LayoutLoader {
 *   async loadLayouts(): Promise<LayoutRegistry> {
 *     // implémentation
 *   }
 * }
 * ```
 */
export interface LayoutLoader {
  /**
   * Charge tous les layouts disponibles depuis la source configurée.
   * @returns Promise résolue avec la registry des layouts validés
   * @throws {PluginError} En cas d'erreur de chargement ou de validation
   */
  loadLayouts(): Promise<LayoutRegistry>;
}

/**
 * Interface pour la validation stricte de layouts.
 * Contract pour l'implémentation de validateurs avec différentes règles.
 * 
 * @example
 * ```typescript
 * class StrictLayoutValidator implements LayoutValidator {
 *   validateModel(name: string, blocks: readonly unknown[]): ValidationResult {
 *     // implémentation avec vérification de collisions
 *   }
 * }
 * ```
 */
export interface LayoutValidator {
  /**
   * Valide un modèle complet avec vérification de cohérence.
   * @param name Nom du modèle pour le contexte d'erreur
   * @param blocks Blocs à valider (typés unknown pour la sécurité)
   * @returns Résultat de validation avec erreurs détaillées
   */
  validateModel(name: string, blocks: readonly unknown[]): ValidationResult;
  
  /**
   * Vérifie qu'un objet correspond à un LayoutBlock valide.
   * @param block Objet à valider
   * @returns Type guard confirmant la validité
   */
  validateBlock(block: unknown): block is LayoutBlock;
}

/**
 * Interface pour la détection automatique de modèles dans les fichiers.
 * Contract pour l'implémentation du système d'auto-switch basé sur le frontmatter.
 * 
 * @example
 * ```typescript
 * class AutoModelDetector implements ModelDetector {
 *   onLoad(): void {
 *     // Démarrer la surveillance des fichiers
 *   }
 * }
 * ```
 */
export interface ModelDetector {
  /**
   * Initialise le détecteur et ses event listeners.
   * Doit être appelé lors de l'activation du plugin.
   */
  onLoad(): void;
  
  /**
   * Nettoie les ressources et arrête la surveillance.
   * Doit être appelé lors de la désactivation du plugin.
   */
  onUnload(): void;
  
  /**
   * Marque qu'un changement manuel a été effectué par l'utilisateur.
   * Empêche l'auto-switch pour ce fichier jusqu'à réinitialisation.
   * @param filePath Chemin du fichier concerné
   */
  markUserManualChange(filePath: string): void;
  
  /**
   * Remet à zéro l'historique des changements manuels.
   * Réactive l'auto-switch pour tous les fichiers.
   */
  resetManualChanges(): void;
}

/**
 * Interface pour le rendu visuel des layouts en mode Live Preview.
 * Contract pour l'implémentation de différents moteurs de rendu (DOM, Canvas, etc.).
 * 
 * @example
 * ```typescript
 * class DOMLayoutRenderer implements LayoutRenderer {
 *   async renderLayout(blocks: LayoutModel, view: MarkdownView, sections: SectionRegistry): Promise<void> {
 *     // Générer la grille DOM avec les composants d'édition
 *   }
 * }
 * ```
 */
export interface LayoutRenderer {
  /**
   * Effectue le rendu complet d'un layout dans une vue Markdown.
   * @param blocks Modèle de layout à rendre
   * @param view Vue Markdown cible pour le rendu
   * @param sections Registry des sections disponibles dans le fichier
   * @throws {PluginError} En cas d'erreur de rendu ou de vue incompatible
   */
  renderLayout(
    blocks: LayoutModel,
    view: MarkdownView,
    sections: SectionRegistry
  ): Promise<void>;
}

/**
 * Interface pour la synchronisation bidirectionnelle de contenu markdown.
 * Contract pour l'implémentation de systèmes de synchronisation temps réel.
 * 
 * @example
 * ```typescript
 * class RealtimeContentSynchronizer implements ContentSynchronizer {
 *   async updateSection(file: TFile, sectionTitle: string, newContent: string): Promise<void> {
 *     // Synchroniser les changements avec débouncing
 *   }
 * }
 * ```
 */
export interface ContentSynchronizer {
  /**
   * Met à jour le contenu d'une section spécifique dans le fichier.
   * @param file Fichier Obsidian à modifier
   * @param sectionTitle Titre de la section à mettre à jour
   * @param newContent Nouveau contenu de la section
   * @throws {PluginError} En cas d'erreur de synchronisation ou de fichier introuvable
   */
  updateSection(
    file: TFile,
    sectionTitle: string,
    newContent: string
  ): Promise<void>;
}

/**
 * Interface d'abstraction pour les opérations sur le système de fichiers.
 * Permet la testabilité et la portabilité entre différents environnements.
 * 
 * @example
 * ```typescript
 * class ObsidianFileSystemAdapter implements FileSystemAdapter {
 *   async readFile(path: string): Promise<string> {
 *     return this.vault.adapter.read(path);
 *   }
 * }
 * ```
 */
export interface FileSystemAdapter {
  /**
   * Lit le contenu complet d'un fichier.
   * @param path Chemin relatif du fichier dans le vault
   * @returns Contenu du fichier en UTF-8
   * @throws {PluginError} En cas d'erreur de lecture ou fichier inexistant
   */
  readFile(path: string): Promise<string>;
  
  /**
   * Écrit du contenu dans un fichier (création ou remplacement).
   * @param path Chemin relatif du fichier dans le vault
   * @param content Contenu à écrire en UTF-8
   * @throws {PluginError} En cas d'erreur d'écriture ou de permissions
   */
  writeFile(path: string, content: string): Promise<void>;
  
  /**
   * Vérifie l'existence d'un fichier ou dossier.
   * @param path Chemin relatif à vérifier
   * @returns true si le chemin existe, false sinon
   */
  exists(path: string): Promise<boolean>;
}

/**
 * Union type exhaustive des erreurs spécifiques au plugin.
 * Chaque erreur contient des informations contextuelles pour le débogage.
 * 
 * @example
 * ```typescript
 * const error: PluginError = {
 *   type: 'LAYOUT_NOT_FOUND',
 *   layoutName: 'kanban',
 *   availableLayouts: ['eisenhower', 'swot']
 * };
 * ```
 */
export type PluginError = 
  | { 
    /** Layout demandé introuvable dans la registry */
    type: 'LAYOUT_NOT_FOUND';
    /** Nom du layout recherché */
    layoutName: string;
    /** Liste des layouts disponibles pour suggestion */
    availableLayouts?: readonly string[];
  }
  | {
    /** Format de fichier layout invalide ou corrompu */
    type: 'INVALID_LAYOUT_FORMAT';
    /** Description détaillée de l'erreur de format */
    details: string;
    /** Chemin du fichier concerné (optionnel) */
    filePath?: string;
  }
  | {
    /** Erreur d'accès au système de fichiers */
    type: 'FILE_SYSTEM_ERROR';
    /** Erreur originale du système */
    error: Error;
    /** Fichier concerné (optionnel) */
    filePath?: string;
    /** Opération en cours lors de l'erreur */
    operation?: string;
  }
  | {
    /** Erreur de validation de modèle ou de données */
    type: 'VALIDATION_ERROR';
    /** Liste des erreurs de validation détectées */
    errors: readonly string[];
    /** Nom du modèle concerné (optionnel) */
    modelName?: string;
  }
  | {
    /** Section requise manquante dans le fichier markdown */
    type: 'SECTION_MISSING';
    /** Titre de la section manquante */
    sectionTitle: string;
    /** Fichier concerné (optionnel) */
    filePath?: string;
  }
  | {
    /** Erreur de parsing de contenu markdown */
    type: 'PARSING_ERROR';
    /** Description de l'erreur de parsing */
    details: string;
    /** Fichier concerné (optionnel) */
    filePath?: string;
    /** Numéro de ligne où l'erreur s'est produite (optionnel) */
    lineNumber?: number;
  }
  | {
    /** Erreur de réseau ou de communication */
    type: 'NETWORK_ERROR';
    /** Message d'erreur descriptif */
    message: string;
    /** URL concernée (optionnel) */
    url?: string;
  }
  | {
    /** Erreur de permissions ou d'accès */
    type: 'PERMISSION_ERROR';
    /** Message décrivant le problème de permission */
    message: string;
    /** Ressource concernée (optionnel) */
    resource?: string;
  }
  | {
    /** Erreur lors de l'initialisation d'un composant */
    type: 'INITIALIZATION_ERROR';
    /** Nom du composant qui a échoué */
    component: string;
    /** Détails de l'erreur d'initialisation */
    details: string;
  };

/**
 * Type Result pour la gestion fonctionnelle des erreurs sans exceptions.
 * Inspire des langages fonctionnels pour une gestion d'erreur explicite.
 * 
 * @template T Type des données en cas de succès
 * @template E Type d'erreur (par défaut PluginError)
 * 
 * @example
 * ```typescript
 * function parseLayout(data: unknown): Result<LayoutModel> {
 *   if (isValid(data)) {
 *     return { success: true, data: validatedLayout };
 *   }
 *   return { success: false, error: { type: 'VALIDATION_ERROR', errors: [...] } };
 * }
 * ```
 */
export type Result<T, E = PluginError> = 
  | { 
    /** Opération réussie */
    success: true;
    /** Données résultantes */
    data: T;
  }
  | { 
    /** Opération échouée */
    success: false;
    /** Détails de l'erreur */
    error: E;
  };

/**
 * Configuration immuable des constantes globales du plugin.
 * Toutes les valeurs sont figées pour garantir la cohérence du système.
 * 
 * @example
 * ```typescript
 * // Utilisation type-safe des constantes
 * const columnCount = PLUGIN_CONSTANTS.GRID.COLUMNS; // Type: 24
 * const containerClass = PLUGIN_CONSTANTS.CSS_CLASSES.CONTAINER; // Type: "agile-board-container"
 * ```
 */
export const PLUGIN_CONSTANTS = {
  /** Configuration de la grille de layout */
  GRID: {
    /** Nombre de colonnes fixes dans la grille */
    COLUMNS: 24,
    /** Nombre de lignes fixes dans la grille */
    ROWS: 100
  },
  /** Temporisations et seuils temporels */
  TIMING: {
    /** Délai avant auto-switch en millisecondes */
    AUTO_SWITCH_DELAY: 100,
    /** Seuil de réouverture de fichier pour reset manuel (ms) */
    FILE_REOPEN_THRESHOLD: 5000
  },
  /** Classes CSS utilisées par le plugin */
  CSS_CLASSES: {
    /** Container principal du rendu */
    CONTAINER: 'agile-board-container',
    /** Grille des blocs de layout */
    GRID: 'agile-board-grid',
    /** Bloc individuel éditable */
    FRAME: 'agile-board-frame',
    /** Overlay d'erreur */
    ERROR: 'agile-board-error'
  }
} as const;

// === Plugin Settings ===

/**
 * Paramètres persistants du plugin, sauvegardés via Obsidian loadData/saveData.
 * Structure immutable pour la configuration utilisateur.
 */
export interface PluginSettings {
  /** Facteur d'échelle de la taille de police des cadres (0.8 - 1.5) */
  readonly frameFontScale: number;
  /** Cadres verrouillés par fichier: { filePath: [sectionTitle1, sectionTitle2] } */
  readonly lockedFrames: Readonly<Record<string, readonly string[]>>;
}

/**
 * Valeurs par défaut pour les paramètres du plugin.
 */
export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
  frameFontScale: 1.0,
  lockedFrames: {}
};

// === Type Utilities ===

/**
 * Utilitaire type-safe pour extraire les clés d'un objet.
 * @template T Type de l'objet dont on veut les clés
 * @example
 * ```typescript
 * type ConfigKeys = KeysOf<PluginConfig>; // "layoutPath" | "gridColumns" | ...
 * ```
 */
export type KeysOf<T> = keyof T;

/**
 * Utilitaire pour rendre toutes les propriétés optionnelles récursivement.
 * Utile pour les configurations partielles et les mises à jour.
 * @template T Type à rendre partiellement optionnel
 * @example
 * ```typescript
 * type PartialConfig = DeepPartial<PluginConfig>;
 * // Toutes les propriétés deviennent optionnelles
 * ```
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Utilitaire pour extraire les valeurs littérales d'un objet const.
 * @template T Type de l'objet const
 * @example
 * ```typescript
 * type CssClass = ValuesOf<typeof PLUGIN_CONSTANTS.CSS_CLASSES>;
 * // "agile-board-container" | "agile-board-grid" | ...
 * ```
 */
export type ValuesOf<T> = T[keyof T];

/**
 * Utilitaire pour créer un type strict avec validation.
 * @template T Type de base
 * @template K Contrainte sur les clés
 * @example
 * ```typescript
 * type StrictSectionRegistry = Strict<SectionRegistry, string>;
 * ```
 */
export type Strict<T, K extends keyof T> = {
  [P in K]-?: T[P];
} & {
  [P in Exclude<keyof T, K>]?: T[P];
};
