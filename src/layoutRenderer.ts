// src/layoutRenderer.ts
import { App, MarkdownView, TFile } from "obsidian";
import { 
  LayoutModel, 
  SectionRegistry, 
  LayoutRenderer as ILayoutRenderer,
  PLUGIN_CONSTANTS 
} from "./types";
import { parseHeadingsInFile } from "./sectionParser";
import { MarkdownBox } from "./markdownBox";

/**
 * Service de rendu des layouts en mode Live Preview.
 * Gère l'affichage en grille et la création des composants d'édition.
 */
export class LayoutRenderer implements ILayoutRenderer {
  constructor(private readonly app: App) {}

  /**
   * Rend un layout en mode Live Preview avec les sections correspondantes.
   * @param blocks Modèle de layout à rendre
   * @param view Vue Markdown active
   * @param sections Registry des sections extraites du fichier
   */
  public async renderLayout(
    blocks: LayoutModel,
    view: MarkdownView,
    sections: SectionRegistry
  ): Promise<void> {
    if (!view.file) {
      return;
    }

    // Vérifier si nous sommes en mode Live Preview
    if (!this.isLivePreviewMode(view)) {
      return;
    }

    // Identifier les sections manquantes
    const missingTitles = this.findMissingSections(blocks, sections);

    // Créer ou réinitialiser le container principal
    const container = this.getOrCreateContainer(view);

    // Si des sections sont manquantes, afficher l'interface d'erreur
    if (missingTitles.length > 0) {
      this.renderErrorOverlay(view, container, blocks, missingTitles);
      return;
    }

    // Sinon, construire la grille
    const grid = document.createElement("div");
    grid.className = "agile-board-grid";
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 0.5rem;
      padding: 1rem;
      min-height: 90vh;
      max-height: 90vh;
    `;

    for (const block of blocks) {
      const section = document.createElement("section");
      section.className = "agile-board-frame";
      section.style.cssText = `
        grid-column: ${block.x + 1} / span ${block.w};
        grid-row: ${block.y + 1} / span ${block.h};
        min-height: 100px;
        border: 1px solid var(--background-modifier-border);
        padding: 0.5rem;
        background-color: var(--background-primary);
        border-radius: 0.5rem;
        overflow: auto;
      `;

      // Titre
      const titleEl = document.createElement("strong");
      titleEl.style.display = "block";
      titleEl.style.marginBottom = "0.5em";
      titleEl.textContent = block.title;
      section.appendChild(titleEl);

      // Contenu ou message d'erreur de section
      const info = sections[block.title];
      if (info) {
        const initial = info.lines.join("\n");
        new MarkdownBox(this.app, section, initial, async (newContent) => {
          const text = await this.app.vault.read(view.file!);
          const lines = text.split("\n");
          const before = lines.slice(0, info.start + 1);
          const after = lines.slice(info.end);
          const merged = [...before, ...newContent.split("\n"), ...after].join("\n");
          await this.app.vault.modify(view.file!, merged);
        });
      } else {
        const p = document.createElement("p");
        p.style.opacity = "0.6";
        p.textContent = "Section introuvable";
        section.appendChild(p);
      }

      grid.appendChild(section);
    }

    container.appendChild(grid);
  }

  /**
   * Vérifie si nous sommes en mode Live Preview.
   * @param view Vue Markdown à vérifier
   * @returns true si en mode Live Preview
   */
  private isLivePreviewMode(view: MarkdownView): boolean {
    const state = view.getState();
    return state.mode === "source" && state.source === false;
  }

  /**
   * Identifie les sections manquantes par rapport au modèle.
   * @param blocks Modèle de layout
   * @param sections Registry des sections disponibles
   * @returns Liste des titres manquants
   */
  private findMissingSections(
    blocks: LayoutModel,
    sections: SectionRegistry
  ): string[] {
    return blocks
      .map(block => block.title)
      .filter(title => !sections[title]);
  }

  /**
   * Crée ou récupère le container principal pour le rendu.
   * @param view Vue Markdown active
   * @returns Container HTML principal
   */
  private getOrCreateContainer(view: MarkdownView): HTMLElement {
    const existingContainer = view.containerEl.querySelector(
      `.${PLUGIN_CONSTANTS.CSS_CLASSES.CONTAINER}`
    );

    if (existingContainer) {
      existingContainer.empty();
      return existingContainer as HTMLElement;
    }

    const container = view.containerEl.createDiv(
      PLUGIN_CONSTANTS.CSS_CLASSES.CONTAINER
    );
    container.style.cssText = `
      position: relative;
      width: 100%;
      min-height: 100vh;
      overflow: auto;
    `;

    return container;
  }

  /**
   * Affiche l'interface d'erreur quand des sections sont manquantes.
   */
  private renderErrorOverlay(
    view: MarkdownView,
    container: HTMLElement,
    blocks: LayoutModel,
    missingTitles: string[]
  ): void {
    // Zone d'erreur
    const overlay = document.createElement("div");
    overlay.className = "agile-board-error";
    overlay.style.cssText = `
      padding: 2rem;
      text-align: center;
      background-color: var(--background-secondary);
      border: 2px dashed var(--color-accent);
      border-radius: 1rem;
      font-size: 1.1em;
      margin-bottom: 1rem;
    `;

    const h2 = document.createElement("h2");
    h2.textContent = "❌ Impossible d’appliquer le modèle";
    overlay.appendChild(h2);

    const p = document.createElement("p");
    p.textContent = "Titres manquants :";
    overlay.appendChild(p);

    const list = document.createElement("ul");
    for (const t of missingTitles) {
      const li = document.createElement("li");
      li.textContent = `# ${t}`;
      list.appendChild(li);
    }
    overlay.appendChild(list);

    const button = document.createElement("button");
    button.className = "mod-cta";
    button.style.marginTop = "1em";
    button.textContent = "➕ Réinitialiser la note avec le modèle";
    button.addEventListener("click", async () => {
      if (!view.file) return;
      const ok = window.confirm(
        "Tout le contenu (hors frontmatter) sera remplacé par les titres du modèle. Continuer ?"
      );
      if (!ok) return;

      await this.resetAndInsertSections(view.file, blocks);
      const updated = await parseHeadingsInFile(this.app, view.file);
      this.renderLayout(blocks, view, updated);
    });
    overlay.appendChild(button);

    container.appendChild(overlay);
  }

  /**
   * Réinitialise le fichier avec les sections du modèle.
   * @param file Fichier à modifier
   * @param blocks Modèle de layout
   */
  private async resetAndInsertSections(
    file: TFile,
    blocks: LayoutModel
  ): Promise<void> {
    const raw = await this.app.vault.read(file);
    const lines = raw.split("\n");

    // Préservation du frontmatter
    let bodyStart = 0;
    if (lines[0] === "---") {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === "---") {
          bodyStart = i + 1;
          break;
        }
      }
    }

    const front = lines.slice(0, bodyStart).join("\n");
    const body = blocks.map((b) => `# ${b.title}\n\n`).join("");
    const final = (front ? front + "\n" : "") + body;

    await this.app.vault.modify(file, final.trimStart());
  }
}
