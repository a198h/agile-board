// src/ui/confirmModal.ts
import { App, Modal } from "obsidian";

/**
 * Modal de confirmation simple pour remplacer window.confirm.
 * Utilise l'API native d'Obsidian pour une meilleure intégration.
 */
export class ConfirmModal extends Modal {
  private result: boolean = false;
  private resolvePromise: ((value: boolean) => void) | null = null;

  constructor(
    app: App,
    private title: string,
    private message: string,
    private confirmText: string = "Confirmer",
    private cancelText: string = "Annuler"
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    // Titre
    contentEl.createEl("h2", { text: this.title });

    // Message (avec support des sauts de ligne)
    const messageEl = contentEl.createEl("p");
    messageEl.style.whiteSpace = "pre-wrap";
    messageEl.textContent = this.message;

    // Boutons
    const buttonContainer = contentEl.createDiv("modal-button-container");

    // Bouton Annuler
    const cancelBtn = buttonContainer.createEl("button", { text: this.cancelText });
    cancelBtn.addEventListener("click", () => {
      this.result = false;
      this.close();
    });

    // Bouton Confirmer
    const confirmBtn = buttonContainer.createEl("button", {
      text: this.confirmText,
      cls: "mod-cta"
    });
    confirmBtn.addEventListener("click", () => {
      this.result = true;
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
    if (this.resolvePromise) {
      this.resolvePromise(this.result);
    }
  }

  /**
   * Affiche la modal et retourne une Promise qui résout avec true/false.
   */
  async confirm(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }
}
