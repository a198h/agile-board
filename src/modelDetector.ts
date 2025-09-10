// src/modelDetector.ts
import { TFile, Plugin, MarkdownView } from "obsidian";
import { 
  LayoutService 
} from "./layoutService";
import { 
  ModelDetector as IModelDetector,
  FileDetectionState,
  PLUGIN_CONSTANTS,
  Result,
  PluginError
} from "./types";
import { createContextLogger } from "./core/logger";
import { ErrorHandler, ErrorSeverity } from "./core/errorHandler";

/**
 * Service de détection automatique des modèles Agile Board dans les fichiers.
 * Architecture fonctionnelle qui sépare la logique pure des effets de bord.
 * Gère l'état des fichiers et déclenche les basculements de vue appropriés.
 * 
 * @example
 * ```typescript
 * const detector = new ModelDetector(plugin, layoutService);
 * detector.onLoad();
 * // detector.markUserManualChange('/path/to/file.md');
 * ```
 */
export class ModelDetector implements IModelDetector {
  private readonly fileStates = new Map<string, FileDetectionState>();
  private lastProcessedFile: string | null = null;
  private readonly logger = createContextLogger('ModelDetector');
  private readonly eventListeners = new Set<EventListener>();
  private isActive = false;

  constructor(
    private readonly plugin: Plugin,
    private readonly layoutService: LayoutService
  ) {}

  /**
   * Initialise le détecteur et ses event listeners.
   * Configuration idempotente qui peut être appelée plusieurs fois.
   */
  public onLoad(): void {
    if (this.isActive) {
      return;
    }

    try {
      this.registerEventListeners();
      this.isActive = true;
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation du détecteur', error);
      ErrorHandler.handleError(
        {
          type: 'INITIALIZATION_ERROR',
          component: 'ModelDetector',
          details: error instanceof Error ? error.message : String(error)
        },
        'ModelDetector.onLoad',
        { severity: ErrorSeverity.WARNING }
      );
    }
  }

  /**
   * Enregistre tous les event listeners de manière sécurisée.
   * Sépare l'enregistrement de la logique métier.
   */
  private registerEventListeners(): void {
    const fileOpenListener = this.handleFileOpen.bind(this) as EventListener;
    const metadataResolvedListener = this.handleMetadataResolved.bind(this) as EventListener;

    this.plugin.app.workspace.on("file-open" as any, fileOpenListener);
    (this.plugin.app.metadataCache.on as any)("resolved", metadataResolvedListener);
  }

  /**
   * Nettoie les event listeners et l'état.
   * Opération idempotente qui peut être appelée plusieurs fois.
   */
  public onUnload(): void {
    if (!this.isActive) {
      return;
    }

    try {
      this.unregisterEventListeners();
      this.resetInternalState();
      this.isActive = false;
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage du détecteur', error);
    }
  }

  /**
   * Désenregistre tous les event listeners de manière sécurisée.
   */
  private unregisterEventListeners(): void {
    // Note: Obsidian ne fournit pas de référence exacte aux listeners,
    // donc on utilise les méthodes originales
    this.plugin.app.workspace.off("file-open" as any, this.handleFileOpen);
    (this.plugin.app.metadataCache.off as any)("resolved", this.handleMetadataResolved);
    
    this.eventListeners.clear();
  }

  /**
   * Réinitialise l'état interne du détecteur.
   */
  private resetInternalState(): void {
    this.fileStates.clear();
    this.lastProcessedFile = null;
  }

  /**
   * Marque qu'un changement de vue a été fait manuellement par l'utilisateur.
   * Fonction pure qui met à jour l'état sans effet de bord.
   * @param filePath Chemin du fichier modifié manuellement
   */
  public markUserManualChange(filePath: string): void {
    const result = this.updateFileState(filePath, { isManuallyChanged: true });
    
    if (result.success) {
    } else {
    }
  }

