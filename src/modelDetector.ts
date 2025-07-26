// src/modelDetector.ts
import { TFile, Plugin, MarkdownView } from "obsidian";
import { 
  LayoutService 
} from "./layoutService";
import { 
  ModelDetector as IModelDetector,
  FileDetectionState,
  PLUGIN_CONSTANTS
} from "./types";

/**
 * Service de détection automatique des modèles Agile Board dans les fichiers.
 * Gère l'état des fichiers et déclenche les basculements de vue appropriés.
 */
export class ModelDetector implements IModelDetector {
  private readonly fileStates = new Map<string, FileDetectionState>();
  private lastProcessedFile: string | null = null;

  constructor(
    private readonly plugin: Plugin,
    private readonly layoutService: LayoutService
  ) {}

  /**
   * Initialise le détecteur et ses event listeners.
   */
  public onLoad(): void {
    this.plugin.app.workspace.on("file-open", this.handleFileOpen);
    (this.plugin.app.metadataCache.on as any)("resolved", this.handleMetadataResolved);
    
    console.log("🔍 ModelDetector initialisé");
  }

  /**
   * Nettoie les event listeners et l'état.
   */
  public onUnload(): void {
    this.plugin.app.workspace.off("file-open", this.handleFileOpen);
    (this.plugin.app.metadataCache.off as any)("resolved", this.handleMetadataResolved);
    
    this.fileStates.clear();
    this.lastProcessedFile = null;
    
    console.log("🔍 ModelDetector nettoyé");
  }

  /**
   * Marque qu'un changement de vue a été fait manuellement par l'utilisateur.
   * @param filePath Chemin du fichier modifié manuellement
   */
  public markUserManualChange(filePath: string): void {
    const currentState = this.getFileState(filePath);
    const newState: FileDetectionState = {
      ...currentState,
      isManuallyChanged: true
    };
    
    this.fileStates.set(filePath, newState);
    console.log(`👤 Changement manuel marqué pour ${filePath}`);
  }

  /**
   * Remet à zéro l'historique des changements manuels.
   */
  public resetManualChanges(): void {
    for (const [filePath, state] of this.fileStates.entries()) {
      if (state.isManuallyChanged) {
        const newState: FileDetectionState = {
          ...state,
          isManuallyChanged: false
        };
        this.fileStates.set(filePath, newState);
      }
    }
    
    console.log("🧹 Historique des changements manuels nettoyé");
  }

  /**
   * Handler pour l'ouverture de fichiers.
   */
  private readonly handleFileOpen = (file: TFile | null): void => {
    if (!file) return;

    const now = Date.now();
    const currentState = this.getFileState(file.path);
    
    // Réinitialiser le flag manuel si assez de temps s'est écoulé
    const timeSinceLastOpen = now - currentState.lastProcessed;
    const shouldResetManualFlag = timeSinceLastOpen > PLUGIN_CONSTANTS.TIMING.FILE_REOPEN_THRESHOLD;
    
    if (shouldResetManualFlag && currentState.isManuallyChanged) {
      console.log(`🆕 Réinitialisation auto-switch pour ${file.path} (${timeSinceLastOpen}ms écoulées)`);
    }

    const newState: FileDetectionState = {
      filePath: file.path,
      lastProcessed: now,
      isManuallyChanged: shouldResetManualFlag ? false : currentState.isManuallyChanged,
      modelName: this.extractModelName(file)
    };

    this.fileStates.set(file.path, newState);
    this.lastProcessedFile = file.path;
    
    this.processFileForAutoSwitch(file, newState);
  };

  /**
   * Handler pour la résolution des métadonnées.
   */
  private readonly handleMetadataResolved = (file: TFile): void => {
    // Éviter de traiter le même fichier deux fois consécutivement
    if (file.path === this.lastProcessedFile) return;

    const currentState = this.getFileState(file.path);
    const modelName = this.extractModelName(file);
    
    // Mettre à jour seulement si le modèle a changé
    if (currentState.modelName !== modelName) {
      const newState: FileDetectionState = {
        ...currentState,
        modelName
      };
      
      this.fileStates.set(file.path, newState);
      this.processFileForAutoSwitch(file, newState);
    }
  };

  /**
   * Récupère l'état d'un fichier ou crée un état par défaut.
   */
  private getFileState(filePath: string): FileDetectionState {
    return this.fileStates.get(filePath) ?? {
      filePath,
      lastProcessed: 0,
      isManuallyChanged: false,
      modelName: null
    };
  }

  /**
   * Extrait le nom du modèle depuis le frontmatter d'un fichier.
   */
  private extractModelName(file: TFile): string | null {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    return cache?.frontmatter?.["agile-board"] as string | undefined ?? null;
  }

  /**
   * Traite un fichier pour un éventuel basculement automatique.
   */
  private processFileForAutoSwitch(file: TFile, state: FileDetectionState): void {
    if (!this.shouldAutoSwitch(file, state)) {
      return;
    }

    console.log(`🔍 Note Agile Board détectée: ${file.path} avec modèle: ${state.modelName}`);
    
    // Délai pour laisser la vue se stabiliser
    setTimeout(async () => {
      await this.attemptAutoSwitch(file, state.modelName!);
    }, PLUGIN_CONSTANTS.TIMING.AUTO_SWITCH_DELAY);
  }

  /**
   * Détermine si un auto-switch doit être tenté.
   */
  private shouldAutoSwitch(file: TFile, state: FileDetectionState): boolean {
    // Vérifications de base
    if (!file.path.endsWith(".md")) {
      return false;
    }

    if (!state.modelName) {
      return false;
    }

    if (state.isManuallyChanged) {
      console.log(`🚫 Auto-switch désactivé - changement manuel détecté pour ${file.path}`);
      return false;
    }

    // Vérifier que le modèle existe
    if (!this.layoutService.hasModel(state.modelName)) {
      console.log(`❌ Modèle "${state.modelName}" introuvable pour ${file.path}`);
      return false;
    }

    return true;
  }

  /**
   * Tente le basculement automatique vers la vue Board.
   */
  private async attemptAutoSwitch(file: TFile, _modelName: string): Promise<void> {
    const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    
    if (!currentView || currentView.file?.path !== file.path) {
      console.log(`❌ Vue non disponible pour basculement automatique de ${file.path}`);
      return;
    }

    console.log(`🚀 Basculement automatique vers mode Board pour ${file.path}`);
    
    try {
      const plugin = this.plugin as any;
      if (plugin.viewSwitcher?.switchToBoardView) {
        await plugin.viewSwitcher.switchToBoardView(file);
        console.log(`✅ Basculement réussi vers mode Board`);
      } else {
        console.log(`❌ ViewSwitcher non disponible`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du basculement automatique:`, error);
    }
  }
}

