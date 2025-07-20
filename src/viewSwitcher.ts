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
    }, 1000); // Vérifier toutes les secondes
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
    
    // Gérer les vues markdown
    markdownLeaves.forEach(leaf => {
      const markdownView = leaf.view as MarkdownView;
      if (markdownView.file) {
        const hasLayout = this.hasAgileBoardLayout(markdownView.file);
        
        console.log('🔍 Checking markdown view:', { 
          fileName: markdownView.file.name, 
          hasLayout,
          isActive: leaf === this.plugin.app.workspace.activeLeaf
        });
        
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
      
      console.log('🔍 Checking board view:', { 
        fileName: boardView.file?.name,
        isActive: leaf === this.plugin.app.workspace.activeLeaf
      });
      
      this.ensureNormalModeButtonForView(boardView);
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
      
      console.log('🔄 Bouton Mode Board ajouté pour', markdownView.file?.name);
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
      console.log('🗑️ Bouton Mode Board supprimé pour', markdownView.file?.name);
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
      const button = (boardView as any).addAction(
        "document",
        "Mode Normal",
        () => {
          if (boardView.file) {
            this.markAsManualChange(boardView.file);
            this.switchToMarkdownView(boardView.file);
          }
        }
      );
      
      button.addClass("agile-board-switch-button");
      
      // Ajouter un attribut pour identifier le bouton
      button.setAttribute('data-agile-board-button', 'normal-mode');
      
      console.log('🔄 Bouton Mode Normal ajouté pour', boardView.file?.name);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du bouton Mode Normal:', error);
    }
  }

  private ensureNormalModeButton(): void {
    const boardView = this.plugin.app.workspace.getActiveViewOfType(AgileBoardView);
    if (!boardView) return;
    this.ensureNormalModeButtonForView(boardView);
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
  }

}