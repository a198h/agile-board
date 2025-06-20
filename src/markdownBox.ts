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
    this.previewEl = this.boxEl.createDiv("preview");
    this.editorEl = this.boxEl.createEl("textarea", { cls: "editor" });

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
    await MarkdownRenderer.renderMarkdown(
      this.content,
      this.previewEl,
      this.app.workspace.getActiveFile()?.path ?? "",
      null
    );
  }

  openEditor() {
    this.editorEl.value = this.content;
    this.previewEl.style.display = "none";
    this.editorEl.style.display = "block";
    this.editorEl.focus();
  }
}
