// src/layoutRenderer.ts
import { App, MarkdownView, TFile } from "obsidian";
import { LayoutBlock } from "./types";
import { SectionInfo, parseHeadingsInFile } from "./sectionParser";
import { MarkdownBox } from "./markdownBox";

export class LayoutRenderer {
  constructor(private app: App) {}

  async renderLayout(
    blocks: LayoutBlock[],
    view: MarkdownView,
    sections: Record<string, SectionInfo>
  ) {
    // Si view.file est null, on ne fait rien
    if (!view.file) return;

    // 📋 Récupère l'état courant de la vue
    const state = (view as any).getState();
    console.log("🔍 getState() →", state);
    
    // ✅ Live Preview = mode "source" + source:false
    const isLivePreview = state.mode === "source" && state.source === false;
    if (!isLivePreview) {
      return;
    }


    // Repérage des titres manquants
    const missingTitles = blocks
      .map(b => b.title)
      .filter(title => !(title in sections));

    // Création ou réinitialisation du wrapper
    let container = view.contentEl.querySelector(
      ".agile-board-container"
    ) as HTMLElement | null;
    if (!container) {
      container = document.createElement("div");
      container.className = "agile-board-container";
      view.contentEl.prepend(container);
    } else {
      container.innerHTML = "";
    }

    // Si titres manquants, on affiche l'erreur + bouton
    if (missingTitles.length > 0) {
      this.renderErrorOverlay(view, container, blocks, missingTitles);
      return;
    }

    // Sinon, on construit la grille
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

  private renderErrorOverlay(
    view: MarkdownView,
    container: HTMLElement,
    blocks: LayoutBlock[],
    missingTitles: string[]
  ) {
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

  private async resetAndInsertSections(
    file: TFile,
    blocks: LayoutBlock[]
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

function renderFrame(markdown: string): string {
  // Sépare le Markdown en lignes
  const lines = markdown.split('\n');
  let output: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    output.push(lines[i]);
    // Si c'est un titre de cadre
    if (lines[i].match(/^# .+/)) {
      // Si la ligne suivante n'existe pas ou est un autre titre
      if (!lines[i + 1] || lines[i + 1].match(/^# /)) {
        // Ajoute un placeholder invisible
        output.push('<span style="display:none" data-placeholder="true"></span>');
      }
    }
  }
  return output.join('\n');
}

function cleanPlaceholders(markdown: string): string {
  // Supprime tous les placeholders invisibles
  return markdown.replace(/<span style="display:none" data-placeholder="true"><\/span>\n?/g, '');
}
