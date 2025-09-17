// src/core/layout/layoutFileRepo.ts

import { Plugin, FileSystemAdapter, Notice } from "obsidian";
import * as fs from "fs/promises";
import * as path from "path";
import { createContextLogger } from "../logger";
import { TIMING_CONSTANTS, GRID_CONSTANTS, FILE_CONSTANTS } from "../constants";
import { ErrorHandler, ErrorSeverity } from "../errorHandler";

// Import synchronous fs for file watching
const fsSync = require('fs');

/**
 * Interface pour un layout selon le nouveau format de grille
 */
export interface LayoutBox {
  readonly id: string;
  readonly title: string;
  readonly x: number;  // 0-${GRID_CONSTANTS.MAX_INDEX}
  readonly y: number;  // 0-${GRID_CONSTANTS.MAX_INDEX}  
  readonly w: number;  // ${GRID_CONSTANTS.MIN_SIZE}-${GRID_CONSTANTS.SIZE}
  readonly h: number;  // ${GRID_CONSTANTS.MIN_SIZE}-${GRID_CONSTANTS.SIZE}
}

/**
 * Structure complète d'un fichier de layout
 */
export interface LayoutFile {
  readonly name: string;
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
      await this.createBundledLayoutFiles();
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
        .filter(file => file.endsWith(FILE_CONSTANTS.FILE_EXTENSION))
        .map(file => path.basename(file, FILE_CONSTANTS.FILE_EXTENSION));
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
      // Chercher le fichier correspondant (avec ou sans espaces)
      const filePath = await this.findLayoutFile(name);
      if (!filePath) {
        // Fichier introuvable - normal si layout n'existe pas
        return null;
      }
      
      const content = await fs.readFile(filePath, 'utf-8');
      const layout = JSON.parse(content) as LayoutFile;
      
      // Validation basique de structure
      if (!this.isValidLayoutFile(layout)) {
        // Layout invalide - skip silencieusement
        return null;
      }

      return layout;
    } catch (error) {
      this.logger.error(`Erreur lors du chargement du tableau ${name}`, error);
      return null;
    }
  }

  /**
   * Sauvegarde un layout
   */
  public async saveLayout(layout: LayoutFile): Promise<boolean> {
    try {
      if (!this.isValidLayoutFile(layout)) {
        throw new Error('Tableau invalide');
      }

      const filePath = this.getLayoutFilePath(layout.name);
      const tempPath = filePath + '.tmp';
      
      // Écriture atomique: temp file -> rename
      const content = JSON.stringify(layout, null, 2);
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
      
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde du tableau ${layout.name}`, error);
      ErrorHandler.handleError(error as Error, 'LayoutFileRepo.saveLayout', {
        severity: ErrorSeverity.ERROR,
        userMessage: `Impossible de sauvegarder le tableau ${layout.name}`
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
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression du tableau ${name}`, error);
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
        timeoutId = setTimeout(callback, TIMING_CONSTANTS.FILE_OPERATION_DELAY_MS);
      });

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
    }
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    this.stopWatching();
  }

  // Méthodes privées

  /**
   * Crée les fichiers de layouts intégrés s'ils n'existent pas déjà
   */
  private async createBundledLayoutFiles(): Promise<void> {
    // Import des layouts intégrés (importés statiquement dans layoutLoader.ts)
    const eisenhowerData = await import("../../layouts/eisenhower.json");
    const swotData = await import("../../layouts/swot.json");
    const moscowData = await import("../../layouts/moscow.json");
    const effortImpactData = await import("../../layouts/effort_impact.json");
    const cornellData = await import("../../layouts/cornell.json");

    const bundledLayouts = [
      { name: 'eisenhower', data: eisenhowerData.default },
      { name: 'swot', data: swotData.default },
      { name: 'moscow', data: moscowData.default },
      { name: 'effort_impact', data: effortImpactData.default },
      { name: 'cornell', data: cornellData.default }
    ];

    for (const layout of bundledLayouts) {
      const filePath = this.getLayoutFilePath(layout.name);
      
      try {
        // Vérifier si le fichier existe déjà
        await fs.access(filePath);
        // Le fichier existe, ne pas l'écraser
        continue;
      } catch {
        // Le fichier n'existe pas, le créer
      }

      try {
        // Convertir vers le nouveau format LayoutFile
        const layoutFile: LayoutFile = {
          name: layout.name,
          boxes: layout.data.boxes.map((box: any, index: number) => ({
            id: `box-${index}`,
            title: box.title,
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h
          }))
        };

        // Écrire le fichier
        const content = JSON.stringify(layoutFile, null, 2);
        await fs.writeFile(filePath, content, 'utf-8');
        // Layout créé silencieusement

      } catch (error) {
        // Erreur silencieuse - layout existe peut-être déjà
      }
    }
  }

  private getLayoutsDirectoryPath(): string {
    const adapter = this.plugin.app.vault.adapter;
    
    if (!(adapter instanceof FileSystemAdapter)) {
      throw new Error("Le plugin nécessite un FileSystemAdapter");
    }

    const pluginId = this.plugin.manifest.id;
    const basePath = adapter.getBasePath();
    
    return path.join(basePath, ".obsidian", "plugins", pluginId, FILE_CONSTANTS.LAYOUTS_DIR);
  }

  private async findLayoutFile(name: string): Promise<string | null> {
    try {
      // D'abord essayer le nom exact
      const exactPath = path.join(this.layoutsDir, `${name}.json`);
      try {
        await fs.access(exactPath);
        return exactPath;
      } catch {
        // Le fichier avec le nom exact n'existe pas
      }
      
      // Lister tous les fichiers et chercher par le contenu JSON
      const files = await fs.readdir(this.layoutsDir);
      for (const file of files) {
        if (!file.endsWith(FILE_CONSTANTS.FILE_EXTENSION)) continue;
        
        try {
          const filePath = path.join(this.layoutsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const layout = JSON.parse(content) as LayoutFile;
          
          // Correspondance par le nom dans le JSON
          if (layout.name === name) {
            return filePath;
          }
        } catch {
          // Ignorer les fichiers JSON invalides
          continue;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche du tableau ${name}`, error);
      return null;
    }
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
      // Dossier créé silencieusement
    }
  }

  private isValidLayoutFile(layout: unknown): layout is LayoutFile {
    if (typeof layout !== 'object' || layout === null) return false;
    
    const l = layout as any;
    
    return (
      typeof l.name === 'string' &&
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