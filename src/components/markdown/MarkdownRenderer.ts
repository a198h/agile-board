// src/components/markdown/MarkdownRenderer.ts
import { App, TFile, Component, MarkdownRenderer as ObsidianMarkdownRenderer } from "obsidian";
import { SectionInfo } from "../../types";
import { BaseUIComponent } from "../../core/baseComponent";

/**
 * Composant responsable du rendu de prévisualisation markdown.
 * Utilise l'API MarkdownRenderer d'Obsidian pour le support complet Dataview/Tasks.
 */
export class MarkdownRenderer extends BaseUIComponent {
  private component: Component;

  constructor(
    container: HTMLElement,
    app: App,
    private file: TFile,
    private section: SectionInfo
  ) {
    super(container, app);
    this.component = new Component();
    
    this.registerDisposable({
      dispose: () => this.component.unload()
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
      await ObsidianMarkdownRenderer.renderMarkdown(
        content,
        this.containerEl,
        this.file.path,
        this.component
      );
    } catch (error) {
      console.warn('MarkdownRenderer failed, falling back to simple HTML:', error);
      this.renderFallbackHTML(content);
    }
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
      padding: 0.5rem;
      cursor: text;
      box-sizing: border-box;
    `;
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
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
  }

  /**
   * Met à jour le contenu à rendre.
   */
  async updateContent(content: string): Promise<void> {
    await this.render(content);
  }

  protected doLoad(): void {
    // Déjà initialisé dans le constructeur
  }

  protected doUnload(): void {
    this.component.unload();
  }
}