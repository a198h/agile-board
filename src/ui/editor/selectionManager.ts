// src/ui/editor/selectionManager.ts

import { LayoutBox } from "../../core/layout/layoutFileRepo";
import { EditorEvents } from "./types";

/**
 * Gestionnaire de la sélection dans l'éditeur.
 * Responsabilité unique : état de sélection et informations associées.
 * Pattern Observer pour notifier les changements.
 */
export class SelectionManager {
  private selectedBoxId: string | null = null;
  private selectedBox: LayoutBox | null = null;

  constructor(private readonly events: EditorEvents) {}

  /**
   * Sélectionne une box par son ID
   */
  public selectBox(boxId: string, box: LayoutBox): void {
    if (this.selectedBoxId === boxId) return;

    this.selectedBoxId = boxId;
    this.selectedBox = { ...box }; // Clone immutable
    
    this.events.onBoxSelect(boxId);
  }

  /**
   * Déselectionne tout
   */
  public deselectAll(): void {
    if (!this.selectedBoxId) return;

    this.selectedBoxId = null;
    this.selectedBox = null;
    
    this.events.onBoxSelect(null);
  }

  /**
   * Met à jour les informations de la box sélectionnée
   */
  public updateSelectedBox(updates: Partial<LayoutBox>): void {
    if (!this.selectedBox || !this.selectedBoxId) return;

    this.selectedBox = { ...this.selectedBox, ...updates };
    this.events.onBoxUpdate(this.selectedBoxId, updates);
  }

  /**
   * Supprime la box sélectionnée
   */
  public deleteSelectedBox(): void {
    if (!this.selectedBoxId) return;

    const boxIdToDelete = this.selectedBoxId;
    this.deselectAll();
    this.events.onBoxDelete(boxIdToDelete);
  }

  /**
   * Récupère la box actuellement sélectionnée
   */
  public getSelectedBox(): LayoutBox | null {
    return this.selectedBox ? { ...this.selectedBox } : null;
  }

  /**
   * Récupère l'ID de la box sélectionnée
   */
  public getSelectedBoxId(): string | null {
    return this.selectedBoxId;
  }

  /**
   * Vérifie si une box est sélectionnée
   */
  public hasSelection(): boolean {
    return this.selectedBoxId !== null;
  }

  /**
   * Vérifie si une box spécifique est sélectionnée
   */
  public isSelected(boxId: string): boolean {
    return this.selectedBoxId === boxId;
  }

  /**
   * Récupère les informations de sélection pour l'affichage
   */
  public getSelectionInfo(): SelectionInfo {
    if (!this.selectedBox) {
      return {
        hasSelection: false,
        box: null,
        positionText: '',
        sizeText: '',
        areaText: ''
      };
    }

    const { x, y, w, h, title } = this.selectedBox;
    
    return {
      hasSelection: true,
      box: { ...this.selectedBox },
      positionText: `Position: (${x}, ${y})`,
      sizeText: `Taille: ${w} × ${h}`,
      areaText: `Surface: ${w * h} cellules`,
      title
    };
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    this.deselectAll();
  }
}

/**
 * Informations de sélection pour l'affichage
 */
export interface SelectionInfo {
  readonly hasSelection: boolean;
  readonly box: LayoutBox | null;
  readonly positionText: string;
  readonly sizeText: string;
  readonly areaText: string;
  readonly title?: string;
}