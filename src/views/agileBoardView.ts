// src/agileBoardView.ts
import { FileView, MarkdownView, Menu, Modal, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import { LayoutModel, LayoutBlock } from "../types";
import { SectionInfo, parseHeadingsInFile } from "../core/parsers/sectionParser";
import { SimpleMarkdownFrame } from "./simpleMarkdownFrame";
import { t } from "../i18n";
import AgileBoardPlugin from "../main";
import { applyFrameContentVisualLayoutStyles, applyGridLayoutStyles } from "../core/dom/layoutStyles";

export const AGILE_BOARD_VIEW_TYPE = "agile-board-view";

export class AgileBoardView extends FileView {
  private frames: Map<string, SimpleMarkdownFrame> = new Map();
  private layoutBlocks: LayoutModel = [];
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
    this.cleanup();
  }

  private async renderBoardLayout(): Promise<void> {
    if (!this.file) return;

    this.cleanup();

    // Vérifier si le fichier a un layout agile-board
    const cache = this.app.metadataCache.getFileCache(this.file);
    const modelName = cache?.frontmatter?.["agile-board"] as string | undefined;

    if (!modelName) {
      this.showNoLayoutMessage();
      return;
    }

    // Récupérer le modèle depuis le plugin
    const model = await this.plugin.layoutService.getModel(modelName);
    if (!model) {
      this.showLayoutNotFoundMessage(modelName);
      return;
    }

    this.layoutBlocks = [...model];

    // Parser les sections du fichier
    const sections = await parseHeadingsInFile(this.app, this.file);

    // Créer la grille
    this.createGrid();

    // Créer les cadres
    this.createFrames(sections);
  }

  private cleanup(): void {
    // Nettoyer les frames existantes
    Array.from(this.frames.values()).forEach(frame => frame.unload());
    this.frames.clear();

    // Nettoyer le container
    if (this.gridContainer) {
      this.gridContainer.remove();
      this.gridContainer = null;
    }
  }

  private createGrid(): void {
    this.gridContainer = this.contentEl.createDiv("agile-board-grid");
    applyGridLayoutStyles(this.gridContainer);
  }

  private createFrames(sections: Record<string, SectionInfo>): void {
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

      // Titre du cadre avec bouton lock
      this.createFrameTitle(frameContainer, block);

      // Contenu du cadre
      const contentEl = frameContainer.createDiv("frame-content");

      // Apply layout-critical styles
      applyFrameContentVisualLayoutStyles(contentEl);

      // Apply visual styles
      contentEl.style.padding = '0.5rem';

      // Créer la vue markdown simple avec callback de verrouillage
      const simpleMarkdownFrame = new SimpleMarkdownFrame(
        contentEl,
        this.app,
        this.file!,
        section,
        (newContent) => {
          void this.onFrameContentChanged(block.title, newContent);
        },
        () => this.isFrameLocked(block.title)
      );

      this.frames.set(block.title, simpleMarkdownFrame);
    }
  }

  private async onFrameContentChanged(title: string, newContent: string): Promise<void> {
    if (!this.file) return;

    // Notifier le synchroniseur que le changement vient de cette vue
    this.plugin.fileSynchronizer.notifyBoardViewChange(this.file);

    // Trouver la section correspondante
    const sections = await parseHeadingsInFile(this.app, this.file);
    const section = sections[title];
    if (!section) {
      console.error(`❌ [AgileBoardView] Section "${title}" introuvable!`);
      return;
    }

    // Tenter d'utiliser l'API Editor si une vue Markdown active existe
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (activeView && activeView.file?.path === this.file.path && activeView.editor) {
      // MÉTHODE OPTIMALE: Utiliser editor.replaceRange() pour modifier seulement la section
      const editor = activeView.editor;

      // Calculer les positions de début et fin de la section (sans le heading)
      const startPos = { line: section.start + 1, ch: 0 };
      const endPos = { line: section.end, ch: 0 };

      // Remplacer uniquement la section concernée
      editor.replaceRange(newContent + '\n', startPos, endPos);
    } else {
      // FALLBACK: Réécrire tout le fichier si pas d'éditeur actif
      const fileContent = await this.app.vault.read(this.file);
      const lines = fileContent.split('\n');

      const before = lines.slice(0, section.start + 1);
      const after = lines.slice(section.end);
      const newLines = [...before, ...newContent.split('\n'), ...after];

      await this.app.vault.modify(this.file, newLines.join('\n'));
    }
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
    message.textContent = "Cette note n'a pas de tableau agile-board configuré";
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
    message.textContent = `Tableau "${modelName}" introuvable`;
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
    title.textContent = t("view.missingSectionsTitle");

    const description = overlay.createEl("p");
    description.textContent = t("view.missingSectionsDescription");

    const list = overlay.createEl("ul");
    missingTitles.forEach(title => {
      const item = list.createEl("li");
      item.textContent = `# ${title}`;
    });

    const button = overlay.createEl("button", { cls: "mod-cta" });
    button.textContent = t("view.createMissingSections");
    button.addEventListener("click", () => {
      void this.createMissingSections(missingTitles);
    });
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

  /**
   * Crée la barre de titre d'un cadre avec le bouton lock.
   */
  private createFrameTitle(container: HTMLElement, block: LayoutBlock): void {
    const titleEl = container.createDiv("frame-title");
    titleEl.style.cssText = 'flex-shrink: 0; display: flex; align-items: center; gap: 0.5em;';

    const titleText = titleEl.createSpan({ cls: 'agile-board-frame-title-text' });
    titleText.textContent = block.title;
    titleText.style.flex = '1';

    const lockBtn = titleEl.createEl('button', { cls: 'agile-board-lock-btn clickable-icon' });
    lockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      void this.toggleFrameLock(block.title, lockBtn);
    });
    this.updateLockIcon(lockBtn, this.isFrameLocked(block.title));
  }

  /**
   * Vérifie si un cadre est verrouillé.
   */
  private isFrameLocked(sectionTitle: string): boolean {
    const filePath = this.file?.path;
    if (!filePath) return false;
    return this.plugin.settings.lockedFrames[filePath]?.includes(sectionTitle) ?? false;
  }

  /**
   * Bascule l'état de verrouillage d'un cadre.
   */
  private async toggleFrameLock(sectionTitle: string, lockBtn: HTMLElement): Promise<void> {
    const filePath = this.file?.path;
    if (!filePath) return;

    const currentLocked = { ...this.plugin.settings.lockedFrames };
    const fileLocks = [...(currentLocked[filePath] ?? [])];
    const index = fileLocks.indexOf(sectionTitle);

    if (index >= 0) {
      fileLocks.splice(index, 1);
    } else {
      fileLocks.push(sectionTitle);
    }

    if (fileLocks.length === 0) {
      delete currentLocked[filePath];
    } else {
      currentLocked[filePath] = fileLocks;
    }

    this.plugin.settings = { ...this.plugin.settings, lockedFrames: currentLocked };
    await this.plugin.saveSettings();
    this.updateLockIcon(lockBtn, index < 0);
  }

  /**
   * Met à jour l'icône du bouton lock.
   */
  private updateLockIcon(btn: HTMLElement, locked: boolean): void {
    btn.empty();
    setIcon(btn, locked ? 'lock' : 'lock-open');
    btn.setAttribute('aria-label',
      locked ? t('settings.lock.unlockTooltip') : t('settings.lock.lockTooltip')
    );
  }

  /**
   * Peuple le menu contextuel de la vue (menu "..." et clic droit sur l'onglet).
   */
  onPaneMenu(menu: Menu, source: string): void {
    if (!this.file) {
      super.onPaneMenu(menu, source);
      return;
    }

    const file = this.file;

    // === Mode de vue ===
    menu.addItem(item => item
      .setIcon('document')
      .setTitle(t('menu.livePreview'))
      .onClick(() => { void this.plugin.viewSwitcher.switchToMarkdownView(file); })
    );

    menu.addItem(item => item
      .setIcon('code')
      .setTitle(t('menu.sourceMode'))
      .onClick(() => { void this.plugin.viewSwitcher.switchToSourceMode(file); })
    );

    menu.addSeparator();

    // === Fractionner / Fenêtre ===
    menu.addItem(item => item
      .setIcon('separator-vertical')
      .setTitle(t('menu.splitRight'))
      .onClick(() => { void this.app.workspace.duplicateLeaf(this.leaf, 'vertical'); })
    );

    menu.addItem(item => item
      .setIcon('separator-horizontal')
      .setTitle(t('menu.splitDown'))
      .onClick(() => { void this.app.workspace.duplicateLeaf(this.leaf, 'horizontal'); })
    );

    menu.addItem(item => item
      .setIcon('arrow-up-right')
      .setTitle(t('menu.openNewWindow'))
      .onClick(() => { void this.app.workspace.duplicateLeaf(this.leaf, 'window'); })
    );

    menu.addSeparator();

    // === Actions fichier ===
    menu.addItem(item => item
      .setIcon('pencil')
      .setTitle(t('menu.rename'))
      .onClick(() => {
        this.promptRenameFile(file);
      })
    );

    menu.addItem(item => item
      .setIcon('folder-input')
      .setTitle(t('menu.moveTo'))
      .onClick(() => {
        (this.app as unknown as { commands: { executeCommandById: (id: string) => void } })
          .commands.executeCommandById('file-explorer:move-file');
      })
    );

    menu.addItem(item => item
      .setIcon('bookmark')
      .setTitle(t('menu.bookmark'))
      .onClick(() => {
        (this.app as unknown as { commands: { executeCommandById: (id: string) => void } })
          .commands.executeCommandById('bookmarks:bookmark-current-view');
      })
    );

    menu.addSeparator();

    // === Export ===
    menu.addItem(item => item
      .setIcon('printer')
      .setTitle(t('menu.printBoard'))
      .onClick(() => { this.printBoard(); })
    );

    menu.addSeparator();

    // === Chemin et navigation ===
    menu.addItem(item => item
      .setIcon('copy')
      .setTitle(t('menu.copyPath'))
      .onClick(() => { void navigator.clipboard.writeText(file.path); })
    );

    menu.addItem(item => item
      .setIcon('folder-open')
      .setTitle(t('menu.revealExplorer'))
      .onClick(() => {
        (this.app as unknown as { commands: { executeCommandById: (id: string) => void } })
          .commands.executeCommandById('file-explorer:reveal-active-file');
      })
    );

    menu.addSeparator();

    // === Suppression ===
    menu.addItem(item => item
      .setIcon('trash')
      .setTitle(t('menu.deleteFile'))
      .setWarning(true)
      .onClick(() => { void this.app.fileManager.promptForDeletion(file); })
    );

    super.onPaneMenu(menu, source);
  }

  /**
   * Imprime le board via un iframe caché injecté dans le DOM.
   */
  private printBoard(): void {
    if (!this.gridContainer) return;

    const gridEl = this.gridContainer;
    const gridStyles = window.getComputedStyle(gridEl);

    // Construire le HTML des frames
    let framesHtml = '';
    const frames = gridEl.querySelectorAll('.agile-board-frame');
    frames.forEach((frame) => {
      const el = frame as HTMLElement;
      const titleEl = el.querySelector('.frame-title');
      const contentEl = el.querySelector('.frame-content');
      const titleText = titleEl?.textContent?.replace(/[\n\r]/g, '').trim() ?? '';
      const contentHtml = contentEl?.innerHTML ?? '';
      framesHtml +=
        `<div class="frame" style="grid-column: ${el.style.gridColumn}; grid-row: ${el.style.gridRow};">` +
        `<div class="frame-title">${titleText}</div>` +
        `<div class="frame-body">${contentHtml}</div></div>`;
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 1rem; }
  .grid {
    display: grid;
    grid-template-columns: ${gridStyles.gridTemplateColumns};
    grid-template-rows: ${gridStyles.gridTemplateRows};
    gap: ${gridStyles.gap};
    width: 100%;
    min-height: 90vh;
  }
  .frame { border: 1px solid #ccc; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; }
  .frame-title { padding: 0.4em 0.6em; font-weight: 600; font-size: 0.95rem; background: #f3f4f6; border-bottom: 1px solid #ccc; }
  .frame-body { padding: 0.5em 0.6em; font-size: 0.85rem; line-height: 1.5; }
  h1, h2, h3 { margin: 0.3em 0; }
  ul, ol { padding-left: 1.2em; }
</style></head><body><div class="grid">${framesHtml}</div></body></html>`;

    // Créer un iframe caché
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position: fixed; top: -10000px; left: -10000px; width: 1px; height: 1px;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) {
      iframe.remove();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Attendre le rendu puis imprimer
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Nettoyer après impression
      setTimeout(() => iframe.remove(), 1000);
    }, 250);
  }

  /**
   * Ouvre un prompt pour renommer le fichier.
   */
  private promptRenameFile(file: TFile): void {
    const modal = new Modal(this.app);
    modal.titleEl.setText(t('menu.rename'));

    const input = modal.contentEl.createEl('input', { type: 'text' });
    input.value = file.basename;
    input.style.width = '100%';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doRename();
      }
    });

    const doRename = (): void => {
      const newName = input.value.trim();
      if (newName && newName !== file.basename) {
        const newPath = file.parent ? `${file.parent.path}/${newName}.${file.extension}` : `${newName}.${file.extension}`;
        void this.app.fileManager.renameFile(file, newPath);
      }
      modal.close();
    };

    modal.contentEl.createEl('button', { text: t('common.save'), cls: 'mod-cta' }, (btn) => {
      btn.style.marginTop = '12px';
      btn.addEventListener('click', doRename);
    });

    modal.open();
    input.focus();
    input.select();
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