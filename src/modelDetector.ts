// src/modelDetector.ts
import { TFile, Plugin, Notice, MarkdownView } from "obsidian";
import { LayoutService } from "./layoutService";
import { LayoutRenderer } from "./layoutRenderer";
import { LayoutBlock } from "./types";
import { parseHeadingsInFile } from "./sectionParser";

export class ModelDetector {
  private layoutRenderer = new LayoutRenderer(this.plugin.app);
  private modeObserver: MutationObserver | null = null;

  constructor(
    private plugin: Plugin,
    private layoutService: LayoutService
  ) {}

  onLoad(): void {
    // Événements initiaux
    this.plugin.app.workspace.on("file-open", this.handleFileOpen);
    this.plugin.app.workspace.on("active-leaf-change", this.handleActiveLeafChange);
    (this.plugin.app.metadataCache.on as any)("resolved", this.handleMetadataResolved);

    // **NOUVEAU** : Écoute du basculement Source↔LivePreview
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
    if (this.modeObserver) this.modeObserver.disconnect();
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

  // **NOUVEAU** : relancer l’application du modèle quand le layout change
  private handleLayoutChange = () => {
    const file = this.plugin.app.workspace.getActiveFile();
    if (file) this.applyModelForFile(file);
  };

  private async applyModelForFile(file: TFile) {
    if (!file.path.endsWith(".md")) {
      this.cleanupContainer();
      return;
    }

    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const modelName = cache?.frontmatter?.["agile-board"] as string | undefined;

    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== file.path) {
      this.cleanupContainer();
      return;
    }

    if (!modelName) {
      this.cleanupContainer();
      return;
    }

    const model = this.layoutService.getModel(modelName);
    if (!model) {
      new Notice(`❌ Modèle "${modelName}" introuvable`);
      return;
    }

    const sections = await parseHeadingsInFile(this.plugin.app, file);
    this.layoutRenderer.renderLayout(model, view, sections);
    this.observeModeSwitch(view, file, model);
  }

  private observeModeSwitch(view: MarkdownView, file: TFile, model: LayoutBlock[]) {
    /* (tu peux conserver ou retirer ton MutationObserver, 
       mais grâce au layout-change, il n’est plus indispensable) */
  }

  private cleanupContainer() {
    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;
    const old = view.contentEl.querySelector(".agile-board-container");
    if (old) old.remove();
  }
}
