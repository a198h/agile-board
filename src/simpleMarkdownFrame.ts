// src/simpleMarkdownFrame.ts
import { App, TFile, Component, MarkdownRenderer } from "obsidian";
import { SectionInfo } from "./sectionParser";
import { BaseUIComponent } from "./core/baseComponent";

/**
 * Frame markdown simplifié utilisant une architecture modulaire.
 * Gère l'affichage et l'édition de sections markdown dans un layout en grille.
 */
export class SimpleMarkdownFrame extends BaseUIComponent {
  private isEditing = false;
  private markdownContent: string;
  private component: Component;

  constructor(
    container: HTMLElement,
    private app: App,
    private file: TFile,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    super(container, app);
    this.markdownContent = this.section.lines.join('\n');
    this.component = new Component();
    
    // Enregistrer le component pour nettoyage automatique
    this.registerDisposable({
      dispose: () => this.component.unload()
    });
    
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
    console.log('SimpleMarkdownFrame: showPreviewMode called');
    
    // Nettoyer les composants existants
    this.cleanupComponents();

    // Rendu de prévisualisation avec support Dataview/Tasks
    if (this.containerEl) {
      this.containerEl.empty();
      this.containerEl.style.cssText = `
        width: 100%;
        height: 100%;
        overflow: auto;
        padding: 0.5rem;
        cursor: text;
        box-sizing: border-box;
      `;
      
      if (!this.markdownContent.trim()) {
        const placeholder = this.containerEl.createDiv();
        placeholder.textContent = "Cliquez pour commencer à écrire...";
        placeholder.style.cssText = `
          color: var(--text-muted);
          font-style: italic;
        `;
      } else {
        try {
          // Utiliser MarkdownRenderer d'Obsidian pour Dataview/Tasks
          await MarkdownRenderer.renderMarkdown(
            this.markdownContent,
            this.containerEl,
            this.file.path,
            this.component
          );
        } catch (error) {
          console.warn('MarkdownRenderer failed, falling back to simple HTML:', error);
          // Fallback vers rendu simple
          this.containerEl.innerHTML = this.parseMarkdownToHTML(this.markdownContent);
        }
      }
      
      // Gestionnaire de clic pour passer en mode édition
      this.containerEl.addEventListener('click', (e) => {
        // Éviter de déclencher sur les éléments interactifs
        const target = e.target as HTMLElement;
        if (target.tagName === 'A' || target.tagName === 'BUTTON' || 
            target.closest('a') || target.closest('button') ||
            target.classList.contains('dataview') ||
            target.closest('.dataview')) {
          return; // Laisser les éléments interactifs fonctionner
        }
        
        console.log('SimpleMarkdownFrame: preview clicked');
        this.enterEditMode();
      });
    }
    
    this.isEditing = false;
    console.log('SimpleMarkdownFrame: preview mode activated');
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
   * Passe en mode édition.
   */
  private enterEditMode(): void {
    console.log('SimpleMarkdownFrame: enterEditMode called');
    if (this.isEditing) {
      console.log('SimpleMarkdownFrame: already in edit mode, returning');
      return;
    }

    // Convertir la grille CSS en positionnement absolu
    this.createDimensionPreservingWrapper();
    this.continueEnterEditMode();
  }
  
  /**
   * Continue le processus d'entrée en mode édition après verrouillage.
   */
  private continueEnterEditMode(): void {
    console.log('SimpleMarkdownFrame: continuing enterEditMode after lock');
    
    // Nettoyer les composants existants
    this.cleanupComponents();

    console.log('SimpleMarkdownFrame: creating text area');
    // Créer directement un textarea simple
    if (this.containerEl) {
      this.containerEl.empty();
      
      const textArea = this.containerEl.createEl('textarea');
      textArea.style.cssText = `
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
      
      textArea.value = this.markdownContent;
      
      // Focus immédiat
      textArea.focus();
      textArea.setSelectionRange(textArea.value.length, textArea.value.length);
      
      // Gestionnaires d'événements simples
      textArea.addEventListener('input', () => {
        this.markdownContent = textArea.value;
        this.onChange(this.markdownContent);
      });
      
      textArea.addEventListener('blur', () => {
        console.log('SimpleMarkdownFrame: textarea blur event');
        setTimeout(() => this.exitEditMode(), 100);
      });
      
      textArea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.exitEditMode();
        }
      });
    }

    this.isEditing = true;
    console.log('SimpleMarkdownFrame: edit mode activated');
  }

  /**
   * Quitte le mode édition et retourne à la prévisualisation.
   */
  private async exitEditMode(): Promise<void> {
    console.log('SimpleMarkdownFrame: exitEditMode called');
    if (!this.isEditing) {
      console.log('SimpleMarkdownFrame: not in edit mode, returning');
      return;
    }

    console.log('SimpleMarkdownFrame: showing preview mode');
    await this.showPreviewMode();
    
    // Restaurer la grille CSS depuis le positionnement absolu
    this.removeDimensionPreservingWrapper();
  }


  /**
   * Convertit temporairement la grille CSS en positionnement absolu.
   */
  private createDimensionPreservingWrapper(): void {
    if (!this.containerEl) return;
    
    // Trouver le container de grille principal
    let gridContainer: HTMLElement | null = null;
    let currentElement = this.containerEl.parentElement;
    
    while (currentElement) {
      if (currentElement.classList.contains('agile-board-grid')) {
        gridContainer = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (!gridContainer) {
      console.warn('Could not find .agile-board-grid container');
      return;
    }
    
    // Éviter la double conversion
    if (gridContainer.hasAttribute('data-agile-converted')) {
      console.log('Grid already converted to absolute positioning');
      return;
    }
    
    console.log('Converting CSS Grid to absolute positioning');
    
    // Sauvegarder le display original
    const originalDisplay = getComputedStyle(gridContainer).display;
    gridContainer.setAttribute('data-original-display', originalDisplay);
    
    // Capturer toutes les positions AVANT tout changement pour éviter les chevauchements
    const framePositions: Array<{element: HTMLElement, left: number, top: number, width: number, height: number}> = [];
    
    const allFrames = gridContainer.querySelectorAll('.agile-board-frame');
    allFrames.forEach((frame, index) => {
      const frameElement = frame as HTMLElement;
      const rect = frameElement.getBoundingClientRect();
      const containerRect = gridContainer!.getBoundingClientRect();
      
      // Calculer la position relative au container
      const left = rect.left - containerRect.left;
      const top = rect.top - containerRect.top;
      
      framePositions.push({
        element: frameElement,
        left,
        top,
        width: rect.width,
        height: rect.height
      });
      
      console.log(`Frame ${index} original position:`, left, top, rect.width, rect.height);
    });
    
    // Maintenant appliquer les positions capturées
    framePositions.forEach((pos, index) => {
      const frameElement = pos.element;
      
      // Sauvegarder les styles originaux
      frameElement.setAttribute('data-original-position', frameElement.style.position || 'static');
      frameElement.setAttribute('data-original-left', frameElement.style.left || '');
      frameElement.setAttribute('data-original-top', frameElement.style.top || '');
      frameElement.setAttribute('data-original-width', frameElement.style.width || '');
      frameElement.setAttribute('data-original-height', frameElement.style.height || '');
      frameElement.setAttribute('data-original-grid-column', frameElement.style.gridColumn || '');
      frameElement.setAttribute('data-original-grid-row', frameElement.style.gridRow || '');
      
      // Appliquer le positionnement absolu avec les positions capturées
      frameElement.style.position = 'absolute';
      frameElement.style.left = pos.left + 'px';
      frameElement.style.top = pos.top + 'px';
      frameElement.style.width = pos.width + 'px';
      frameElement.style.height = pos.height + 'px';
      frameElement.style.gridColumn = 'unset';
      frameElement.style.gridRow = 'unset';
      frameElement.style.zIndex = '1'; // Assurer que tous les frames sont au même niveau
      
      console.log(`Applied absolute positioning to frame ${index}:`, pos.left, pos.top, pos.width, pos.height);
    });
    
    // Changer le container en block et le rendre relatif
    gridContainer.style.display = 'block';
    gridContainer.style.position = 'relative';
    gridContainer.setAttribute('data-agile-converted', 'true');
    
    console.log(`Converted ${allFrames.length} frames to absolute positioning`);
  }

  /**
   * Restaure la grille CSS depuis le positionnement absolu.
   */
  private removeDimensionPreservingWrapper(): void {
    console.log('Converting back from absolute positioning to CSS Grid');
    
    // Trouver le container converti
    const gridContainer = document.querySelector('[data-agile-converted]') as HTMLElement;
    if (!gridContainer) {
      console.log('No converted grid found');
      return;
    }
    
    // Restaurer tous les frames
    const allFrames = gridContainer.querySelectorAll('.agile-board-frame');
    allFrames.forEach((frame, index) => {
      const frameElement = frame as HTMLElement;
      
      console.log(`Restoring frame ${index} to grid positioning`);
      
      // Restaurer les styles originaux
      frameElement.style.position = frameElement.getAttribute('data-original-position') || '';
      frameElement.style.left = frameElement.getAttribute('data-original-left') || '';
      frameElement.style.top = frameElement.getAttribute('data-original-top') || '';
      frameElement.style.width = frameElement.getAttribute('data-original-width') || '';
      frameElement.style.height = frameElement.getAttribute('data-original-height') || '';
      frameElement.style.gridColumn = frameElement.getAttribute('data-original-grid-column') || '';
      frameElement.style.gridRow = frameElement.getAttribute('data-original-grid-row') || '';
      frameElement.style.zIndex = ''; // Retirer le z-index
      
      // Supprimer les attributs de sauvegarde
      frameElement.removeAttribute('data-original-position');
      frameElement.removeAttribute('data-original-left');
      frameElement.removeAttribute('data-original-top');
      frameElement.removeAttribute('data-original-width');
      frameElement.removeAttribute('data-original-height');
      frameElement.removeAttribute('data-original-grid-column');
      frameElement.removeAttribute('data-original-grid-row');
    });
    
    // Restaurer le container de grille
    const originalDisplay = gridContainer.getAttribute('data-original-display') || 'grid';
    gridContainer.style.display = originalDisplay;
    gridContainer.style.position = '';
    gridContainer.removeAttribute('data-agile-converted');
    gridContainer.removeAttribute('data-original-display');
    
    console.log(`Restored ${allFrames.length} frames to CSS Grid`);
  }


  /**
   * Nettoie les composants actifs.
   */
  private cleanupComponents(): void {
    // Nettoyage simple
    this.containerEl?.empty();
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
    if (this.isEditing && this.containerEl) {
      const textArea = this.containerEl.querySelector('textarea');
      if (textArea) {
        textArea.focus();
      }
    }
  }

  protected doLoad(): void {
    // Déjà initialisé dans le constructeur
  }

  protected doUnload(): void {
    // Supprimer le wrapper si nécessaire
    this.removeDimensionPreservingWrapper();
    this.cleanupComponents();
  }
}