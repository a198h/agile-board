import { LayoutBlock } from "./types";
import { Plugin, Notice, FileSystemAdapter } from "obsidian";
import * as fs from "fs/promises";
import * as path from "path";

export class LayoutService {
  private models: Map<string, LayoutBlock[]> = new Map();

  constructor(private plugin: Plugin) {}

  async load(): Promise<void> {
    try {
      const adapter = this.plugin.app.vault.adapter;
      if (!(adapter instanceof FileSystemAdapter)) {
        new Notice("❌ Le plugin nécessite un FileSystemAdapter.");
        return;
      }

      const pluginId = this.plugin.manifest.id;
      const basePath = adapter.getBasePath();
      const layoutPath = path.join(basePath, ".obsidian", "plugins", pluginId, "layout.json");

      console.log("📁 Lecture layout.json depuis :", layoutPath);

      const raw = await fs.readFile(layoutPath, "utf-8");

      const blocks = raw.split(/"model":\s*"([^"]+)"\s*\n\s*(\[[\s\S]*?\])/g);
      this.models.clear();

      for (let i = 1; i < blocks.length; i += 3) {
        const model = blocks[i];
        const json = blocks[i + 1];

        const parsed: LayoutBlock[] = JSON.parse(json);
        if (!this.validateModel(parsed)) {
          new Notice(`Modèle "${model}" invalide`);
          continue;
        }

        this.models.set(model, parsed);
      }

      console.log("📐 Modèles chargés :", Array.from(this.models.keys()));
    } catch (err) {
      console.error("❌ Erreur lecture layout.json :", err);
      new Notice("Erreur lors du chargement de layout.json");
    }
  }

  getModel(name: string): LayoutBlock[] | undefined {
    return this.models.get(name);
  }

  getAllModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  private validateModel(blocks: LayoutBlock[]): boolean {
    const grid = Array.from({ length: 24 }, () => Array(100).fill(false));
    for (const b of blocks) {
      if (
        b.x < 0 || b.y < 0 ||
        b.w <= 0 || b.h <= 0 ||
        b.x + b.w > 24 || b.y + b.h > 100
      ) return false;

      for (let x = b.x; x < b.x + b.w; x++) {
        for (let y = b.y; y < b.y + b.h; y++) {
          if (grid[x][y]) return false;
          grid[x][y] = true;
        }
      }
    }
    return true;
  }
}
