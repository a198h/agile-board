// src/modelDetector.ts
import { TFile, Plugin, Notice, MarkdownView } from "obsidian";
import { LayoutService } from "./layoutService";
import { LayoutRenderer } from "./layoutRenderer";
import { parseHeadingsInFile } from "./sectionParser";

export class ModelDetector {
  private layoutRenderer = new LayoutRenderer(this.plugin.app);

  constructor(
    private plugin: Plugin,
    private layoutService: LayoutService
  ) {}

  onLoad(): void {
    // Événements : ouverture de fichier, changement de feuille, métadonnées résolues
    this.plugin.app.workspace.on("file-open", this.handleFileOpen);
    this.plugin.app.workspace.on("active-leaf-change", this.handleActiveLeafChange);
    (this.plugin.app.metadataCache.on as any)("resolved", this.handleMetadataResolved);

    // Au démarrage, appliquer sur la note active si présent
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (activeFile) {
      this.applyModelForFile(activeFile);
    }
  }

  onUnload(): void {
    this.plugin.app.workspace.off("file-open", this.handleFileOpen);
    this.plugin.app.workspace.off("active-leaf-change", this.handleActiveLeafChange);
    this.plugin.app.metadataCache.off("resolved", this.handleMetadataResolved);
  }

  private handleFileOpen = (file: TFile | null) => {
    if (file) this.applyModelForFile(file);
  };

  private handleActiveLeafChange = () => {
    const active = this.plugin.app.workspace.getActiveFile();
    if (active) this.applyModelForFile(active);
  };

  private handleMetadataResolved = (file: TFile) => {
    this.applyModelForFile(file);
  };

  private async applyModelForFile(file: TFile) {
    // Ne traiter que les .md
    if (!file.path.endsWith(".md")) {
      this.cleanupContainer();
      return;
    }

    // Lire le frontmatter
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const modelName = cache?.frontmatter?.["agile-board"] as string | undefined;

    // Récupérer la vue Markdown active
    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    // Nettoyer si pas de vue ou fichier différent
    if (!view || !view.file || view.file.path !== file.path) {
      this.cleanupContainer();
      return;
    }

    // Si pas de propriété agile-board, on nettoie et on arrête
    if (!modelName) {
      this.cleanupContainer();
      return;
    }

    // Chercher le modèle déclaré
    const model = this.layoutService.getModel(modelName);
    if (!model) {
      new Notice(`❌ Modèle "${modelName}" introuvable`);
      return;
    }

    // Parser les sections existantes
    const sections = await parseHeadingsInFile(this.plugin.app, file);
    console.log("📑 Sections trouvées :", Object.keys(sections));

    // Enfin, rendre le layout
    this.layoutRenderer.renderLayout(model, view, sections);
  }

  private cleanupContainer() {
    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;
    const old = view.contentEl.querySelector(".agile-board-container");
    if (old) old.remove();
  }
}
