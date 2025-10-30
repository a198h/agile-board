// src/components/markdown/MarkdownRenderer.ts
import { App, TFile, Component, MarkdownRenderer as ObsidianMarkdownRenderer, MarkdownRenderChild } from "obsidian";
import { SectionInfo } from "../../types";
import { BaseUIComponent } from "../../core/baseComponent";

/**
 * Composant responsable du rendu de prévisualisation markdown.
 * Utilise l'API MarkdownRenderer d'Obsidian pour le support complet Dataview/Tasks.
 */
export class MarkdownRenderer extends BaseUIComponent {
  private component: Component;
  private renderComponent: Component;
  private app: App;

  constructor(
    container: HTMLElement,
    app: App,
    private file: TFile,
    private section: SectionInfo
  ) {
    super(container, app);
    this.app = app;
    this.component = new Component();
    this.renderComponent = new Component();

    this.registerDisposable({
      dispose: () => {
        this.component.unload();
        this.renderComponent.unload();
      }
    });
  }

  /**
   * Rend le contenu markdown en mode prévisualisation.
   */
  async render(content: string): Promise<void> {
    if (!this.containerEl) return;

    this.containerEl.empty();
    this.setupPreviewStyles();

    if (!content.trim()) {
      this.renderPlaceholder();
      return;
    }

    try {
      // Décharger et recharger le component pour un rendu propre
      this.renderComponent.unload();
      this.renderComponent = new Component();
      this.renderComponent.load();

      // Utiliser renderMarkdown (API v1.0+) avec le bon sourcePath
      await ObsidianMarkdownRenderer.renderMarkdown(
        content,
        this.containerEl,
        this.file.path,
        this.renderComponent
      );

      // Post-traiter les embeds qui n'ont pas été rendus par Obsidian
      await this.processEmbeds(content);

      // Après le rendu, configurer les gestionnaires d'événements pour les boutons de copie
      this.setupCopyButtonHandlers();
    } catch (error) {
      console.warn('MarkdownRenderer failed, falling back to simple HTML:', error);
      this.renderFallbackHTML(content);
    }
  }

  /**
   * Post-traite les embeds ![[...]] qui n'ont pas été rendus par Obsidian.
   * Obsidian convertit ![[...]] en <span class="internal-embed">, mais ne les rend pas visuellement.
   * On cherche ces spans et on les remplace par le contenu visuel.
   */
  private async processEmbeds(content: string): Promise<void> {
    if (!this.containerEl) return;

    // Chercher tous les <span class="internal-embed"> générés par Obsidian
    const embedSpans = this.containerEl.querySelectorAll('span.internal-embed');

    if (embedSpans.length === 0) return;

    // Remplacer chaque span par le contenu visuel
    for (const span of Array.from(embedSpans)) {
      try {
        await this.replaceEmbedSpan.call(this, span as HTMLElement);
      } catch (error) {
        console.error('Erreur remplacement embed:', error);
      }
    }
  }

