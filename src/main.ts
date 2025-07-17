//src/main.ts
import { Plugin } from "obsidian";
import { LayoutService } from "./layoutService";
import { ModelDetector } from "./modelDetector";
import { AgileBoardView, AGILE_BOARD_VIEW_TYPE } from "./agileBoardView";
import { ViewSwitcher } from "./viewSwitcher";
import { FileSynchronizer } from "./fileSynchronizer";


export default class AgileBoardPlugin extends Plugin {
  public layoutService: LayoutService;
  public fileSynchronizer: FileSynchronizer;
  private modelDetector: ModelDetector;
  private viewSwitcher: ViewSwitcher;

  async onload() {
    this.layoutService = new LayoutService(this);
    await this.layoutService.load();

    // Enregistrer la vue personnalisée
    this.registerView(
      AGILE_BOARD_VIEW_TYPE,
      (leaf) => new AgileBoardView(leaf, this)
    );

    // Initialiser le système de basculement
    this.viewSwitcher = new ViewSwitcher(this);
    this.viewSwitcher.addSwitchButton();

    // Initialiser la synchronisation des fichiers
    this.fileSynchronizer = new FileSynchronizer(this);
    this.fileSynchronizer.start();

    // Garder l'ancien système pour la compatibilité (sera supprimé plus tard)
    this.modelDetector = new ModelDetector(this, this.layoutService);
    this.modelDetector.onLoad();

    console.log("✅ Agile Board chargé avec mode Board");
  }

  onunload() {
    this.modelDetector.onUnload();
    this.fileSynchronizer.stop();
  }
}

