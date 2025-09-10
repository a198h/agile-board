// src/layoutService.ts
import { Plugin } from "obsidian";
import { 
  LayoutModel, 
  LayoutRegistry,
  LayoutLoader as ILayoutLoader,
  PluginError,
  Result
} from "./types";
import { LayoutLoader } from "./core/layout/layoutLoader";
import { LayoutFileRepo } from "./core/layout/layoutFileRepo";
import { ErrorHandler, ErrorSeverity } from "./core/errorHandler";
import { ValidationUtils } from "./core/validation";
import { createContextLogger } from "./core/logger";

/**
 * Service principal de gestion des modèles de layout.
 * Orchestrateur pur qui délègue le chargement et la validation aux services spécialisés.
 * Sépare complètement la logique métier du DOM et des effets de bord.
 * 
 * @example
 * ```typescript
 * const layoutService = new LayoutService(plugin);
 * await layoutService.load();
 * const model = layoutService.getModel('eisenhower');
 * ```
 */
export class LayoutService {
  private models: Map<string, LayoutModel> = new Map();
  private readonly loader: ILayoutLoader;
  private readonly fileRepo: LayoutFileRepo;
  private readonly logger = createContextLogger('LayoutService');
  private isWatching = false;
  private readonly eventListeners = new Set<() => void>();

  constructor(private readonly plugin: Plugin) {
    this.loader = new LayoutLoader(plugin);
    this.fileRepo = new LayoutFileRepo(plugin);
  }

