// src/modelDetector.ts
import { TFile, Plugin, Notice, MarkdownView } from "obsidian";
import { LayoutService } from "./layoutService";
import { LayoutRenderer } from "./layoutRenderer";
import { parseHeadingsInFile } from "./sectionParser";

export class ModelDetector {
  private fallbackModel: string;

  constructor(
    private plugin: Plugin,
    private layoutService: LayoutService
  ) {
    this.fallbackModel = "layout_one"; // Tu peux rendre cela configurable plus tard
  }

  onLoad(): void {
    this.plugin.app.workspace.on("file-open", this.handleFileOpen);
    (this.plugin.app.metadataCache.on as any)("resolved", this.handleMetadataResolved);
  }

  onUnload(): void {
    this.plugin.app.workspace.off("file-open", this.handleFileOpen);
    this.plugin.app.metadataCache.off("resolved", this.handleMetadataResolved);
  }

  private handleFileOpen = (file: TFile | null) => {
    if (file) this.applyModelForFile(file);
  };

  private handleMetadataResolved = (file: TFile) => {
    this.applyModelForFile(file);
  };

  private layoutRenderer = new LayoutRenderer();

  private async applyModelForFile(file: TFile) {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const modelName = (cache?.frontmatter?.["agile-board"] as string) || this.fallbackModel;
    const model = this.layoutService.getModel(modelName);

    if (!model) {
      new Notice(`❌ Modèle "${modelName}" introuvable`);
      return;
    }

    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) return;

    const sections = await parseHeadingsInFile(this.plugin.app, file);
    console.log("📑 Sections trouvées :", Object.keys(sections));

    // Rendu (on y passera les sections plus tard)
    this.layoutRenderer.renderLayout(model, view, sections);
  }


  setFallbackModel(name: string) {
    this.fallbackModel = name;
  }

  
}
