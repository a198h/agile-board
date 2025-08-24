// src/core/layout/layoutFileRepo.ts

import { Plugin, FileSystemAdapter, Notice } from "obsidian";
import * as fs from "fs/promises";
import * as path from "path";
import { createContextLogger } from "../logger";
import { ErrorHandler, ErrorSeverity } from "../errorHandler";

// Import synchronous fs for file watching
const fsSync = require('fs');

/**
 * Interface pour un layout selon le nouveau format 24x24
 */
export interface LayoutBox {
  readonly id: string;
  readonly title: string;
  readonly x: number;  // 0-23
  readonly y: number;  // 0-23  
  readonly w: number;  // 1-24
  readonly h: number;  // 1-24
}

/**
 * Structure complète d'un fichier de layout
 */
export interface LayoutFile {
  readonly name: string;
  readonly version: number;
  readonly boxes: readonly LayoutBox[];
}

/**
 * Service de gestion des fichiers de layout dans le dossier layouts/
 */
export class LayoutFileRepo {
  private readonly logger = createContextLogger('LayoutFileRepo');
  private readonly layoutsDir: string;
  private fileWatcher?: any;

  constructor(private readonly plugin: Plugin) {
    this.layoutsDir = this.getLayoutsDirectoryPath();
  }

  /**
   * Initialise le repository et crée le dossier si nécessaire
   */
  public async initialize(): Promise<void> {
    try {
      await this.ensureLayoutsDirectoryExists();
      this.logger.info('LayoutFileRepo initialisé');
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'LayoutFileRepo.initialize', {
        severity: ErrorSeverity.CRITICAL
      });
      throw error;
    }
  }

  /**
   * Liste tous les layouts disponibles
   */
  public async listLayouts(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.layoutsDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
    } catch (error) {
      this.logger.error('Erreur lors de la lecture du dossier layouts', error);
      return [];
    }
  }

  /**
   * Charge un layout spécifique
   */
  public async loadLayout(name: string): Promise<LayoutFile | null> {
    try {
      const filePath = this.getLayoutFilePath(name);
      const content = await fs.readFile(filePath, 'utf-8');
      const layout = JSON.parse(content) as LayoutFile;
      
      // Validation basique de structure
      if (!this.isValidLayoutFile(layout)) {
        this.logger.warn(`Layout invalide: ${name}`);
        return null;
      }

      return layout;
    } catch (error) {
      this.logger.error(`Erreur lors du chargement du layout ${name}`, error);
      return null;
    }
  }

  /**
   * Sauvegarde un layout
   */
  public async saveLayout(layout: LayoutFile): Promise<boolean> {
    try {
      if (!this.isValidLayoutFile(layout)) {
        throw new Error('Layout invalide');
      }

      const filePath = this.getLayoutFilePath(layout.name);
      const tempPath = filePath + '.tmp';
      
      // Écriture atomique: temp file -> rename
      const content = JSON.stringify(layout, null, 2);
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
      
      this.logger.info(`Layout sauvegardé: ${layout.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde du layout ${layout.name}`, error);
      ErrorHandler.handleError(error as Error, 'LayoutFileRepo.saveLayout', {
        severity: ErrorSeverity.ERROR,
        userMessage: `Impossible de sauvegarder le layout ${layout.name}`
      });
      return false;
    }
  }

  /**
   * Supprime un layout
   */
  public async deleteLayout(name: string): Promise<boolean> {
    try {
      const filePath = this.getLayoutFilePath(name);
      await fs.unlink(filePath);
      this.logger.info(`Layout supprimé: ${name}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression du layout ${name}`, error);
      return false;
    }
  }

  /**
   * Vérifie si un layout existe
   */
  public async layoutExists(name: string): Promise<boolean> {
    try {
      const filePath = this.getLayoutFilePath(name);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Génère un nom unique pour éviter les collisions
   */
  public async generateUniqueName(baseName: string): Promise<string> {
    let name = baseName;
    let counter = 1;
    
    while (await this.layoutExists(name)) {
      name = `${baseName}-${counter}`;
      counter++;
    }
    
    return name;
  }

  /**
   * Démarre la surveillance des changements de fichiers
   */
  public async startWatching(callback: () => void): Promise<void> {
    try {
      if (this.fileWatcher) {
        this.fileWatcher.close();
      }

      this.fileWatcher = fsSync.watch(this.layoutsDir, { persistent: false });
      
      // Throttle pour éviter les multiples événements
      let timeoutId: NodeJS.Timeout | null = null;
      
      this.fileWatcher.on('change', () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(callback, 200);
      });

      this.logger.info('Surveillance des fichiers layouts démarrée');
    } catch (error) {
      this.logger.error('Erreur lors du démarrage de la surveillance', error);
    }
  }

  /**
   * Arrête la surveillance des fichiers
   */
  public stopWatching(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
      this.logger.info('Surveillance des fichiers layouts arrêtée');
    }
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    this.stopWatching();
  }

  // Méthodes privées

  private getLayoutsDirectoryPath(): string {
    const adapter = this.plugin.app.vault.adapter;
    
    if (!(adapter instanceof FileSystemAdapter)) {
      throw new Error("Le plugin nécessite un FileSystemAdapter");
    }

    const pluginId = this.plugin.manifest.id;
    const basePath = adapter.getBasePath();
    
    return path.join(basePath, ".obsidian", "plugins", pluginId, "layouts");
  }

  private getLayoutFilePath(name: string): string {
    return path.join(this.layoutsDir, `${name}.json`);
  }

  private async ensureLayoutsDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.layoutsDir);
    } catch {
      // Le dossier n'existe pas, le créer
      await fs.mkdir(this.layoutsDir, { recursive: true });
      this.logger.info('Dossier layouts créé');
    }
  }

  private isValidLayoutFile(layout: unknown): layout is LayoutFile {
    if (typeof layout !== 'object' || layout === null) return false;
    
    const l = layout as any;
    
    return (
      typeof l.name === 'string' &&
      typeof l.version === 'number' &&
      Array.isArray(l.boxes) &&
      l.boxes.every((box: any) => this.isValidLayoutBox(box))
    );
  }

  private isValidLayoutBox(box: unknown): box is LayoutBox {
    if (typeof box !== 'object' || box === null) return false;
    
    const b = box as any;
    
    return (
      typeof b.id === 'string' &&
      typeof b.title === 'string' &&
      typeof b.x === 'number' &&
      typeof b.y === 'number' &&
      typeof b.w === 'number' &&
      typeof b.h === 'number' &&
      b.x >= 0 && b.x <= 23 &&
      b.y >= 0 && b.y <= 23 &&
      b.w >= 1 && b.w <= 24 &&
      b.h >= 1 && b.h <= 24 &&
      b.x + b.w <= 24 &&
      b.y + b.h <= 24
    );
  }
}