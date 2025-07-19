// src/agileBoardView.ts
import { FileView, TFile, WorkspaceLeaf } from "obsidian";
import { LayoutBlock } from "./types";
import { SectionInfo, parseHeadingsInFile } from "./sectionParser";
import { SimpleMarkdownFrame } from "./simpleMarkdownFrame";
import AgileBoardPlugin from "./main";

export const AGILE_BOARD_VIEW_TYPE = "agile-board-view";

export class AgileBoardView extends FileView {
  private frames: Map<string, SimpleMarkdownFrame> = new Map();
  private layoutBlocks: LayoutBlock[] = [];
  private gridContainer: HTMLElement | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: AgileBoardPlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return AGILE_BOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.file ? `${this.file.basename} (Board)` : "Agile Board";
  }

  getIcon(): string {
    return "layout-grid";
  }

  async onLoadFile(file: TFile): Promise<void> {
    await this.renderBoardLayout();
  }

  async onUnloadFile(file: TFile): Promise<void> {
    await this.cleanup();
  }

  private async renderBoardLayout(): Promise<void> {
    if (!this.file) return;

    await this.cleanup();

    // Vérifier si le fichier a un layout agile-board
    const cache = this.app.metadataCache.getFileCache(this.file);
    const modelName = cache?.frontmatter?.["agile-board"] as string | undefined;

    if (!modelName) {
      this.showNoLayoutMessage();
      return;
    }

    // Récupérer le modèle depuis le plugin
    const model = this.plugin.layoutService.getModel(modelName);
    if (!model) {
      this.showLayoutNotFoundMessage(modelName);
      return;
    }

    this.layoutBlocks = model;

    // Parser les sections du fichier
    const sections = await parseHeadingsInFile(this.app, this.file);

    // Créer la grille
    this.createGrid();

    // Créer les cadres
    await this.createFrames(sections);
  }

  private async cleanup(): Promise<void> {
    // Nettoyer les frames existantes
    const destroyPromises = Array.from(this.frames.values()).map(frame => frame.destroy());
    await Promise.all(destroyPromises);
    this.frames.clear();

    // Nettoyer le container
    if (this.gridContainer) {
      this.gridContainer.remove();
      this.gridContainer = null;
    }
  }

  private createGrid(): void {
    this.gridContainer = this.contentEl.createDiv("agile-board-grid");
    this.gridContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 0.5rem;
      padding: 1rem;
      height: 100%;
      overflow: auto;
    `;
  }

  private async createFrames(sections: Record<string, SectionInfo>): Promise<void> {
    if (!this.gridContainer) return;

    // Vérifier les titres manquants
    const missingTitles = this.layoutBlocks
      .map(b => b.title)
      .filter(title => !(title in sections));

    if (missingTitles.length > 0) {
      this.showMissingSectionsError(missingTitles);
      return;
    }

    // Créer les cadres pour chaque bloc
    for (const block of this.layoutBlocks) {
      const section = sections[block.title];
      if (!section) continue;

      const frameContainer = this.gridContainer.createDiv("agile-board-frame");
      frameContainer.style.cssText = `
        grid-column: ${block.x + 1} / span ${block.w};
        grid-row: ${block.y + 1} / span ${block.h};
        min-height: 100px;
        display: flex;
        flex-direction: column;
      `;

      // Titre du cadre
      const titleEl = frameContainer.createDiv("frame-title");
      titleEl.style.cssText = `
        flex-shrink: 0;
      `;
      titleEl.textContent = block.title;

      // Contenu du cadre
      const contentEl = frameContainer.createDiv("frame-content");
      contentEl.style.cssText = `
        flex: 1;
        overflow: auto;
        padding: 0.5rem;
      `;

      // Créer la vue markdown simple
      const simpleMarkdownFrame = new SimpleMarkdownFrame(
        this.app,
        contentEl,
        this.file!,
        section,
        (newContent) => this.onFrameContentChanged(block.title, newContent)
      );

      this.frames.set(block.title, simpleMarkdownFrame);
    }
  }

  private async onFrameContentChanged(title: string, newContent: string): Promise<void> {
    if (!this.file) return;

    // Notifier le synchroniseur que le changement vient de cette vue
    this.plugin.fileSynchronizer.notifyBoardViewChange(this.file);

    // Récupérer le contenu actuel du fichier
    const fileContent = await this.app.vault.read(this.file);
    const lines = fileContent.split('\n');

    // Trouver la section correspondante
    const sections = await parseHeadingsInFile(this.app, this.file);
    const section = sections[title];
    if (!section) return;

    // Remplacer le contenu de la section
    const before = lines.slice(0, section.start + 1);
    const after = lines.slice(section.end);
    const newLines = [...before, ...newContent.split('\n'), ...after];

    // Sauvegarder le fichier
    await this.app.vault.modify(this.file, newLines.join('\n'));
  }

  private showNoLayoutMessage(): void {
    this.contentEl.empty();
    const message = this.contentEl.createDiv("no-layout-message");
    message.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 1.2em;
      color: var(--text-muted);
    `;
    message.textContent = "Cette note n'a pas de layout agile-board configuré";
  }

  private showLayoutNotFoundMessage(modelName: string): void {
    this.contentEl.empty();
    const message = this.contentEl.createDiv("layout-not-found-message");
    message.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 1.2em;
      color: var(--text-error);
    `;
    message.textContent = `Layout "${modelName}" introuvable`;
  }

  private showMissingSectionsError(missingTitles: string[]): void {
    if (!this.gridContainer) return;

    const overlay = this.gridContainer.createDiv("missing-sections-overlay");
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--background-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      z-index: 1000;
    `;

    const title = overlay.createEl("h2");
    title.textContent = "❌ Sections manquantes";

    const description = overlay.createEl("p");
    description.textContent = "Les sections suivantes sont requises :";

    const list = overlay.createEl("ul");
    missingTitles.forEach(title => {
      const item = list.createEl("li");
      item.textContent = `# ${title}`;
    });

    const button = overlay.createEl("button", { cls: "mod-cta" });
    button.textContent = "➕ Créer les sections manquantes";
    button.addEventListener("click", () => this.createMissingSections(missingTitles));
  }

  private async createMissingSections(missingTitles: string[]): Promise<void> {
    if (!this.file) return;

    const content = await this.app.vault.read(this.file);
    const lines = content.split('\n');

    // Trouver la fin du frontmatter
    let bodyStart = 0;
    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          bodyStart = i + 1;
          break;
        }
      }
    }

    // Ajouter les sections manquantes
    const sectionsToAdd = missingTitles.map(title => `# ${title}\n\n`).join('');
    const newContent = [
      ...lines.slice(0, bodyStart),
      sectionsToAdd,
      ...lines.slice(bodyStart)
    ].join('\n');

    await this.app.vault.modify(this.file, newContent);
    
    // Recharger la vue
    await this.renderBoardLayout();
  }

  // Méthode pour basculer vers le mode normal
  async switchToNormalView(): Promise<void> {
    if (!this.file) return;

    const leaf = this.leaf;
    await leaf.setViewState({
      type: "markdown",
      state: { file: this.file.path }
    });
  }
}