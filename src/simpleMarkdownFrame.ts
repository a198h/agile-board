// src/simpleMarkdownFrame.ts
import { App, TFile, Component, MarkdownRenderer } from "obsidian";
import { SectionInfo } from "./sectionParser";
import { debounce } from "ts-debounce";

export class SimpleMarkdownFrame {
  private previewContainer: HTMLElement;
  private editorContainer: HTMLElement;
  private textArea: HTMLTextAreaElement;
  private isEditing = false;
  private component: Component;
  private debouncedOnChange: (content: string) => void;
  private markdownContent: string;

  constructor(
    private app: App,
    private container: HTMLElement,
    private file: TFile,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    this.component = new Component();
    this.markdownContent = this.section.lines.join('\n');
    this.debouncedOnChange = debounce(this.onChange, 300);
    
    this.initializeFrame();
  }

  private initializeFrame(): void {
    this.setupContainer();
    this.createPreviewContainer();
    this.createEditorContainer();
    this.showPreviewMode();
  }

  private setupContainer(): void {
    this.container.empty();
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    `;
  }

  private createPreviewContainer(): void {
    this.previewContainer = this.container.createDiv('simple-markdown-preview');
    this.previewContainer.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      padding: 0.5rem;
      cursor: text;
      box-sizing: border-box;
    `;
    
    this.renderMarkdown();
    this.setupPreviewEvents();
  }

  private createEditorContainer(): void {
    this.editorContainer = this.container.createDiv('simple-markdown-editor');
    this.editorContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: none;
      box-sizing: border-box;
    `;

    this.textArea = this.editorContainer.createEl('textarea');
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
      padding: 0.5rem;
      box-sizing: border-box;
      line-height: 1.6;
    `;
    
    this.textArea.value = this.markdownContent;
    this.setupEditorEvents();
  }

  private async renderMarkdown(): Promise<void> {
    this.previewContainer.empty();
    
    if (!this.markdownContent.trim()) {
      this.renderEmptyState();
      return;
    }

    console.log('🔍 Rendu markdown manuel pour contenu:', this.markdownContent);

    try {
      // Rendu markdown manuel (sans MarkdownRenderer qui cause des problèmes)
      const renderedHTML = this.parseMarkdownToHTML(this.markdownContent);
      this.previewContainer.innerHTML = renderedHTML;
      
      // Ajouter les event listeners pour les liens
      this.setupLinksAndImages();
      
      console.log('✅ Markdown rendu manuellement');
      console.log('🔍 HTML rendu:', this.previewContainer.innerHTML);
      
    } catch (error) {
      console.error('❌ Erreur rendu markdown:', error);
      this.renderFallback();
    }
  }

