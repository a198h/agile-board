// src/fileSynchronizer.ts
import { TFile, EventRef } from "obsidian";
import { parseHeadingsInFile } from "./sectionParser";
import { AGILE_BOARD_VIEW_TYPE, AgileBoardView } from "./agileBoardView";
import AgileBoardPlugin from "./main";

// Type pour accéder aux propriétés internes d'AgileBoardView
type AgileBoardViewWithState = AgileBoardView & {
  isUpdating?: boolean;
  frames?: Map<string, { updateContent(content: string): Promise<void> }>;
}

export class FileSynchronizer {
  private eventRefs: EventRef[] = [];

  constructor(private plugin: AgileBoardPlugin) {}

  start(): void {
    // Écouter les modifications de fichier
    this.eventRefs.push(
      this.plugin.app.vault.on("modify", (file) => {
        if (file instanceof TFile) {
          this.onFileModified(file);
        }
      })
    );

    // Écouter les changements de métadonnées (frontmatter)
    this.eventRefs.push(
      this.plugin.app.metadataCache.on("changed", (file) => {
        this.onFileModified(file);
      })
    );
  }

  stop(): void {
    this.eventRefs.forEach(ref => this.plugin.app.vault.offref(ref));
    this.eventRefs = [];
  }

  private async onFileModified(file: TFile): Promise<void> {
    if (!file.path.endsWith('.md')) return;

    // Vérifier si une vue Board est ouverte pour ce fichier
    const boardView = this.getBoardViewForFile(file);
    if (boardView) {
      await this.updateBoardView(boardView, file);
    }
  }

  private getBoardViewForFile(file: TFile): AgileBoardView | null {
    const leaves = this.plugin.app.workspace.getLeavesOfType(AGILE_BOARD_VIEW_TYPE);
    
    for (const leaf of leaves) {
      const view = leaf.view as AgileBoardView;
      if (view.file?.path === file.path) {
        return view;
      }
    }
    
    return null;
  }

  private async updateBoardView(boardView: AgileBoardView, file: TFile): Promise<void> {
    // @ts-ignore - Accès aux propriétés internes pour éviter les boucles de mise à jour
    const viewWithState = boardView as AgileBoardViewWithState;

    // Eviter les boucles infinies en vérifiant si la vue est en cours de modification
    // @ts-expect-error - isUpdating est une propriété interne ajoutée dynamiquement
    if (viewWithState.isUpdating) return;

    try {
      // @ts-expect-error - isUpdating est une propriété interne ajoutée dynamiquement
      viewWithState.isUpdating = true;

      // Parser les nouvelles sections
      const newSections = await parseHeadingsInFile(this.plugin.app, file);

      // Mettre à jour chaque frame avec le nouveau contenu
      // @ts-expect-error - frames est une propriété privée d'AgileBoardView
      if (viewWithState.frames) {
        // @ts-expect-error - frames est une propriété privée d'AgileBoardView
        for (const [title, frame] of viewWithState.frames) {
          const newSection = newSections[title];
          if (newSection) {
            // Convertir SectionInfo en string en joignant les lignes
            const newContent = newSection.lines.join('\n');
            await frame.updateContent(newContent);
          }
        }
      }
    } finally {
      // @ts-expect-error - isUpdating est une propriété interne ajoutée dynamiquement
      viewWithState.isUpdating = false;
    }
  }

  // Méthode pour notifier qu'un changement vient d'une vue Board
  // (évite la mise à jour circulaire)
  notifyBoardViewChange(file: TFile): void {
    const boardView = this.getBoardViewForFile(file);
    if (boardView) {
      // @ts-ignore - Accès aux propriétés internes pour éviter les boucles de mise à jour
      const viewWithState = boardView as AgileBoardViewWithState;
      // @ts-expect-error - isUpdating est une propriété interne ajoutée dynamiquement
      viewWithState.isUpdating = true;

      // Remettre à false après un court délai
      setTimeout(() => {
        // @ts-expect-error - isUpdating est une propriété interne ajoutée dynamiquement
        viewWithState.isUpdating = false;
      }, 100);
    }
  }
}