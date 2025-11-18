// src/markdownSubView.ts
import { App, TFile, Component, MarkdownRenderer, Editor, MarkdownView } from "obsidian";
import { SectionInfo } from "./sectionParser";
import { debounce } from "ts-debounce";
import { t } from "./i18n";

export class MarkdownSubView {
  private contentEl: HTMLElement;
  private isRendering = false;
  private debouncedOnChange: (content: string) => void;
  private component: Component;
  private markdownContent: string;
  private isEditing = false;
  private textArea: HTMLTextAreaElement | null = null;
  private previewEl: HTMLElement | null = null;

  constructor(
    private app: App,
    container: HTMLElement,
    private file: TFile,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    this.contentEl = container;
    this.component = new Component();
    this.markdownContent = this.section.lines.join('\n');

    // Débouncer les changements pour éviter les sauvegardes trop fréquentes
    const debouncedFn = debounce((content: string) => {
      void this.onChange(content);
    }, 300);
    this.debouncedOnChange = (content: string) => {
      void debouncedFn(content);
    };

    void this.render();
    this.setupEventListeners();
  }

  private async render(): Promise<void> {
    if (this.isRendering) return;
    this.isRendering = true;

    try {
      // Vider le contenu
      this.contentEl.empty();
      
      // Créer les deux modes : preview et édition
      this.createPreviewMode();
      this.createEditMode();
      
      // Afficher le mode approprié
      if (this.isEditing) {
        this.showEditMode();
      } else {
        this.showPreviewMode();
      }
      
    } finally {
      this.isRendering = false;
    }
  }
  
  private createPreviewMode(): void {
    this.previewEl = this.contentEl.createDiv('markdown-preview');
    this.previewEl.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      cursor: text;
    `;

    void this.renderPreview();
  }
  
  private createEditMode(): void {
    this.textArea = this.contentEl.createEl('textarea');
    // Respecter la configuration de vérification orthographique d'Obsidian
    // @ts-ignore - accès aux paramètres internes d'Obsidian
    this.textArea.spellcheck = this.app.vault.config?.spellcheck ?? false;
    this.textArea.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      resize: none;
      font-family: var(--font-text);
      font-size: var(--font-size-normal);
      background: transparent;
      color: var(--text-normal);
      padding: 0;
      margin: 0;
      display: none;
      line-height: 1.6;
    `;
    
    this.textArea.value = this.markdownContent;
    
    // Ajouter les raccourcis clavier pour simuler le live-preview
    this.addLivePreviewKeyboardShortcuts();
  }
  
  private async renderPreview(): Promise<void> {
    if (!this.previewEl) return;
    
    this.previewEl.empty();
    
    if (!this.markdownContent.trim()) {
      this.renderEmptyState();
    } else {
      // Utiliser MarkdownRenderer pour un rendu natif
      await MarkdownRenderer.render(
        this.app,
        this.markdownContent,
        this.previewEl,
        this.file.path,
        this.component
      );
      
      // Post-traitement pour les éléments spécifiques d'Obsidian
      this.processObsidianElements();
    }
  }
  
  private processObsidianElements(): void {
    if (!this.previewEl) return;
    
    // Traiter les images internes ![[image.jpg]]
    this.processInternalImages();
    
    // Traiter les liens internes [[note]]
    this.processInternalLinks();
  }
  
