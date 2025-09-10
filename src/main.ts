// src/main.ts
import { Plugin } from "obsidian";
import { LayoutService } from "./layoutService";
import { ModelDetector } from "./modelDetector";
import { AgileBoardView, AGILE_BOARD_VIEW_TYPE } from "./agileBoardView";
import { ViewSwitcher } from "./viewSwitcher";
import { FileSynchronizer } from "./fileSynchronizer";
import { ErrorHandler, ErrorSeverity, LifecycleManager, LifecycleAware, createContextLogger, LoggingConfig } from "./core";
import { PluginError, Result } from "./types";
import { LayoutSettingsTab } from "./ui/layoutSettingsTab";
import { LayoutDownloader } from "./core/layout/layoutDownloader";


/**
 * Plugin principal Agile Board.
 * Point d'entrée minimal et clean qui orchestre les services principaux.
 * Sépare l'initialisation, la configuration et le cycle de vie.
 * 
 * Architecture SOLID :
 * - Single Responsibility: Orchestration des services uniquement
 * - Open/Closed: Extensible via les services injectés
 * - Liskov Substitution: Interfaces contractées
 * - Interface Segregation: Services spécialisés
 * - Dependency Inversion: Injection de dépendances
 * 
 * @example
 * ```typescript
 * // Le plugin est automatiquement instancié par Obsidian
 * // Accès aux services via l'instance globale
 * const layoutService = plugin.layoutService;
 * ```
 */
export default class AgileBoardPlugin extends Plugin {
  // Services publics (accès externe nécessaire)
  public readonly layoutService: LayoutService;
  public readonly fileSynchronizer: FileSynchronizer;
  public readonly viewSwitcher: ViewSwitcher;
  
  // Services privés (usage interne uniquement)
  private readonly modelDetector: ModelDetector;
  private readonly lifecycleManager: LifecycleManager;
  private readonly logger = createContextLogger('AgileBoardPlugin');
  
  // État du plugin
  private isInitialized = false;
  private initializationError: PluginError | null = null;

  /**
   * Point d'entrée principal lors du chargement du plugin.
   * Initialise tous les services de manière séquentielle et sécurisée.
   * @throws Jamais (capture toutes les erreurs en interne)
   */
  async onload(): Promise<void> {
    // Configurer le système de logging automatiquement
    LoggingConfig.setupAutomatic();
    
    this.lifecycleManager = new LifecycleManager(this.app);
    
    if (!initResult.success) {
      this.initializationError = initResult.error;
      this.handleInitializationFailure(initResult.error);
    } else {
      this.isInitialized = true;
      this.logger.info('Plugin Agile Board chargé avec succès');
    }
  }

