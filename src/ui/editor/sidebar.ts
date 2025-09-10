// src/ui/editor/sidebar.ts

import { ButtonComponent } from "obsidian";
import { EditorComponent, EditorEvents } from "./types";
import { SelectionInfo } from "./selectionManager";

/**
 * Panneau latéral de l'éditeur avec contrôles et informations.
 * Responsabilité unique : interface utilisateur des actions et infos.
 * Pattern Component pour l'encapsulation UI.
 */
export class Sidebar implements EditorComponent {
  private container: HTMLElement | null = null;
  private selectionSection: HTMLElement | null = null;
  private positionInput: HTMLInputElement | null = null;
  private sizeInput: HTMLInputElement | null = null;
  private titleInput: HTMLInputElement | null = null;

  constructor(private readonly events: EditorEvents) {}

  /**
   * Rend le panneau latéral
   */
  public render(container: HTMLElement): void {
    this.container = container;
    this.setupSidebar();
  }

  /**
   * Met à jour les informations de sélection
   */
  public updateSelection(selectionInfo: SelectionInfo): void {
    if (!this.selectionSection) return;

    if (selectionInfo.hasSelection && selectionInfo.box) {
      this.selectionSection.style.display = 'block';
      
      // Mettre à jour les champs
      if (this.titleInput) {
        this.titleInput.value = selectionInfo.box.title;
      }
      
      if (this.positionInput) {
        this.positionInput.value = `${selectionInfo.box.x}, ${selectionInfo.box.y}`;
      }
      
      if (this.sizeInput) {
        this.sizeInput.value = `${selectionInfo.box.w} × ${selectionInfo.box.h}`;
      }

      // Mettre à jour les textes d'information
      const infoElements = this.selectionSection.querySelectorAll('.selection-info');
      infoElements.forEach(element => {
        const info = element as HTMLElement;
        if (info.dataset.type === 'position') {
          info.textContent = selectionInfo.positionText;
        } else if (info.dataset.type === 'size') {
          info.textContent = selectionInfo.sizeText;
        } else if (info.dataset.type === 'area') {
          info.textContent = selectionInfo.areaText;
        }
      });
    } else {
      this.selectionSection.style.display = 'none';
    }
  }

  /**
   * Configure le panneau latéral
   */
  private setupSidebar(): void {
    if (!this.container) return;

    this.container.style.cssText = `
      width: 250px;
      padding: 20px;
      background: var(--background-primary);
      border-left: 1px solid var(--background-modifier-border);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    `;

    this.createSelectionSection();
    this.createActionsSection();
    this.createHelpSection();
    this.createClearAllButton();
  }

  /**
   * Section des informations de sélection
   */
  private createSelectionSection(): void {
    const section = document.createElement('div');
    section.style.display = 'none'; // Caché par défaut
    
    const title = document.createElement('h3');
    title.textContent = 'Box sélectionnée';
    title.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-normal);
    `;
    section.appendChild(title);

    // Champ titre
    this.createLabeledInput(section, 'Titre:', 'text', (value) => {
      this.events.onBoxUpdate('', { title: value }); // ID sera récupéré par le manager
    }).then(input => {
      this.titleInput = input;
    });

    // Informations en lecture seule
    this.createInfoDisplay(section, 'Position:', 'position');
    this.createInfoDisplay(section, 'Taille:', 'size');
    this.createInfoDisplay(section, 'Surface:', 'area');

    this.selectionSection = section;
    this.container!.appendChild(section);
  }

  /**
   * Section des actions principales
   */
  private createActionsSection(): void {
    const section = document.createElement('div');
    
    const title = document.createElement('h3');
    title.textContent = 'Actions';
    title.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-normal);
    `;
    section.appendChild(title);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    // Bouton nouvelle box
    new ButtonComponent(buttonContainer)
      .setButtonText('➕ Nouvelle box')
      .setTooltip('Créer une nouvelle box (clic-glisser sur la grille)')
      .onClick(() => {
        // L'utilisateur doit faire un clic-glisser sur la grille
        // On peut afficher un message d'aide
        this.showHelpMessage('Cliquez et glissez sur la grille pour créer une nouvelle box');
      });

