// src/nativeMarkdownView.ts
import { App, TFile, Component, MarkdownRenderer } from "obsidian";
import { SectionInfo } from "./sectionParser";
import { debounce } from "ts-debounce";

export class NativeMarkdownView {
  private component: Component;
  private debouncedOnChange: (content: string) => void;
  private previewContainer: HTMLElement;
  private editorContainer: HTMLElement;
  private isEditing = false;
  private textArea: HTMLTextAreaElement;
  private markdownContent: string;

  constructor(
    private app: App,
    private container: HTMLElement,
    private sourceFile: TFile,
    private sectionTitle: string,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    this.component = new Component();
    this.markdownContent = this.section.lines.join('\n');
    this.debouncedOnChange = debounce(this.onChange, 300);
    
    this.initialize();
  }

  private initialize(): void {
    this.setupContainers();
    this.createPreviewContainer();
    this.createEditorContainer();
    this.renderPreview();
    this.setupEventListeners();
  }

  private setupContainers(): void {
    this.container.empty();
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;
  }

  private createPreviewContainer(): void {
    this.previewContainer = this.container.createDiv('native-preview');
    this.previewContainer.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      padding: 0.5rem;
      cursor: text;
    `;
  }

  private createEditorContainer(): void {
    this.editorContainer = this.container.createDiv('native-editor');
    this.editorContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: none;
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
    `;
    
    this.textArea.value = this.markdownContent;
  }

  private async renderPreview(): Promise<void> {
    this.previewContainer.empty();
    
    if (!this.markdownContent.trim()) {
      this.renderEmptyState();
      return;
    }

    // Utiliser MarkdownRenderer avec Component correctement configuré
    try {
      await MarkdownRenderer.renderMarkdown(
        this.markdownContent,
        this.previewContainer,
        this.sourceFile.path,
        this.component
      );
      
      // Le MarkdownRenderer devrait maintenant gérer les liens et images automatiquement
      console.log('✅ Rendu natif pour:', this.sectionTitle);
      
    } catch (error) {
      console.error('Erreur rendu markdown:', error);
      this.renderFallback();
    }
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
    this.previewContainer.empty();
    const fallback = this.previewContainer.createDiv('fallback');
    fallback.style.cssText = `
      padding: 0.5rem;
      color: var(--text-error);
      border: 1px dashed var(--text-error);
      border-radius: 4px;
    `;
    fallback.textContent = `Erreur de rendu pour: ${this.sectionTitle}`;
  }

  private setupEventListeners(): void {
    // Clic pour passer en mode édition (éviter les éléments interactifs)
    this.previewContainer.addEventListener('click', (e) => {
      if (this.isInteractiveElement(e.target as HTMLElement)) {
        return;
      }
      this.enterEditMode();
    });

    // Événements de l'éditeur
    this.textArea.addEventListener('input', () => {
      this.markdownContent = this.textArea.value;
      this.debouncedOnChange(this.markdownContent);
    });

    this.textArea.addEventListener('blur', () => {
      this.exitEditMode();
    });

    this.textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.exitEditMode();
      }
    });
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    let current = element;
    while (current && current !== this.previewContainer) {
      const tag = current.tagName.toLowerCase();
      
      // Éléments interactifs
      if (['a', 'button', 'input', 'textarea', 'select', 'img'].includes(tag)) {
        return true;
      }
      
      // Classes spéciales d'Obsidian
      if (current.classList.contains('internal-link') || 
          current.classList.contains('external-link') ||
          current.classList.contains('image-embed') ||
          current.classList.contains('file-embed') ||
          current.classList.contains('tag')) {
        return true;
      }
      
      current = current.parentElement!;
    }
    
    return false;
  }

  private enterEditMode(): void {
    this.isEditing = true;
    this.textArea.value = this.markdownContent;
    this.previewContainer.style.display = 'none';
    this.editorContainer.style.display = 'block';
    this.textArea.focus();
  }

  private async exitEditMode(): Promise<void> {
    this.isEditing = false;
    this.markdownContent = this.textArea.value;
    this.editorContainer.style.display = 'none';
    this.previewContainer.style.display = 'block';
    
    // Re-rendre le preview avec le nouveau contenu
    await this.renderPreview();
  }

  // Méthode pour mettre à jour le contenu depuis l'extérieur
  async updateContent(newSection: SectionInfo): Promise<void> {
    this.section = newSection;
    this.markdownContent = newSection.lines.join('\n');
    
    if (this.isEditing) {
      this.textArea.value = this.markdownContent;
    } else {
      await this.renderPreview();
    }
  }

  // Méthode pour obtenir le contenu actuel
  getContent(): string {
    return this.markdownContent;
  }

  // Méthode pour nettoyer la vue
  destroy(): void {
    this.component.unload();
    this.container.empty();
    console.log('🗑️ NativeMarkdownView détruite pour:', this.sectionTitle);
  }
}