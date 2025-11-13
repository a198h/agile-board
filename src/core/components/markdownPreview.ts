// src/core/components/markdownPreview.ts
import { App, TFile, Component, MarkdownRenderer } from "obsidian";
import { BaseUIComponent } from "../baseComponent";
import { MarkdownProcessor } from "../business/markdownProcessor";
import { ElementFactory, MediaElementFactory, setHtmlContent } from "../dom";
import { EmbedRenderer } from "./embedRenderer";
import { TaskManager } from "./taskManager";
import { ErrorHandler, ErrorSeverity } from "../errorHandler";
import { debounce } from "ts-debounce";

/**
 * Configuration pour le composant de prévisualisation.
 */
export interface MarkdownPreviewConfig {
  readonly content: string;
  readonly file: TFile;
  readonly onContentChange: (content: string) => void;
  readonly onEditRequest: () => void;
}

/**
 * Composant dédié à la prévisualisation markdown.
 * Gère le rendu, les liens internes, les images et les tâches.
 */
export class MarkdownPreview extends BaseUIComponent {
  private component: Component;
  private currentContent: string;
  private debouncedOnChange: (content: string) => void;
  private taskManager?: TaskManager;

  constructor(
    container: HTMLElement,
    private app: App,
    private config: MarkdownPreviewConfig
  ) {
    super(container, app);
    this.component = new Component();
    this.currentContent = config.content;
    this.debouncedOnChange = debounce(config.onContentChange, 1000);

    this.registerDisposable({
      dispose: () => this.component.unload()
    });

    this.initializePreview();
  }

  /**
   * Initialise le container de prévisualisation.
   */
  private initializePreview(): void {
    if (!this.containerEl) return;

    this.containerEl.empty();
    this.containerEl.className = "agile-board-preview";

    this.renderContent();
    this.setupClickHandler();
  }

  /**
   * Rend le contenu markdown dans la prévisualisation.
   */
  private async renderContent(): Promise<void> {
    if (!this.containerEl) return;
    
    this.containerEl.empty();

    if (!this.currentContent.trim()) {
      this.renderEmptyState();
      return;
    }

    try {
      // Utiliser le processeur pour pré-traiter le contenu
      const preprocessed = MarkdownProcessor.preprocessMarkdown(this.currentContent);

      // Utiliser MarkdownRenderer d'Obsidian
      await MarkdownRenderer.render(
        this.app,
        preprocessed.content,
        this.containerEl,
        this.config.file.path,
        this.component
      );
      
      // Post-traitement pour les éléments spéciaux
      this.postProcessElements(preprocessed.replacements);
      
    } catch (error) {
      ErrorHandler.handleError(error, "MarkdownPreview.renderContent", {
        severity: ErrorSeverity.WARNING,
        context: { file: this.config.file.path }
      });
      this.renderWithFallbackParser();
    }
  }

  /**
   * Affiche l'état vide avec placeholder.
   */
  private renderEmptyState(): void {
    if (!this.containerEl) return;
    
    const placeholder = ElementFactory.createEmptyPlaceholder(
      "Cliquez pour commencer à écrire..."
    );
    this.containerEl.appendChild(placeholder);
  }

  /**
   * Rendu de secours avec le parseur manuel.
   */
  private renderWithFallbackParser(): void {
    if (!this.containerEl) return;

    const html = MarkdownProcessor.parseMarkdownToHTML(this.currentContent);
    setHtmlContent(this.containerEl, html);
    this.setupInteractiveElements();
  }

  /**
   * Post-traitement des éléments après rendu Obsidian.
   */
  private postProcessElements(replacements: readonly any[]): void {
    // Traiter les images
    this.processImagePlaceholders();
    
    // Traiter les embeds
    this.processEmbedPlaceholders();
    
    // Configurer les éléments interactifs
    this.setupInteractiveElements();
  }

  /**
   * Traite les placeholders d'images.
   */
  private processImagePlaceholders(): void {
    if (!this.containerEl) return;
    
    const imagePlaceholders = this.containerEl.querySelectorAll('span[data-agile-image]');
    
    imagePlaceholders.forEach(span => {
      const fileName = span.getAttribute('data-name');
      if (fileName) {
        this.replaceImagePlaceholder(span as HTMLElement, fileName);
      }
    });
  }