  /**
   * Charge tous les modèles de layout depuis le fichier de configuration.
   * Opération idempotente qui peut être appelée plusieurs fois sans effet de bord.
   * @returns Promise résolue quand le chargement est terminé
   * @throws {PluginError} En cas d'erreur de chargement ou de validation
   */
  public async load(): Promise<void> {
    this.models = await this.loader.loadLayouts();
    this.logger.info(`${this.models.size} layout(s) chargé(s)`);

      // Démarrer la surveillance des fichiers de layout personnalisés
      if (!this.isWatching) {
        await this.startFileWatching();
      }
    } catch (error) {
      this.logger.error('Erreur lors du chargement des layouts', error);
      throw error;
    }
  }

  /**
   * Version fonctionnelle du chargement qui retourne un Result.
   * Permet une gestion d'erreur explicite sans exception.
   * @returns Result contenant les modèles chargés ou l'erreur
   */
  public async loadWithResult(): Promise<Result<LayoutRegistry>> {
    try {
      const models = await this.loader.loadLayouts();
      return { success: true, data: models };
    } catch (error) {
      const pluginError: PluginError = error instanceof Error
        ? {
            type: 'INITIALIZATION_ERROR',
            component: 'LayoutService',
            details: error.message
          }
        : {
            type: 'INITIALIZATION_ERROR',
            component: 'LayoutService',
            details: String(error)
          };
      
      return { success: false, error: pluginError };
    }
  }

  /**
   * Démarre la surveillance des fichiers de layout pour le hot-reload.
   * Fonction pure qui configure la surveillance sans effet de bord direct.
   * @returns Promise résolue quand la surveillance est activée
   * @throws {PluginError} En cas d'erreur de configuration de la surveillance
   */
  private async startFileWatching(): Promise<void> {
    if (this.isWatching) {
      this.logger.debug('Surveillance déjà active, ignore la demande');
      return;
    }

    try {
      const changeHandler = this.createFileChangeHandler();
      await this.fileRepo.startWatching(changeHandler);
      this.isWatching = true;
    } catch (error) {
      this.logger.error('Erreur lors du démarrage de la surveillance', error);
      const pluginError: PluginError = {
        type: 'INITIALIZATION_ERROR',
        component: 'LayoutService.fileWatching',
        details: error instanceof Error ? error.message : String(error)
      };
      throw pluginError;
    }
  }

  /**
   * Crée un gestionnaire de changement de fichier pur.
   * Factory method qui retourne une fonction de callback.
   * @returns Fonction de callback pour les changements de fichiers
   */
  private createFileChangeHandler(): () => Promise<void> {
    return async () => {
      this.logger.info('Changement détecté dans les fichiers de layout, rechargement...');
      try {
        await this.reload();
        this.notifyLayoutsChanged();
      } catch (error) {
        this.logger.error('Erreur lors du rechargement automatique', error);
        ErrorHandler.handleError(
          {
            type: 'FILE_SYSTEM_ERROR',
            error: error instanceof Error ? error : new Error(String(error)),
            operation: 'hot-reload'
          },
          'LayoutService.fileChangeHandler',
          { severity: ErrorSeverity.WARNING }
        );
      }
    };
  }


  /**
   * Notifie les composants que les layouts ont changé.
   * Fonction pure qui déclenche les callbacks enregistrés sans effet de bord direct.
   * @param layoutNames Liste optionnelle des layouts qui ont changé
   */
  private notifyLayoutsChanged(layoutNames?: readonly string[]): void {
    const eventData = {
      type: 'layouts-changed' as const,
      layoutNames: layoutNames ?? Array.from(this.models.keys()),
      timestamp: Date.now()
    };

    // Événement Obsidian pour compatibilité
    this.plugin.app.workspace.trigger('agile-board:layouts-changed', eventData);

    // Callbacks internes pour découplage
    this.eventListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        this.logger.error('Erreur dans un callback de changement de layout', error);
      }
    });

    this.logger.debug(`Notification envoyée pour ${eventData.layoutNames.length} layout(s)`);
  }

  /**
   * Enregistre un callback pour les changements de layouts.
   * @param callback Fonction appelée lors des changements
   * @returns Fonction de désenregistrement
   */
  public onLayoutsChanged(callback: () => void): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  /**
   * Récupère un modèle par son nom avec validation stricte.
   * Fonction pure qui ne produit pas d'effet de bord.
   * @param name Nom du modèle recherché
   * @returns Modèle trouvé ou undefined si inexistant ou invalide
   */
  public getModel(name: string): LayoutModel | undefined {
    const result = this.getModelWithResult(name);
    return result.success ? result.data : undefined;
  }

  /**
   * Version fonctionnelle de getModel qui retourne un Result.
   * Permet une gestion d'erreur explicite et testable.
   * @param name Nom du modèle recherché
   * @returns Result contenant le modèle ou l'erreur détaillée
   */
  public getModelWithResult(name: string): Result<LayoutModel> {
    // Validation du nom
    const validation = ValidationUtils.validateLayoutModelName(name);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error!
      };
    }

    // Recherche dans la registry
    const model = this.models.get(name);
    if (!model) {
      const availableLayouts = Array.from(this.models.keys());
      return {
        success: false,
        error: {
          type: 'LAYOUT_NOT_FOUND',
          layoutName: name,
          availableLayouts
        }
      };
    }

    return {
      success: true,
      data: model
    };
  }

  /**
   * Récupère tous les noms de modèles disponibles.
   * Fonction pure qui retourne une copie immuable de la liste.
   * @returns Liste immuable et triée des noms de modèles
   */
  public getAllModelNames(): readonly string[] {
    return Array.from(this.models.keys()).sort();
  }

  /**
   * Récupère une copie immuable de la registry complète.
   * @returns Registry en lecture seule
   */
  public getAllModels(): LayoutRegistry {
    return new Map(this.models);
  }

  /**
   * Vérifie si un modèle existe avec validation stricte du nom.
   * Fonction pure qui ne produit aucun effet de bord.
   * @param name Nom du modèle à vérifier
   * @returns true si le modèle existe et est valide, false sinon
   */
  public hasModel(name: string): boolean {
    const result = this.getModelWithResult(name);
    return result.success;
  }

  /**
   * Vérifie l'existence sans validation (accès direct).
   * Utilisé pour les cas où le nom est déjà validé.
   * @param name Nom du modèle (présumé valide)
   * @returns true si présent dans la registry
   */
  public hasModelUnsafe(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * Récupère le nombre total de modèles chargés.
   * @returns Nombre de modèles disponibles dans la registry
   */
  public getModelCount(): number {
    return this.models.size;
  }

  /**
   * Recharge tous les modèles depuis le fichier.
   * Utile pour rafraîchir après modification des fichiers de layout.
   * @returns Promise résolue quand le rechargement est terminé
   * @throws {PluginError} En cas d'erreur de rechargement
   */
  public async reload(): Promise<void> {
    const result = await this.reloadWithResult();
    if (!result.success) {
      throw result.error;
    }
  }

  /**
   * Version fonctionnelle du rechargement qui retourne un Result.
   * Préserve l'état actuel en cas d'erreur de rechargement.
   * @returns Result indiquant le succès ou l'échec du rechargement
   */
  public async reloadWithResult(): Promise<Result<void>> {
    const previousModels = new Map(this.models);
    const previousModelNames = Array.from(this.models.keys());

    try {
      this.logger.info('Rechargement des modèles de layout');
      const loadResult = await this.loadWithResult();
      
      if (!loadResult.success) {
        return loadResult;
      }

      this.models = new Map(loadResult.data);
      const newModelNames = Array.from(this.models.keys());
      
      this.logger.info(`${this.models.size} modèle(s) rechargé(s): ${newModelNames.join(', ')}`);
      
      // Notifier seulement si les modèles ont changé
      if (this.hasModelsChanged(previousModelNames, newModelNames)) {
        this.notifyLayoutsChanged(newModelNames);
      }

      return { success: true, data: undefined };
      
    } catch (error) {
      // Restaurer l'état précédent en cas d'erreur
      this.models = previousModels;
      
      this.logger.error('Erreur lors du rechargement des layouts, restauration de l\'\u00e9tat précédent', error);
      
      const pluginError: PluginError = {
        type: 'INITIALIZATION_ERROR',
        component: 'LayoutService.reload',
        details: error instanceof Error ? error.message : String(error)
      };
      
      return { success: false, error: pluginError };
    }
  }

  /**
   * Compare deux listes de noms de modèles pour détecter les changements.
   * @param previous Noms de modèles précédents
   * @param current Noms de modèles actuels
   * @returns true si les modèles ont changé
   */
  private hasModelsChanged(previous: string[], current: string[]): boolean {
    if (previous.length !== current.length) {
      return true;
    }
    
    const sortedPrevious = [...previous].sort();
    const sortedCurrent = [...current].sort();
    
    return !sortedPrevious.every((name, index) => name === sortedCurrent[index]);
  }

  /**
   * Nettoie proprement toutes les ressources utilisées par le service.
   * Fonction idempotente qui peut être appelée plusieurs fois sans effet.
   */
  public dispose(): void {
    this.logger.info('Début du nettoyage des ressources LayoutService');
    
    // Arrêter la surveillance des fichiers
    if (this.isWatching) {
      try {
        this.fileRepo.dispose();
        this.isWatching = false;
        this.logger.info('Surveillance des layouts arrêtée');
      } catch (error) {
        this.logger.error('Erreur lors de l\'arrêt de la surveillance', error);
      }
    }

    // Vider la registry et les callbacks
    this.models.clear();
    this.eventListeners.clear();
    
    this.logger.info('Ressources LayoutService nettoyées');
  }

  /**
   * Réinitialise le service dans un état propre.
   * Combine dispose() et une réinitialisation complète.
   * @returns Promise résolue quand la réinitialisation est terminée
   */
  public async reset(): Promise<void> {
    this.logger.info('Réinitialisation complète du LayoutService');
    
    this.dispose();
    await this.load();
    
    this.logger.info('Réinitialisation terminée');
  }

  /**
   * Vérifie l'intégrité interne du service.
   * Utile pour le débogage et les tests.
   * @returns Rapport d'intégrité détaillé
   */
  public getIntegrityReport(): {
    isHealthy: boolean;
    modelCount: number;
    isWatching: boolean;
    listenerCount: number;
    lastCheck: number;
  } {
    return {
      isHealthy: this.isReady(),
      modelCount: this.models.size,
      isWatching: this.isWatching,
      listenerCount: this.eventListeners.size,
      lastCheck: Date.now()
    };
  }
}
