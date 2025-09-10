// src/core/layout/layoutLoader.ts

import { Plugin } from "obsidian";

import { 
  LayoutLoader as ILayoutLoader,
  LayoutRegistry,
  LayoutModel
} from "../../types";
import { LayoutFileRepo } from "./layoutFileRepo";
import { createContextLogger } from "../logger";

/**
 * Service de chargement des modèles de layout depuis le système de fichiers.
 * Charge uniquement les layouts depuis les fichiers individuels dans /layouts/.
 */
export class LayoutLoader implements ILayoutLoader {
  private readonly fileRepo = new LayoutFileRepo(this.plugin);
  private readonly logger = createContextLogger('LayoutLoader');

  constructor(private readonly plugin: Plugin) {}

  /**
   * Charge tous les modèles de layout depuis les fichiers individuels.
   * @returns Registry des modèles valides ou erreur
   */
  public async loadLayouts(): Promise<LayoutRegistry> {
    const registry = new Map<string, LayoutModel>();

    // Charger les layouts depuis les fichiers individuels
    await this.loadIndividualLayouts(registry);

    return registry as LayoutRegistry;
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
      
    } catch (error) {
      this.logger.warn('Erreur lors du chargement des layouts individuels', error);
    }
  }


}