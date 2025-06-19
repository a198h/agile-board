// src/modelDetector.ts
import { TFile, Plugin, Notice } from "obsidian";
import { LayoutService } from "./layoutService";

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

  private applyModelForFile(file: TFile) {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    const modelName = (fm?.["agile-board"] as string) || this.fallbackModel;

    const model = this.layoutService.getModel(modelName);
    if (!model) {
      new Notice(`❌ Modèle "${modelName}" introuvable`);
      return;
    }

    console.log(`📄 Modèle "${modelName}" appliqué à ${file.path}`);
    // 👉 C’est ici que tu appelleras le layout renderer plus tard
  }

  setFallbackModel(name: string) {
    this.fallbackModel = name;
  }
}
