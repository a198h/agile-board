// src/viewSwitcher.ts
import { MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import { AGILE_BOARD_VIEW_TYPE, AgileBoardView } from "./agileBoardView";
import AgileBoardPlugin from "./main";

export class ViewSwitcher {
  constructor(private plugin: AgileBoardPlugin) {}

  async switchToBoardView(file: TFile): Promise<void> {
    const leaf = this.plugin.app.workspace.activeLeaf;
    if (!leaf) return;

    await leaf.setViewState({
      type: AGILE_BOARD_VIEW_TYPE,
      state: { file: file.path }
    });
  }

  async switchToMarkdownView(file: TFile): Promise<void> {
    const leaf = this.plugin.app.workspace.activeLeaf;
    if (!leaf) return;

    await leaf.setViewState({
      type: "markdown",
      state: { file: file.path }
    });
  }

  isCurrentViewBoardView(): boolean {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(AgileBoardView);
    return activeView !== null;
  }

  isCurrentViewMarkdownView(): boolean {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    return activeView !== null;
  }

  getCurrentFile(): TFile | null {
    return this.plugin.app.workspace.getActiveFile();
  }

  hasAgileBoardLayout(file: TFile): boolean {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    return cache?.frontmatter?.["agile-board"] !== undefined;
  }

  addSwitchButton(): void {
    // Ajouter le bouton de basculement dans la toolbar des vues markdown
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        this.updateSwitchButton();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("file-open", () => {
        this.updateSwitchButton();
      })
    );
  }

  private updateSwitchButton(): void {
    const file = this.getCurrentFile();
    if (!file || !file.path.endsWith('.md')) return;

    const hasLayout = this.hasAgileBoardLayout(file);
    const isBoardView = this.isCurrentViewBoardView();
    const isMarkdownView = this.isCurrentViewMarkdownView();

    // Enlever les boutons existants
    this.removeSwitchButtons();

    if (hasLayout && isMarkdownView) {
      this.addBoardModeButton();
    } else if (isBoardView) {
      this.addNormalModeButton();
    }
  }

  private addBoardModeButton(): void {
    const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) return;

    const button = markdownView.addAction(
      "layout-grid",
      "Mode Board",
      () => {
        const file = this.getCurrentFile();
        if (file) {
          this.switchToBoardView(file);
        }
      }
    );
    
    button.addClass("agile-board-switch-button");
  }

  private addNormalModeButton(): void {
    const boardView = this.plugin.app.workspace.getActiveViewOfType(AgileBoardView);
    if (!boardView) return;

    const button = (boardView as any).addAction(
      "document",
      "Mode Normal",
      () => {
        const file = this.getCurrentFile();
        if (file) {
          this.switchToMarkdownView(file);
        }
      }
    );
    
    button.addClass("agile-board-switch-button");
  }

  private removeSwitchButtons(): void {
    // Enlever tous les boutons de basculement existants
    const buttons = document.querySelectorAll('.agile-board-switch-button');
    buttons.forEach(button => button.remove());
  }
}