  private parseMarkdownToHTML(markdown: string): string {
    let html = markdown;
    
    // Traiter les headings
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Traiter les liens internes [[text]]
    html = html.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
      return `<a href="#" class="internal-link" data-href="${linkText}">${linkText}</a>`;
    });
    
    // Traiter les images ![[text]]
    html = html.replace(/!\[\[([^\]]+)\]\]/g, (match, imageName) => {
      return `<img src="#" class="image-embed" data-src="${imageName}" alt="${imageName}" style="max-width: 100%; height: auto;">`;
    });
    
    // Traiter les listes
    html = html.replace(/^[\s]*[-*+] (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Traiter les listes numérotées
    html = html.replace(/^[\s]*\d+\. (.*$)/gm, '<li>$1</li>');
    
    // Traiter les paragraphes
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Nettoyer les paragraphes vides
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');
    
    return html;
  }

  private setupLinksAndImages(): void {
    // Gérer les liens internes
    const internalLinks = this.previewContainer.querySelectorAll('a.internal-link');
    internalLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('data-href');
        if (href) {
          console.log(`🔗 Clic sur lien interne: ${href}`);
          this.app.workspace.openLinkText(href, this.file.path);
        }
      });
    });
    
    // Gérer les images
    const images = this.previewContainer.querySelectorAll('img.image-embed');
    images.forEach(img => {
      const imageName = img.getAttribute('data-src');
      if (imageName) {
        // Résoudre le chemin de l'image
        const imageFile = this.app.metadataCache.getFirstLinkpathDest(imageName, this.file.path);
        if (imageFile) {
          img.setAttribute('src', this.app.vault.getResourcePath(imageFile));
        }
        
        // Ajouter le clic pour ouvrir l'image
        img.addEventListener('click', (e) => {
          e.preventDefault();
          console.log(`🖼️ Clic sur image: ${imageName}`);
          this.app.workspace.openLinkText(imageName, this.file.path);
        });
      }
    });
  }

  private renderEmptyState(): void {
    const placeholder = this.previewContainer.createDiv('empty-placeholder');
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

  private renderFallback(): void {
    const fallback = this.previewContainer.createDiv('fallback');
    fallback.style.cssText = `
      padding: 0.5rem;
      color: var(--text-error);
      border: 1px dashed var(--text-error);
      border-radius: 4px;
      background: var(--background-secondary);
    `;
    fallback.textContent = `Erreur de rendu du markdown`;
  }

  private setupPreviewEvents(): void {
    this.previewContainer.addEventListener('click', (e) => {
      if (!this.isInteractiveElement(e.target as HTMLElement)) {
        console.log('🖱️ Clic sur preview → mode édition');
        this.enterEditMode();
      }
    });
  }

  private setupEditorEvents(): void {
    this.textArea.addEventListener('input', () => {
      this.markdownContent = this.textArea.value;
      this.debouncedOnChange(this.markdownContent);
    });

    this.textArea.addEventListener('blur', () => {
      console.log('📝 Blur sur textarea → mode preview');
      this.exitEditMode();
    });

    this.textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        console.log('⌨️ Escape → mode preview');
        this.exitEditMode();
      }
    });
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    let current = element;
    while (current && current !== this.previewContainer) {
      const tag = current.tagName.toLowerCase();
      
      // Éléments interactifs standard
      if (['a', 'button', 'input', 'textarea', 'select', 'img'].includes(tag)) {
        return true;
      }
      
      // Classes spéciales d'Obsidian
      if (current.classList.contains('internal-link') || 
          current.classList.contains('external-link') ||
          current.classList.contains('image-embed') ||
          current.classList.contains('file-embed') ||
          current.classList.contains('tag') ||
          current.classList.contains('math') ||
          current.classList.contains('frontmatter')) {
        return true;
      }
      
      // Attributs interactifs
      if (current.hasAttribute('href') || 
          current.hasAttribute('src') ||
          current.hasAttribute('data-href') ||
          current.hasAttribute('data-path') ||
          current.hasAttribute('data-link')) {
        return true;
      }
      
      current = current.parentElement!;
    }
    
    return false;
  }

  private enterEditMode(): void {
    this.isEditing = true;
    this.previewContainer.style.display = 'none';
    this.editorContainer.style.display = 'block';
    
    // Synchroniser le contenu
    this.textArea.value = this.markdownContent;
    this.textArea.focus();
  }

  private async exitEditMode(): Promise<void> {
    if (!this.isEditing) return;
    
    this.isEditing = false;
    this.markdownContent = this.textArea.value;
    
    this.editorContainer.style.display = 'none';
    this.previewContainer.style.display = 'block';
    
    // Re-rendre le preview
    await this.renderMarkdown();
  }

  private showPreviewMode(): void {
    this.previewContainer.style.display = 'block';
    this.editorContainer.style.display = 'none';
    this.isEditing = false;
  }

  // Méthodes publiques
  async updateContent(newSection: SectionInfo): Promise<void> {
    this.section = newSection;
    this.markdownContent = newSection.lines.join('\n');
    
    if (this.isEditing) {
      this.textArea.value = this.markdownContent;
    } else {
      await this.renderMarkdown();
    }
  }

  getContent(): string {
    if (this.isEditing) {
      return this.textArea.value;
    }
    return this.markdownContent;
  }

  focusEditor(): void {
    this.enterEditMode();
  }

  async focusPreview(): Promise<void> {
    await this.exitEditMode();
  }

  isInEditMode(): boolean {
    return this.isEditing;
  }

  destroy(): void {
    this.component.unload();
    this.container.empty();
    console.log('🗑️ SimpleMarkdownFrame détruite');
  }
}