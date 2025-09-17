// src/ui/layoutSettingsTab.ts

import { App, PluginSettingTab, Setting, ButtonComponent, Modal, Notice } from "obsidian";
import { LayoutFileRepo, LayoutFile } from "../core/layout/layoutFileRepo";
import { LayoutValidator24 } from "../core/layout/layoutValidator24";
import { LayoutEditor, LayoutEditorCallbacks } from "./layoutEditor";
import { createContextLogger } from "../core/logger";
import { TIMING_CONSTANTS, VALIDATION_CONSTANTS, generateBoxId } from "../core/constants";
import { UIErrorHandler } from "./utils/ErrorHandler";
import { NameGenerator } from "../core/utils/NameGenerator";
import AgileBoardPlugin from "../main";

/**
 * Onglet de paramètres pour la gestion des layouts
 */
export class LayoutSettingsTab extends PluginSettingTab {
  private readonly logger = createContextLogger('LayoutSettingsTab');
  private readonly validator = new LayoutValidator24();
  private plugin: AgileBoardPlugin;
  private layoutRepo: LayoutFileRepo;
  
  private layouts: LayoutFile[] = [];
  private layoutListContainer: HTMLElement | null = null;

  constructor(app: App, plugin: AgileBoardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.layoutRepo = new LayoutFileRepo(plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl('h2', { text: 'Agile Board - Tableaux' });

    // Boutons principaux
    this.createMainButtons(containerEl);
    
    // Liste des layouts
    this.layoutListContainer = containerEl.createDiv('layout-list-container');
    this.layoutListContainer.style.marginTop = '20px';
    
    this.refreshLayoutList();
  }

  private createMainButtons(container: HTMLElement): void {
    const buttonsContainer = container.createDiv('layout-buttons-container');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.gap = '10px';
    buttonsContainer.style.marginBottom = '20px';

    // Bouton "Nouveau Tableau"
    new ButtonComponent(buttonsContainer)
      .setButtonText('Nouveau Tableau')
      .setIcon('plus')
      .setTooltip('Créer un nouveau tableau vide')
      .onClick(() => this.createNewLayout());

    // Bouton "Importer JSON"
    new ButtonComponent(buttonsContainer)
      .setButtonText('Importer JSON')
      .setIcon('download')
      .setTooltip('Importer un tableau depuis un fichier JSON')
      .onClick(() => this.importLayout());

    // Bouton "Actualiser"
    new ButtonComponent(buttonsContainer)
      .setButtonText('Actualiser')
      .setIcon('refresh-cw')
      .setTooltip('Actualiser la liste des tableaux')
      .onClick(() => this.refreshLayoutList());
  }

  private async refreshLayoutList(): Promise<void> {
    if (!this.layoutListContainer) return;

    try {
      const layoutNames = await this.layoutRepo.listLayouts();
      const loadedLayouts = await Promise.all(
        layoutNames.map(async name => {
          try {
            return await this.layoutRepo.loadLayout(name);
          } catch (error) {
            this.logger.warn(`Impossible de charger le layout "${name}"`, error);
            return null;
          }
        })
      );
      this.layouts = loadedLayouts.filter((layout): layout is LayoutFile => layout !== null);
      this.renderLayoutList();
    } catch (error) {
      this.logger.error('Erreur lors du chargement des tableaux', error);
      new Notice('Erreur lors du chargement des tableaux');
    }
  }

  private renderLayoutList(): void {
    if (!this.layoutListContainer) return;

    this.layoutListContainer.empty();
    
    if (this.layouts.length === 0) {
      const emptyMessage = this.layoutListContainer.createDiv('layout-empty-message');
      emptyMessage.style.textAlign = 'center';
      emptyMessage.style.color = 'var(--text-muted)';
      emptyMessage.style.padding = '40px 20px';
      emptyMessage.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 10px;">Aucun tableau personnalisé</div>
        <div style="font-size: 14px;">Créez votre premier tableau avec le bouton "Nouveau Tableau" ci-dessus</div>
      `;
      return;
    }

    // En-tête de liste
    const header = this.layoutListContainer.createDiv('layout-list-header');
    header.style.display = 'grid';
    header.style.gridTemplateColumns = '1fr 120px 200px';
    header.style.gap = '10px';
    header.style.padding = '10px 15px';
    header.style.borderBottom = '1px solid var(--background-modifier-border)';
    header.style.fontWeight = 'bold';
    header.style.fontSize = '14px';
    header.style.color = 'var(--text-muted)';

    header.createSpan({ text: 'Nom du Tableau' });
    header.createSpan({ text: 'Cadres' });
    header.createSpan({ text: 'Actions' });

    // Liste des tableaux
    this.layouts.forEach(layout => this.renderLayoutItem(layout));
  }

  private renderLayoutItem(layout: LayoutFile): void {
    if (!this.layoutListContainer) return;

    const item = this.createLayoutItemContainer();
    this.addLayoutInfo(item, layout);
    this.addLayoutActions(item, layout);
  }

  private createLayoutItemContainer(): HTMLElement {
    const item = this.layoutListContainer!.createDiv('layout-item');
    item.style.display = 'grid';
    item.style.gridTemplateColumns = '1fr 120px 200px';
    item.style.gap = '10px';
    item.style.padding = '15px';
    item.style.borderBottom = '1px solid var(--background-modifier-border-hover)';
    item.style.alignItems = 'center';
    return item;
  }

  private addLayoutInfo(item: HTMLElement, layout: LayoutFile): void {
    // Nom du layout
    const nameContainer = item.createDiv('layout-name');
    nameContainer.createSpan({ text: layout.name, cls: 'layout-name-text' });

    // Nombre de boxes
    const boxCount = item.createSpan({ 
      text: `${layout.boxes.length} cadre${layout.boxes.length > 1 ? 's' : ''}` 
    });
    boxCount.style.color = 'var(--text-muted)';
    boxCount.style.fontSize = '14px';
  }

  private addLayoutActions(item: HTMLElement, layout: LayoutFile): void {
    const actionsContainer = item.createDiv('layout-actions');
    actionsContainer.style.display = 'flex';
    actionsContainer.style.gap = '5px';

    // Boutons d'action
    this.createActionButton(actionsContainer, 'Éditer', 'edit', 'Ouvrir l\'éditeur visuel', 
      () => this.editLayout(layout));
    this.createActionButton(actionsContainer, 'Dupliquer', 'copy', 'Créer une copie de ce tableau', 
      () => this.duplicateLayout(layout));
    this.createActionButton(actionsContainer, 'Exporter', 'upload', 'Exporter vers un fichier JSON', 
      () => this.exportLayout(layout));
    this.createActionButton(actionsContainer, 'Supprimer', 'trash', 'Supprimer définitivement ce tableau', 
      () => this.deleteLayout(layout));
  }

  private createActionButton(
    container: HTMLElement, 
    text: string, 
    icon: string, 
    tooltip: string, 
    onClick: () => void
  ): void {
    new ButtonComponent(container)
      .setButtonText(text)
      .setIcon(icon)
      .setTooltip(tooltip)
      .onClick(onClick);
  }

  private async createNewLayout(): Promise<void> {
    const modal = new LayoutNameModal(this.app, 'Nouveau Tableau', '', async (name) => {
      if (!name.trim()) {
        new Notice('Le nom du tableau ne peut pas être vide');
        return;
      }

      try {
        let newLayout: LayoutFile = {
          name: name.trim(),
            boxes: []
        };

        const uniqueName = await this.layoutRepo.generateUniqueName(newLayout.name);
        newLayout = { ...newLayout, name: uniqueName };

        await this.layoutRepo.saveLayout(newLayout);
        UIErrorHandler.showSuccess(`Tableau "${uniqueName}" créé avec succès`);
        
        this.refreshLayoutList();
        this.editLayout(newLayout);
      } catch (error) {
        this.logger.error('Erreur lors de la création du tableau', error);
        new Notice('Erreur lors de la création du tableau');
      }
    });

    modal.open();
  }

  private async duplicateLayout(layout: LayoutFile): Promise<void> {
    const defaultName = `${layout.name} - Copie`;
    const modal = new LayoutNameModal(this.app, 'Dupliquer Tableau', defaultName, async (name) => {
      await this.performLayoutDuplication(layout, name);
    });

    modal.open();
  }

  private async performLayoutDuplication(sourceLayout: LayoutFile, newName: string): Promise<void> {
    if (!newName.trim()) {
      new Notice('Le nom du tableau ne peut pas être vide');
      return;
    }

    try {
      const duplicatedLayout = await this.createDuplicatedLayout(sourceLayout, newName.trim());
      await this.layoutRepo.saveLayout(duplicatedLayout);
      
      UIErrorHandler.showSuccess(`Tableau "${duplicatedLayout.name}" dupliqué avec succès`);
      this.refreshLayoutList();
    } catch (error) {
      UIErrorHandler.handleLayoutError('la duplication', sourceLayout.name, error);
    }
  }

  private async createDuplicatedLayout(sourceLayout: LayoutFile, baseName: string): Promise<LayoutFile> {
    const uniqueName = await this.layoutRepo.generateUniqueName(baseName);
    
    return {
      ...sourceLayout,
      name: uniqueName,
      boxes: sourceLayout.boxes.map(box => ({
        ...box,
        id: generateBoxId()
      }))
    };
  }

  private editLayout(layout: LayoutFile): void {
    const callbacks: LayoutEditorCallbacks = {
      onSave: async (updatedLayout: LayoutFile) => {
        try {
          await this.layoutRepo.saveLayout(updatedLayout);
          UIErrorHandler.showSuccess(`Layout "${updatedLayout.name}" sauvegardé avec succès`);
          this.refreshLayoutList();
          
          // Recharger le service de layout si nécessaire
          if (this.plugin.layoutService) {
            await this.plugin.layoutService.load();
          }
        } catch (error) {
          UIErrorHandler.handleLayoutError('la sauvegarde', layout.name, error);
        }
      },
      onCancel: () => {
        // Rien à faire
      }
    };

    const editor = new LayoutEditor(this.app, layout, callbacks);
    editor.open();
  }

  private async exportLayout(layout: LayoutFile): Promise<void> {
    try {
      const jsonString = JSON.stringify(layout, null, 2);
      
      // Créer un lien de téléchargement
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${layout.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      new Notice(`Tableau "${layout.name}" exporté`);
    } catch (error) {
      this.logger.error('Erreur lors de l\'export du tableau', error);
      new Notice('Erreur lors de l\'export du tableau');
    }
  }

  private async deleteLayout(layout: LayoutFile): Promise<void> {
    const modal = new ConfirmationModal(
      this.app,
      'Supprimer le tableau',
      `Êtes-vous sûr de vouloir supprimer le tableau "${layout.name}" ?\n\nCette action est irréversible.`,
      async () => {
        try {
          await this.layoutRepo.deleteLayout(layout.name);
          new Notice(`Tableau "${layout.name}" supprimé`);
          this.refreshLayoutList();
          
          // Recharger le service de layout si nécessaire
          if (this.plugin.layoutService) {
            await this.plugin.layoutService.load();
          }
        } catch (error) {
          this.logger.error('Erreur lors de la suppression du tableau', error);
          new Notice('Erreur lors de la suppression du tableau');
        }
      }
    );
    
    modal.open();
  }

  private importLayout(): void {
    this.createFileInput();
  }

  private createFileInput(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.processImportFile(file);
      }
    });
    
    input.click();
  }

  private processImportFile(file: File): void {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await this.handleFileContent(e.target?.result as string);
      } catch (error) {
        UIErrorHandler.handleLayoutError('l\'import', 'du fichier', error);
      }
    };
    
    reader.readAsText(file);
  }

  private async handleFileContent(jsonContent: string): Promise<void> {
    const importedLayout = JSON.parse(jsonContent) as LayoutFile;
    
    // Valider le layout
    const validation = this.validator.validateLayout(importedLayout);
    if (!validation.isValid) {
      UIErrorHandler.handleValidationError(validation.errors);
      return;
    }

    // Créer et sauvegarder le layout final
    const finalLayout = await this.prepareFinalLayout(importedLayout);
    await this.layoutRepo.saveLayout(finalLayout);
    
    UIErrorHandler.showSuccess(`Tableau "${finalLayout.name}" importé avec succès`);
    this.refreshLayoutList();
  }

  private async prepareFinalLayout(importedLayout: LayoutFile): Promise<LayoutFile> {
    const uniqueName = await this.layoutRepo.generateUniqueName(importedLayout.name);
    
    return {
      ...importedLayout,
      name: uniqueName,
      boxes: importedLayout.boxes.map(box => ({
        ...box,
        id: generateBoxId()
      }))
    };
  }
}

/**
 * Modal pour saisir le nom d'un layout
 */
class LayoutNameModal extends Modal {
  private result: string;
  private onSubmit: (result: string) => void;

  constructor(app: App, title: string, defaultValue: string, onSubmit: (result: string) => void) {
    super(app);
    this.result = defaultValue;
    this.onSubmit = onSubmit;
    this.titleEl.setText(title);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('p', { text: 'Entrez le nom du tableau:' });

    const inputContainer = contentEl.createDiv();
    const input = inputContainer.createEl('input', {
      type: 'text',
      placeholder: 'Nom du tableau',
      value: this.result
    });
    input.style.width = '100%';
    input.style.padding = '8px';
    input.style.marginBottom = '15px';
    input.style.border = '1px solid var(--background-modifier-border)';
    input.style.borderRadius = '4px';

    input.addEventListener('input', (e) => {
      this.result = (e.target as HTMLInputElement).value;
    });

    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';

    // Bouton Annuler
    new ButtonComponent(buttonContainer)
      .setButtonText('Annuler')
      .onClick(() => this.close());

    // Bouton Confirmer
    new ButtonComponent(buttonContainer)
      .setButtonText('Confirmer')
      .setCta()
      .onClick(() => {
        this.onSubmit(this.result);
        this.close();
      });

    // Focus sur l'input et sélectionner tout
    input.focus();
    input.select();

    // Soumettre avec Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.onSubmit(this.result);
        this.close();
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/**
 * Modal de confirmation
 */
class ConfirmationModal extends Modal {
  private onConfirm: () => void;
  private message: string;

  constructor(app: App, title: string, message: string, onConfirm: () => void) {
    super(app);
    this.onConfirm = onConfirm;
    this.message = message;
    this.titleEl.setText(title);
    
    // Configurer la modal comme dialogue de confirmation
    this.modalEl.style.maxWidth = '400px';
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    const messageEl = contentEl.createEl('p');
    messageEl.style.marginBottom = '20px';
    messageEl.style.lineHeight = '1.5';
    messageEl.textContent = this.message;

    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';

    // Bouton Annuler
    new ButtonComponent(buttonContainer)
      .setButtonText('Annuler')
      .onClick(() => this.close());

    // Bouton Confirmer (dangereux)
    new ButtonComponent(buttonContainer)
      .setButtonText('Supprimer')
      .setWarning()
      .onClick(() => {
        this.onConfirm();
        this.close();
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}