  private processInternalImages(): void {
    if (!this.previewEl) return;
    
    // Chercher les textes qui correspondent au pattern ![[image.jpg]]
    const walker = document.createTreeWalker(
      this.previewEl,
      NodeFilter.SHOW_TEXT
    );
    
    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent?.includes('![[')) {
        textNodes.push(node as Text);
      }
    }
    
    textNodes.forEach(textNode => {
      const content = textNode.textContent || '';
      const imageRegex = /!\[\[([^\]]+)\]\]/g;
      let match;
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();
      
      while ((match = imageRegex.exec(content)) !== null) {
        // Ajouter le texte avant l'image
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(content.slice(lastIndex, match.index)));
        }
        
        // Créer l'élément image
        const imageName = match[1];
        const imageEl = this.createImageElement(imageName);
        fragment.appendChild(imageEl);
        
        lastIndex = imageRegex.lastIndex;
      }
      
      // Ajouter le texte restant
      if (lastIndex < content.length) {
        fragment.appendChild(document.createTextNode(content.slice(lastIndex)));
      }
      
      // Remplacer le nœud texte par le fragment
      if (fragment.childNodes.length > 0) {
        textNode.parentNode?.replaceChild(fragment, textNode);
      }
    });
  }
  
  private createImageElement(imageName: string): HTMLElement {
    const container = document.createElement('span');
    container.className = 'image-embed';
    
    // Résoudre le chemin de l'image
    const imageFile = this.app.metadataCache.getFirstLinkpathDest(imageName, this.file.path);
    
    if (imageFile) {
      const img = document.createElement('img');
      img.src = this.app.vault.getResourcePath(imageFile);
      img.alt = imageName;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      
      // Ajouter un clic pour ouvrir l'image
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        void this.app.workspace.openLinkText(imageName, this.file.path);
      });
      
      container.appendChild(img);
    } else {
      // Image non trouvée
      const placeholder = document.createElement('span');
      placeholder.className = 'image-embed-placeholder';
      placeholder.textContent = `![[${imageName}]]`;
      placeholder.style.cssText = `
        color: var(--text-error);
        background: var(--background-secondary);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--font-monospace);
      `;
      container.appendChild(placeholder);
    }
    
    return container;
  }
  
  private processInternalLinks(): void {
    if (!this.previewEl) return;
    
    // Chercher les textes qui correspondent au pattern [[note]]
    const walker = document.createTreeWalker(
      this.previewEl,
      NodeFilter.SHOW_TEXT
    );
    
    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent?.includes('[[') && !node.textContent?.includes('![[')) {
        textNodes.push(node as Text);
      }
    }
    
    textNodes.forEach(textNode => {
      const content = textNode.textContent || '';
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      let match;
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();
      
      while ((match = linkRegex.exec(content)) !== null) {
        // Ajouter le texte avant le lien
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(content.slice(lastIndex, match.index)));
        }
        
        // Créer l'élément lien
        const linkText = match[1];
        const linkEl = this.createLinkElement(linkText);
        fragment.appendChild(linkEl);
        
        lastIndex = linkRegex.lastIndex;
      }
      
      // Ajouter le texte restant
      if (lastIndex < content.length) {
        fragment.appendChild(document.createTextNode(content.slice(lastIndex)));
      }
      
      // Remplacer le nœud texte par le fragment
      if (fragment.childNodes.length > 0) {
        textNode.parentNode?.replaceChild(fragment, textNode);
      }
    });
  }
  
  private createLinkElement(linkText: string): HTMLElement {
    const link = document.createElement('a');
    link.className = 'internal-link';
    link.textContent = linkText;
    link.href = '#';
    
    // Gérer le clic sur le lien
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.app.workspace.openLinkText(linkText, this.file.path);
    });
    
    return link;
  }
  
  private showPreviewMode(): void {
    if (this.previewEl) this.previewEl.style.display = 'block';
    if (this.textArea) this.textArea.style.display = 'none';
  }
  
  private showEditMode(): void {
    if (this.previewEl) this.previewEl.style.display = 'none';
    if (this.textArea) {
      this.textArea.style.display = 'block';
      this.textArea.focus();
    }
  }

  private renderEmptyState(): void {
    if (!this.previewEl) return;
    
    const placeholder = this.previewEl.createDiv("empty-frame");
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
    placeholder.textContent = t('editor.empty.placeholder');
  }


  private setupEventListeners(): void {
    // Écouter les clics sur le preview pour passer en mode édition
    if (this.previewEl) {
      this.previewEl.addEventListener('click', (e) => {
        // Ne pas intercepter les clics sur les liens et éléments interactifs
        if (this.isInteractiveElement(e.target as HTMLElement)) {
          return;
        }
        this.enterEditMode();
      });
    }
    
    // Écouter les changements dans le textarea
    if (this.textArea) {
      this.textArea.addEventListener('input', this.onTextAreaInput.bind(this));
      this.textArea.addEventListener('blur', this.onTextAreaBlur.bind(this));
      this.textArea.addEventListener('keydown', this.onTextAreaKeyDown.bind(this));
    }
  }

  private enterEditMode(): void {
    this.isEditing = true;
    this.textArea!.value = this.markdownContent;
    this.showEditMode();
  }
  
  private async exitEditMode(): Promise<void> {
    this.isEditing = false;
    await this.renderPreview();
    this.showPreviewMode();
  }
  
  private onTextAreaInput(): void {
    if (!this.textArea) return;
    
    this.markdownContent = this.textArea.value;
    this.debouncedOnChange(this.markdownContent);
  }
  
  private async onTextAreaBlur(): Promise<void> {
    await this.exitEditMode();
  }
  
  private async onTextAreaKeyDown(event: KeyboardEvent): Promise<void> {
    if (event.key === 'Escape') {
      await this.exitEditMode();
      return;
    }
    
    // Laisser la méthode addLivePreviewKeyboardShortcuts gérer les autres touches
  }
  
  private addLivePreviewKeyboardShortcuts(): void {
    if (!this.textArea) return;
    
    this.textArea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.handleEnterKey(event);
      } else if (event.key === 'Tab') {
        this.handleTabKey(event);
      } else if (event.key === 'Backspace') {
        this.handleBackspaceKey(event);
      }
    });
  }
  
  private handleEnterKey(event: KeyboardEvent): void {
    const textarea = this.textArea!;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const currentLine = textBeforeCursor.split('\n').pop() || '';
    
    // Détecter les listes
    const listMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
    if (listMatch) {
      const [, indent, bullet, content] = listMatch;
      
      // Si la ligne est vide (juste le bullet), on sort de la liste
      if (!content.trim()) {
        event.preventDefault();
        const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
        const newText = textarea.value.substring(0, lineStart) + 
                       '\n' + 
                       textarea.value.substring(cursorPos);
        textarea.value = newText;
        textarea.setSelectionRange(lineStart + 1, lineStart + 1);
        return;
      }
      
      // Créer une nouvelle ligne de liste
      event.preventDefault();
      const newListItem = '\n' + indent + bullet + ' ';
      const newText = textarea.value.substring(0, cursorPos) + 
                     newListItem + 
                     textarea.value.substring(cursorPos);
      textarea.value = newText;
      textarea.setSelectionRange(cursorPos + newListItem.length, cursorPos + newListItem.length);
      
      // Notifier le changement
      this.onTextAreaInput();
      return;
    }
    
    // Détecter les listes numérotées
    const numberedListMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numberedListMatch) {
      const [, indent, num, content] = numberedListMatch;
      
      if (!content.trim()) {
        event.preventDefault();
        const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
        const newText = textarea.value.substring(0, lineStart) + 
                       '\n' + 
                       textarea.value.substring(cursorPos);
        textarea.value = newText;
        textarea.setSelectionRange(lineStart + 1, lineStart + 1);
        return;
      }
      
      event.preventDefault();
      const nextNum = parseInt(num) + 1;
      const newListItem = '\n' + indent + nextNum + '. ';
      const newText = textarea.value.substring(0, cursorPos) + 
                     newListItem + 
                     textarea.value.substring(cursorPos);
      textarea.value = newText;
      textarea.setSelectionRange(cursorPos + newListItem.length, cursorPos + newListItem.length);
      
      this.onTextAreaInput();
      return;
    }
    
    // Détecter les blocs de citation
    const blockquoteMatch = currentLine.match(/^(\s*)(>)\s+(.*)$/);
    if (blockquoteMatch) {
      const [, indent, quote, content] = blockquoteMatch;
      
      if (!content.trim()) {
        event.preventDefault();
        const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
        const newText = textarea.value.substring(0, lineStart) + 
                       '\n' + 
                       textarea.value.substring(cursorPos);
        textarea.value = newText;
        textarea.setSelectionRange(lineStart + 1, lineStart + 1);
        return;
      }
      
      event.preventDefault();
      const newQuoteLine = '\n' + indent + '> ';
      const newText = textarea.value.substring(0, cursorPos) + 
                     newQuoteLine + 
                     textarea.value.substring(cursorPos);
      textarea.value = newText;
      textarea.setSelectionRange(cursorPos + newQuoteLine.length, cursorPos + newQuoteLine.length);
      
      this.onTextAreaInput();
      return;
    }
  }
  
  private handleTabKey(event: KeyboardEvent): void {
    const textarea = this.textArea!;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const currentLine = textBeforeCursor.split('\n').pop() || '';
    
    // Indenter les listes
    const listMatch = currentLine.match(/^(\s*)([-*+])\s/);
    if (listMatch) {
      event.preventDefault();
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const indent = event.shiftKey ? '  ' : '\t';
      const newText = textarea.value.substring(0, lineStart) + 
                     (event.shiftKey ? 
                      currentLine.replace(/^(\s*)/, (match) => match.length >= 2 ? match.slice(2) : '') :
                      indent + currentLine) + 
                     textarea.value.substring(cursorPos);
      textarea.value = newText;
      const newCursorPos = cursorPos + (event.shiftKey ? -Math.min(2, listMatch[1].length) : indent.length);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      
      this.onTextAreaInput();
      return;
    }
    
    // Tab normal
    event.preventDefault();
    const tabText = '\t';
    const newText = textarea.value.substring(0, cursorPos) + 
                   tabText + 
                   textarea.value.substring(cursorPos);
    textarea.value = newText;
    textarea.setSelectionRange(cursorPos + tabText.length, cursorPos + tabText.length);
    
    this.onTextAreaInput();
  }
  
  private handleBackspaceKey(event: KeyboardEvent): void {
    const textarea = this.textArea!;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const currentLine = textBeforeCursor.split('\n').pop() || '';
    
    // Supprimer intelligemment les listes vides
    if (currentLine.match(/^(\s*)([-*+])\s*$/)) {
      event.preventDefault();
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const newText = textarea.value.substring(0, lineStart) + 
                     textarea.value.substring(cursorPos);
      textarea.value = newText;
      textarea.setSelectionRange(lineStart, lineStart);
      
      this.onTextAreaInput();
      return;
    }
  }
  
  private isInteractiveElement(element: HTMLElement): boolean {
    let current = element;
    while (current && current !== this.previewEl) {
      const tag = current.tagName.toLowerCase();
      
      // Éléments interactifs standard
      if (['a', 'button', 'input', 'textarea', 'select', 'img'].includes(tag)) {
        return true;
      }
      
      // Éléments avec des classes spéciales d'Obsidian
      if (current.classList.contains('internal-link') || 
          current.classList.contains('external-link') ||
          current.classList.contains('image-embed') ||
          current.classList.contains('image-embed-placeholder') ||
          current.classList.contains('file-embed') ||
          current.classList.contains('tag') ||
          current.classList.contains('cm-link') ||
          current.classList.contains('dataview')) {
        return true;
      }
      
      // Éléments avec attributs interactifs
      if (current.hasAttribute('href') || 
          current.hasAttribute('src') ||
          current.hasAttribute('data-href') ||
          current.hasAttribute('data-path')) {
        return true;
      }
      
      current = current.parentElement!;
    }
    
    return false;
  }


  // Méthode pour mettre à jour le contenu depuis l'extérieur
  async updateContent(newSection: SectionInfo): Promise<void> {
    this.section = newSection;
    this.markdownContent = newSection.lines.join('\n');
    
    // Mettre à jour la textarea si elle existe
    if (this.textArea) {
      this.textArea.value = this.markdownContent;
    }
    
    // Re-rendre le preview
    await this.renderPreview();
  }

  // Méthode pour nettoyer les event listeners
  destroy(): void {
    this.component.unload();
    // Les event listeners seront automatiquement nettoyés quand les éléments sont supprimés
  }
}