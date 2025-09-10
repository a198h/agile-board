// src/markdownBox.ts
import { App, MarkdownRenderer } from "obsidian";
import { createContextLogger } from "./core/logger";
import { ErrorHandler, ErrorSeverity } from "./core/errorHandler";
import { PluginError, Result } from "./types";

/**
 * Composant d'édition inline de contenu Markdown avec prévisualisation.
 * Architecture séparée entre rendu (DOM) et logique métier (contenu).
 * Optimisé pour l'intégration dans les grilles CSS et les layouts responsifs.
 * 
 * @example
 * ```typescript
 * const markdownBox = new MarkdownBox(
 *   app, 
 *   container, 
 *   'contenu initial', 
 *   async (newContent) => {
 *     await saveContent(newContent);
 *   }
 * );
 * ```
 */
export class MarkdownBox {
  // Éléments DOM principaux
  public readonly boxEl: HTMLElement;
  public readonly previewEl: HTMLElement;
  public readonly editorEl: HTMLTextAreaElement;
  
  // État du contenu
  private content = "";
  private isDirty = false;
  private isEditing = false;
  
  // Configuration et helpers
  private readonly logger = createContextLogger('MarkdownBox');
  private readonly containerOriginalHeight: string;

  constructor(
    private readonly app: App,
    container: HTMLElement,
    initial: string,
    private readonly onChange: (newContent: string) => Promise<void>
  ) {
    this.content = initial || "";
    
    // Mémoriser la configuration originale du container
    this.containerOriginalHeight = container.style.height || getComputedStyle(container).height;
    

    // ATTENTION : Ne pas modifier le display du container car cela interfère avec CSS Grid
    // Le container garde son display original pour préserver les propriétés de grille
    if (container.classList.contains("agile-board-frame")) {
      // Seulement définir les propriétés qui ne cassent pas CSS Grid
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      // Ne pas toucher à display, height, etc. - laisser CSS Grid gérer
    }

    // Création du container principal
    this.boxEl = this.createMainContainer(container);

    // Élément de prévisualisation
    this.previewEl = this.createPreviewElement();

    // Zone d'édition
    this.editorEl = this.createEditorElement();

    // Initialisation de l'interface
    this.initializeInterface();
  }

