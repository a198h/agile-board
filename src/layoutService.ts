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
      const parsed = JSON.parse(raw);

      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        new Notice("❌ layout.json doit être un objet avec des modèles nommés.", 0);
        return;
      }

      this.models.clear();

      for (const [model, blocks] of Object.entries(parsed)) {
        if (!Array.isArray(blocks)) {
          new Notice(`❌ Le modèle "${model}" doit être un tableau de blocs.`, 0);
          continue;
        }

        if (!this.validateModel(model, blocks)) {
          new Notice(`❌ Modèle "${model}" invalide – voir console pour détails.`, 0);
          continue;
        }

        this.models.set(model, blocks);
      }

      console.log("📐 Modèles chargés :", Array.from(this.models.keys()));
    } catch (err) {
      console.error("❌ Erreur lecture layout.json :", err);
      new Notice("Erreur lors du chargement de layout.json", 0);
    }
  }

  getModel(name: string): LayoutBlock[] | undefined {
    return this.models.get(name);
  }

  getAllModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  private validateModel(name: string, blocks: LayoutBlock[]): boolean {
    const grid = Array.from({ length: 24 }, () => Array(100).fill(false));
    let valid = true;

    for (const b of blocks) {
      if (
        typeof b.title !== "string" ||
        typeof b.x !== "number" || typeof b.y !== "number" ||
        typeof b.w !== "number" || typeof b.h !== "number"
      ) {
        console.warn(`❌ [${name}] Cadre invalide (types incorrects) :`, b);
        valid = false;
        continue;
      }

      if (
        b.x < 0 || b.y < 0 ||
        b.w <= 0 || b.h <= 0 ||
        b.x + b.w > 24 || b.y + b.h > 100
      ) {
        console.warn(`❌ [${name}] Cadre hors limites :`, b);
        valid = false;
        continue;
      }

      for (let x = b.x; x < b.x + b.w; x++) {
        for (let y = b.y; y < b.y + b.h; y++) {
          if (grid[x][y]) {
            console.warn(`❌ [${name}] Chevauchement détecté au cadre "${b.title}" à (${x}, ${y})`);
            valid = false;
          }
          grid[x][y] = true;
        }
      }
    }

    return valid;
  }
}
