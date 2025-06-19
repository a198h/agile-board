import { Plugin, Notice } from "obsidian";
import { LayoutService } from "./layoutService";

export default class AgileBoardPlugin extends Plugin {
  layoutService: LayoutService;

  async onload() {
    console.log("Agile Board plugin loaded");

    this.layoutService = new LayoutService(this, "layout.json");
    await this.layoutService.load();

    // Watcher
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file.path === "layout.json") {
          await this.layoutService.load();
          new Notice("layout.json mis à jour !");
        }
      })
    );

    this.addCommand({
      id: "afficher-modeles-agile-board",
      name: "📐 Afficher les modèles Agile Board",
      callback: () => {
        const models = this.layoutService.getAllModelNames();
        if (models.length === 0) {
          new Notice("Aucun modèle trouvé dans layout.json");
        } else {
        new Notice("Modèles trouvés : " + models.join(", "));
        console.log("📐 Modèles Agile Board:", models);
        }
      },
    });

  }
}
