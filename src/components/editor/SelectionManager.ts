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
  generateSelectionInfo(): string {
    if (!this.selectedBox) {
      return `<p style="color: var(--text-muted);">${t('editor.sidebar.selection.empty')}</p>`;
    }

    const box = this.selectedBox.box;
    return `
      <div style="font-size: 14px; line-height: 1.4;">
        <div style="margin-bottom: 8px;">
          <strong>${t('editor.sidebar.selection.frameTitle')}:</strong> ${box.title}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>${t('editor.sidebar.selection.position')}:</strong> (${box.x + 1}, ${box.y + 1})
        </div>
        <div style="margin-bottom: 8px;">
          <strong>${t('editor.sidebar.selection.size')}:</strong> ${box.w} × ${box.h}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>ID:</strong> <code style="font-size: 11px;">${box.id}</code>
        </div>
      </div>
      <div style="margin-top: 15px;">
        <input 
          type="text" 
          placeholder="${t('editor.sidebar.selection.placeholder')}" 
          value="${box.title}"
          style="width: 100%; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;"
          class="box-title-input"
        />
      </div>
    `;
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