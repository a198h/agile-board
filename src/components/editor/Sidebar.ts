// src/components/editor/Sidebar.ts
import { LayoutFile } from "../../core/layout/layoutFileRepo";
import { UI_CONSTANTS } from "../../core/constants";
import { t } from "../../i18n";

/**
 * Composant responsable de l'interface latérale de l'éditeur.
 * Gère les informations de sélection, actions rapides et aide.
 */
export class Sidebar {
  private sidebar: HTMLElement;
  private infoContent: HTMLElement;

  constructor(
    container: HTMLElement,
    private layout: LayoutFile,
    private callbacks: {
      onAddBox: () => void;
      onDeleteBox: () => void;
      onClearAll: () => void | Promise<void>;
    }
  ) {
    this.sidebar = this.createSidebar(container);
    this.setupSidebarContent();
    this.infoContent = this.sidebar.querySelector('.info-content') as HTMLElement;
  }

  /**
   * Crée le container principal de la sidebar.
   */
  private createSidebar(container: HTMLElement): HTMLElement {
    const sidebar = container.createDiv('layout-sidebar');
    sidebar.style.position = 'absolute';
    sidebar.style.left = `${UI_CONSTANTS.EDITOR_WIDTH_PX + 15}px`;
    sidebar.style.top = '0';
    sidebar.style.bottom = '0';
    sidebar.style.width = '280px';
    sidebar.style.border = '1px solid var(--background-modifier-border)';
    sidebar.style.borderRadius = '4px';
    sidebar.style.padding = '15px';
    sidebar.style.backgroundColor = 'var(--background-primary)';
    sidebar.style.overflow = 'auto';
    sidebar.style.boxSizing = 'border-box';
    
    return sidebar;
  }

  /**
   * Configure le contenu de la sidebar.
   */
  private setupSidebarContent(): void {
    this.createHeader();
    this.createSelectionSection();
    this.createActionsSection();
    this.createHelpSection();
    this.createClearAllButton();
  }

  /**
   * Crée l'en-tête de la sidebar.
   */
  private createHeader(): void {
    const header = this.sidebar.createDiv('sidebar-header');
    header.style.borderBottom = '1px solid var(--background-modifier-border)';
    header.style.paddingBottom = '12px';
    header.style.marginBottom = '16px';
    
    const title = header.createEl('h2');
    title.textContent = t('editor.title');
    title.style.margin = '0';
    title.style.fontSize = '16px';
    title.style.color = 'var(--text-normal)';
    
    const subtitle = header.createDiv();
    subtitle.textContent = t('editor.toolbar.info', { count: this.layout.boxes.length });
    subtitle.style.color = 'var(--text-muted)';
    subtitle.style.fontSize = '12px';
    subtitle.style.marginTop = '4px';
  }

  /**
   * Crée la section de sélection.
   */
  private createSelectionSection(): void {
    const selectionSection = this.sidebar.createDiv('selection-section');
    selectionSection.style.marginBottom = '20px';
    selectionSection.style.padding = '12px';
    selectionSection.style.backgroundColor = 'var(--background-secondary)';
    selectionSection.style.borderRadius = '6px';
    selectionSection.style.border = '1px solid var(--background-modifier-border)';
    
    const sectionTitle = selectionSection.createEl('h3');
    sectionTitle.textContent = t('editor.sidebar.selection.title');
    sectionTitle.style.margin = '0 0 12px 0';
    sectionTitle.style.fontSize = '14px';
    sectionTitle.style.color = 'var(--text-normal)';
    
    const infoContent = selectionSection.createDiv('info-content');
    const emptyP = infoContent.createEl('p');
    emptyP.addClass('agile-selection-empty');
    emptyP.textContent = t('editor.sidebar.selection.empty');
  }

  /**
   * Crée la section d'actions rapides.
   */
  private createActionsSection(): void {
    const actionsSection = this.sidebar.createDiv('actions-section');
    actionsSection.style.marginBottom = '20px';
    
    const sectionTitle = actionsSection.createEl('h3');
    sectionTitle.textContent = t('editor.sidebar.actions.title');
    sectionTitle.style.margin = '0 0 12px 0';
    sectionTitle.style.fontSize = '14px';
    sectionTitle.style.color = 'var(--text-normal)';
    
    // Bouton Ajouter
    const addButton = this.createActionButton(
      t('editor.sidebar.actions.add'),
      'var(--interactive-accent)',
      'white',
      'none'
    );
    addButton.addEventListener('click', this.callbacks.onAddBox);
    actionsSection.appendChild(addButton);
    
    // Bouton Supprimer
    const deleteButton = this.createActionButton(
      t('editor.sidebar.actions.delete'),
      '#fee2e2',
      '#dc2626',
      '1px solid #fca5a5'
    );
    deleteButton.addEventListener('click', this.callbacks.onDeleteBox);
    actionsSection.appendChild(deleteButton);
  }

