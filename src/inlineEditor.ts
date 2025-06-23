// src/inlineEditor.ts
import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup";
import { markdown } from "@codemirror/lang-markdown";
import { debounce } from "ts-debounce";
import { App, TFile } from "obsidian";

export class InlineEditor {
  private view: EditorView;

  constructor(
    private container: HTMLElement,
    private initialText: string,
    private app: App,
    private file: TFile,
    private sectionStart: number,
    private sectionEnd: number
  ) {
    this.render();
  }

  private render() {
    const state = EditorState.create({
      doc: this.initialText,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.updateListener.of(this.onUpdate)
      ]
    });

    this.view = new EditorView({
      state,
      parent: this.container
    });
  }

  private onUpdate = debounce(async (update: any) => {
    if (!update.docChanged) return;

    const newText = this.view.state.doc.toString();
    const fileText = await this.app.vault.read(this.file);
    const lines = fileText.split("\n");

    const before = lines.slice(0, this.sectionStart + 1); // inclut le titre
    const after = lines.slice(this.sectionEnd); // tout ce qui suit

    const newLines = newText.split("\n");

    const updated = [...before, ...newLines, ...after].join("\n");
    await this.app.vault.modify(this.file, updated);

    // mettre à jour la sectionEnd si nécessaire : à voir plus tard
  }, 200);
}
