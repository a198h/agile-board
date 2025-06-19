// src/layoutRenderer.ts
import { MarkdownView } from "obsidian";
import { LayoutBlock } from "./types";

export class LayoutRenderer {
  renderLayout(blocks: LayoutBlock[], view: MarkdownView) {
    const container = view.contentEl;

    // Supprimer un rendu précédent si présent
    const existing = container.querySelector(".agile-board-grid");
    if (existing) existing.remove();

    if (!view || !view.file) {
        console.warn("⛔ Aucune vue Markdown active ou fichier associé");
        return;
    }   


    // Créer la grille
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
      section.dataset.title = block.title;
      section.className = "agile-board-frame";

      section.setAttribute("style", `
        grid-column: ${block.x + 1} / span ${block.w};
        grid-row: ${block.y + 1} / span ${block.h};
        min-height: 100px;
        border: 1px solid var(--background-modifier-border);
        padding: 0.5rem;
        background-color: var(--background-primary);
        border-radius: 0.5rem;
      `); 


      section.innerHTML = `<strong>${block.title}</strong>`;
      grid.appendChild(section);
    }

    container.prepend(grid);

    console.log("🎨 Rendu de", blocks.length, "cadres dans", view.file?.path ?? "(inconnu)");

  }
}