  /**
   * Traite les placeholders d'embeds.
   */
  private processEmbedPlaceholders(): void {
    if (!this.containerEl) return;
    
    const embedPlaceholders = this.containerEl.querySelectorAll('span[data-agile-embed]');
    
    embedPlaceholders.forEach(span => {
      const fileName = span.getAttribute('data-name');
      if (fileName) {
        this.replaceEmbedPlaceholder(span as HTMLElement, fileName);
      }
    });
  }

  /**
   * Remplace un placeholder d'image par l'élément réel.
   */
  private replaceImagePlaceholder(span: HTMLElement, imageName: string): void {
    const imageFile = this.app.metadataCache.getFirstLinkpathDest(imageName, this.config.file.path);
    
    if (imageFile) {
      const imagePath = this.app.vault.getResourcePath(imageFile);
      const img = MediaElementFactory.createImage(
        imagePath, 
        imageName,
        () => this.app.workspace.openLinkText(imageName, this.config.file.path)
      );
      
      span.parentElement?.replaceChild(img, span);
    } else {
      const errorEl = MediaElementFactory.createMediaError(imageName, 'image');
      span.parentElement?.replaceChild(errorEl, span);
    }
  }

  /**
   * Remplace un placeholder d'embed par l'élément réel.
   */
  private replaceEmbedPlaceholder(span: HTMLElement, fileName: string): void {
    const embedEl = EmbedRenderer.createPlaceholder({
      fileName,
      sourcePath: this.config.file.path,
      app: this.app
    });
    
    span.parentElement?.replaceChild(embedEl, span);
  }


  /**
   * Configure les éléments interactifs (liens, tâches).
   */
  private setupInteractiveElements(): void {
    this.setupTaskManager();
    this.setupInternalLinks();
  }

  /**
   * Configure le gestionnaire de tâches.
   */
  private setupTaskManager(): void {
    if (!this.containerEl) return;
    
    try {
      this.taskManager = new TaskManager(
        this.containerEl,
        this.currentContent,
        {
          onTaskUpdate: (content: string) => {
            this.currentContent = content;
            this.debouncedOnChange(content);
          }
        }
      );
      
      this.taskManager.setupTaskCheckboxes();
    } catch (error) {
      ErrorHandler.handleError(error, "MarkdownPreview.setupTaskManager", {
        severity: ErrorSeverity.ERROR,
        context: { file: this.config.file.path }
      });
    }
  }

  /**
   * Configure les liens internes.
   */
  private setupInternalLinks(): void {
    if (!this.containerEl) return;
    
    const internalLinks = this.containerEl.querySelectorAll('a.internal-link, a[data-href]');
    
    internalLinks.forEach(link => {
      if (!(link as HTMLAnchorElement).onclick) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const href = link.getAttribute('data-href') || link.getAttribute('href');
          if (href && href !== '#') {
            this.app.workspace.openLinkText(href, this.config.file.path);
          }
        });
      }
    });
  }


  /**
   * Configure le gestionnaire de clic pour passer en mode édition.
   */
  private setupClickHandler(): void {
    if (!this.containerEl) return;
    
    this.containerEl.addEventListener('click', (e) => {
      if (!MarkdownProcessor.isInteractiveElement(e.target as HTMLElement, this.containerEl!)) {
        this.config.onEditRequest();
      }
    });
  }

  /**
   * Met à jour le contenu affiché.
   */
  async updateContent(newContent: string): Promise<void> {
    this.currentContent = newContent;
    if (this.taskManager) {
      this.taskManager.updateContent(newContent);
    }
    await this.renderContent();
  }

  /**
   * Retourne le contenu actuel.
   */
  getContent(): string {
    return this.currentContent;
  }

  protected doLoad(): void {
    // Déjà initialisé dans le constructeur
  }

  protected doUnload(): void {
    // Nettoyage automatique via BaseUIComponent
  }
}