  /**
   * Crée le container principal avec la configuration CSS appropriée.
   * @param parent Élément parent
   * @returns Container configuré
   */
  private createMainContainer(parent: HTMLElement): HTMLElement {
    const container = parent.createDiv("markdown-box");
    
    // Configuration CSS optimisée pour les grilles
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
      maxHeight: '100%',
      boxSizing: 'border-box',
      padding: '0.25rem'
    });
    
    return container;
  }

  /**
   * Crée l'élément de prévisualisation.
   * @returns Élément de prévisualisation configuré
   */
  private createPreviewElement(): HTMLElement {
    const preview = this.boxEl.createDiv("markdown-preview");
    
    Object.assign(preview.style, {
      flex: '1',
      overflow: 'auto',
      cursor: 'text'
    });
    
    return preview;
  }

  /**
   * Crée l'élément d'édition (textarea).
   * @returns Élément d'édition configuré
   */
  private createEditorElement(): HTMLTextAreaElement {
    const editor = this.boxEl.createEl("textarea", { cls: "markdown-editor" });
    
    // Configuration Obsidian
    // @ts-ignore - accès aux paramètres internes d'Obsidian
    editor.spellcheck = this.app.vault.config?.spellcheck ?? false;
    
    // Configuration CSS
    Object.assign(editor.style, {
      width: '100%',
      flex: '1',
      minHeight: '0',
      boxSizing: 'border-box',
      resize: 'none',
      overflow: 'auto',
      display: 'none',
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit'
    });
    
    return editor;
  }

  /**
   * Initialise l'interface et les event listeners.
   */
  private initializeInterface(): void {
    // Rendu initial de la prévisualisation
    this.renderInitialPreview();
    
    // Configuration des interactions
    this.setupEventListeners();
    
  }

  /**
   * Effectue le rendu initial de la prévisualisation.
   */
  private renderInitialPreview(): void {
    this.renderPreview().catch(error => {
      this.logger.error('Erreur lors du rendu initial:', error);
    });
  }

  /**
   * Configure tous les event listeners de manière centralisée.
   */
  private setupEventListeners(): void {
    // Clic sur la prévisualisation
    this.previewEl.addEventListener("click", this.handlePreviewClick.bind(this));
    
    // Événements de l'éditeur
    this.editorEl.addEventListener("blur", this.handleEditorBlur.bind(this));
    this.editorEl.addEventListener("input", this.handleEditorInput.bind(this));
    this.editorEl.addEventListener("keydown", this.handleEditorKeydown.bind(this));
  }

  /**
   * Gère le clic sur la zone de prévisualisation.
   * @param event Événement de clic
   */
  private handlePreviewClick(event: MouseEvent): void {
    if (!this.isInteractiveElement(event.target as HTMLElement)) {
      this.openEditor();
    }
  }

  /**
   * Gère la perte de focus de l'éditeur.
   */
  private async handleEditorBlur(): Promise<void> {
    await this.closeEditor();
  }

  /**
   * Gère la saisie dans l'éditeur avec débouncing.
   */
  private handleEditorInput(): void {
    const newContent = this.editorEl.value;
    if (newContent !== this.content) {
      this.content = newContent;
      this.isDirty = true;
      this.renderPreview().catch(error => {
        this.logger.error('Erreur lors du rendu de prévisualisation:', error);
      });
    }
  }

  /**
   * Gère les raccourcis clavier dans l'éditeur.
   * @param event Événement clavier
   */
  private handleEditorKeydown(event: KeyboardEvent): void {
    // Raccourcis de navigation
    if (event.key === "Escape") {
      this.cancelEditing();
      return;
    }
    
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.closeEditor();
      return;
    }
    
    // Auto-indentation pour les listes (simplifié)
    if (event.key === "Enter") {
      this.handleEnterKey(event);
    }
  }

  /**
   * Gère la touche Entrée pour l'auto-indentation.
   * @param event Événement clavier
   */
  private handleEnterKey(event: KeyboardEvent): void {
    const textarea = this.editorEl;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const currentLine = textBeforeCursor.split('\n').pop() || '';

    // Détection des patterns de liste
    const bulletListMatch = currentLine.match(/^(\s*[-*+])\s/);
    
    if (bulletListMatch) {
      event.preventDefault();
      const listPrefix = bulletListMatch[1];
      const newText = textarea.value.substring(0, cursorPos) + 
                     '\n' + listPrefix + ' ' + 
                     textarea.value.substring(cursorPos);
      textarea.value = newText;
      textarea.setSelectionRange(cursorPos + listPrefix.length + 2, cursorPos + listPrefix.length + 2);
      
      // Trigger input event to update preview
      this.content = textarea.value;
      this.renderPreview();
    }
  }

  /**
   * Vérifie si un élément est interactif.
   * @param element Élément à vérifier
   * @returns true si interactif
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    // Vérifier si l'élément ou ses parents sont interactifs
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

  /**
   * Annule l'édition en cours et restaure le contenu original.
   */
  private cancelEditing(): void {
    this.editorEl.value = this.content; // Restaurer le contenu original
    this.isDirty = false;
    this.closeEditor();
  }

  /**
   * Effectue le rendu de la prévisualisation Markdown.
   * Fonction asynchrone pour la compatibilité avec MarkdownRenderer.
   */
  async renderPreview(): Promise<void> {
    try {
      this.previewEl.empty();

      // Force le conteneur à occuper tout l'espace disponible
      this.previewEl.style.position = "relative";
      this.previewEl.style.width = "100%";
      this.previewEl.style.height = "100%";
      this.previewEl.style.minHeight = "60px"; // adapte si besoin

      if (!this.content.trim()) {
        const placeholder = document.createElement("div");
        placeholder.innerText = "Cliquez pour commencer à écrire…";
        // Styles en dur pour occuper tout l'espace et centrer le texte
        placeholder.style.position = "absolute";
        placeholder.style.top = "0";
        placeholder.style.left = "0";
        placeholder.style.right = "0";
        placeholder.style.bottom = "0";
        placeholder.style.width = "100%";
        placeholder.style.height = "100%";
        placeholder.style.display = "flex";
        placeholder.style.alignItems = "center";
        placeholder.style.justifyContent = "center";
        placeholder.style.opacity = "0.5";
        placeholder.style.cursor = "text";
        placeholder.style.userSelect = "none";
        placeholder.style.fontStyle = "italic";
        this.previewEl.appendChild(placeholder);
      } else {
        // Nettoie le style si contenu non vide
        this.previewEl.style.position = "";
        this.previewEl.style.minHeight = "";
        await MarkdownRenderer.render(
          this.app,
          this.content,
          this.previewEl,
          this.app.workspace.getActiveFile()?.path ?? "",
          this.app.workspace.getActiveFile() as any
        );
      }
    } catch (error) {
      this.logger.error('Erreur lors du rendu de prévisualisation:', error);
    }
  }

  /**
   * Ouvre l'éditeur et active le mode édition.
   */
  public openEditor(): void {
    try {
      this.isEditing = true;
      this.isDirty = false;
      
      this.editorEl.value = this.content;
      this.previewEl.style.display = "none";
      this.editorEl.style.display = "block";
      
      // S'assurer que le container conserve ses propriétés de grille ET sa hauteur
      const container = this.boxEl.parentElement;
      
      if (container && container.classList.contains("agile-board-frame")) {
        // Sauvegarder les propriétés CSS Grid existantes
        const computedStyle = getComputedStyle(container);
        const gridColumn = computedStyle.gridColumn;
        const gridRow = computedStyle.gridRow;
        const currentHeight = computedStyle.height;
        
        // Préserver la hauteur ET les propriétés de grille
        container.style.height = currentHeight;
        container.style.minHeight = currentHeight;
        container.style.maxHeight = currentHeight;
        
        // IMPORTANT : Préserver les propriétés de grille qui pourraient être écrasées
        if (gridColumn && gridColumn !== 'auto') {
          container.style.gridColumn = gridColumn;
        }
        if (gridRow && gridRow !== 'auto') {
          container.style.gridRow = gridRow;
        }
      }
      
      // S'assurer que l'éditeur occupe tout l'espace disponible
      this.editorEl.style.height = "100%";
      this.editorEl.style.minHeight = "calc(100% - 1rem)";
      
      this.editorEl.focus();
      
      // Placer le curseur à la fin du texte
      this.editorEl.setSelectionRange(this.content.length, this.content.length);
      
    } catch (error) {
      this.logger.error('Erreur lors de l\'ouverture de l\'éditeur:', error);
      this.isEditing = false;
    }
  }
  
  /**
   * Ferme l'éditeur et sauvegarde les modifications.
   */
  private async closeEditor(): Promise<void> {
    try {
      const newContent = this.editorEl.value;
      const hasChanged = newContent !== this.content;
      
      if (hasChanged) {
        this.content = newContent;
      }
      
      this.editorEl.style.display = "none";
      this.previewEl.style.display = "block";
      
      // Rétablir le comportement flexible du container
      const container = this.boxEl.parentElement;
      if (container && container.classList.contains("agile-board-frame")) {
        // Retirer les contraintes de hauteur fixe pour permettre au contenu de s'adapter
        container.style.minHeight = "100px"; // Hauteur minimum raisonnable
        container.style.maxHeight = "100%";   // Reprendre la hauteur de la grille
        // Garder la hauteur actuelle comme base
        // container.style.height reste inchangé pour conserver la taille
      }
      
      await this.renderPreview();
      
      if (hasChanged) {
        try {
          await this.onChange(this.content);
        } catch (error) {
          this.logger.error('Erreur lors de la notification de changement:', error);
        }
      }
      
      this.isEditing = false;
      this.isDirty = false;
      
    } catch (error) {
      this.logger.error('Erreur lors de la fermeture de l\'éditeur:', error);
    }
  }

  /**
   * Vérifie si des changements non sauvegardés sont en cours.
   * @returns true si des changements sont en attente
   */
  public hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  /**
   * Récupère le contenu actuel.
   * @returns Contenu Markdown actuel
   */
  public getContent(): string {
    return this.content;
  }

  /**
   * Met à jour le contenu programmatiquement.
   * @param newContent Nouveau contenu
   */
  public setContent(newContent: string): void {
    this.content = newContent;
    
    if (this.isEditing) {
      this.editorEl.value = newContent;
    }
    
    this.renderPreview().catch(error => {
      this.logger.error('Erreur lors de la mise à jour du contenu:', error);
    });
  }

  /**
   * Nettoie les ressources utilisées par le composant.
   */
  public dispose(): void {
    // Les event listeners seront automatiquement nettoyés avec les éléments DOM
  }
}