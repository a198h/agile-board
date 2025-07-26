// src/layoutService.ts
import { Plugin } from "obsidian";
import { 
  LayoutModel, 
  LayoutRegistry,
  LayoutLoader as ILayoutLoader,
  PluginError
} from "./types";
import { LayoutLoader } from "./core/layout/layoutLoader";
import { ErrorHandler, ErrorSeverity } from "./core/errorHandler";
import { ValidationUtils } from "./core/validation";
import { createContextLogger } from "./core/logger";

/**
 * Service principal de gestion des modèles de layout.
 * Orchestrateur qui délègue le chargement et la validation aux services spécialisés.
 */
export class LayoutService {
  private models: LayoutRegistry = new Map();
  private readonly loader: ILayoutLoader;
  private readonly logger = createContextLogger('LayoutService');

  constructor(private readonly plugin: Plugin) {
    this.loader = new LayoutLoader(plugin);
  }

  /**
   * Charge tous les modèles de layout depuis le fichier de configuration.
   * @returns Promise résolue quand le chargement est terminé
   */
  public async load(): Promise<void> {
    this.logger.info('Chargement des modèles de layout');
    this.models = await this.loader.loadLayouts();
    this.logger.info(`${this.models.size} modèle(s) chargé(s): ${Array.from(this.models.keys()).join(', ')}`);
  }

  /**
   * Récupère un modèle par son nom avec validation.
   * @param name Nom du modèle recherché
   * @returns Modèle trouvé ou undefined
   */
  public getModel(name: string): LayoutModel | undefined {
    const validation = ValidationUtils.validateLayoutModelName(name);
    if (!validation.isValid) {
      ErrorHandler.handleError(validation.error!, 'LayoutService.getModel', {
        severity: ErrorSeverity.WARNING,
        userMessage: `Nom de modèle invalide: ${name}`
      });
      return undefined;
    }

    const model = this.models.get(name);
    if (!model) {
      const availableLayouts = Array.from(this.models.keys());
      const notFoundError: PluginError = {
        type: 'LAYOUT_NOT_FOUND',
        layoutName: name,
        availableLayouts
      };
      ErrorHandler.handleError(notFoundError, 'LayoutService.getModel', {
        severity: ErrorSeverity.WARNING
      });
    }

    return model;
  }

  /**
   * Récupère tous les noms de modèles disponibles.
   * @returns Liste des noms de modèles
   */
  public getAllModelNames(): readonly string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Vérifie si un modèle existe avec validation du nom.
   * @param name Nom du modèle à vérifier
   * @returns true si le modèle existe
   */
  public hasModel(name: string): boolean {
    const validation = ValidationUtils.validateLayoutModelName(name);
    if (!validation.isValid) {
      return false;
    }
    return this.models.has(name);
  }

  /**
   * Récupère le nombre total de modèles chargés.
   * @returns Nombre de modèles disponibles
   */
  public getModelCount(): number {
    return this.models.size;
  }

  /**
   * Recharge tous les modèles depuis le fichier.
   * Utile pour rafraîchir après modification du fichier layout.json.
   * @returns Promise résolue quand le rechargement est terminé
   */
  public async reload(): Promise<void> {
    this.logger.info('Rechargement des modèles de layout');
    await this.load();
  }
}