  /**
   * Crée un bouton d'action.
   */
  private createActionButton(text: string, bgColor: string, textColor: string, border: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.width = '100%';
    button.style.padding = '8px 12px';
    button.style.marginBottom = '8px';
    button.style.backgroundColor = bgColor;
    button.style.color = textColor;
    button.style.border = border;
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '13px';
    button.style.fontWeight = '500';
    
    return button;
  }

  /**
   * Crée la section d'aide.
   */
  private createHelpSection(): void {
    const helpSection = this.sidebar.createDiv('help-section');
    helpSection.style.padding = '12px';
    helpSection.style.backgroundColor = 'var(--background-secondary)';
    helpSection.style.borderRadius = '6px';
    helpSection.style.border = '1px solid var(--background-modifier-border)';
    
    const sectionTitle = helpSection.createEl('h3');
    sectionTitle.textContent = t('editor.sidebar.help.title');
    sectionTitle.style.margin = '0 0 8px 0';
    sectionTitle.style.fontSize = '14px';
    sectionTitle.style.color = 'var(--text-normal)';
    
    const helpText = helpSection.createDiv('agile-help-text');

    const createHelpItem = (text: string, isLast: boolean = false) => {
      const p = helpText.createEl('p');
      p.addClass(isLast ? 'agile-help-item-last' : 'agile-help-item');
      p.style.fontSize = '12px';
      p.style.marginBottom = isLast ? '0' : '8px';
      p.style.lineHeight = '1.4';
      p.style.color = 'var(--text-normal)';
      const [label, description] = text.split(':');
      const strong = p.createEl('strong');
      strong.textContent = label + ':';
      strong.style.color = 'var(--text-accent)';
      p.appendText(' ' + description);
    };

    createHelpItem(t('editor.sidebar.help.create'));
    createHelpItem(t('editor.sidebar.help.move'));
    createHelpItem(t('editor.sidebar.help.resize'));
    createHelpItem(t('editor.sidebar.help.select'), true);
  }

  /**
   * Crée le bouton "Effacer tout".
   */
  private createClearAllButton(): void {
    const clearAllButton = this.sidebar.createEl('button');
    clearAllButton.textContent = t('editor.sidebar.actions.clear');
    clearAllButton.style.width = '100%';
    clearAllButton.style.padding = '10px 12px';
    clearAllButton.style.marginTop = '16px';
    clearAllButton.style.backgroundColor = '#dc2626';
    clearAllButton.style.color = 'white';
    clearAllButton.style.border = 'none';
    clearAllButton.style.borderRadius = '4px';
    clearAllButton.style.cursor = 'pointer';
    clearAllButton.style.fontSize = '13px';
    clearAllButton.style.fontWeight = '600';
    clearAllButton.style.transition = 'background-color 0.2s ease';
    
    // Effet hover
    clearAllButton.addEventListener('mouseenter', () => {
      clearAllButton.style.backgroundColor = '#b91c1c';
    });
    clearAllButton.addEventListener('mouseleave', () => {
      clearAllButton.style.backgroundColor = '#dc2626';
    });
    
    clearAllButton.addEventListener('click', () => {
      void this.callbacks.onClearAll();
    });
  }

  /**
   * Met à jour les informations de sélection.
   */
  updateSelectionInfo(content: HTMLElement): void {
    if (this.infoContent) {
      this.infoContent.empty();
      this.infoContent.appendChild(content);
    }
  }

  /**
   * Configure les gestionnaires d'événements pour l'input de titre.
   */
  setupTitleInputHandlers(onTitleChange: (boxId: string, title: string) => void): void {
    const titleInput = this.infoContent?.querySelector('.box-title-input') as HTMLInputElement;
    if (!titleInput) return;

    // Ces gestionnaires seront configurés par le SelectionManager
    // Cette méthode sert de pont pour éviter les dépendances circulaires
  }

  /**
   * Met à jour le compteur de boxes dans l'en-tête.
   */
  updateBoxCount(count: number): void {
    const subtitle = this.sidebar.querySelector('div');
    if (subtitle) {
      subtitle.textContent = t('editor.toolbar.info', { count });
    }
  }

  /**
   * Retourne l'élément de la sidebar.
   */
  getElement(): HTMLElement {
    return this.sidebar;
  }

  /**
   * Retourne l'élément de contenu d'informations.
   */
  getInfoContent(): HTMLElement {
    return this.infoContent;
  }
}