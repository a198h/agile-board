// src/markdownBox.ts
import { App, MarkdownRenderer } from "obsidian";

export class MarkdownBox {
  boxEl: HTMLElement;
  previewEl: HTMLElement;
  editorEl: HTMLTextAreaElement;
  content = "";

  constructor(
    private app: App,
    container: HTMLElement,
    initial: string,
    private onChange: (newContent: string) => void
  ) {
    this.content = initial;

    // Création de la boîte
    this.boxEl = container.createDiv("box");
    this.boxEl.style.overflow = "auto";
    this.boxEl.style.maxHeight = "90%";
    this.boxEl.style.height = "100%"; // <-- Ajoute ceci pour forcer la hauteur
    // this.boxEl.style.scrollbarWidth = "thin";      // Firefox
    this.boxEl.style.padding = "0.25rem";
    // this.boxEl.style.border = "";
    // this.boxEl.style.borderRadius = "0.5rem";
    this.boxEl.style.backgroundColor = "var(--background-primary)";
    this.previewEl = this.boxEl.createDiv("preview");
    this.previewEl.style.overflow = "auto";
    this.previewEl.style.maxHeight = "90%";
    this.previewEl.style.scrollbarWidth = "thin";

    this.editorEl = this.boxEl.createEl("textarea", { cls: "editor" });

    // Ajoute ces styles pour occuper tout l'espace
    this.editorEl.style.width = "100%";
    this.editorEl.style.height = "100%";
    this.editorEl.style.minHeight = "0"; // déjà présent
    this.editorEl.style.boxSizing = "border-box";
    this.editorEl.style.resize = "none"; // optionnel, pour éviter le redimensionnement manuel

    this.renderPreview();

    // Clic sur le rendu → édition
    this.previewEl.addEventListener("click", () => this.openEditor());

    // Changement → maj rendu + notify
    this.editorEl.addEventListener("blur", async () => {
      this.content = this.editorEl.value;
      this.editorEl.style.display = "none";
      this.previewEl.style.display = "block";
      await this.renderPreview();
      this.onChange(this.content);
    });

    // Preview en live pendant la frappe
    this.editorEl.addEventListener("input", () => {
      this.content = this.editorEl.value;
      this.renderPreview();
    });
  }

  async renderPreview() {
    this.previewEl.empty();

    // Force le conteneur à occuper tout l'espace disponible
    this.previewEl.style.position = "relative";
    this.previewEl.style.width = "100%";
    this.previewEl.style.height = "100%";
    this.previewEl.style.minHeight = "60px"; // adapte si besoin

    if (!this.content.trim()) {
      const placeholder = document.createElement("div");
      placeholder.innerText = "Cliquez pour éditer…";
      // Styles en dur pour occuper tout l'espace et centrer le texte
      placeholder.style.position = "absolute";
      placeholder.style.top = "0";
      placeholder.style.left = "0";
      placeholder.style.right = "0";
      placeholder.style.bottom = "0";
      placeholder.style.width = "100%";
      placeholder.style.height = "100%";
      placeholder.style.display = "flex";
      placeholder.style.alignItems = "center";
      placeholder.style.justifyContent = "center";
      placeholder.style.opacity = "0.5";
      placeholder.style.cursor = "pointer";
      placeholder.style.userSelect = "none";
      placeholder.style.fontStyle = "italic";
      placeholder.addEventListener("click", () => this.openEditor());
      this.previewEl.appendChild(placeholder);
    } else {
      // Nettoie le style si contenu non vide
      this.previewEl.style.position = "";
      this.previewEl.style.minHeight = "";
      await MarkdownRenderer.renderMarkdown(
        this.content,
        this.previewEl,
        this.app.workspace.getActiveFile()?.path ?? "",
        null
      );
    }
  }

  openEditor() {
    this.editorEl.value = this.content;
    this.previewEl.style.display = "none";
    this.editorEl.style.display = "block";
    this.editorEl.focus();
  }
}