  /**
   * Remplace un <span class="internal-embed"> par le contenu visuel.
   */
  private async replaceEmbedSpan(span: HTMLElement): Promise<void> {
    // Récupérer le lien depuis les attributs src ou alt
    const linkPath = span.getAttribute('src') || span.getAttribute('alt') || span.textContent || '';

    if (!linkPath) return;

    // Vérifier que this.app existe
    if (!this.app || !this.app.metadataCache) {
      console.error('app ou metadataCache est undefined');
      return;
    }

    // Résoudre le fichier cible
    const tfile = this.app.metadataCache.getFirstLinkpathDest(
      linkPath,
      this.file.path
    ) as TFile | null;

    // Créer le conteneur pour l'embed
    const embedContainer = document.createElement('div');
    embedContainer.classList.add('agile-embed-preview');
    embedContainer.style.margin = '0.5em 0';

    if (!tfile) {
      embedContainer.textContent = `⚠ ${linkPath} introuvable`;
      embedContainer.style.color = 'var(--text-error)';
    } else if (this.isImageFile(tfile)) {
      // Rendu image
      const img = document.createElement('img');
      img.src = this.app.vault.getResourcePath(tfile);
      img.alt = tfile.name;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      embedContainer.appendChild(img);
    } else if (tfile.extension === 'md') {
      // Rendu note markdown
      const noteDiv = document.createElement('div');
      noteDiv.classList.add('markdown-embed', 'inline-embed');
      noteDiv.style.border = '1px solid var(--background-modifier-border)';
      noteDiv.style.borderRadius = 'var(--radius-s)';
      noteDiv.style.padding = '0.5em';
      noteDiv.style.backgroundColor = 'var(--background-secondary)';

      try {
        const noteContent = await this.app.vault.read(tfile);
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('markdown-embed-content');

        await ObsidianMarkdownRenderer.renderMarkdown(
          noteContent,
          contentDiv,
          tfile.path,
          this.renderComponent
        );

        noteDiv.appendChild(contentDiv);
      } catch (error) {
        noteDiv.textContent = `⚠ Erreur: ${tfile.name}`;
        noteDiv.style.color = 'var(--text-error)';
        console.error('Erreur rendu note embed:', error);
      }

      embedContainer.appendChild(noteDiv);
    } else if (tfile.extension === 'base') {
      // Rendu base - utiliser l'API render() synchrone pour que le plugin Bases puisse traiter
      const baseDiv = document.createElement('div');
      baseDiv.classList.add('agile-embed-base', 'markdown-preview-view', 'markdown-rendered');
      baseDiv.style.minHeight = '100px';

      // Utiliser l'API render() synchrone recommandée dans la doc
      const embedMarkdown = `![[${linkPath}]]`;

      try {
        // API synchrone qui devrait permettre au plugin Bases de s'exécuter
        ObsidianMarkdownRenderer.render(
          this.app,
          embedMarkdown,
          baseDiv,
          this.file.path,
          this.renderComponent
        );
      } catch (error) {
        baseDiv.textContent = `⚠ Erreur: ${tfile.name}`;
        baseDiv.style.color = 'var(--text-error)';
        console.error('Erreur rendu base embed:', error);
      }

      embedContainer.appendChild(baseDiv);
    } else {
      // Fichier générique
      embedContainer.textContent = `📎 ${tfile.name}`;
    }

    // Si le span est le seul enfant d'un <p>, remplacer le <p> entier
    const parent = span.parentElement;
    if (parent && parent.tagName === 'P' && parent.children.length === 1 && parent.textContent?.trim() === span.textContent?.trim()) {
      parent.replaceWith(embedContainer);
    } else {
      // Sinon, remplacer juste le span
      span.replaceWith(embedContainer);
    }
  }

