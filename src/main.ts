//src/main.ts
import { Plugin } from "obsidian";
import { LayoutService } from "./layoutService";
import { ModelDetector } from "./modelDetector";


export default class AgileBoardPlugin extends Plugin {
  private layoutService: LayoutService;
  private modelDetector: ModelDetector;

  async onload() {
    this.layoutService = new LayoutService(this);
    await this.layoutService.load();

    this.modelDetector = new ModelDetector(this, this.layoutService);
    this.modelDetector.onLoad();

    console.log("✅ Agile Board chargé");
  }

  onunload() {
    this.modelDetector.onUnload();
  }
}

