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
  private models: LayoutRegistry | null = null;
  private readonly loader: ILayoutLoader;
  private readonly fileRepo: LayoutFileRepo;
  private readonly logger = createContextLogger('LayoutService');
  private isWatching = false;
  private hasActiveLayouts = false;

  constructor(private readonly plugin: Plugin) {
    this.loader = new LayoutLoader(plugin);
    this.fileRepo = new LayoutFileRepo(plugin);
  }

  /**
   * Charge tous les modèles de layout depuis le fichier de configuration.
   * @returns Promise résolue quand le chargement est terminé
   */
  public async load(): Promise<void> {
    // Chargement lazy - seulement si nécessaire
    if (this.models === null) {
      this.models = await this.loader.loadLayouts();
    }

    // Démarrer la surveillance seulement si des layouts sont actifs
    await this.startFileWatchingIfNeeded();
  }

  /**
   * Démarre la surveillance des fichiers de layout pour le hot-reload
   */
  private async startFileWatching(): Promise<void> {
    try {
      await this.fileRepo.startWatching(async () => {
        await this.reload();
      });
      this.isWatching = true;
    } catch (error) {
      this.logger.error('Erreur lors du démarrage de la surveillance', error);
    }
  }

  /**
   * Démarre la surveillance conditionnelle des fichiers
   */
  private async startFileWatchingIfNeeded(): Promise<void> {
    if (this.hasActiveLayouts && !this.isWatching) {
      await this.startFileWatching();
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
  public async getModel(name: string): Promise<LayoutModel | undefined> {
    const validation = ValidationUtils.validateLayoutModelName(name);
    if (!validation.isValid) {
      ErrorHandler.handleError(validation.error!, 'LayoutService.getModel', {
        severity: ErrorSeverity.WARNING,
        userMessage: `Nom de modèle invalide: ${name}`
      });
      return undefined;
    }

    // Chargement lazy des layouts
    await this.ensureLayoutsLoaded();
    
    // Marquer qu'on a un layout actif
    this.hasActiveLayouts = true;
    await this.startFileWatchingIfNeeded();

    const model = this.models!.get(name);
    if (!model) {
      const availableLayouts = Array.from(this.models!.keys());
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
  public async getAllModelNames(): Promise<readonly string[]> {
    await this.ensureLayoutsLoaded();
    return Array.from(this.models!.keys());
  }

  /**
   * Vérifie si un modèle existe avec validation du nom.
   * @param name Nom du modèle à vérifier
   * @returns true si le modèle existe
   */
  public async hasModel(name: string): Promise<boolean> {
    const validation = ValidationUtils.validateLayoutModelName(name);
    if (!validation.isValid) {
      return false;
    }
    await this.ensureLayoutsLoaded();
    return this.models!.has(name);
  }

  /**
   * Récupère le nombre total de modèles chargés.
   * @returns Nombre de modèles disponibles
   */
  public async getModelCount(): Promise<number> {
    await this.ensureLayoutsLoaded();
    return this.models!.size;
  }

  /**
   * S'assure que les layouts sont chargés
   */
  private async ensureLayoutsLoaded(): Promise<void> {
    if (this.models === null) {
      this.models = await this.loader.loadLayouts();
    }
  }

  /**
   * Recharge tous les modèles depuis le fichier.
   * Utile pour rafraîchir après modification des fichiers de layout.
   * @returns Promise résolue quand le rechargement est terminé
   */
  public async reload(): Promise<void> {
    try {
      this.models = await this.loader.loadLayouts();
      
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
    }
  }
}
