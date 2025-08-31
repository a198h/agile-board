// src/core/layout/layoutLoader.ts

import { Plugin, FileSystemAdapter } from "obsidian";
import * as fs from "fs/promises";
import * as path from "path";

import { 
  LayoutLoader as ILayoutLoader,
  LayoutRegistry,
  LayoutModel,
  RawLayoutData,
  Result,
  PluginError 
} from "../../types";
import { LayoutValidator } from "./layoutValidator";
import { LayoutFileRepo } from "./layoutFileRepo";
import { ErrorHandler, ErrorSeverity } from "../errorHandler";
import { createContextLogger } from "../logger";

/**
 * Service de chargement des modèles de layout depuis le système de fichiers.
 * Gère la lecture, le parsing et la validation des layouts.
 */
export class LayoutLoader implements ILayoutLoader {
  private readonly validator = new LayoutValidator();
  private readonly fileRepo = new LayoutFileRepo(this.plugin);
  private readonly logger = createContextLogger('LayoutLoader');

  constructor(private readonly plugin: Plugin) {}

  /**
   * Charge tous les modèles de layout depuis layout.json et les fichiers individuels.
   * @returns Registry des modèles valides ou erreur
   */
  public async loadLayouts(): Promise<LayoutRegistry> {
    const registry = new Map<string, LayoutModel>();

    // 1. Charger les layouts du fichier layout.json (anciens layouts)
    await this.loadLegacyLayouts(registry);

    // 2. Charger les nouveaux layouts depuis les fichiers individuels
    await this.loadIndividualLayouts(registry);

    this.logger.info(`${registry.size} modèles chargés: ${Array.from(registry.keys()).join(', ')}`);
    return registry as LayoutRegistry;
  }

  /**
   * Charge les layouts depuis l'ancien fichier layout.json (rétrocompatibilité)
   */
  private async loadLegacyLayouts(registry: LayoutRegistry): Promise<void> {
    const layoutPath = this.getLayoutFilePath();
    
    try {
      const rawData = await this.readLayoutFile(layoutPath);
      const parseResult = this.parseRawData(rawData);
      
      if (!parseResult.success) {
        this.logger.warn('Impossible de charger layout.json (peut être normal si migration effectuée)');
        return;
      }

      const validatedModels = this.validateAllModels(parseResult.data);
      
      // Ajouter au registry avec le préfixe "legacy_"
      validatedModels.forEach((model, name) => {
        (registry as Map<string, LayoutModel>).set(`legacy_${name}`, model);
      });
      
      this.logger.info(`${validatedModels.size} layouts legacy chargés`);
      
    } catch (error) {
      this.logger.warn('Fichier layout.json introuvable (peut être normal après migration)', error);
    }
  }

  /**
   * Charge les layouts depuis les fichiers individuels dans /layouts/
   */
  private async loadIndividualLayouts(registry: LayoutRegistry): Promise<void> {
    try {
      const layoutNames = await this.fileRepo.listLayouts();
      
      for (const name of layoutNames) {
        try {
          const layoutFile = await this.fileRepo.loadLayout(name);
          
          if (!layoutFile) continue;
          
          // Convertir le nouveau format vers l'ancien pour compatibilité (LayoutModel = readonly LayoutBlock[])
          const legacyModel: LayoutModel = layoutFile.boxes.map(box => ({
            title: box.title,
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h
          })) as LayoutModel;

          (registry as Map<string, LayoutModel>).set(layoutFile.name, legacyModel);
        } catch (error) {
          this.logger.warn(`Impossible de charger le layout "${name}"`, error);
        }
      }
      
      this.logger.info(`${layoutNames.length} layouts individuels traités`);
    } catch (error) {
      this.logger.warn('Erreur lors du chargement des layouts individuels', error);
    }
  }

  /**
   * Construit le chemin vers le fichier layout.json.
   * @returns Chemin absolu vers layout.json
   */
  private getLayoutFilePath(): string {
    const adapter = this.plugin.app.vault.adapter;
    
    if (!(adapter instanceof FileSystemAdapter)) {
      throw new Error("Le plugin nécessite un FileSystemAdapter");
    }

    const pluginId = this.plugin.manifest.id;
    const basePath = adapter.getBasePath();
    
    return path.join(basePath, ".obsidian", "plugins", pluginId, "layout.json");
  }

  /**
   * Lit le contenu du fichier layout.json.
   * @param layoutPath Chemin vers le fichier
   * @returns Contenu du fichier en string
   */
  private async readLayoutFile(layoutPath: string): Promise<string> {
    this.logger.debug(`Lecture de layout.json depuis: ${layoutPath}`);
    return await fs.readFile(layoutPath, "utf-8");
  }

  /**
   * Parse les données JSON brutes et valide la structure de base.
   * @param rawContent Contenu string du fichier JSON
   * @returns Résultat du parsing ou erreur
   */
  private parseRawData(rawContent: string): Result<RawLayoutData> {
    try {
      const parsed = JSON.parse(rawContent);

      if (!this.isValidRootStructure(parsed)) {
        return {
          success: false,
          error: {
            type: 'INVALID_LAYOUT_FORMAT',
            details: 'layout.json doit être un objet avec des modèles nommés'
          }
        };
      }

      return { success: true, data: parsed };
      
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'INVALID_LAYOUT_FORMAT',
          details: `JSON invalide: ${error}`
        }
      };
    }
  }

  /**
   * Vérifie que la structure racine du JSON est valide.
   * @param parsed Données parsées
   * @returns true si la structure est un objet non-array
   */
  private isValidRootStructure(parsed: unknown): parsed is RawLayoutData {
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  }

  /**
   * Valide tous les modèles et retourne seulement ceux qui sont valides.
   * @param rawData Données brutes du fichier
   * @returns Map des modèles valides
   */
  private validateAllModels(rawData: RawLayoutData): LayoutRegistry {
    const validModels = new Map<string, LayoutModel>();

    for (const [modelName, rawBlocks] of Object.entries(rawData)) {
      const validationResult = this.validateSingleModel(modelName, rawBlocks);
      
      if (validationResult.success) {
        validModels.set(modelName, validationResult.data);
      } else {
        ErrorHandler.handleError(validationResult.error, `LayoutLoader.validateModel(${modelName})`, {
          severity: ErrorSeverity.WARNING
        });
      }
    }

    return validModels;
  }

  /**
   * Valide un modèle individuel.
   * @param modelName Nom du modèle
   * @param rawBlocks Données brutes des blocs
   * @returns Résultat de validation
   */
  private validateSingleModel(
    modelName: string, 
    rawBlocks: unknown
  ): Result<LayoutModel> {
    if (!Array.isArray(rawBlocks)) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`Le modèle "${modelName}" doit être un tableau de blocs`]
        }
      };
    }

    const validation = this.validator.validateModel(modelName, rawBlocks);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: validation.errors
        }
      };
    }

    // À ce stade, tous les blocs sont valides
    const validBlocks = rawBlocks.filter(this.validator.validateBlock);
    
    return { 
      success: true, 
      data: validBlocks as LayoutModel 
    };
  }

}