// src/layoutRenderer.ts
import { App, MarkdownView, TFile } from "obsidian";
import { 
  LayoutModel, 
  SectionRegistry, 
  LayoutRenderer as ILayoutRenderer,
  PLUGIN_CONSTANTS,
  LayoutBlock,
  Result,
  PluginError
} from "./types";
import { parseHeadingsInFile } from "./sectionParser";
import { MarkdownBox } from "./markdownBox";
import { createContextLogger } from "./core/logger";
import { ErrorHandler, ErrorSeverity } from "./core/errorHandler";

/**
 * Plan de rendu structuré pour un layout.
 * Contient toutes les informations nécessaires pour effectuer le rendu.
 */
interface RenderPlan {
  /** Blocs de layout complets */
  blocks: LayoutModel;
  /** Registry des sections disponibles */
  sections: SectionRegistry;
  /** Titres des sections manquantes */
  missingTitles: string[];
  /** Blocs avec sections disponibles */
  availableSections: LayoutBlock[];
  /** Blocs avec sections manquantes */
  missingSections: LayoutBlock[];
  /** Indique s'il y a des sections manquantes */
  hasMissingSections: boolean;
  /** Indique si une correction automatique est possible */
  canAutoFix: boolean;
}

/**
 * Service de rendu des layouts en mode Live Preview.
 * Architecture séparée entre logique de rendu (pure) et manipulation DOM (effets).
 * Gère l'affichage en grille CSS et la création des composants d'édition interactifs.
 * 
 * @example
 * ```typescript
 * const renderer = new LayoutRenderer(app);
 * await renderer.renderLayout(blocks, view, sections);
 * ```
 */
export class LayoutRenderer implements ILayoutRenderer {
  private readonly logger = createContextLogger('LayoutRenderer');
  private readonly activeContainers = new WeakSet<HTMLElement>();
  private readonly renderingState = new Map<string, boolean>();

  constructor(private readonly app: App) {}

  /**
   * Rend un layout en mode Live Preview avec les sections correspondantes.
   * Orchestrateur principal qui sépare validation, préparation et rendu.
   * @param blocks Modèle de layout à rendre
   * @param view Vue Markdown active
   * @param sections Registry des sections extraites du fichier
   * @throws {PluginError} En cas d'erreur de rendu ou de vue incompatible
   */
  public async renderLayout(
    blocks: LayoutModel,
    view: MarkdownView,
    sections: SectionRegistry
  ): Promise<void> {
    const renderResult = await this.renderLayoutSafe(blocks, view, sections);
    
    if (!renderResult.success) {
      this.logger.error('Erreur lors du rendu du tableau:', renderResult.error);
      ErrorHandler.handleError(
        renderResult.error,
        'LayoutRenderer.renderLayout',
        { severity: ErrorSeverity.WARNING }
      );
      throw renderResult.error;
    }
  }

  /**
   * Version sécurisée du rendu qui retourne un Result.
   * @param blocks Modèle de layout à rendre
   * @param view Vue Markdown active
   * @param sections Registry des sections
   * @returns Result indiquant le succès ou l'échec du rendu
   */
  public async renderLayoutSafe(
    blocks: LayoutModel,
    view: MarkdownView,
    sections: SectionRegistry
  ): Promise<Result<void>> {
    try {
      // Étape 1: Validation du contexte de rendu
      const validationResult = this.validateRenderContext(blocks, view, sections);
      if (!validationResult.success) {
        return validationResult;
      }

      const viewId = this.getViewId(view);
      
      // Prévenir le rendu concurrent sur la même vue
      if (this.renderingState.get(viewId)) {
        return { success: true, data: undefined };
      }

      this.renderingState.set(viewId, true);
      
      try {
        // Étape 2: Analyse des données et préparation
        const renderPlan = this.createRenderPlan(blocks, sections);
        
        // Étape 3: Création du container principal
        const container = this.getOrCreateContainer(view);
        
        // Étape 4: Rendu conditionnel selon l'état
        if (renderPlan.hasMissingSections) {
          await this.renderErrorState(view, container, renderPlan);
        } else {
          await this.renderSuccessState(view, container, renderPlan);
        }
        
        return { success: true, data: undefined };
        
      } finally {
        this.renderingState.delete(viewId);
      }
      
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'INITIALIZATION_ERROR',
          component: 'LayoutRenderer',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Valide le contexte avant rendu pour éviter les erreurs.
   * @param blocks Blocs de layout
   * @param view Vue Markdown
   * @param sections Registry des sections
   * @returns Result de validation
   */
  private validateRenderContext(
    blocks: LayoutModel,
    view: MarkdownView,
    sections: SectionRegistry
  ): Result<void> {
    if (!view.file) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: ['Aucun fichier associé à la vue Markdown']
        }
      };
    }

