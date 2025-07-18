// src/livePreviewFrame.ts
import { App, TFile, Component, MarkdownRenderer } from "obsidian";
import { EditorState } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { SectionInfo } from "./sectionParser";
import { debounce } from "ts-debounce";

export class LivePreviewFrame {
  private editorView: EditorView | null = null;
  private previewContainer: HTMLElement;
  private editorContainer: HTMLElement;
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
    this.createPreviewMode();
    this.createEditorMode();
    this.showPreviewMode();
  }

  private showPreviewMode(): void {
    this.previewContainer.style.display = 'block';
    this.editorContainer.style.display = 'none';
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

  private createPreviewMode(): void {
    this.previewContainer = this.container.createDiv('live-preview-container');
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

  private createEditorMode(): void {
    this.editorContainer = this.container.createDiv('live-editor-container');
    this.editorContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: none;
      box-sizing: border-box;
      overflow: hidden;
    `;

    // Configuration ultra-minimaliste de CodeMirror 6
    const extensions = [
      // Juste le support markdown
      markdown(),
      
      // Wrap des lignes longues
      EditorView.lineWrapping,
      
      // Thème minimal et propre
      EditorView.theme({
        // Container principal
        '&': {
          width: '100%',
          height: '100%',
          fontSize: 'var(--font-size-normal)',
          fontFamily: 'var(--font-text)',
        },
        
        // Éditeur principal
        '.cm-editor': {
          width: '100%',
          height: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
        },
        
        // Zone de contenu
        '.cm-content': {
          padding: '0.5rem',
          color: 'var(--text-normal)',
          caretColor: 'var(--text-accent)',
          minHeight: '100%',
          fontFamily: 'var(--font-text)',
          fontSize: 'var(--font-size-normal)',
          lineHeight: '1.6',
        },
        
        // Scroller
        '.cm-scroller': {
          fontFamily: 'var(--font-text)',
          fontSize: 'var(--font-size-normal)',
        },
        
        // CRUCIAL: Masquer complètement les gutters (numéros de ligne)
        '.cm-gutters': {
          display: 'none !important',
          width: '0 !important',
          border: 'none !important',
        },
        
        // Masquer les guides de ligne
        '.cm-lineNumbers': {
          display: 'none !important',
        },
        
        // Style du focus
        '.cm-focused': {
          outline: 'none',
          border: 'none',
        },
        
        // Lignes
        '.cm-line': {
          lineHeight: '1.6',
        },
        
        // Sélection
        '.cm-selectionBackground': {
          background: 'var(--text-selection)',
        },
        
        // Curseur
        '.cm-cursor': {
          borderColor: 'var(--text-accent)',
        }
      }),
      
      // Listener pour les changements
      EditorView.updateListener.of(this.onEditorChange.bind(this)),
      
      // Événements DOM
      EditorView.domEventHandlers({
        blur: (event, view) => {
          console.log('CM6 blur event');
          this.exitEditMode();
        },
        keydown: (event, view) => {
          if (event.key === 'Escape') {
            console.log('CM6 escape key');
            this.exitEditMode();
            return true;
          }
          return false;
        }
      })
    ];

    try {
      this.editorView = new EditorView({
        state: EditorState.create({
          doc: this.markdownContent,
          extensions
        }),
        parent: this.editorContainer
      });
      
      console.log('✅ CodeMirror 6 créé avec succès');
    } catch (error) {
      console.error('❌ Erreur création CodeMirror 6:', error);
      this.createFallbackEditor();
    }
  }

  private createFallbackEditor(): void {
    console.log('🔄 Création éditeur de secours');
    this.editorContainer.empty();
    
    const textarea = this.editorContainer.createEl('textarea');
    textarea.style.cssText = `
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
    textarea.value = this.markdownContent;
    
    textarea.addEventListener('input', () => {
      this.markdownContent = textarea.value;
      this.debouncedOnChange(this.markdownContent);
    });
    
    textarea.addEventListener('blur', () => {
      this.exitEditMode();
    });
    
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.exitEditMode();
      }
    });
  }

  private async renderMarkdown(): Promise<void> {
    this.previewContainer.empty();
    
    if (!this.markdownContent.trim()) {
      this.renderEmptyState();
      return;
    }

    try {
      await MarkdownRenderer.renderMarkdown(
        this.markdownContent,
        this.previewContainer,
        this.file.path,
        this.component
      );
      console.log('✅ Markdown rendu avec succès');
    } catch (error) {
      console.error('❌ Erreur rendu markdown:', error);
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
        console.log('🖱️ Clic sur preview, passage en mode édition');
        this.enterEditMode();
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
          current.classList.contains('tag')) {
        return true;
      }
      
      current = current.parentElement!;
    }
    
    return false;
  }

  private enterEditMode(): void {
    console.log('🔄 Passage en mode édition');
    this.isEditing = true;
    this.previewContainer.style.display = 'none';
    this.editorContainer.style.display = 'block';
    
    // Mettre à jour le contenu de l'éditeur
    if (this.editorView) {
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: this.markdownContent
        }
      });
      this.editorView.focus();
    }
  }

  private async exitEditMode(): Promise<void> {
    if (!this.isEditing) return;
    
    console.log('🔄 Sortie du mode édition');
    this.isEditing = false;
    this.editorContainer.style.display = 'none';
    this.previewContainer.style.display = 'block';
    
    // Récupérer le contenu de l'éditeur
    if (this.editorView) {
      this.markdownContent = this.editorView.state.doc.toString();
    }
    
    // Re-rendre le preview
    await this.renderMarkdown();
  }

  private onEditorChange(update: ViewUpdate): void {
    if (!update.docChanged) return;
    
    console.log('📝 Changement dans l\'éditeur');
    this.markdownContent = update.state.doc.toString();
    this.debouncedOnChange(this.markdownContent);
  }

  // Méthodes publiques pour la gestion externe
  async updateContent(newSection: SectionInfo): Promise<void> {
    this.section = newSection;
    this.markdownContent = newSection.lines.join('\n');
    
    if (this.isEditing && this.editorView) {
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: this.markdownContent
        }
      });
    } else {
      await this.renderMarkdown();
    }
  }

  getContent(): string {
    if (this.isEditing && this.editorView) {
      return this.editorView.state.doc.toString();
    }
    return this.markdownContent;
  }

  destroy(): void {
    console.log('🗑️ Destruction LivePreviewFrame');
    
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
    
    this.component.unload();
    this.container.empty();
  }
}