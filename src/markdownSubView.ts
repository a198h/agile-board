// src/markdownSubView.ts
import { App, TFile, Component, MarkdownRenderer } from "obsidian";
import { SectionInfo } from "./sectionParser";
import { debounce } from "ts-debounce";

export class MarkdownSubView {
  private contentEl: HTMLElement;
  private isRendering = false;
  private debouncedOnChange: (content: string) => void;
  private component: Component;

  constructor(
    private app: App,
    container: HTMLElement,
    private file: TFile,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    this.contentEl = container;
    this.component = new Component();
    
    // Débouncer les changements pour éviter les sauvegardes trop fréquentes
    this.debouncedOnChange = debounce(this.onChange, 300);
    
    this.render();
    this.setupEventListeners();
  }

  private async render(): Promise<void> {
    if (this.isRendering) return;
    this.isRendering = true;

    try {
      // Vider le contenu
      this.contentEl.empty();

      // Obtenir le contenu de la section
      const content = this.section.lines.join('\n');

      if (!content.trim()) {
        this.renderEmptyState();
      } else {
        // Utiliser MarkdownRenderer pour un rendu natif
        await MarkdownRenderer.renderMarkdown(
          content,
          this.contentEl,
          this.file.path,
          this.component
        );
      }

      // Rendre le contenu éditable
      this.makeEditable();
    } finally {
      this.isRendering = false;
    }
  }

  private renderEmptyState(): void {
    const placeholder = this.contentEl.createDiv("empty-frame");
    placeholder.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 80px;
      color: var(--text-muted);
      font-style: italic;
      cursor: text;
    `;
    placeholder.textContent = "Cliquez pour commencer à écrire...";
  }

  private makeEditable(): void {
    // Rendre le contenu éditable
    this.contentEl.contentEditable = "true";
    this.contentEl.style.outline = "none";
    this.contentEl.style.cursor = "text";

    // Gérer les liens pour qu'ils restent cliquables
    this.handleLinksAndInteractiveElements();
  }

  private handleLinksAndInteractiveElements(): void {
    // Gérer les liens internes
    const internalLinks = this.contentEl.querySelectorAll('a.internal-link');
    internalLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('data-href');
        if (href) {
          this.app.workspace.openLinkText(href, this.file.path);
        }
      });
    });

    // Gérer les liens externes
    const externalLinks = this.contentEl.querySelectorAll('a:not(.internal-link)');
    externalLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Laisser le comportement par défaut pour les liens externes
      });
    });

    // Gérer les images
    const images = this.contentEl.querySelectorAll('img');
    images.forEach(img => {
      img.style.pointerEvents = 'auto';
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        // Optionnel : ouvrir l'image dans un modal
      });
    });
  }

  private setupEventListeners(): void {
    // Écouter les changements de contenu
    this.contentEl.addEventListener('input', this.onContentChange.bind(this));
    this.contentEl.addEventListener('paste', this.onPaste.bind(this));
    this.contentEl.addEventListener('keydown', this.onKeyDown.bind(this));

    // Écouter les changements de focus
    this.contentEl.addEventListener('focus', this.onFocus.bind(this));
    this.contentEl.addEventListener('blur', this.onBlur.bind(this));
  }

  private onContentChange(): void {
    const content = this.extractMarkdownFromHTML();
    this.debouncedOnChange(content);
  }

  private onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    
    // Obtenir le texte brut du presse-papiers
    const text = event.clipboardData?.getData('text/plain') || '';
    
    // Insérer le texte à la position du curseur
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      
      // Placer le curseur après le texte inséré
      range.setStartAfter(range.endContainer);
      range.setEndAfter(range.endContainer);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Notifier le changement
    this.onContentChange();
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Gérer les raccourcis clavier spéciaux
    if (event.key === 'Enter') {
      this.handleEnterKey(event);
    } else if (event.key === 'Tab') {
      this.handleTabKey(event);
    }
  }

  private handleEnterKey(event: KeyboardEvent): void {
    // Gérer la création automatique de listes
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const currentNode = range.startContainer;
    
    // Trouver le paragraphe ou l'élément de liste parent
    let listItem = currentNode.parentElement;
    while (listItem && !['LI', 'P', 'DIV'].includes(listItem.tagName)) {
      listItem = listItem.parentElement;
    }

    if (listItem && listItem.tagName === 'LI') {
      event.preventDefault();
      this.createNewListItem(listItem);
    }
  }

  private createNewListItem(currentItem: HTMLElement): void {
    const newItem = document.createElement('li');
    newItem.textContent = '';
    
    // Insérer après l'élément actuel
    if (currentItem.nextSibling) {
      currentItem.parentNode?.insertBefore(newItem, currentItem.nextSibling);
    } else {
      currentItem.parentNode?.appendChild(newItem);
    }

    // Placer le curseur dans le nouvel élément
    const range = document.createRange();
    range.selectNodeContents(newItem);
    range.collapse(true);
    
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private handleTabKey(event: KeyboardEvent): void {
    event.preventDefault();
    
    // Insérer une tabulation ou des espaces
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const tabText = event.shiftKey ? '' : '\t'; // Simplification
      range.insertNode(document.createTextNode(tabText));
      range.collapse(false);
    }
  }

  private onFocus(): void {
    // Ajouter une classe pour le styling
    this.contentEl.classList.add('agile-board-frame-focused');
  }

  private onBlur(): void {
    // Enlever la classe de focus
    this.contentEl.classList.remove('agile-board-frame-focused');
  }

  private extractMarkdownFromHTML(): string {
    // Fonction simple pour extraire le markdown du HTML
    // Dans une implémentation complète, on pourrait utiliser une bibliothèque
    // comme turndown pour une conversion plus robuste
    
    let content = this.contentEl.innerText || '';
    
    // Nettoyer le contenu
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n'); // Réduire les lignes vides multiples
    content = content.trim();
    
    return content;
  }

  // Méthode pour mettre à jour le contenu depuis l'extérieur
  async updateContent(newSection: SectionInfo): Promise<void> {
    this.section = newSection;
    await this.render();
  }

  // Méthode pour nettoyer les event listeners
  destroy(): void {
    this.component.unload();
    this.contentEl.removeEventListener('input', this.onContentChange);
    this.contentEl.removeEventListener('paste', this.onPaste);
    this.contentEl.removeEventListener('keydown', this.onKeyDown);
    this.contentEl.removeEventListener('focus', this.onFocus);
    this.contentEl.removeEventListener('blur', this.onBlur);
  }
}