    // Bouton supprimer
    new ButtonComponent(buttonContainer)
      .setButtonText('🗑️ Supprimer')
      .setTooltip('Supprimer la box sélectionnée')
      .onClick(() => {
        this.events.onBoxDelete(''); // ID sera récupéré par le manager
      });

    // Bouton dupliquer
    new ButtonComponent(buttonContainer)
      .setButtonText('📑 Dupliquer')
      .setTooltip('Dupliquer la box sélectionnée')
      .onClick(() => {
        // TODO: Implémenter la duplication
        this.showHelpMessage('Fonctionnalité de duplication à venir');
      });

    section.appendChild(buttonContainer);
    this.container!.appendChild(section);
  }

  /**
   * Section d'aide
   */
  private createHelpSection(): void {
    const section = document.createElement('div');
    
    const title = document.createElement('h3');
    title.textContent = 'Aide';
    title.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-normal);
    `;
    section.appendChild(title);

    const helpText = document.createElement('div');
    helpText.innerHTML = `
      <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
        <p><strong>Créer:</strong> Cliquez et glissez sur la grille</p>
        <p><strong>Déplacer:</strong> Glissez une box existante</p>
        <p><strong>Redimensionner:</strong> Utilisez les poignées aux coins</p>
        <p><strong>Sélectionner:</strong> Cliquez sur une box</p>
        <p><strong>Annuler:</strong> Appuyez sur Échap pendant une action</p>
      </div>
    `;
    section.appendChild(helpText);

    this.container!.appendChild(section);
  }

  /**
   * Bouton pour effacer toutes les boxes
   */
  private createClearAllButton(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-top: auto;
      padding-top: 20px;
      border-top: 1px solid var(--background-modifier-border);
    `;

    new ButtonComponent(container)
      .setButtonText('🗑️ Effacer tout')
      .setTooltip('Supprimer toutes les boxes (irréversible)')
      .onClick(() => {
        this.confirmClearAll();
      })
      .buttonEl.style.cssText = `
        width: 100%;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      `;

    this.container!.appendChild(container);
  }

  /**
   * Crée un champ de saisie avec label
   */
  private async createLabeledInput(
    parent: HTMLElement, 
    label: string, 
    type: string, 
    onChange: (value: string) => void
  ): Promise<HTMLInputElement> {
    const container = document.createElement('div');
    container.style.marginBottom = '12px';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-normal);
    `;

    const input = document.createElement('input');
    input.type = type;
    input.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      font-size: 12px;
    `;

    input.addEventListener('change', () => onChange(input.value));
    input.addEventListener('blur', () => onChange(input.value));

    container.appendChild(labelEl);
    container.appendChild(input);
    parent.appendChild(container);

    return input;
  }

  /**
   * Crée un affichage d'information en lecture seule
   */
  private createInfoDisplay(parent: HTMLElement, label: string, type: string): void {
    const container = document.createElement('div');
    container.style.marginBottom = '8px';

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--text-normal);
      margin-bottom: 2px;
    `;

    const value = document.createElement('div');
    value.className = 'selection-info';
    value.dataset.type = type;
    value.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-monospace);
    `;

    container.appendChild(labelEl);
    container.appendChild(value);
    parent.appendChild(container);
  }

  /**
   * Affiche un message d'aide temporaire
   */
  private showHelpMessage(message: string): void {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 12px;
      font-size: 12px;
      color: var(--text-normal);
      box-shadow: var(--shadow-s);
      z-index: 1000;
      max-width: 250px;
    `;

    document.body.appendChild(notification);

    // Supprimer après 3 secondes
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Demande confirmation pour effacer toutes les boxes
   */
  private confirmClearAll(): void {
    const confirmed = confirm(
      'Êtes-vous sûr de vouloir supprimer toutes les boxes ?\n\nCette action est irréversible.'
    );

    if (confirmed) {
      // Notifier l'événement - sera géré par le BoxManager
      // TODO: Ajouter un événement onClearAll dans EditorEvents
    }
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    this.container = null;
    this.selectionSection = null;
    this.positionInput = null;
    this.sizeInput = null;
    this.titleInput = null;
  }
}