  /**
   * Initialise le plugin de manière sécurisée.
   * @returns Result indiquant le succès ou l'échec de l'initialisation
   */
  private async initializePlugin(): Promise<Result<void>> {
    try {
      this.logger.info('Début de l\'initialisation du plugin Agile Board');
      
      // Étape 1: Configuration de base
      this.setupLogging();
      this.createLifecycleManager();
      
      // Étape 2: Téléchargement automatique des layouts (pour BRAT)
      const layoutsResult = await this.ensureDefaultLayouts();
      if (!layoutsResult.success) {
        this.logger.warn('Téléchargement automatique des layouts échoué, mais on continue', layoutsResult.error);
        // Ne pas échouer l'initialisation pour ça
      }
      
      // Étape 3: Initialisation des services métier
      const servicesResult = await this.initializeServices();
      if (!servicesResult.success) {
        return servicesResult;
      }
      
      // Étape 4: Configuration de l'interface utilisateur
      this.setupUserInterface();
      
      // Étape 5: Démarrage de la surveillance
      this.startMonitoring();
      
      // Étape 6: Initialisation des composants du cycle de vie
      await this.lifecycleManager.initializeComponents();
      
      return { success: true, data: undefined };
      
      // Ajouter l'onglet de paramètres pour les layouts
      this.addSettingTab(new LayoutSettingsTab(this.app, this));
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'INITIALIZATION_ERROR',
          component: 'AgileBoardPlugin',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * S'assure que les layouts par défaut sont disponibles.
   * Télécharge automatiquement depuis GitHub si nécessaire (pour BRAT).
   * @returns Result indiquant le succès de l'opération
   */
  private async ensureDefaultLayouts(): Promise<Result<void>> {
    try {
      const downloader = new LayoutDownloader(this);
      return await downloader.ensureDefaultLayouts();
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'INITIALIZATION_ERROR',
          component: 'LayoutDownloader',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Configure le système de logging.
   */
  private setupLogging(): void {
    LoggingConfig.setupAutomatic();
    LoggingConfig.addLogLevelCommands(this);
  }

  /**
   * Crée le gestionnaire de cycle de vie.
   */
  private createLifecycleManager(): void {
    // @ts-ignore - Utilisation du constructeur privé pour l'affectation readonly
    (this as any).lifecycleManager = new LifecycleManager(this.app);
  }

  /**
   * Configure l'interface utilisateur (onglets, commandes, etc.).
   */
  private setupUserInterface(): void {
    // Onglet de paramètres pour les layouts
    this.addSettingTab(new LayoutSettingsTab(this.app, this));
    
    // Commandes additionnelles pourraient être ajoutées ici
    this.logger.debug('Interface utilisateur configurée');
  }

  /**
   * Gère l'échec d'initialisation de manière gracieuse.
   * @param error Erreur d'initialisation
   */
  private handleInitializationFailure(error: PluginError): void {
    this.logger.error('Échec de l\'initialisation du plugin', error);
    
    ErrorHandler.handleError(error, 'AgileBoardPlugin.initialize', {
      severity: ErrorSeverity.CRITICAL,
      userMessage: 'Le plugin Agile Board n\'a pas pu s\'initialiser correctement. Consultez la console pour plus de détails.'
    });
    
    // Tentative de nettoyage partiel si nécessaire
    this.performEmergencyCleanup();
  }

  /**
   * Effectue un nettoyage d'urgence en cas d'échec d'initialisation.
   */
  private performEmergencyCleanup(): void {
    try {
      // Nettoyage sélectif des ressources partiellement initialisées
      if (this.lifecycleManager) {
        this.lifecycleManager.dispose();
      }
      this.logger.info('Nettoyage d\'urgence effectué');
    } catch (cleanupError) {
      this.logger.error('Erreur lors du nettoyage d\'urgence', cleanupError);
    }
  }

  /**
   * Nettoie toutes les ressources lors du déchargement du plugin.
   * Opération idempotente et sécurisée.
   */
  onunload(): void {
    this.logger.info('Début du déchargement du plugin Agile Board');
    
    try {
      // Nettoyage séquentiel et sécurisé
      this.stopMonitoring();
      this.cleanupServices();
      this.cleanupLifecycle();
      
      // Marquer comme désinitialisé
      this.isInitialized = false;
      this.initializationError = null;
      
      this.logger.info('Plugin Agile Board déchargé avec succès');
    } catch (error) {
      this.logger.error('Erreur lors du déchargement', error);
    }
  }

  /**
   * Arrête la surveillance et les services actifs.
   */
  private stopMonitoring(): void {
    try {
      if (this.modelDetector) {
        this.modelDetector.onUnload();
      }
      if (this.fileSynchronizer) {
        this.fileSynchronizer.stop();
      }
      if (this.viewSwitcher) {
        this.viewSwitcher.stop();
      }
      this.logger.debug('Surveillance arrêtée');
    } catch (error) {
      this.logger.error('Erreur lors de l\'arrêt de la surveillance', error);
    }
  }

  /**
   * Nettoie les services principaux.
   */
  private cleanupServices(): void {
    try {
      if (this.layoutService) {
        this.layoutService.dispose();
      }
      this.logger.debug('Services nettoyés');
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des services', error);
    }
  }

  /**
   * Nettoie le gestionnaire de cycle de vie.
   */
  private cleanupLifecycle(): void {
    try {
      if (this.lifecycleManager) {
        this.lifecycleManager.dispose();
      }
      this.logger.debug('Gestionnaire de cycle de vie nettoyé');
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage du cycle de vie', error);
    }
  }

  /**
   * Initialise tous les services métier de manière séquentielle.
   * @returns Result indiquant le succès de l'initialisation
   */
  private async initializeServices(): Promise<Result<void>> {
    try {
      this.logger.debug('Initialisation des services métier');
      
      // Service principal: gestion des layouts
      await this.initializeLayoutService();
      
      // Services d'interface: vues et navigation
      this.initializeViewServices();
      
      // Services de synchronisation
      this.initializeSynchronizationServices();
      
      // Services de détection automatique
      this.initializeDetectionServices();
      
      // Enregistrement dans le gestionnaire de cycle de vie
      this.registerLifecycleComponents();
      
      this.logger.debug('Tous les services initialisés avec succès');
      return { success: true, data: undefined };
      
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'INITIALIZATION_ERROR',
          component: 'Services',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Initialise le service de layout (service principal).
   */
  private async initializeLayoutService(): Promise<void> {
    this.logger.debug('Initialisation du LayoutService');
    
    // @ts-ignore - Affectation pour readonly
    (this as any).layoutService = new LayoutService(this);
    await this.layoutService.load();
    
    this.logger.debug('LayoutService initialisé');
  }

  /**
   * Initialise les services de vue et d'interface.
   */
  private initializeViewServices(): void {
    this.logger.debug('Initialisation des services de vue');
    
    // Enregistrement de la vue personnalisée
    this.registerView(
      AGILE_BOARD_VIEW_TYPE,
      (leaf) => new AgileBoardView(leaf, this)
    );
    
    // Service de basculement de vue
    // @ts-ignore - Affectation pour readonly
    (this as any).viewSwitcher = new ViewSwitcher(this);
    
    this.logger.debug('Services de vue initialisés');
  }

  /**
   * Initialise les services de synchronisation.
   */
  private initializeSynchronizationServices(): void {
    this.logger.debug('Initialisation des services de synchronisation');
    
    // @ts-ignore - Affectation pour readonly
    (this as any).fileSynchronizer = new FileSynchronizer(this);
    
    this.logger.debug('Services de synchronisation initialisés');
  }

  /**
   * Initialise les services de détection automatique.
   */
  private initializeDetectionServices(): void {
    this.logger.debug('Initialisation des services de détection');
    
    // @ts-ignore - Affectation pour readonly
    (this as any).modelDetector = new ModelDetector(this, this.layoutService);
    
    this.logger.debug('Services de détection initialisés');
  }

  /**
   * Enregistre les composants compatibles dans le gestionnaire de cycle de vie.
   */
  private registerLifecycleComponents(): void {
    const components = [
      { name: 'ViewSwitcher', service: this.viewSwitcher },
      { name: 'FileSynchronizer', service: this.fileSynchronizer },
      { name: 'ModelDetector', service: this.modelDetector }
    ];
    
    components.forEach(({ name, service }) => {
      if (this.isLifecycleAware(service)) {
        this.lifecycleManager.registerComponent(service);
        this.logger.debug(`${name} enregistré dans le cycle de vie`);
      }
    });
  }

  /**
   * Démarre la surveillance des fichiers et l'activation des services.
   */
  private startMonitoring(): void {
    try {
      this.logger.debug('Démarrage de la surveillance et des services actifs');
      
      // Interface utilisateur
      this.viewSwitcher.addSwitchButton();
      
      // Surveillance des fichiers
      this.fileSynchronizer.start();
      
      // Détection automatique
      this.modelDetector.onLoad();
      
      this.logger.debug('Surveillance active');
    } catch (error) {
      this.logger.error('Erreur lors du démarrage de la surveillance', error);
      throw error;
    }
  }

  /**
   * Vérifie si un objet implémente l'interface LifecycleAware.
   * Type guard sécurisé pour l'enregistrement dans le gestionnaire de cycle de vie.
   * @param obj Objet à vérifier
   * @returns true si l'objet implémente LifecycleAware
   */
  private isLifecycleAware(obj: unknown): obj is LifecycleAware {
    return obj !== null && 
           typeof obj === 'object' && 
           (typeof (obj as any).onLoad === 'function' || typeof (obj as any).onUnload === 'function');
  }

  /**
   * Donne accès au gestionnaire de cycle de vie pour les composants externes.
   * @returns Gestionnaire de cycle de vie ou null si non initialisé
   */
  public getLifecycleManager(): LifecycleManager | null {
    return this.lifecycleManager || null;
  }

  /**
   * Indique si le plugin est correctement initialisé et fonctionnel.
   * @returns true si le plugin est opérationnel
   */
  public isPluginReady(): boolean {
    return this.isInitialized && this.initializationError === null;
  }

  /**
   * Récupère l'erreur d'initialisation si elle existe.
   * @returns Erreur d'initialisation ou null
   */
  public getInitializationError(): PluginError | null {
    return this.initializationError;
  }

  /**
   * Obtient un rapport de diagnostic complet sur l'état du plugin.
   * Utile pour le débogage et le support utilisateur.
   * @returns Rapport d'intégrité détaillé
   */
  public getDiagnostics(): PluginDiagnostics {
    return {
      isInitialized: this.isInitialized,
      hasInitializationError: this.initializationError !== null,
      initializationError: this.initializationError,
      services: {
        layoutService: {
          isReady: this.layoutService?.isReady() ?? false,
          modelCount: this.layoutService?.getModelCount() ?? 0
        },
        modelDetector: {
          isActive: this.modelDetector ? true : false,
          diagnostics: this.modelDetector?.getDiagnosticReport() ?? null
        },
        viewSwitcher: {
          isActive: this.viewSwitcher ? true : false
        },
        fileSynchronizer: {
          isActive: this.fileSynchronizer ? true : false
        }
      },
      lifecycle: {
        isActive: this.lifecycleManager ? true : false
      },
      timestamp: Date.now()
    };
  }

  /**
   * Force une réinitialisation complète du plugin.
   * À utiliser uniquement en cas de problème critique.
   * @returns Promise résolue quand la réinitialisation est terminée
   */
  public async forceReinitialize(): Promise<Result<void>> {
    this.logger.warn('Début de la réinitialisation forcée du plugin');
    
    try {
      // Nettoyage complet
      this.stopMonitoring();
      this.cleanupServices();
      this.cleanupLifecycle();
      
      // Réinitialisation
      this.isInitialized = false;
      this.initializationError = null;
      
      const initResult = await this.initializePlugin();
      
      if (initResult.success) {
        this.isInitialized = true;
        this.logger.info('Réinitialisation forcée réussie');
      } else {
        this.initializationError = initResult.error;
        this.logger.error('Réinitialisation forcée échouée', initResult.error);
      }
      
      return initResult;
      
    } catch (error) {
      const pluginError: PluginError = {
        type: 'INITIALIZATION_ERROR',
        component: 'AgileBoardPlugin.forceReinitialize',
        details: error instanceof Error ? error.message : String(error)
      };
      
      this.logger.error('Erreur lors de la réinitialisation forcée', error);
      return { success: false, error: pluginError };
    }
  }
}

/**
 * Interface pour le rapport de diagnostic du plugin.
 */
interface PluginDiagnostics {
  isInitialized: boolean;
  hasInitializationError: boolean;
  initializationError: PluginError | null;
  services: {
    layoutService: {
      isReady: boolean;
      modelCount: number;
    };
    modelDetector: {
      isActive: boolean;
      diagnostics: any;
    };
    viewSwitcher: {
      isActive: boolean;
    };
    fileSynchronizer: {
      isActive: boolean;
    };
  };
  lifecycle: {
    isActive: boolean;
  };
  timestamp: number;
}

