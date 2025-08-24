// src/ui/layoutSettingsTab.ts

import { App, PluginSettingTab, Setting, ButtonComponent, Modal, Notice } from "obsidian";
import { LayoutFileRepo, LayoutFile } from "../core/layout/layoutFileRepo";
import { LayoutValidator24 } from "../core/layout/layoutValidator24";
import { LayoutEditor, LayoutEditorCallbacks } from "./layoutEditor";
import { createContextLogger } from "../core/logger";
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
    
    containerEl.createEl('h2', { text: 'Agile Board - Layouts' });

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

    // Bouton "Nouveau Layout"
    new ButtonComponent(buttonsContainer)
      .setButtonText('Nouveau Layout')
      .setIcon('plus')
      .setTooltip('Créer un nouveau layout vide')
      .onClick(() => this.createNewLayout());

    // Bouton "Importer JSON"
    new ButtonComponent(buttonsContainer)
      .setButtonText('Importer JSON')
      .setIcon('download')
      .setTooltip('Importer un layout depuis un fichier JSON')
      .onClick(() => this.importLayout());

    // Bouton "Actualiser"
    new ButtonComponent(buttonsContainer)
      .setButtonText('Actualiser')
      .setIcon('refresh-cw')
      .setTooltip('Actualiser la liste des layouts')
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
      this.logger.error('Erreur lors du chargement des layouts', error);
      new Notice('Erreur lors du chargement des layouts');
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
        <div style="font-size: 16px; margin-bottom: 10px;">Aucun layout personnalisé</div>
        <div style="font-size: 14px;">Créez votre premier layout avec le bouton "Nouveau Layout" ci-dessus</div>
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

    header.createSpan({ text: 'Nom du Layout' });
    header.createSpan({ text: 'Boxes' });
    header.createSpan({ text: 'Actions' });

    // Liste des layouts
    this.layouts.forEach(layout => this.renderLayoutItem(layout));
  }

  private renderLayoutItem(layout: LayoutFile): void {
    if (!this.layoutListContainer) return;

    const item = this.layoutListContainer.createDiv('layout-item');
    item.style.display = 'grid';
    item.style.gridTemplateColumns = '1fr 120px 200px';
    item.style.gap = '10px';
    item.style.padding = '15px';
    item.style.borderBottom = '1px solid var(--background-modifier-border-hover)';
    item.style.alignItems = 'center';

    // Nom du layout
    const nameContainer = item.createDiv('layout-name');
    nameContainer.createSpan({ text: layout.name, cls: 'layout-name-text' });
    
    const versionSpan = nameContainer.createSpan({ 
      text: `v${layout.version.toFixed(1)}`, 
      cls: 'layout-version' 
    });
    versionSpan.style.marginLeft = '10px';
    versionSpan.style.fontSize = '12px';
    versionSpan.style.color = 'var(--text-muted)';
    versionSpan.style.fontWeight = 'normal';

    // Nombre de boxes
    const boxCount = item.createSpan({ 
      text: `${layout.boxes.length} box${layout.boxes.length > 1 ? 'es' : ''}` 
    });
    boxCount.style.color = 'var(--text-muted)';
    boxCount.style.fontSize = '14px';

    // Boutons d'action
    const actionsContainer = item.createDiv('layout-actions');
    actionsContainer.style.display = 'flex';
    actionsContainer.style.gap = '5px';

    // Bouton Éditer
    new ButtonComponent(actionsContainer)
      .setButtonText('Éditer')
      .setIcon('edit')
      .setTooltip('Ouvrir l\'éditeur visuel')
      .onClick(() => this.editLayout(layout));

    // Bouton Dupliquer
    new ButtonComponent(actionsContainer)
      .setButtonText('Dupliquer')
      .setIcon('copy')
      .setTooltip('Créer une copie de ce layout')
      .onClick(() => this.duplicateLayout(layout));

    // Bouton Exporter
    new ButtonComponent(actionsContainer)
      .setButtonText('Exporter')
      .setIcon('upload')
      .setTooltip('Exporter vers un fichier JSON')
      .onClick(() => this.exportLayout(layout));

    // Bouton Supprimer
    new ButtonComponent(actionsContainer)
      .setButtonText('Supprimer')
      .setIcon('trash')
      .setTooltip('Supprimer définitivement ce layout')
      .onClick(() => this.deleteLayout(layout));
  }

  private async createNewLayout(): Promise<void> {
    const modal = new LayoutNameModal(this.app, 'Nouveau Layout', '', async (name) => {
      if (!name.trim()) {
        new Notice('Le nom du layout ne peut pas être vide');
        return;
      }

      try {
        let newLayout: LayoutFile = {
          name: name.trim(),
          version: 1,
          boxes: []
        };

        const uniqueName = await this.layoutRepo.generateUniqueName(newLayout.name);
        newLayout = { ...newLayout, name: uniqueName };

        await this.layoutRepo.saveLayout(newLayout);
        new Notice(`Layout "${uniqueName}" créé avec succès`);
        
        this.refreshLayoutList();
        this.editLayout(newLayout);
      } catch (error) {
        this.logger.error('Erreur lors de la création du layout', error);
        new Notice('Erreur lors de la création du layout');
      }
    });

    modal.open();
  }

  private async duplicateLayout(layout: LayoutFile): Promise<void> {
    const modal = new LayoutNameModal(this.app, 'Dupliquer Layout', `${layout.name} - Copie`, async (name) => {
      if (!name.trim()) {
        new Notice('Le nom du layout ne peut pas être vide');
        return;
      }

      try {
        let duplicatedLayout: LayoutFile = {
          ...layout,
          name: name.trim(),
          boxes: layout.boxes.map(box => ({
            ...box,
            id: `box-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
          }))
        };

        const uniqueName = await this.layoutRepo.generateUniqueName(duplicatedLayout.name);
        duplicatedLayout = { ...duplicatedLayout, name: uniqueName };

        await this.layoutRepo.saveLayout(duplicatedLayout);
        new Notice(`Layout "${uniqueName}" dupliqué avec succès`);
        
        this.refreshLayoutList();
      } catch (error) {
        this.logger.error('Erreur lors de la duplication du layout', error);
        new Notice('Erreur lors de la duplication du layout');
      }
    });

    modal.open();
  }

  private editLayout(layout: LayoutFile): void {
    const callbacks: LayoutEditorCallbacks = {
      onSave: async (updatedLayout: LayoutFile) => {
        try {
          await this.layoutRepo.saveLayout(updatedLayout);
          new Notice(`Layout "${updatedLayout.name}" sauvegardé avec succès`);
          this.refreshLayoutList();
          
          // Recharger le service de layout si nécessaire
          if (this.plugin.layoutService) {
            await this.plugin.layoutService.load();
          }
        } catch (error) {
          this.logger.error('Erreur lors de la sauvegarde du layout', error);
          new Notice('Erreur lors de la sauvegarde du layout');
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
      
      new Notice(`Layout "${layout.name}" exporté`);
    } catch (error) {
      this.logger.error('Erreur lors de l\'export du layout', error);
      new Notice('Erreur lors de l\'export du layout');
    }
  }

  private async deleteLayout(layout: LayoutFile): Promise<void> {
    const modal = new ConfirmationModal(
      this.app,
      'Supprimer le layout',
      `Êtes-vous sûr de vouloir supprimer le layout "${layout.name}" ?\n\nCette action est irréversible.`,
      async () => {
        try {
          await this.layoutRepo.deleteLayout(layout.name);
          new Notice(`Layout "${layout.name}" supprimé`);
          this.refreshLayoutList();
          
          // Recharger le service de layout si nécessaire
          if (this.plugin.layoutService) {
            await this.plugin.layoutService.load();
          }
        } catch (error) {
          this.logger.error('Erreur lors de la suppression du layout', error);
          new Notice('Erreur lors de la suppression du layout');
        }
      }
    );
    
    modal.open();
  }

  private importLayout(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonContent = e.target?.result as string;
          const importedLayout = JSON.parse(jsonContent) as LayoutFile;
          
          // Valider le layout
          const validation = this.validator.validateLayout(importedLayout);
          if (!validation.isValid) {
            new Notice(`Layout invalide:\n${validation.errors.join('\n')}`, 8000);
            return;
          }

          // Générer un nom unique
          const uniqueName = await this.layoutRepo.generateUniqueName(importedLayout.name);
          
          // Créer une copie mutable avec le nouveau nom et les nouveaux IDs
          const finalLayout: LayoutFile = {
            ...importedLayout,
            name: uniqueName,
            boxes: importedLayout.boxes.map(box => ({
              ...box,
              id: `box-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
            }))
          };

          await this.layoutRepo.saveLayout(finalLayout);
          new Notice(`Layout "${uniqueName}" importé avec succès`);
          
          this.refreshLayoutList();
        } catch (error) {
          this.logger.error('Erreur lors de l\'import du layout', error);
          new Notice('Erreur lors de l\'import du layout. Vérifiez que le fichier est valide.');
        }
      };
      
      reader.readAsText(file);
    });
    
    input.click();
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

    contentEl.createEl('p', { text: 'Entrez le nom du layout:' });

    const inputContainer = contentEl.createDiv();
    const input = inputContainer.createEl('input', {
      type: 'text',
      placeholder: 'Nom du layout',
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