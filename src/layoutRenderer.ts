// src/layoutRenderer.ts
import { App, MarkdownView, TFile } from "obsidian";import { LayoutBlock } from "./types";
import { SectionInfo } from "./sectionParser";
import { InlineEditor } from "./inlineEditor";

export class LayoutRenderer {
  constructor(private app: App) {}
  
  renderLayout(blocks: LayoutBlock[], view: MarkdownView, sections: Record<string, SectionInfo>) {
    const container = view.contentEl;
    const existing = container.querySelector(".agile-board-grid");
    if (existing) existing.remove();

    const grid = document.createElement("div");
    grid.className = "agile-board-grid";

    grid.setAttribute("style", `
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 0.5rem;
      padding: 1rem;
    `);

    for (const block of blocks) {
      const section = document.createElement("section");
      section.className = "agile-board-frame";

      section.setAttribute("style", `
        grid-column: ${block.x + 1} / span ${block.w};
        grid-row: ${block.y + 1} / span ${block.h};
        border: 1px solid var(--background-modifier-border);
        padding: 0.5rem;
        background-color: var(--background-primary);
        border-radius: 0.5rem;
        overflow: auto;
      `);

      const content = sections[block.title]?.lines.join("\n") ?? "*Aucune section `# " + block.title + "` trouvée*";

      section.innerHTML = `
        <strong style="display: block; margin-bottom: 0.5em;">${block.title}</strong>
        <pre style="white-space: pre-wrap;">${content}</pre>
      `;
      
      const sectionInfo = sections[block.title];
      if (sectionInfo && view.file) {
        // Nettoyer l’intérieur du bloc
        section.innerHTML = "";

        new InlineEditor(
          section,
          sectionInfo.lines.join("\n"),
          this.app,
          view.file,
          sectionInfo.start,
          sectionInfo.end
        );
      }

      grid.appendChild(section);
    }

    container.prepend(grid);
  }
}

