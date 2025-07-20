// src/modelDetector.ts
import { TFile, Plugin, MarkdownView } from "obsidian";
import { LayoutService } from "./layoutService";

export class ModelDetector {
  private lastProcessedFile: string | null = null;
  private manuallyChangedFiles = new Set<string>();
  private fileOpenTimestamps = new Map<string, number>();

  constructor(
    private plugin: Plugin,
    private layoutService: LayoutService
  ) {}

  onLoad(): void {
    // Uniquement l'événement file-open pour les nouveaux fichiers
    this.plugin.app.workspace.on("file-open", this.handleFileOpen);
    (this.plugin.app.metadataCache.on as any)("resolved", this.handleMetadataResolved);
  }

  onUnload(): void {
    this.plugin.app.workspace.off("file-open", this.handleFileOpen);
    (this.plugin.app.metadataCache.off as any)("resolved", this.handleMetadataResolved);
  }

  private handleFileOpen = (file: TFile | null) => {
    if (file) {
      const now = Date.now();
      const lastOpenTime = this.fileOpenTimestamps.get(file.path) || 0;
      const timeSinceLastOpen = now - lastOpenTime;
      
      console.log(`📂 Fichier ouvert: ${file.path} (dernière ouverture: ${timeSinceLastOpen}ms)`);
      
      // Si plus de 5 secondes depuis la dernière ouverture, considérer comme nouvelle ouverture
      if (timeSinceLastOpen > 5000) {
        console.log(`🆕 Nouvelle ouverture détectée - reset auto-switch pour ${file.path}`);
        this.manuallyChangedFiles.delete(file.path);
      }
      
      this.fileOpenTimestamps.set(file.path, now);
      this.lastProcessedFile = file.path;
      this.applyModelForFile(file);
    }
  };

  private handleMetadataResolved = (file: TFile) => {
    // Seulement si c'est un nouveau fichier, pas pour les changements de métadonnées
    if (file.path !== this.lastProcessedFile) {
      this.applyModelForFile(file);
    }
  };

  // Méthode publique pour indiquer qu'un changement de vue est manuel
  public markUserManualChange(filePath: string): void {
    this.manuallyChangedFiles.add(filePath);
    console.log(`👤 Changement manuel détecté pour ${filePath}`);
  }

  // Méthode pour nettoyer l'historique des changements manuels (pour debug)
  public resetManualChanges(): void {
    this.manuallyChangedFiles.clear();
    console.log(`🧹 Historique des changements manuels nettoyé`);
  }

  private async applyModelForFile(file: TFile) {
    console.log(`🔍 ModelDetector: applyModelForFile appelé pour ${file.path}`);
    
    // Ne traiter que les .md
    if (!file.path.endsWith(".md")) {
      console.log(`❌ ModelDetector: ${file.path} n'est pas un fichier .md`);
      return;
    }

    // Si l'utilisateur a manuellement changé de vue pour ce fichier, ne pas auto-switcher
    if (this.manuallyChangedFiles.has(file.path)) {
      console.log(`🚫 Auto-switch désactivé - changement manuel détecté pour ${file.path}`);
      return;
    }

    // Lecture du frontmatter
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const modelName = cache?.frontmatter?.["agile-board"] as string | undefined;

    // Si c'est une note Agile Board, basculer automatiquement vers le mode Board
    if (modelName) {
      console.log(`🔍 Note Agile Board détectée: ${file.path} avec modèle: ${modelName}`);
      
      // Attendre un peu que la vue soit prête
      setTimeout(async () => {
        const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        console.log(`🔍 Vue markdown actuelle:`, currentView ? `${currentView.file?.path}` : 'aucune');
        
        if (currentView && currentView.file?.path === file.path) {
          console.log(`🚀 Conditions remplies, basculement automatique vers mode Board`);
          
          // Utiliser le viewSwitcher du plugin pour basculer
          const plugin = this.plugin as any;
          if (plugin.viewSwitcher) {
            console.log(`✅ ViewSwitcher disponible, basculement...`);
            await plugin.viewSwitcher.switchToBoardView(file);
          } else {
            console.log(`❌ ViewSwitcher non disponible`);
          }
        } else {
          console.log(`❌ Conditions non remplies pour le basculement automatique`);
        }
      }, 100);
    } else {
      console.log(`ℹ️ Pas de modèle Agile Board pour ${file.path}`);
    }
  }
}

