// src/main.ts
import { Plugin } from "obsidian";
import { LayoutService } from "./core/layout/layoutService";
import { ModelDetector } from "./core/services/modelDetector";
import { AgileBoardView, AGILE_BOARD_VIEW_TYPE } from "./views/agileBoardView";
import { ViewSwitcher } from "./core/services/viewSwitcher";
import { FileSynchronizer } from "./core/services/fileSynchronizer";
import { ErrorHandler, ErrorSeverity, LifecycleManager, LifecycleAware, createContextLogger, LoggingConfig } from "./core";
import { PluginError } from "./types";
import { LayoutSettingsTab } from "./ui/layoutSettingsTab";
import { initializeI18n, setLanguage } from "./i18n";


/**
 * Plugin principal Agile Board.
 * Point d'entrée minimal qui orchestre les services principaux.
 */
export default class AgileBoardPlugin extends Plugin {
  public layoutService: LayoutService;
  public fileSynchronizer: FileSynchronizer;
  public viewSwitcher: ViewSwitcher;
  private modelDetector: ModelDetector;
  private lifecycleManager: LifecycleManager;
  private logger = createContextLogger('AgileBoardPlugin');

  /**
   * Initialise le plugin et ses services.
   */
  async onload(): Promise<void> {
    // Configurer le système de logging automatiquement
    LoggingConfig.setupAutomatic();
    
    // Initialiser le système d'internationalisation
    await initializeI18n();
    setLanguage(window.localStorage.getItem('language') || 'en');
    
    this.lifecycleManager = new LifecycleManager(this.app);
    
    try {
      await this.initializeServices();
      this.startMonitoring();
      await this.lifecycleManager.initializeComponents();
      
      // Ajouter les commandes de logging
      LoggingConfig.addLogLevelCommands(this);
      
      // Ajouter l'onglet de paramètres pour les layouts
      this.addSettingTab(new LayoutSettingsTab(this.app, this));
      
    } catch (error) {
      const pluginError: PluginError = {
        type: 'INITIALIZATION_ERROR',
        component: 'AgileBoardPlugin',
        details: error instanceof Error ? error.message : String(error)
      };
      
      this.logger.error('Échec de l\'initialisation du plugin', error);
      ErrorHandler.handleError(pluginError, 'main.onload', {
        severity: ErrorSeverity.CRITICAL
      });
    }
  }

  /**
   * Nettoie les ressources lors du déchargement.
   */
  onunload(): void {
    this.cleanup();
    if (this.lifecycleManager) {
      this.lifecycleManager.dispose();
    }
    
  }

  /**
   * Initialise les services principaux du plugin.
   */
  private async initializeServices(): Promise<void> {
    // Initialisation du service de layout et création des layouts de base
    this.layoutService = new LayoutService(this);
    await this.layoutService.initialize();

    // Enregistrement de la vue personnalisée
    this.registerView(
      AGILE_BOARD_VIEW_TYPE,
      (leaf) => new AgileBoardView(leaf, this)
    );

    // Initialisation des services complémentaires
    this.viewSwitcher = new ViewSwitcher(this);
    this.fileSynchronizer = new FileSynchronizer(this);
    
    // Initialisation du détecteur de modèles
    this.modelDetector = new ModelDetector(this, this.layoutService);
    
    // Enregistrement des composants dans le gestionnaire de cycle de vie
    if (this.isLifecycleAware(this.viewSwitcher)) {
      this.lifecycleManager.registerComponent(this.viewSwitcher);
    }
    if (this.isLifecycleAware(this.fileSynchronizer)) {
      this.lifecycleManager.registerComponent(this.fileSynchronizer);
    }
    if (this.isLifecycleAware(this.modelDetector)) {
      this.lifecycleManager.registerComponent(this.modelDetector);
    }
    
  }

  /**
   * Démarre la surveillance des fichiers et les services.
   */
  private startMonitoring(): void {
    
    this.viewSwitcher.addSwitchButton();
    this.fileSynchronizer.start();
    this.modelDetector.onLoad();
    
  }

  /**
   * Vérifie si un objet implémente l'interface LifecycleAware.
   * @param obj Objet à vérifier
   * @returns true si l'objet implémente LifecycleAware
   */
  private isLifecycleAware(obj: unknown): obj is LifecycleAware {
    return obj !== null && typeof obj === 'object' &&
           (typeof (obj as Record<string, unknown>).onLoad === 'function' || typeof (obj as Record<string, unknown>).onUnload === 'function');
  }

  /**
   * Donne accès au gestionnaire de cycle de vie pour les composants.
   * @returns Gestionnaire de cycle de vie
   */
  public getLifecycleManager(): LifecycleManager {
    return this.lifecycleManager;
  }

  /**
   * Nettoie toutes les ressources et arrête les services.
   */
  private cleanup(): void {
    // Les services implémentant LifecycleAware seront nettoyés automatiquement
    // par le LifecycleManager. Garde le nettoyage manuel pour compatibilité.
    if (this.modelDetector) {
      this.modelDetector.onUnload();
    }
    if (this.fileSynchronizer) {
      this.fileSynchronizer.stop();
    }
    if (this.viewSwitcher) {
      this.viewSwitcher.stop();
    }
    if (this.layoutService) {
      this.layoutService.dispose();
    }
  }

}

