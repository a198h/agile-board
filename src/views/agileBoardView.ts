// src/agileBoardView.ts
import { FileView, MarkdownView, Menu, Modal, Notice, TFile, WorkspaceLeaf, setIcon } from "obsidian";
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
  private activePopouts: Map<string, TFile> = new Map();

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

    // Empêcher l'auto-switch pendant l'édition (fix #20)
    this.plugin.modelDetector.markUserManualChange(this.file.path);

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
    titleText.style.cursor = 'pointer';

    // Double-clic sur le titre → ouvrir en fenêtre popout (sauf si verrouillé)
    titleText.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.isFrameLocked(block.title)) return;
      void this.openSectionInPopout(block.title);
    });

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

    const ownerDoc = this.containerEl.ownerDocument;
    const fileTitle = this.file?.basename ?? '';
    const version = this.plugin.manifest.version;

    let framesHtml = '';
    this.gridContainer.querySelectorAll('.agile-board-frame').forEach((frame) => {
      const el = frame as HTMLElement;
      const titleText = el.querySelector('.agile-board-frame-title-text')?.textContent?.trim() ?? '';
      const contentEl = el.querySelector('.frame-content');

      let contentHtml = '';
      if (contentEl) {
        const clone = contentEl.cloneNode(true) as HTMLElement;

        // Remove SVG icon elements — Lucide/Obsidian icons render as garbled
        // text without Obsidian's icon CSS/fonts.
        clone.querySelectorAll('svg').forEach(e => e.remove());

        // Real data cards contain value elements (.bases-rendered-value or
        // .bases-metadata-value). The "Fj" placeholder card has only icon
        // spans with no value containers → it is excluded by this filter.
        const cardItems = Array.from(clone.querySelectorAll('.bases-cards-item'))
          .filter(card =>
            card.querySelector('.bases-rendered-value, .bases-metadata-value, .bases-cards-value') !== null
          );
        const tableEl = clone.querySelector('.bases-table');

        if (cardItems.length > 0) {
          clone.innerHTML = '';
          const wrap = ownerDoc.createElement('div');
          wrap.className = 'bases-cards-print';
          cardItems.forEach(card => {
            (card as HTMLElement).removeAttribute('style');
            // Remove the label element only for the "name" property —
            // it's redundant (the file name speaks for itself). All other
            // labels (e.g. "date de création") are kept for context.
            card.querySelectorAll('.bases-cards-property').forEach(prop => {
              const labelEl = Array.from(prop.children).find(
                c => !c.classList.contains('bases-rendered-value') &&
                     !c.classList.contains('bases-metadata-value')
              );
              if (labelEl?.textContent?.trim().toLowerCase() === 'name') {
                labelEl.remove();
              }
            });
            wrap.appendChild(card.cloneNode(true));
          });
          clone.appendChild(wrap);
        } else if (tableEl) {
          clone.innerHTML = '';
          const wrap = ownerDoc.createElement('div');
          wrap.className = 'bases-table-print';
          (tableEl as HTMLElement).removeAttribute('style');
          wrap.appendChild(tableEl.cloneNode(true));
          clone.appendChild(wrap);
        }

        // Strip all inline styles from Bases elements — Obsidian sets margins,
        // paddings and heights via JS that would override our iframe CSS reset.
        clone.querySelectorAll('[class*="bases-"]').forEach(e => {
          (e as HTMLElement).removeAttribute('style');
        });

        // Replace every <input> with a <span>.
        // For date/datetime inputs, format as DD/MM/YYYY HH:MM:SS to match
        // Obsidian Bases display format instead of the raw ISO input value.
        clone.querySelectorAll('input').forEach(input => {
          const inp = input as HTMLInputElement;
          // Checkboxes render fine as disabled form controls — skip them.
          if (inp.type === 'checkbox') return;
          const span = ownerDoc.createElement('span');
          let text = inp.value || inp.placeholder || '';
          if (inp.value && (inp.type === 'datetime-local' || inp.type === 'date')) {
            const d = new Date(inp.value);
            if (!isNaN(d.getTime())) {
              const p = (n: number) => String(n).padStart(2, '0');
              text = inp.type === 'date'
                ? `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
                : `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
            }
          }
          span.textContent = text;
          span.className = 'print-input-value';
          inp.replaceWith(span);
        });

        contentHtml = clone.innerHTML;
      }

      framesHtml +=
        `<div class="frame" style="grid-column:${el.style.gridColumn};grid-row:${el.style.gridRow}">` +
        `<div class="ft">${titleText}</div>` +
        `<div class="fb">${contentHtml}</div></div>`;
    });

    // Isolated HTML document for print. fr units scale the grid to any paper
    // size/orientation — computed px values would overflow on paper.
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
@page{margin:1.5cm;size:auto}
html,body{width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column}
header{font-size:1rem;font-weight:700;padding-bottom:.5em;border-bottom:2px solid #333;margin-bottom:.5em;flex-shrink:0}
.grid{display:grid;grid-template-columns:repeat(24,1fr);grid-template-rows:repeat(24,1fr);gap:3px;width:100%;flex:1;min-height:0}
footer{font-size:.65rem;color:#999;text-align:right;padding-top:.4em;margin-top:.4em;flex-shrink:0}
.frame{border:1px solid #ccc;border-radius:4px;overflow:hidden;display:flex;flex-direction:column;min-height:0}
.ft{padding:.3em .5em;font-weight:600;font-size:.8rem;background:#f3f4f6;border-bottom:1px solid #ddd;flex-shrink:0}
.fb{padding:.3em .5em;font-size:.72rem;line-height:1.4;overflow:hidden;flex:1;min-height:0}
h1,h2,h3{margin:.2em 0;font-size:.85em}
ul,ol{padding-left:1em;margin:.1em 0}
li{margin:.05em 0}
p{margin:.1em 0}
input[type=checkbox]{pointer-events:none;margin-right:.3em}
.callout{border-left:3px solid #888;background:#f8f8f8;border-radius:3px;margin:.2em 0;padding:.2em .4em}
.callout-title{display:flex;align-items:center;font-weight:600;font-size:.8em;gap:.3em;margin-bottom:.15em}
.callout-icon,.callout-fold{display:none}
.callout-content{font-size:.75em}
/* Bases — toolbar removed in JS (clone+remove), so no blank space from hidden elements.
   Divs need explicit display:table-* since Obsidian CSS isn't loaded in the iframe. */
.bases-view{display:block;width:100%;font-size:.72em}
.bases-table{display:table;width:100%;border-collapse:collapse}
.bases-thead{display:table-header-group;background:#f3f4f6}
.bases-tbody{display:table-row-group}
.bases-tr{display:table-row}
.bases-td{display:table-cell;padding:.15em .3em;border:1px solid #ddd;vertical-align:top;font-size:.75em}
.bases-table-header-name{font-weight:600;font-size:.78em}
.bases-table-header-resizer,.bases-table-header-icon{display:none}
/* Cards view: 2-column grid */
.bases-cards-print{display:grid;grid-template-columns:1fr 1fr;gap:.3em;width:100%}
.bases-cards-item{border:1px solid #ddd;border-radius:3px;padding:.3em .4em;box-sizing:border-box;font-size:.7em;min-width:0}
/* Property labels: small gray text above value (except "name" removed in JS) */
.bases-cards-property>*:not(.bases-rendered-value):not(.bases-metadata-value){display:block;font-size:.65em;color:#888;margin-top:.15em}
.bases-rendered-value,.bases-metadata-value{display:block}
.bases-cards-property{display:block;margin:.05em 0;line-height:1.3}
.bases-cards-line{display:inline}
/* Property labels in cards */
.bases-property-label,.bases-label{font-size:.7em;color:#888;display:block}
/* Input values replaced with span.print-input-value */
.print-input-value{font-size:.75em;color:#444}
table{width:100%;border-collapse:collapse;font-size:.7em}
th{background:#f3f4f6;font-weight:600;padding:.15em .3em;border:1px solid #ddd;text-align:left}
td{padding:.1em .3em;border:1px solid #eee}
</style></head><body>
<header>${fileTitle}</header>
<div class="grid">${framesHtml}</div>
<footer>Agile Board v${version}</footer>
</body></html>`;

    const iframe = ownerDoc.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:210mm;height:297mm';
    ownerDoc.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) { iframe.remove(); return; }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 300);
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

  /**
   * Ouvre le contenu d'une section dans une fenêtre popout via un fichier temporaire.
   */
  private async openSectionInPopout(sectionTitle: string): Promise<void> {
    if (!this.file) return;

    // Empêcher l'ouverture de plusieurs popouts pour la même section
    if (this.activePopouts.has(sectionTitle)) {
      new Notice(t('popout.alreadyOpen', { title: sectionTitle }));
      return;
    }

    // Récupérer le contenu de la section
    const sections = await parseHeadingsInFile(this.app, this.file);
    const section = sections[sectionTitle];
    if (!section) return;

    const sectionContent = section.lines.join('\n');

    // Créer le fichier temporaire à la racine du vault
    const timestamp = Date.now();
    const tempFileName = `_ab-tmp-${timestamp}.md`;
    const tempFile = await this.app.vault.create(tempFileName, sectionContent);

    this.activePopouts.set(sectionTitle, tempFile);

    // Ouvrir dans une fenêtre popout
    const newLeaf = this.app.workspace.openPopoutLeaf();
    await newLeaf.openFile(tempFile, { state: { mode: 'source', source: false } });

    // Surveiller la fermeture du leaf
    const onClose = this.app.workspace.on('layout-change', async () => {
      // Vérifier si le leaf est toujours attaché
      if (newLeaf.parent) return;

      // Le leaf a été fermé — resync le contenu
      this.app.workspace.offref(onClose);
      await this.syncPopoutBack(sectionTitle, tempFile);
    });
  }

  /**
   * Synchronise le contenu du fichier temporaire vers la section originale, puis supprime le temp.
   */
  private async syncPopoutBack(sectionTitle: string, tempFile: TFile): Promise<void> {
    if (!this.file) return;

    try {
      // Lire le contenu édité
      const editedContent = await this.app.vault.read(tempFile);

      // Mettre à jour la section dans le fichier original
      await this.onFrameContentChanged(sectionTitle, editedContent);

      // Supprimer le fichier temporaire
      await this.app.vault.delete(tempFile);

      // Rafraîchir le frame
      const frame = this.frames.get(sectionTitle);
      if (frame) {
        await frame.updateContent(editedContent);
      }
    } finally {
      this.activePopouts.delete(sectionTitle);
    }
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