// src/modelDetector.ts
import { TFile, Plugin, Notice, MarkdownView } from "obsidian";
import { LayoutService } from "./layoutService";
import { LayoutRenderer } from "./layoutRenderer";
import { LayoutBlock } from "./types";
import { parseHeadingsInFile } from "./sectionParser";

export class ModelDetector {
  private layoutRenderer = new LayoutRenderer(this.plugin.app);

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
    // Ne traiter que les .md
    if (!file.path.endsWith(".md")) {
      this.cleanupContainer();
      return;
    }

    // Lecture du frontmatter
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const modelName = cache?.frontmatter?.["agile-board"] as string | undefined;

    // Récupération de la vue active
    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== file.path) {
      this.cleanupContainer();
      return;
    }

    // 🚦 Test immédiat du mode Live Preview vs Source
    const state = (view as any).getState?.();
    const isLivePreview = state?.mode === "source" && state?.source === false;
    if (!isLivePreview) {
      console.log("✋ Passage en mode Source détecté → suppression des cadres");
      this.cleanupContainer();
      return;
    }

    // Si pas de modèle déclaré
    if (!modelName) {
      this.cleanupContainer();
      return;
    }

    // Récupération du modèle
    const model = this.layoutService.getModel(modelName);
    if (!model) {
      new Notice(`❌ Modèle "${modelName}" introuvable`);
      return;
    }

    // Parsing des sections existantes
    const sections = await parseHeadingsInFile(this.plugin.app, file);
    console.log("📑 Sections trouvées :", Object.keys(sections));

    // Rendu du layout
    this.layoutRenderer.renderLayout(model, view, sections);
  }

  private cleanupContainer() {
    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;
    const old = view.contentEl.querySelector(".agile-board-container");
    if (old) old.remove();
  }
}

