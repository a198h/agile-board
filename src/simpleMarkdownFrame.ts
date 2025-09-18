// src/simpleMarkdownFrame.ts
import { App, TFile } from "obsidian";
import { SectionInfo } from "./sectionParser";
import { BaseUIComponent } from "./core/baseComponent";
import { MarkdownRenderer } from "./components/markdown/MarkdownRenderer";
import { MarkdownEditor } from "./components/markdown/MarkdownEditor";
import { LinkHandler } from "./components/markdown/LinkHandler";
import { CheckboxHandler } from "./components/markdown/CheckboxHandler";
import { GridLayoutManager } from "./components/markdown/GridLayoutManager";

/**
 * Frame markdown refactorisé utilisant une architecture modulaire.
 * Délègue les responsabilités aux composants spécialisés pour respecter SOLID.
 */
export class SimpleMarkdownFrame extends BaseUIComponent {
  private isEditing = false;
  private markdownContent: string;
  
  // Composants modulaires
  private renderer: MarkdownRenderer;
  private editor: MarkdownEditor | null = null;
  private linkHandler: LinkHandler;
  private checkboxHandler: CheckboxHandler;
  private gridLayoutManager: GridLayoutManager;

  constructor(
    container: HTMLElement,
    private app: App,
    private file: TFile,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    super(container, app);
    this.markdownContent = this.section.lines.join('\n');
    
    // Initialiser les composants modulaires
    this.renderer = new MarkdownRenderer(container, app, file, section);
    this.linkHandler = new LinkHandler(app, file, container);
    this.checkboxHandler = new CheckboxHandler(container, this.handleContentChange.bind(this));
    this.gridLayoutManager = new GridLayoutManager();
    
    // Enregistrer les composants pour nettoyage automatique
    this.registerDisposable(this.renderer);
    
    this.initializeFrame();
  }

  /**
   * Initialise le frame avec le mode prévisualisation.
   */
  private async initializeFrame(): Promise<void> {
    this.setupContainer();
    await this.showPreviewMode();
  }

  /**
   * Gestionnaire centralisé des changements de contenu.
   */
  private handleContentChange(content: string): void {
    this.markdownContent = content;
    this.onChange(content);
  }

  /**
   * Configure le container principal.
   */
  private setupContainer(): void {
    if (!this.containerEl) return;
    
    this.containerEl.empty();
    this.containerEl.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    `;
  }

  /**
   * Affiche le mode prévisualisation.
   */
  private async showPreviewMode(): Promise<void> {
    this.cleanupEditor();
    
    if (!this.containerEl) return;
    
    // Utiliser le renderer modulaire
    await this.renderer.render(this.markdownContent);
    
    // Configurer les gestionnaires avec les composants modulaires
    this.linkHandler.setupAllLinks();
    this.checkboxHandler.setupCheckboxHandlers();
    this.setupCheckboxListener();
    this.setupClickHandler();
    
    this.isEditing = false;
  }

  /**
   * Configure le gestionnaire de clic pour passer en mode édition.
   */
  private setupClickHandler(): void {
    if (!this.containerEl) return;
    
    this.containerEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Vérifier si c'est un élément interactif
      if (this.linkHandler.isInteractiveElement(target)) {
        return;
      }
      
      this.enterEditMode();
    });
  }

  /**
   * Configure l'écoute des changements de checkbox.
   */
  private setupCheckboxListener(): void {
    if (!this.containerEl) return;
    
    this.containerEl.addEventListener('checkbox-changed', () => {
      const updatedContent = this.checkboxHandler.updateMarkdownContent(this.markdownContent);
      this.handleContentChange(updatedContent);
      this.refreshPreview();
    });
  }


  /**
   * Passe en mode édition.
   */
  private enterEditMode(): void {
    if (this.isEditing) {
        return;
    }

    // Convertir la grille CSS en positionnement absolu
    this.gridLayoutManager.convertToAbsolute(this.containerEl!);
    this.continueEnterEditMode();
  }
  
  /**
   * Continue le processus d'entrée en mode édition après verrouillage.
   */
  private continueEnterEditMode(): void {
    this.cleanupEditor();
    
    if (!this.containerEl) return;
    
    // Créer l'éditeur modulaire
    this.editor = new MarkdownEditor(
      this.containerEl,
      this.app,
      this.markdownContent,
      {
        onContentChange: this.handleContentChange.bind(this),
        onExitEdit: this.exitEditMode.bind(this)
      }
    );
    
    this.editor.initialize();
    
    this.isEditing = true;
  }



  /**
   * Quitte le mode édition et retourne à la prévisualisation.
   */
  private async exitEditMode(): Promise<void> {
    if (!this.isEditing) {
      return;
    }

    await this.showPreviewMode();
    
    // Restaurer la grille CSS depuis le positionnement absolu
    this.gridLayoutManager.restoreToGrid();
  }













  /**
   * Re-rend le contenu en mode prévisualisation pour appliquer les styles.
   */
  private async refreshPreview(): Promise<void> {
    if (this.isEditing || !this.containerEl) return;
    
    const scrollTop = this.containerEl.scrollTop;
    await this.showPreviewMode();
    this.containerEl.scrollTop = scrollTop;
  }

  /**
   * Nettoie l'éditeur actif.
   */
  private cleanupEditor(): void {
    if (this.editor) {
      this.editor.unload();
      this.editor = null;
    }
  }

  /**
   * Met à jour le contenu du frame.
   */
  async updateContent(newContent: string): Promise<void> {
    this.markdownContent = newContent;

    if (!this.isEditing) {
      await this.showPreviewMode();
    }
  }

  /**
   * Retourne le contenu actuel.
   */
  getContent(): string {
    return this.markdownContent;
  }

  /**
   * Force l'entrée en mode édition.
   */
  startEditing(): void {
    this.enterEditMode();
  }

  /**
   * Vérifie si le frame est en mode édition.
   */
  isEditMode(): boolean {
    return this.isEditing;
  }

  /**
   * Obtient le titre de la section.
   */
  getSectionTitle(): string {
    return this.section.title;
  }

  /**
   * Met le focus sur l'éditeur si en mode édition.
   */
  focus(): void {
    if (this.isEditing && this.editor) {
      this.editor.focus();
    }
  }

  protected doLoad(): void {
    // Déjà initialisé dans le constructeur
  }

  protected doUnload(): void {
    this.gridLayoutManager.restoreToGrid();
    this.cleanupEditor();
  }
}