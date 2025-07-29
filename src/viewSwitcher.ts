// src/viewSwitcher.ts
import { MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import { AGILE_BOARD_VIEW_TYPE, AgileBoardView } from "./agileBoardView";
import AgileBoardPlugin from "./main";

export class ViewSwitcher {
  private checkInterval: NodeJS.Timeout | null = null;
  private mutationObserver: MutationObserver | null = null;
  
  constructor(private plugin: AgileBoardPlugin) {}

  private markAsManualChange(file: TFile): void {
    // Notifier le ModelDetector qu'un changement manuel a eu lieu
    const plugin = this.plugin as any;
    if (plugin.modelDetector) {
      plugin.modelDetector.markUserManualChange(file.path);
    }
  }

  async switchToBoardView(file: TFile): Promise<void> {
    const leaf = this.plugin.app.workspace.activeLeaf;
    if (!leaf) return;

    await leaf.setViewState({
      type: AGILE_BOARD_VIEW_TYPE,
      state: { file: file.path }
    });
  }

  async switchToMarkdownView(file: TFile): Promise<void> {
    const leaf = this.plugin.app.workspace.activeLeaf;
    if (!leaf) return;

    await leaf.setViewState({
      type: "markdown",
      state: { file: file.path }
    });
  }

  async switchToSourceMode(file: TFile): Promise<void> {
    const leaf = this.plugin.app.workspace.activeLeaf;
    if (!leaf) return;

    await leaf.setViewState({
      type: "markdown",
      state: { 
        file: file.path,
        mode: "source",
        source: true
      }
    });
  }

  isCurrentViewBoardView(): boolean {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(AgileBoardView);
    return activeView !== null;
  }

  isCurrentViewMarkdownView(): boolean {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    return activeView !== null;
  }

  getCurrentFile(): TFile | null {
    return this.plugin.app.workspace.getActiveFile();
  }

  hasAgileBoardLayout(file: TFile): boolean {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    return cache?.frontmatter?.["agile-board"] !== undefined;
  }

  addSwitchButton(): void {
    // Utiliser un MutationObserver pour détecter les changements dans la toolbar
    this.observeToolbarChanges();
    
    // Ajouter le bouton de basculement dans la toolbar des vues markdown
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        setTimeout(() => this.updateSwitchButton(), 100);
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("file-open", () => {
        setTimeout(() => this.updateSwitchButton(), 100);
      })
    );


    // Ajouter des événements pour maintenir le bouton même quand la vue perd le focus
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("layout-change", () => {
        setTimeout(() => this.updateSwitchButton(), 100);
      })
    );

    // Écouter les changements de vue plus directement
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("quit", () => {
        this.stop();
      })
    );

    // Mise à jour initiale
    setTimeout(() => this.updateSwitchButton(), 100);
    
    // Vérification périodique pour s'assurer que le bouton reste présent
    this.startPeriodicCheck();
  }
  
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.updateSwitchButton();
    }, 10000); // Vérifier toutes les 10 secondes
  }
  
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }
  
  private observeToolbarChanges(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const target = mutation.target as HTMLElement;
          
          // Vérifier si c'est une toolbar ou une action container
          if (target.classList.contains('view-actions') || 
              target.classList.contains('view-header') ||
              target.querySelector('.view-actions')) {
            shouldUpdate = true;
            break;
          }
        }
      }
      
      if (shouldUpdate) {
        setTimeout(() => this.updateSwitchButton(), 50);
      }
    });
    
    // Observer le workspace container
    const workspaceContainer = document.querySelector('.workspace');
    if (workspaceContainer) {
      this.mutationObserver.observe(workspaceContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  private updateSwitchButton(): void {
    // Vérifier toutes les vues ouvertes, pas seulement la vue active
    this.checkAllViews();
  }
  
  private checkAllViews(): void {
    const markdownLeaves = this.plugin.app.workspace.getLeavesOfType("markdown");
    const boardLeaves = this.plugin.app.workspace.getLeavesOfType(AGILE_BOARD_VIEW_TYPE);
    
    // Si aucune vue Board n'est active, supprimer le bouton de mode de la barre d'état
    const activeLeaf = this.plugin.app.workspace.activeLeaf;
    const isBoardViewActive = activeLeaf && activeLeaf.view.getViewType() === AGILE_BOARD_VIEW_TYPE;
    
    if (!isBoardViewActive) {
      this.removeModeButtonFromStatusBar();
    }
    
    // Gérer les vues markdown
    markdownLeaves.forEach(leaf => {
      const markdownView = leaf.view as MarkdownView;
      if (markdownView.file) {
        const hasLayout = this.hasAgileBoardLayout(markdownView.file);
        
        // Debug: console.log('🔍 Checking markdown view:', { 
        //   fileName: markdownView.file.name, 
        //   hasLayout,
        //   isActive: leaf === this.plugin.app.workspace.activeLeaf
        // });
        
        if (hasLayout) {
          this.ensureBoardModeButtonForView(markdownView);
        } else {
          this.removeBoardModeButtonForView(markdownView);
        }
      }
    });
    
    // Gérer les vues board
    boardLeaves.forEach(leaf => {
      const boardView = leaf.view as AgileBoardView;
      const isActive = leaf === activeLeaf;
      
      // Debug: console.log('🔍 Checking board view:', { 
      //   fileName: boardView.file?.name,
      //   isActive
      // });
      
      if (isActive) {
        this.ensureNormalModeButtonForView(boardView);
      }
    });
  }

  private ensureBoardModeButtonForView(markdownView: MarkdownView): void {
    // Vérifier si le bouton existe déjà de manière plus robuste
    const viewActions = markdownView.containerEl.querySelector('.view-actions');
    if (!viewActions) return;
    
    const existingButton = viewActions.querySelector('.agile-board-switch-button');
    if (existingButton) return;

    try {
      const button = markdownView.addAction(
        "layout-grid",
        "Mode Board",
        () => {
          if (markdownView.file) {
            this.markAsManualChange(markdownView.file);
            this.switchToBoardView(markdownView.file);
          }
        }
      );
      
      button.addClass("agile-board-switch-button");
      
      // Ajouter un attribut pour identifier le bouton
      button.setAttribute('data-agile-board-button', 'board-mode');
      
      // Debug: console.log('🔄 Bouton Mode Board ajouté pour', markdownView.file?.name);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du bouton Mode Board:', error);
    }
  }
  
  private removeBoardModeButtonForView(markdownView: MarkdownView): void {
    const viewActions = markdownView.containerEl.querySelector('.view-actions');
    if (!viewActions) return;
    
    const existingButton = viewActions.querySelector('.agile-board-switch-button');
    if (existingButton) {
      existingButton.remove();
      // Debug: console.log('🗑️ Bouton Mode Board supprimé pour', markdownView.file?.name);
    }
  }

  private ensureBoardModeButton(): void {
    const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) return;
    this.ensureBoardModeButtonForView(markdownView);
  }

  private ensureNormalModeButtonForView(boardView: AgileBoardView): void {
    // Vérifier si le bouton existe déjà de manière plus robuste
    const viewActions = boardView.containerEl.querySelector('.view-actions');
    if (!viewActions) return;
    
    const existingButton = viewActions.querySelector('.agile-board-switch-button');
    if (existingButton) return;

    try {
      // Bouton pour mode Live Preview dans la toolbar
      const livePreviewButton = (boardView as any).addAction(
        "document",
        "Mode Live Preview",
        () => {
          if (boardView.file) {
            this.markAsManualChange(boardView.file);
            this.switchToMarkdownView(boardView.file);
          }
        }
      );
      livePreviewButton.addClass("agile-board-switch-button");
      livePreviewButton.setAttribute('data-agile-board-button', 'live-preview-mode');
      
      // Ajouter le bouton de mode dans la barre d'état
      this.addModeButtonToStatusBar(boardView);
      
      // Debug: console.log('🔄 Bouton Mode Live Preview et bouton de mode ajoutés pour', boardView.file?.name);
    } catch (error) {
      console.error('Erreur lors de l\'ajout des boutons:', error);
    }
  }

  private ensureNormalModeButton(): void {
    const boardView = this.plugin.app.workspace.getActiveViewOfType(AgileBoardView);
    if (!boardView) return;
    this.ensureNormalModeButtonForView(boardView);
  }

  private addModeButtonToStatusBar(boardView: AgileBoardView): void {
    // Rechercher la barre d'état globale d'Obsidian
    const obsidianStatusBar = document.querySelector('.status-bar');
    if (!obsidianStatusBar) return;

    // Vérifier si le bouton existe déjà
    const existingModeButton = obsidianStatusBar.querySelector('.agile-board-mode-button');
    if (existingModeButton) return;

    // Créer le bouton de mode dans la barre d'état
    const modeButton = obsidianStatusBar.createEl('div');
    modeButton.addClass('status-bar-item');
    modeButton.addClass('agile-board-mode-button');
    modeButton.addClass('clickable-icon');
    modeButton.setAttribute('aria-label', 'Changer de mode');
    
    // Contenu du bouton - seulement l'icône
    modeButton.innerHTML = `
      <svg class="svg-icon lucide-edit-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    `;
    modeButton.setAttribute('aria-label', 'Passer en mode Source');
    modeButton.setAttribute('title', 'Passer en mode Source');
    
    // Gestionnaire de clic pour basculer vers le mode Source
    modeButton.addEventListener('click', async () => {
      if (!boardView.file) return;
      
      this.markAsManualChange(boardView.file);
      await this.switchToSourceMode(boardView.file);
    });
  }


  private removeModeButtonFromStatusBar(): void {
    const obsidianStatusBar = document.querySelector('.status-bar');
    if (obsidianStatusBar) {
      const modeButton = obsidianStatusBar.querySelector('.agile-board-mode-button');
      if (modeButton) {
        modeButton.remove();
      }
    }
  }

  private removeSwitchButtons(): void {
    // Enlever tous les boutons de basculement existants de toutes les vues
    const allLeaves = this.plugin.app.workspace.getLeavesOfType("markdown")
      .concat(this.plugin.app.workspace.getLeavesOfType(AGILE_BOARD_VIEW_TYPE));
    
    allLeaves.forEach(leaf => {
      const actionsContainer = leaf.view.containerEl.querySelector('.view-actions');
      if (actionsContainer) {
        const existingButtons = actionsContainer.querySelectorAll('.agile-board-switch-button');
        existingButtons.forEach(button => button.remove());
      }
    });
    
    // Supprimer le bouton de mode de la barre d'état globale
    this.removeModeButtonFromStatusBar();
  }

}