    if (!this.isLivePreviewMode(view)) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: ['Vue non compatible: Live Preview requis']
        }
      };
    }

    if (blocks.length === 0) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: ['Modèle de tableau vide']
        }
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Vérifie si nous sommes en mode Live Preview.
   * @param view Vue Markdown à vérifier
   * @returns true si en mode Live Preview
   */
  private isLivePreviewMode(view: MarkdownView): boolean {
    const state = view.getState();
    return state.mode === "source" && state.source === false;
  }

  /**
   * Génère un identifiant unique pour une vue.
   * @param view Vue Markdown
   * @returns Identifiant de vue
   */
  private getViewId(view: MarkdownView): string {
    return view.file?.path ?? `view-${Date.now()}`;
  }

  /**
   * Crée un plan de rendu basé sur l'analyse des données.
   * Fonction pure qui analyse sans effet de bord.
   * @param blocks Modèle de layout
   * @param sections Registry des sections disponibles
   * @returns Plan de rendu structuré
   */
  private createRenderPlan(
    blocks: LayoutModel,
    sections: SectionRegistry
  ): RenderPlan {
    const missingTitles = this.findMissingSections(blocks, sections);
    const availableSections = blocks.filter(block => sections[block.title]);
    const missingSections = blocks.filter(block => !sections[block.title]);

    return {
      blocks,
      sections,
      missingTitles,
      availableSections,
      missingSections,
      hasMissingSections: missingTitles.length > 0,
      canAutoFix: missingTitles.length > 0 // Tous les titres manquants peuvent être créés
    };
  }

  /**
   * Identifie les sections manquantes par rapport au modèle.
   * @param blocks Modèle de layout
   * @param sections Registry des sections disponibles
   * @returns Liste des titres manquants
   */
  private findMissingSections(
    blocks: LayoutModel,
    sections: SectionRegistry
  ): string[] {
    return blocks
      .map(block => block.title)
      .filter(title => !sections[title]);
  }

  /**
   * Effectue le rendu en état d'erreur (sections manquantes).
   * @param view Vue Markdown
   * @param container Container principal
   * @param renderPlan Plan de rendu avec les erreurs
   */
  private async renderErrorState(
    view: MarkdownView,
    container: HTMLElement,
    renderPlan: RenderPlan
  ): Promise<void> {
    
    const errorOverlay = this.createErrorOverlay(
      view,
      renderPlan.blocks,
      renderPlan.missingTitles
    );
    
    container.appendChild(errorOverlay);
  }

  /**
   * Effectue le rendu en état de succès (grille complète).
   * @param view Vue Markdown
   * @param container Container principal
   * @param renderPlan Plan de rendu validé
   */
  private async renderSuccessState(
    view: MarkdownView,
    container: HTMLElement,
    renderPlan: RenderPlan
  ): Promise<void> {
    
    const grid = this.createGrid(renderPlan.blocks);
    
    // Ajouter tous les blocs à la grille
    for (const block of renderPlan.blocks) {
      const blockElement = await this.createBlockElement(
        view,
        block,
        renderPlan.sections[block.title]
      );
      grid.appendChild(blockElement);
    }
    
    container.appendChild(grid);
  }

  /**
   * Crée ou récupère le container principal pour le rendu.
   * @param view Vue Markdown active
   * @returns Container HTML principal
   */
  private getOrCreateContainer(view: MarkdownView): HTMLElement {
    const existingContainer = view.containerEl.querySelector(
      `.${PLUGIN_CONSTANTS.CSS_CLASSES.CONTAINER}`
    ) as HTMLElement;

    if (existingContainer) {
      this.cleanupContainer(existingContainer);
      return existingContainer;
    }

    return this.createContainer(view);
  }

  /**
   * Crée un nouveau container principal.
   * @param view Vue Markdown
   * @returns Nouveau container
   */
  private createContainer(view: MarkdownView): HTMLElement {
    const container = view.containerEl.createDiv(
      PLUGIN_CONSTANTS.CSS_CLASSES.CONTAINER
    );
    
    // Application des styles de base
    Object.assign(container.style, {
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      overflow: 'auto'
    });

    this.activeContainers.add(container);
    return container;
  }

  /**
   * Nettoie un container existant pour le réutiliser.
   * @param container Container à nettoyer
   */
  private cleanupContainer(container: HTMLElement): void {
    // Nettoyer tout le contenu DOM
    container.empty();
    
    // Réinitialiser les classes CSS
    container.className = PLUGIN_CONSTANTS.CSS_CLASSES.CONTAINER;
  }

  /**
   * Crée la grille CSS pour le layout.
   * @param blocks Blocs de layout
   * @returns Élément DOM de la grille
   */
  private createGrid(blocks: LayoutModel): HTMLElement {
    const grid = document.createElement('div');
    grid.className = PLUGIN_CONSTANTS.CSS_CLASSES.GRID;

    // Configuration de la grille CSS - dimensions contrôlées par inline styles
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: `repeat(${PLUGIN_CONSTANTS.GRID.COLUMNS}, 1fr)`,
      gap: '0.5rem',
      padding: '1rem',
      minHeight: '90vh'
    });

    return grid;
  }

  /**
   * Crée un élément de bloc pour la grille.
   * @param view Vue Markdown
   * @param block Configuration du bloc
   * @param sectionInfo Informations de la section (optionnel)
   * @returns Élément DOM du bloc
   */
  private async createBlockElement(
    view: MarkdownView,
    block: LayoutBlock,
    sectionInfo?: any
  ): Promise<HTMLElement> {
    const blockElement = document.createElement('section');
    blockElement.className = PLUGIN_CONSTANTS.CSS_CLASSES.FRAME;

    // Configuration du positionnement CSS Grid avec flex layout pour le contenu
    Object.assign(blockElement.style, {
      gridColumn: `${block.x + 1} / span ${block.w}`,
      gridRow: `${block.y + 1} / span ${block.h}`,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100px',
      boxSizing: 'border-box',
      border: '1px solid var(--background-modifier-border)',
      padding: '0.5rem',
      backgroundColor: 'var(--background-primary)',
      borderRadius: '0.5rem',
      overflow: 'hidden'
    });

    // Ajouter le titre
    const titleElement = this.createBlockTitle(block.title);
    blockElement.appendChild(titleElement);

    // Ajouter le contenu
    const contentElement = await this.createBlockContent(
      view,
      block,
      sectionInfo
    );
    blockElement.appendChild(contentElement);

    return blockElement;
  }

  /**
   * Crée l'élément titre d'un bloc.
   * @param title Titre du bloc
   * @returns Élément titre
   */
  private createBlockTitle(title: string): HTMLElement {
    const titleElement = document.createElement('strong');
    Object.assign(titleElement.style, {
      display: 'block',
      padding: '0.5em 0.75em',
      marginBottom: '0.5em'
    });
    titleElement.textContent = title;
    return titleElement;
  }

  /**
   * Crée le contenu d'un bloc (MarkdownBox ou message d'erreur).
   * @param view Vue Markdown
   * @param block Configuration du bloc
   * @param sectionInfo Informations de la section
   * @returns Élément contenu
   */
  private async createBlockContent(
    view: MarkdownView,
    block: LayoutBlock,
    sectionInfo?: any
  ): Promise<HTMLElement> {
    const contentContainer = document.createElement('div');

    // Configurer le container pour prendre l'espace restant et permettre le scroll
    Object.assign(contentContainer.style, {
      flex: '1',
      overflow: 'auto',
      minHeight: '0'
    });

    if (sectionInfo) {
      // Contenu éditable avec MarkdownBox
      const initialContent = sectionInfo.lines.join('\n');
      const onContentChange = this.createContentChangeHandler(view, sectionInfo);

      new MarkdownBox(this.app, contentContainer, initialContent, onContentChange);
    } else {
      // Message d'erreur pour section manquante
      const errorMessage = document.createElement('p');
      errorMessage.style.opacity = '0.6';
      errorMessage.textContent = 'Section introuvable';
      contentContainer.appendChild(errorMessage);
    }

    return contentContainer;
  }

  /**
   * Crée un gestionnaire de changement de contenu pour une section.
   * @param view Vue Markdown
   * @param sectionInfo Informations de la section
   * @returns Fonction de callback
   */
  private createContentChangeHandler(
    view: MarkdownView,
    sectionInfo: any
  ): (newContent: string) => Promise<void> {
    return async (newContent: string) => {
      try {
        if (!view.file) {
          throw new Error('Fichier non disponible');
        }
        
        const text = await this.app.vault.read(view.file);
        const lines = text.split('\n');
        const before = lines.slice(0, sectionInfo.start + 1);
        const after = lines.slice(sectionInfo.end);
        const merged = [...before, ...newContent.split('\n'), ...after].join('\n');
        
        await this.app.vault.modify(view.file, merged);
      } catch (error) {
        this.logger.error('Erreur lors de la mise à jour du contenu:', error);
        ErrorHandler.handleError(
          {
            type: 'FILE_SYSTEM_ERROR',
            error: error instanceof Error ? error : new Error(String(error)),
            filePath: view.file?.path,
            operation: 'content-update'
          },
          'LayoutRenderer.contentChange',
          { severity: ErrorSeverity.WARNING }
        );
      }
    };
  }

  /**
   * Crée l'overlay d'erreur pour les sections manquantes.
   * @param view Vue Markdown
   * @param blocks Blocs du layout
   * @param missingTitles Titres manquants
   * @returns Élément d'erreur
   */
  private createErrorOverlay(
    view: MarkdownView,
    blocks: LayoutModel,
    missingTitles: string[]
  ): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = PLUGIN_CONSTANTS.CSS_CLASSES.ERROR;
    
    // Styles de base pour l'overlay
    Object.assign(overlay.style, {
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: 'var(--background-secondary)',
      border: '2px dashed var(--color-accent)',
      borderRadius: '1rem',
      fontSize: '1.1em',
      marginBottom: '1rem'
    });

    // Titre d'erreur
    const title = document.createElement('h2');
    title.textContent = '❌ Impossible d\'appliquer le modèle';
    overlay.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.textContent = 'Titres manquants :';
    overlay.appendChild(description);

    // Liste des sections manquantes
    const list = this.createMissingSectionsList(missingTitles);
    overlay.appendChild(list);

    // Bouton de correction automatique
    const fixButton = this.createAutoFixButton(view, blocks);
    overlay.appendChild(fixButton);

    return overlay;
  }

  /**
   * Crée la liste des sections manquantes.
   * @param missingTitles Titres manquants
   * @returns Élément liste
   */
  private createMissingSectionsList(missingTitles: string[]): HTMLElement {
    const list = document.createElement('ul');
    list.style.textAlign = 'left';
    
    missingTitles.forEach(title => {
      const listItem = document.createElement('li');
      listItem.textContent = `# ${title}`;
      list.appendChild(listItem);
    });
    
    return list;
  }

  /**
   * Crée le bouton de correction automatique.
   * @param view Vue Markdown
   * @param blocks Blocs du layout
   * @returns Élément bouton
   */
  private createAutoFixButton(view: MarkdownView, blocks: LayoutModel): HTMLElement {
    const button = document.createElement('button');
    button.className = 'mod-cta';
    button.style.marginTop = '1em';
    button.textContent = '➕ Réinitialiser la note avec le modèle';
    
    button.addEventListener('click', async () => {
      await this.handleAutoFix(view, blocks);
    });
    
    return button;
  }

  /**
   * Gère la correction automatique des sections manquantes.
   * @param view Vue Markdown
   * @param blocks Blocs du layout
   */
  private async handleAutoFix(view: MarkdownView, blocks: LayoutModel): Promise<void> {
    if (!view.file) {
      this.logger.error('Aucun fichier disponible pour la correction automatique');
      return;
    }

    const confirmed = window.confirm(
      'Tout le contenu (hors frontmatter) sera remplacé par les titres du modèle. Continuer ?'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await this.resetAndInsertSections(view.file, blocks);
      const updatedSections = await parseHeadingsInFile(this.app, view.file);
      await this.renderLayout(blocks, view, updatedSections);
      
    } catch (error) {
      this.logger.error('Erreur lors de la correction automatique:', error);
      ErrorHandler.handleError(
        {
          type: 'FILE_SYSTEM_ERROR',
          error: error instanceof Error ? error : new Error(String(error)),
          filePath: view.file.path,
          operation: 'auto-fix'
        },
        'LayoutRenderer.autoFix',
        { severity: ErrorSeverity.WARNING }
      );
    }
  }

  /**
   * Réinitialise le fichier avec les sections du modèle.
   * Préserve le frontmatter et remplace tout le contenu par les titres du layout.
   * @param file Fichier à modifier
   * @param blocks Modèle de layout
   * @throws {PluginError} En cas d'erreur de lecture ou d'écriture
   */
  private async resetAndInsertSections(
    file: TFile,
    blocks: LayoutModel
  ): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const { frontmatter, contentStart } = this.extractFrontmatter(content);
      
      // Génération du nouveau contenu avec sections vides
      const sectionsContent = blocks
        .map(block => `# ${block.title}\n\n`)
        .join('');
      
      // Reconstruction du fichier
      const newContent = frontmatter 
        ? `${frontmatter}\n${sectionsContent}`
        : sectionsContent;
      
      await this.app.vault.modify(file, newContent.trimStart());
      
    } catch (error) {
      const pluginError: PluginError = {
        type: 'FILE_SYSTEM_ERROR',
        error: error instanceof Error ? error : new Error(String(error)),
        filePath: file.path,
        operation: 'reset-file'
      };
      throw pluginError;
    }
  }

  /**
   * Extrait le frontmatter d'un contenu markdown.
   * Fonction pure qui analyse la structure du fichier.
   * @param content Contenu complet du fichier
   * @returns Frontmatter et position de début du contenu
   */
  private extractFrontmatter(content: string): {
    frontmatter: string | null;
    contentStart: number;
  } {
    const lines = content.split('\n');
    
    if (lines.length === 0 || lines[0] !== '---') {
      return { frontmatter: null, contentStart: 0 };
    }
    
    // Recherche de la fin du frontmatter
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        const frontmatterLines = lines.slice(0, i + 1);
        return {
          frontmatter: frontmatterLines.join('\n'),
          contentStart: i + 1
        };
      }
    }
    
    // Frontmatter mal fermé, le traiter comme du contenu normal
    return { frontmatter: null, contentStart: 0 };
  }

  /**
   * Nettoie toutes les ressources actives du renderer.
   * Méthode publique pour le nettoyage lors du déchargement du plugin.
   */
  public dispose(): void {
    // Nettoyer les états de rendu actifs
    this.renderingState.clear();
    
    // Les containers seront nettoyés automatiquement par Obsidian
    // mais on peut forcer le nettoyage des WeakSet
    // (les WeakSet se nettoient automatiquement quand les objets sont garbage collected)
    
  }

  /**
   * Obtient des statistiques de diagnostic sur l'état du renderer.
   * Utile pour le débogage et le monitoring.
   * @returns Rapport de diagnostic
   */
  public getDiagnostics(): {
    activeRenders: number;
    activeContainersCount: number; // Approximatif car WeakSet
  } {
    return {
      activeRenders: this.renderingState.size,
      activeContainersCount: 0 // WeakSet ne permet pas de compter
    };
  }
}
