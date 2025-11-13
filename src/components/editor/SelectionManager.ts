// src/components/editor/SelectionManager.ts
import { BoxState } from "./BoxManager";
import { t } from "../../i18n";

/**
 * Composant responsable de la gestion de la sélection des boxes.
 * Gère la sélection, désélection et mise à jour de l'interface de sélection.
 */
export class SelectionManager {
  private selectedBox: BoxState | null = null;
  private boxes: Map<string, BoxState> = new Map();

  constructor(
    private onSelectionChange: (box: BoxState | null) => void
  ) {}

  /**
   * Sélectionne une box.
   */
  selectBox(boxState: BoxState): void {
    this.deselectAll();
    
    boxState.isSelected = true;
    this.applySelectedStyles(boxState.element);
    this.showResizeHandles(boxState.element);

    this.selectedBox = boxState;
    this.onSelectionChange(boxState);
  }

  /**
   * Désélectionne toutes les boxes.
   */
  deselectAll(): void {
    this.boxes.forEach(boxState => {
      boxState.isSelected = false;
      this.applyDeselectedStyles(boxState.element);
      this.hideResizeHandles(boxState.element);
    });
    
    this.selectedBox = null;
    this.onSelectionChange(null);
  }

  /**
   * Applique les styles de sélection à un élément.
   */
  private applySelectedStyles(element: HTMLElement): void {
    element.style.opacity = '1';
    element.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08), 0 0 0 2px var(--interactive-accent)';
    element.style.transform = 'translateZ(0)';
  }

  /**
   * Applique les styles de désélection à un élément.
   */
  private applyDeselectedStyles(element: HTMLElement): void {
    element.style.opacity = '0.95';
    element.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)';
    element.style.transform = 'translateZ(0) scale(1)';
  }

  /**
   * Affiche les poignées de redimensionnement.
   */
  private showResizeHandles(element: HTMLElement): void {
    const handles = element.querySelectorAll('.resize-handle') as NodeListOf<HTMLElement>;
    handles.forEach(handle => {
      handle.style.opacity = '1';
    });
  }

  /**
   * Cache les poignées de redimensionnement.
   */
  private hideResizeHandles(element: HTMLElement): void {
    const handles = element.querySelectorAll('.resize-handle') as NodeListOf<HTMLElement>;
    handles.forEach(handle => {
      handle.style.opacity = '0';
    });
  }

  /**
   * Met à jour la référence des boxes gérées.
   */
  updateBoxes(boxes: Map<string, BoxState>): void {
    this.boxes = boxes;
  }

  /**
   * Retourne la box actuellement sélectionnée.
   */
  getSelectedBox(): BoxState | null {
    return this.selectedBox;
  }

  /**
   * Vérifie si une box est sélectionnée.
   */
  hasSelection(): boolean {
    return this.selectedBox !== null;
  }

  /**
   * Génère les informations de sélection pour l'interface.
   */
  generateSelectionInfo(): HTMLElement {
    const container = document.createElement('div');

    if (!this.selectedBox) {
      const emptyP = container.createEl('p');
      emptyP.addClass('agile-selection-empty');
      emptyP.textContent = t('editor.sidebar.selection.empty');
      return container;
    }

    const box = this.selectedBox.box;

    // Section d'informations
    const infoDiv = container.createDiv('agile-selection-info');

    // Titre du cadre
    const titleDiv = infoDiv.createDiv('agile-info-item');
    const titleLabel = titleDiv.createEl('strong');
    titleLabel.textContent = t('editor.sidebar.selection.frameTitle') + ':';
    titleDiv.appendText(' ' + box.title);

    // Position
    const posDiv = infoDiv.createDiv('agile-info-item');
    const posLabel = posDiv.createEl('strong');
    posLabel.textContent = t('editor.sidebar.selection.position') + ':';
    posDiv.appendText(` (${box.x + 1}, ${box.y + 1})`);

    // Taille
    const sizeDiv = infoDiv.createDiv('agile-info-item');
    const sizeLabel = sizeDiv.createEl('strong');
    sizeLabel.textContent = t('editor.sidebar.selection.size') + ':';
    sizeDiv.appendText(` ${box.w} × ${box.h}`);

    // ID
    const idDiv = infoDiv.createDiv('agile-info-item');
    const idLabel = idDiv.createEl('strong');
    idLabel.textContent = 'ID:';
    idDiv.appendText(' ' + box.id);

    // Input de modification de titre
    const inputContainer = container.createDiv('agile-title-input-container');
    inputContainer.createEl('input', {
      cls: 'box-title-input',
      type: 'text',
      placeholder: t('editor.sidebar.selection.placeholder'),
      value: box.title
    });

    return container;
  }

  /**
   * Configure les gestionnaires d'événements pour l'input de titre.
   */
  setupTitleInputHandlers(container: HTMLElement, onTitleChange: (boxId: string, title: string) => void): void {
    const titleInput = container.querySelector('.box-title-input') as HTMLInputElement;
    if (!titleInput || !this.selectedBox) return;

    const boxId = this.selectedBox.box.id;

    titleInput.addEventListener('input', (e) => {
      const newTitle = (e.target as HTMLInputElement).value;
      onTitleChange(boxId, newTitle);
    });

    titleInput.addEventListener('blur', (e) => {
      const newTitle = (e.target as HTMLInputElement).value;
      onTitleChange(boxId, newTitle);
    });
    
    titleInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Met à jour la box sélectionnée avec de nouvelles données.
   */
  updateSelectedBox(updatedBox: BoxState): void {
    if (this.selectedBox && this.selectedBox.box.id === updatedBox.box.id) {
      this.selectedBox = updatedBox;
    }
  }
}