// src/layoutService.ts
import { Plugin } from "obsidian";
import { 
  LayoutModel, 
  LayoutRegistry,
  LayoutLoader as ILayoutLoader,
  PluginError
} from "./types";
import { LayoutLoader } from "./core/layout/layoutLoader";
import { LayoutFileRepo } from "./core/layout/layoutFileRepo";
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
  private readonly fileRepo: LayoutFileRepo;
  private readonly logger = createContextLogger('LayoutService');
  private isWatching = false;

  constructor(private readonly plugin: Plugin) {
    this.loader = new LayoutLoader(plugin);
    this.fileRepo = new LayoutFileRepo(plugin);
  }

  /**
   * Charge tous les modèles de layout depuis le fichier de configuration.
   * @returns Promise résolue quand le chargement est terminé
   */
  public async load(): Promise<void> {
    this.logger.info('Chargement des modèles de layout');
    this.models = await this.loader.loadLayouts();
    this.logger.info(`${this.models.size} modèle(s) chargé(s): ${Array.from(this.models.keys()).join(', ')}`);

    // Démarrer la surveillance des fichiers de layout personnalisés
    if (!this.isWatching) {
      await this.startFileWatching();
    }
  }

  /**
   * Démarre la surveillance des fichiers de layout pour le hot-reload
   */
  private async startFileWatching(): Promise<void> {
    try {
      await this.fileRepo.startWatching(async () => {
        this.logger.info('Changement détecté dans les fichiers de layout, rechargement...');
        await this.reload();
      });
      this.isWatching = true;
      this.logger.info('Surveillance des layouts personnalisés activée');
    } catch (error) {
      this.logger.error('Erreur lors du démarrage de la surveillance', error);
    }
  }


  /**
   * Notifie les composants que les layouts ont changé
   */
  private notifyLayoutsChanged(): void {
    // Émettre un événement custom pour informer les autres composants
    this.plugin.app.workspace.trigger('agile-board:layouts-changed');
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
   * Utile pour rafraîchir après modification des fichiers de layout.
   * @returns Promise résolue quand le rechargement est terminé
   */
  public async reload(): Promise<void> {
    try {
      this.logger.info('Rechargement des modèles de layout');
      this.models = await this.loader.loadLayouts();
      this.logger.info(`${this.models.size} modèle(s) rechargé(s): ${Array.from(this.models.keys()).join(', ')}`);
      
      // Notifier les autres services du changement si nécessaire
      this.notifyLayoutsChanged();
    } catch (error) {
      this.logger.error('Erreur lors du rechargement des layouts', error);
      ErrorHandler.handleError({
        type: 'INITIALIZATION_ERROR', // Utiliser le type existant
        component: 'LayoutService',
        details: error instanceof Error ? error.message : String(error)
      }, 'LayoutService.reload', {
        severity: ErrorSeverity.WARNING,
        userMessage: 'Erreur lors du rechargement des layouts'
      });
    }
  }

  /**
   * Nettoie les ressources utilisées par le service
   */
  public dispose(): void {
    if (this.isWatching) {
      this.fileRepo.dispose();
      this.isWatching = false;
      this.logger.info('Surveillance des layouts arrêtée');
    }
  }
}
