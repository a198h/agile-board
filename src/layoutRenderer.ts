import { App, MarkdownView, TFile } from "obsidian";
import { LayoutBlock } from "./types";
import { SectionInfo, parseHeadingsInFile } from "./sectionParser";
import { insertSectionIfMissing } from "./sectionParser";
import { MarkdownBox } from "./markdownBox";

export class LayoutRenderer {
  constructor(private app: App) {}

  async renderLayout(
    blocks: LayoutBlock[],
    view: MarkdownView,
    sections: Record<string, SectionInfo>
  ) {
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
      min-height: 90vh;
      max-height: 90vh; /* 👈 force la grille à occuper toute la hauteur de l'écran */
    `);


    for (const block of blocks) {
      const section = document.createElement("section");
      section.className = "agile-board-frame";

      section.setAttribute("style", `
        grid-column: ${block.x + 1} / span ${block.w};
        grid-row: ${block.y + 1} / span ${block.h};
        min-height: 100px; /* 👈 chaque bloc doit avoir une vraie hauteur */
        border: 1px solid var(--background-modifier-border);
        padding: 0.5rem;
        background-color: var(--background-primary);
        border-radius: 0.5rem;
        overflow: auto;
      `);

      let sectionInfo = sections[block.title];

      // ➕ Si la section n'existe pas, on l'ajoute au fichier
      if (!sectionInfo && view.file) {
        await insertSectionIfMissing(this.app, view.file, block.title);
        const updatedSections = await parseHeadingsInFile(this.app, view.file);
        sectionInfo = updatedSections[block.title];
      }

      if (sectionInfo && view.file) {
        const initial = sectionInfo.lines.join("\n");

        // Nettoyer l’intérieur et injecter le MarkdownBox
        section.innerHTML = `<strong style="display:block; margin-bottom:0.5em;">${block.title}</strong>`;

        new MarkdownBox(this.app, section, initial, async (newContent) => {
          const fileText = await this.app.vault.read(view.file!);
          const lines = fileText.split("\n");

          const before = lines.slice(0, sectionInfo!.start + 1);
          const after = lines.slice(sectionInfo!.end);
          const updated = [...before, ...newContent.split("\n"), ...after].join("\n");

          await this.app.vault.modify(view.file!, updated);
        });

      } else {
        section.innerHTML = `<strong>${block.title}</strong><p style="opacity: 0.6;">Section introuvable</p>`;
      }

      grid.appendChild(section);
    }

    container.prepend(grid);
  }
}
