// src/core/components/embedRenderer.ts
import { App, TFile } from "obsidian";
import { MarkdownProcessor } from "../business/markdownProcessor";
import { ElementFactory, MediaElementFactory, setHtmlContent } from "../dom";
import { ErrorHandler, ErrorSeverity } from "../errorHandler";

/**
 * Configuration pour le rendu d'embeds.
 */
export interface EmbedConfig {
  readonly fileName: string;
  readonly sourcePath: string;
  readonly app: App;
}

/**
 * Résultat du rendu d'un embed.
 */
export interface EmbedResult {
  readonly element: HTMLElement;
  readonly isValid: boolean;
  readonly error?: string;
}

/**
 * Moteur de rendu pour les embeds de fichiers Obsidian.
 * Gère le chargement asynchrone et l'affichage des aperçus.
 */
export class EmbedRenderer {
  /**
   * Crée un élément embed pour un fichier donné.
   * @param config Configuration de l'embed
   * @returns Promesse resolue avec le résultat du rendu
   */
  public static async createEmbed(config: EmbedConfig): Promise<EmbedResult> {
    const targetFile = this.resolveFile(config);
    
    if (!targetFile) {
      return this.createErrorResult(config.fileName, "Fichier introuvable");
    }

    return this.createValidEmbed(config, targetFile);
  }

  /**
   * Crée un placeholder embed (sans chargement immédiat).
   * @param config Configuration de l'embed
   * @returns Element embed avec chargement différé
   */
  public static createPlaceholder(config: EmbedConfig): HTMLElement {
    const embedDiv = this.createEmbedContainer(config.fileName);
    
    // Charger le contenu de façon asynchrone
    this.loadContentLater(embedDiv, config);
    
    return embedDiv;
  }

  /**
   * Résout le fichier cible d'un embed.
   */
  private static resolveFile(config: EmbedConfig): TFile | null {
    return config.app.metadataCache.getFirstLinkpathDest(
      config.fileName,
      config.sourcePath
    );
  }

  /**
   * Crée un embed valide avec contenu.
   */
  private static async createValidEmbed(
    config: EmbedConfig,
    targetFile: TFile
  ): Promise<EmbedResult> {
    try {
      const embedEl = this.createEmbedContainer(config.fileName);
      await this.loadFileContent(embedEl, targetFile, config);
      this.attachClickHandler(embedEl, config);

      return {
        element: embedEl,
        isValid: true
      };
    } catch (error) {
      ErrorHandler.handleError(error, "EmbedRenderer.createValidEmbed", {
        severity: ErrorSeverity.ERROR,
        context: { fileName: config.fileName, sourcePath: config.sourcePath }
      });
      return this.createErrorResult(config.fileName, `Erreur: ${error}`);
    }
  }

  /**
   * Crée un résultat d'erreur.
   */
  private static createErrorResult(fileName: string, error: string): EmbedResult {
    const errorEl = MediaElementFactory.createMediaError(fileName, 'embed');
    
    return {
      element: errorEl,
      isValid: false,
      error
    };
  }

  /**
   * Crée le container de base pour un embed.
   */
  private static createEmbedContainer(fileName: string): HTMLElement {
    const embedDiv = ElementFactory.createElement('div', {
      className: 'markdown-embed agile-board-embed',
      attributes: { 'data-file': fileName }
    });

    const titleDiv = this.createTitleElement(fileName);
    const contentDiv = this.createContentElement();

    embedDiv.appendChild(titleDiv);
    embedDiv.appendChild(contentDiv);

    return embedDiv;
  }

  /**
   * Crée l'élément titre de l'embed.
   */
  private static createTitleElement(fileName: string): HTMLElement {
    return ElementFactory.createElement('div', {
      className: 'agile-board-embed-title',
      textContent: `📄 ${fileName}`
    });
  }

  /**
   * Crée l'élément contenu de l'embed.
   */
  private static createContentElement(initialText = 'Chargement...'): HTMLElement {
    return ElementFactory.createElement('div', {
      className: 'agile-board-embed-content',
      textContent: initialText
    });
  }

  /**
   * Charge le contenu d'un fichier dans l'embed.
   */
  private static async loadFileContent(
    embedEl: HTMLElement,
    targetFile: TFile,
    config: EmbedConfig
  ): Promise<void> {
    const fileContent = await config.app.vault.read(targetFile);
    const preview = MarkdownProcessor.extractPreview(fileContent, 10);

    const contentDiv = embedEl.querySelector('div:last-child');
    if (contentDiv) {
      const html = MarkdownProcessor.parseMarkdownToHTML(preview);
      setHtmlContent(contentDiv as HTMLElement, html);
    }
  }

  /**
   * Attache le gestionnaire de clic pour ouvrir le fichier.
   */
  private static attachClickHandler(embedEl: HTMLElement, config: EmbedConfig): void {
    embedEl.addEventListener('click', (e) => {
      e.preventDefault();
      void config.app.workspace.openLinkText(config.fileName, config.sourcePath);
    });
  }

  /**
   * Charge le contenu de façon différée.
   */
  private static loadContentLater(embedEl: HTMLElement, config: EmbedConfig): void {
    // Utiliser requestIdleCallback si disponible, sinon setTimeout
    const loadFn = () => void this.loadContentBackground(embedEl, config);

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadFn);
    } else {
      setTimeout(loadFn, 100);
    }
  }

  /**
   * Charge le contenu en arrière-plan.
   */
  private static async loadContentBackground(
    embedEl: HTMLElement,
    config: EmbedConfig
  ): Promise<void> {
    try {
      const targetFile = this.resolveFile(config);
      if (!targetFile) {
        this.showError(embedEl, "Fichier introuvable");
        return;
      }

      await this.loadFileContent(embedEl, targetFile, config);
      this.attachClickHandler(embedEl, config);
    } catch (error) {
      ErrorHandler.handleError(error, "EmbedRenderer.loadContentBackground", {
        severity: ErrorSeverity.WARNING,
        context: { fileName: config.fileName }
      });
      this.showError(embedEl, `Erreur: ${error}`);
    }
  }

  /**
   * Affiche une erreur dans l'embed.
   */
  private static showError(embedEl: HTMLElement, error: string): void {
    const contentDiv = embedEl.querySelector('div:last-child') as HTMLElement;
    if (contentDiv) {
      contentDiv.textContent = `❌ ${error}`;
      contentDiv.style.color = 'var(--text-error)';
    }
  }
}