  /**
   * Met à jour l'état d'un fichier de manière fonctionnelle.
   * @param filePath Chemin du fichier à mettre à jour
   * @param updates Mises à jour partielles à appliquer
   * @returns Result indiquant le succès ou l'échec
   */
  private updateFileState(
    filePath: string, 
    updates: Partial<FileDetectionState>
  ): Result<FileDetectionState> {
    try {
      const currentState = this.getFileState(filePath);
      const newState: FileDetectionState = {
        ...currentState,
        ...updates,
        filePath // Toujours préserver le chemin
      };
      
      this.fileStates.set(filePath, newState);
      return { success: true, data: newState };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`Impossible de mettre à jour l'état du fichier: ${filePath}`],
          modelName: updates.modelName || undefined
        }
      };
    }
  }

  /**
   * Remet à zéro l'historique des changements manuels.
   * Opération fonctionnelle qui traite tous les fichiers en une passe.
   */
  public resetManualChanges(): void {
    const filesWithManualChanges = this.getFilesWithManualChanges();
    
    if (filesWithManualChanges.length === 0) {
      return;
    }

    const resetResults = filesWithManualChanges.map(filePath => 
      this.updateFileState(filePath, { isManuallyChanged: false })
    );
    
    const successCount = resetResults.filter(r => r.success).length;
    const failureCount = resetResults.length - successCount;
    
  }

  /**
   * Récupère la liste des fichiers avec des changements manuels.
   * Fonction pure pour la sélection de données.
   * @returns Liste des chemins de fichiers avec changements manuels
   */
  private getFilesWithManualChanges(): readonly string[] {
    return Array.from(this.fileStates.entries())
      .filter(([, state]) => state.isManuallyChanged)
      .map(([filePath]) => filePath);
  }

  /**
   * Handler fonctionnel pour l'ouverture de fichiers.
   * Sépare la logique de détection des effets de bord.
   */
  private readonly handleFileOpen = (file: TFile | null): void => {
    if (!file || !this.isActive) {
      return;
    }

    try {
      const processingResult = this.processFileOpen(file);
      
      if (processingResult.success) {
        this.processFileForAutoSwitch(file, processingResult.data);
      } else {
      }
    } catch (error) {
      this.logger.error(`Exception lors du traitement de l'ouverture du fichier ${file.path}:`, error);
    }
  };

  /**
   * Traite l'ouverture d'un fichier de manière fonctionnelle.
   * Logic pure qui calcule le nouvel état sans effet de bord.
   * @param file Fichier ouvert
   * @returns Result contenant le nouvel état ou l'erreur
   */
  private processFileOpen(file: TFile): Result<FileDetectionState> {
    const now = Date.now();
    const currentState = this.getFileState(file.path);
    const modelName = this.extractModelName(file);
    
    // Calculer si le flag manuel doit être réinitialisé
    const timeSinceLastOpen = now - currentState.lastProcessed;
    const shouldResetManualFlag = timeSinceLastOpen > PLUGIN_CONSTANTS.TIMING.FILE_REOPEN_THRESHOLD;
    
    if (shouldResetManualFlag && currentState.isManuallyChanged) {
    }

    const newState: FileDetectionState = {
      filePath: file.path,
      lastProcessed: now,
      isManuallyChanged: shouldResetManualFlag ? false : currentState.isManuallyChanged,
      modelName
    };

    // Mettre à jour l'état
    this.fileStates.set(file.path, newState);
    this.lastProcessedFile = file.path;
    
    return { success: true, data: newState };
  }

  /**
   * Handler fonctionnel pour la résolution des métadonnées.
   * Évite le traitement redondant et les boucles infinies.
   */
  private readonly handleMetadataResolved = (file: TFile): void => {
    // Vérifier que le fichier existe
    if (!file) return;
    
    // Éviter de traiter le même fichier deux fois consécutivement
    if (file.path === this.lastProcessedFile) return;

    // Éviter le traitement redondant
    if (file.path === this.lastProcessedFile) {
      return;
    }

    try {
      const processingResult = this.processMetadataResolved(file);
      
      if (processingResult.success && processingResult.data) {
        this.processFileForAutoSwitch(file, processingResult.data);
      }
    } catch (error) {
      this.logger.error(`Exception lors du traitement des métadonnées pour ${file.path}:`, error);
    }
  };

  /**
   * Traite la résolution des métadonnées de manière fonctionnelle.
   * @param file Fichier avec métadonnées résolues
   * @returns Result indiquant si un traitement est nécessaire
   */
  private processMetadataResolved(file: TFile): Result<FileDetectionState | null> {
    const currentState = this.getFileState(file.path);
    const modelName = this.extractModelName(file);
    
    // Pas de changement, pas de traitement nécessaire
    if (currentState.modelName === modelName) {
      return { success: true, data: null };
    }

    const newState: FileDetectionState = {
      ...currentState,
      modelName
    };
    
    this.fileStates.set(file.path, newState);
    
    return { success: true, data: newState };
  }

  /**
   * Récupère l'état d'un fichier ou crée un état par défaut.
   * Fonction pure qui ne modifie pas l'état.
   * @param filePath Chemin du fichier
   * @returns État actuel ou état par défaut
   */
  private getFileState(filePath: string): FileDetectionState {
    return this.fileStates.get(filePath) ?? this.createDefaultFileState(filePath);
  }

  /**
   * Crée un état par défaut pour un nouveau fichier.
   * Factory method pure pour la création d'état.
   * @param filePath Chemin du fichier
   * @returns État par défaut
   */
  private createDefaultFileState(filePath: string): FileDetectionState {
    return {
      filePath,
      lastProcessed: 0,
      isManuallyChanged: false,
      modelName: null
    };
  }

  /**
   * Extrait le nom du modèle depuis le frontmatter d'un fichier.
   * Fonction pure qui analyse les métadonnées sans effet de bord.
   * @param file Fichier à analyser
   * @returns Nom du modèle ou null si absent/invalide
   */
  private extractModelName(file: TFile): string | null {
    try {
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      const modelName = cache?.frontmatter?.["agile-board"];
      
      // Validation stricte du type
      if (typeof modelName === 'string' && modelName.trim().length > 0) {
        return modelName.trim();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Traite un fichier pour un éventuel basculement automatique.
   * Orchestrateur qui sépare la décision de l'exécution.
   * @param file Fichier à traiter
   * @param state État actuel du fichier
   */
  private processFileForAutoSwitch(file: TFile, state: FileDetectionState): void {
    const switchDecision = this.evaluateAutoSwitchDecision(file, state);
    
    if (!switchDecision.shouldSwitch) {
      if (switchDecision.reason) {
      }
      return;
    }

    
    // Délai pour stabiliser la vue avant basculement
    this.scheduleAutoSwitch(file, state.modelName!);
  }

  /**
   * Évalue si un auto-switch doit être effectué.
   * Fonction pure qui analyse l'état sans effet de bord.
   * @param file Fichier à évaluer
   * @param state État actuel
   * @returns Décision structurée avec raison
   */
  private evaluateAutoSwitchDecision(file: TFile, state: FileDetectionState): {
    shouldSwitch: boolean;
    reason?: string;
  } {
    // Vérifications de base
    if (!file.path.endsWith('.md')) {
      return { shouldSwitch: false, reason: 'fichier non-markdown' };
    }

    if (!state.modelName) {
      return { shouldSwitch: false, reason: 'aucun modèle détecté' };
    }

    if (state.isManuallyChanged) {
      return { shouldSwitch: false, reason: 'changement manuel détecté' };
    }

    // Vérifier que le modèle existe
    if (!this.layoutService.hasModel(state.modelName)) {
      return { shouldSwitch: false, reason: `modèle "${state.modelName}" introuvable` };
    }

    return { shouldSwitch: true };
  }

  /**
   * Programme un auto-switch avec délai de stabilisation.
   * @param file Fichier cible
   * @param modelName Nom du modèle à appliquer
   */
  private scheduleAutoSwitch(file: TFile, modelName: string): void {
    setTimeout(async () => {
      try {
        await this.attemptAutoSwitch(file, modelName);
      } catch (error) {
        this.logger.error(`Erreur lors de l'auto-switch pour ${file.path}:`, error);
      }
    }, PLUGIN_CONSTANTS.TIMING.AUTO_SWITCH_DELAY);
  }


  /**
   * Tente le basculement automatique vers la vue Board.
   * Sépare la validation préalable de l'exécution du basculement.
   * @param file Fichier cible pour le basculement
   * @param modelName Nom du modèle à appliquer
   */
  private async attemptAutoSwitch(file: TFile, modelName: string): Promise<void> {
    const switchResult = await this.executeSafeAutoSwitch(file, modelName);
    
    if (switchResult.success) {
    } else {
    }
  }

  /**
   * Exécute un basculement automatique de manière sécurisée.
   * @param file Fichier cible
   * @param modelName Nom du modèle
   * @returns Result du basculement
   */
  private async executeSafeAutoSwitch(file: TFile, modelName: string): Promise<Result<void>> {
    try {
      // Validation préalable
      const validationResult = this.validateAutoSwitchContext(file);
      if (!validationResult.success) {
        return validationResult;
      }

      // Exécution du basculement
      const plugin = this.plugin as any;
      if (!plugin.viewSwitcher?.switchToBoardView) {
        return {
          success: false,
          error: {
            type: 'INITIALIZATION_ERROR',
            component: 'ViewSwitcher',
            details: 'ViewSwitcher non disponible ou méthode manquante'
          }
        };
      }

      await plugin.viewSwitcher.switchToBoardView(file);
      return { success: true, data: undefined };
      
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'INITIALIZATION_ERROR',
          component: 'ModelDetector.autoSwitch',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Valide le contexte avant un basculement automatique.
   * @param file Fichier à valider
   * @returns Result de validation
   */
  private validateAutoSwitchContext(file: TFile): Result<void> {
    const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    
    if (!currentView) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: ['Aucune vue Markdown active'],
        }
      };
    }

    if (currentView.file?.path !== file.path) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`Vue active (${currentView.file?.path}) ne correspond pas au fichier cible (${file.path})`],
        }
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Obtient un rapport détaillé de l'état du détecteur.
   * @returns Rapport de diagnostic
   */
  public getDiagnosticReport(): {
    isActive: boolean;
    fileCount: number;
    filesWithManualChanges: number;
    lastProcessedFile: string | null;
    eventListenerCount: number;
  } {
    return {
      isActive: this.isActive,
      fileCount: this.fileStates.size,
      filesWithManualChanges: this.getFilesWithManualChanges().length,
      lastProcessedFile: this.lastProcessedFile,
      eventListenerCount: this.eventListeners.size
    };
  }
}

