// src/types.ts

import { TFile, Plugin, MarkdownView } from "obsidian";

/**
 * Configuration d'un bloc dans une grille de layout.
 * Utilise un système de grille 24x100.
 */
export interface LayoutBlock {
  readonly title: string;
  readonly x: number;  // Position colonne (0-23)
  readonly y: number;  // Position ligne (0-99)
  readonly w: number;  // Largeur en colonnes (1-24)
  readonly h: number;  // Hauteur en lignes (1-100)
}

/**
 * Collection de blocs formant un modèle de layout complet.
 */
export type LayoutModel = readonly LayoutBlock[];

/**
 * Registry de tous les modèles disponibles, indexés par nom.
 */
export type LayoutRegistry = ReadonlyMap<string, LayoutModel>;

/**
 * Données brutes des fichiers de layout avant validation.
 */
export type RawLayoutData = Record<string, unknown>;

/**
 * Information sur une section markdown extraite d'un fichier.
 */
export interface SectionInfo {
  readonly title: string;
  readonly start: number;     // Ligne de début (incluse)
  readonly end: number;       // Ligne de fin (exclue)
  readonly lines: readonly string[];  // Contenu de la section
}

/**
 * Collection de sections indexées par titre.
 */
export type SectionRegistry = Record<string, SectionInfo>;

/**
 * Résultat de validation d'un modèle de layout.
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Configuration d'erreur pour l'affichage utilisateur.
 */
export interface ErrorDisplayConfig {
  readonly missingTitles: readonly string[];
  readonly layoutBlocks: LayoutModel;
  readonly canAutoFix: boolean;
}

/**
 * État du détecteur de modèle pour un fichier.
 */
export interface FileDetectionState {
  readonly filePath: string;
  readonly lastProcessed: number;
  readonly isManuallyChanged: boolean;
  readonly modelName: string | null;
}

/**
 * Configuration du plugin au niveau global.
 */
export interface PluginConfig {
  readonly layoutPath: string;
  readonly gridColumns: number;  // 24
  readonly gridRows: number;     // 100
  readonly autoSwitchDelay: number; // ms
}

/**
 * Interface pour les services de chargement de layouts.
 */
export interface LayoutLoader {
  loadLayouts(): Promise<LayoutRegistry>;
}

/**
 * Interface pour la validation de layouts.
 */
export interface LayoutValidator {
  validateModel(name: string, blocks: readonly unknown[]): ValidationResult;
  validateBlock(block: unknown): block is LayoutBlock;
}

/**
 * Interface pour la détection de modèles dans les fichiers.
 */
export interface ModelDetector {
  onLoad(): void;
  onUnload(): void;
  markUserManualChange(filePath: string): void;
  resetManualChanges(): void;
}

/**
 * Interface pour le rendu de layouts.
 */
export interface LayoutRenderer {
  renderLayout(
    blocks: LayoutModel,
    view: MarkdownView,
    sections: SectionRegistry
  ): Promise<void>;
}

/**
 * Interface pour la synchronisation de contenu markdown.
 */
export interface ContentSynchronizer {
  updateSection(
    file: TFile,
    sectionTitle: string,
    newContent: string
  ): Promise<void>;
}

/**
 * Interface pour les opérations sur le système de fichiers.
 */
export interface FileSystemAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

/**
 * Type d'erreur spécifique au plugin.
 */
export type PluginError = 
  | { type: 'LAYOUT_NOT_FOUND'; layoutName: string; availableLayouts?: readonly string[] }
  | { type: 'INVALID_LAYOUT_FORMAT'; details: string; filePath?: string }
  | { type: 'FILE_SYSTEM_ERROR'; error: Error; filePath?: string; operation?: string }
  | { type: 'VALIDATION_ERROR'; errors: readonly string[]; modelName?: string }
  | { type: 'SECTION_MISSING'; sectionTitle: string; filePath?: string }
  | { type: 'PARSING_ERROR'; details: string; filePath?: string; lineNumber?: number }
  | { type: 'NETWORK_ERROR'; message: string; url?: string }
  | { type: 'PERMISSION_ERROR'; message: string; resource?: string }
  | { type: 'INITIALIZATION_ERROR'; component: string; details: string };

/**
 * Résultat d'une opération pouvant échouer.
 */
export type Result<T, E = PluginError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Configuration des constantes du plugin.
 */
export const PLUGIN_CONSTANTS = {
  GRID: {
    COLUMNS: 24,
    ROWS: 100
  },
  TIMING: {
    AUTO_SWITCH_DELAY: 100,
    FILE_REOPEN_THRESHOLD: 5000
  },
  CSS_CLASSES: {
    CONTAINER: 'agile-board-container',
    GRID: 'agile-board-grid',
    FRAME: 'agile-board-frame',
    ERROR: 'agile-board-error'
  }
} as const;

/**
 * Type helper pour extraire les clés d'un objet de manière type-safe.
 */
export type KeysOf<T> = keyof T;

/**
 * Type helper pour rendre toutes les propriétés optionnelles de manière récursive.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
