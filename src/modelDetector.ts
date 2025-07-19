// src/modelDetector.ts
import { TFile, Plugin, MarkdownView } from "obsidian";
import { LayoutService } from "./layoutService";

export class ModelDetector {

  constructor(
    private plugin: Plugin,
    private layoutService: LayoutService
  ) {}

  onLoad(): void {
    // Événements initiaux
    this.plugin.app.workspace.on("file-open", this.handleFileOpen);
    this.plugin.app.workspace.on("active-leaf-change", this.handleActiveLeafChange);
    (this.plugin.app.metadataCache.on as any)("resolved", this.handleMetadataResolved);

    // Écoute du basculement Source↔LivePreview
    this.plugin.app.workspace.on("layout-change", this.handleLayoutChange);

    // Premier rendu si note déjà active
    const active = this.plugin.app.workspace.getActiveFile();
    if (active) this.applyModelForFile(active);
  }

  onUnload(): void {
    this.plugin.app.workspace.off("file-open", this.handleFileOpen);
    this.plugin.app.workspace.off("active-leaf-change", this.handleActiveLeafChange);
    (this.plugin.app.metadataCache.off as any)("resolved", this.handleMetadataResolved);
    this.plugin.app.workspace.off("layout-change", this.handleLayoutChange);
  }

  private handleFileOpen = (file: TFile | null) => {
    if (file) this.applyModelForFile(file);
  };

  private handleActiveLeafChange = () => {
    const file = this.plugin.app.workspace.getActiveFile();
    if (file) this.applyModelForFile(file);
  };

  private handleMetadataResolved = (file: TFile) => {
    this.applyModelForFile(file);
  };

  private handleLayoutChange = () => {
    const file = this.plugin.app.workspace.getActiveFile();
    if (file) this.applyModelForFile(file);
  };

  private async applyModelForFile(file: TFile) {
    console.log(`🔍 ModelDetector: applyModelForFile appelé pour ${file.path}`);
    
    // Ne traiter que les .md
    if (!file.path.endsWith(".md")) {
      console.log(`❌ ModelDetector: ${file.path} n'est pas un fichier .md`);
      return;
    }

    // Lecture du frontmatter
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const modelName = cache?.frontmatter?.["agile-board"] as string | undefined;

    // Si c'est une note Agile Board, basculer automatiquement vers le mode Board
    if (modelName) {
      console.log(`🔍 Note Agile Board détectée: ${file.path} avec modèle: ${modelName}`);
      
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
        return;
      } else {
        console.log(`❌ Conditions non remplies pour le basculement automatique`);
      }
    } else {
      console.log(`ℹ️ Pas de modèle Agile Board pour ${file.path}`);
    }
  }
}