  /**
   * Vérifie si un fichier est une image.
   */
  private isImageFile(file: TFile): boolean {
    const ext = file.extension.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'avif', 'heic'].includes(ext);
  }

  /**
   * Configure les styles pour le mode prévisualisation.
   */
  private setupPreviewStyles(): void {
    if (!this.containerEl) return;
    
    this.containerEl.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.5rem;
      cursor: text;
      box-sizing: border-box;
      display: block;
    `;

    // Améliorer les styles des blocs de code pour respecter le thème
    const style = document.createElement('style');
    style.textContent = `
      .agile-board-frame pre {
        background-color: var(--code-background) !important;
        border: 1px solid var(--background-modifier-border) !important;
        border-radius: var(--radius-s) !important;
        padding: var(--size-4-2) !important;
        margin: var(--size-4-2) 0 !important;
        overflow-x: auto !important;
        position: relative !important;
      }
      
      .agile-board-frame code {
        background-color: var(--code-background) !important;
        color: var(--code-normal) !important;
        padding: var(--size-4-1) var(--size-4-2) !important;
        border-radius: var(--radius-s) !important;
        font-family: var(--font-monospace) !important;
        font-size: var(--code-size) !important;
      }
      
      .agile-board-frame pre code {
        background-color: transparent !important;
        padding: 0 !important;
        border-radius: 0 !important;
      }
      
      /* Repositionner l'icône de copie d'Obsidian */
      .agile-board-frame .copy-code-button {
        position: absolute !important;
        top: var(--size-4-1) !important;
        right: var(--size-4-1) !important;
        bottom: auto !important;
        left: auto !important;
        margin: 0 !important;
        opacity: 0.7 !important;
        transition: opacity 0.2s ease !important;
      }
      
      .agile-board-frame .copy-code-button:hover {
        opacity: 1 !important;
      }
      
      .agile-board-frame pre:hover .copy-code-button {
        opacity: 1 !important;
      }

      /* Styles pour les callouts dans les cadres */
      .agile-board-frame .callout {
        overflow: visible !important;
        margin: 0.5em 0 !important;
      }

      .agile-board-frame .callout-content {
        overflow: visible !important;
        display: block !important;
      }
    `;

    if (!document.head.querySelector('#agile-board-code-styles')) {
      style.id = 'agile-board-code-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Affiche un placeholder quand le contenu est vide.
   */
  private renderPlaceholder(): void {
    if (!this.containerEl) return;

    const placeholder = this.containerEl.createDiv();
    placeholder.textContent = "Cliquez pour commencer à écrire...";
    placeholder.style.cssText = `
      color: var(--text-muted);
      font-style: italic;
    `;
  }

  /**
   * Rendu fallback en HTML simple si MarkdownRenderer échoue.
   */
  private renderFallbackHTML(content: string): void {
    if (!this.containerEl) return;

    const html = this.parseMarkdownToHTML(content);
    this.containerEl.innerHTML = html;
  }

  /**
   * Convertit le markdown en HTML simple.
   */
  private parseMarkdownToHTML(markdown: string): string {
    return markdown
      // Blocs de code (doit être traité avant les lignes horizontales)
      .replace(/```([\s\S]*?)```/gm, (match, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
      })
      
      // Lignes horizontales (avec ou sans saut de ligne avant)
      .replace(/(^|\n)(---+)(\n|$)/gim, '$1<hr>$3')
      .replace(/(^|\n)(\*\*\*+)(\n|$)/gim, '$1<hr>$3')
      .replace(/(^|\n)(___+)(\n|$)/gim, '$1<hr>$3')
      
      // Titres
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      
      // Code en ligne
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      
      // Formatage du texte
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/__(.*?)__/gim, '<strong>$1</strong>')
      .replace(/_(.*?)_/gim, '<em>$1</em>')
      .replace(/~~(.*?)~~/gim, '<del>$1</del>')
      
      // Listes à puces
      .replace(/^\s*[-*+]\s+(.+)$/gim, '<li>$1</li>')
      
      // Listes numérotées
      .replace(/^\s*\d+\.\s+(.+)$/gim, '<li>$1</li>')
      
      // Citations
      .replace(/^>\s+(.+)$/gim, '<blockquote>$1</blockquote>')
      
      // Liens
      .replace(/\[([^\]]+)]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      
      // Sauts de ligne
      .replace(/\n/gim, '<br>');
  }

  /**
   * Met à jour le contenu à rendre.
   */
  async updateContent(content: string): Promise<void> {
    await this.render(content);
  }

  /**
   * Configure les gestionnaires d'événements pour les boutons de copie.
   */
  private setupCopyButtonHandlers(): void {
    if (!this.containerEl) return;
    
    // Trouver tous les boutons de copie dans ce conteneur
    const copyButtons = this.containerEl.querySelectorAll('.copy-code-button');
    
    copyButtons.forEach(button => {
      // Empêcher la propagation des événements pour éviter d'ouvrir l'éditeur
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Laisser Obsidian gérer la copie
      });
      
      button.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      
      button.addEventListener('mouseup', (e) => {
        e.stopPropagation();
      });
    });
  }

  protected doLoad(): void {
    // Déjà initialisé dans le constructeur
  }

  protected doUnload(): void {
    this.component.unload();
  }
}