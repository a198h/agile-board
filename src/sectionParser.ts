// src/sectionParser.ts
import { TFile, App } from "obsidian";

export interface SectionInfo {
  start: number;      // ligne de début du titre
  end: number;        // ligne de fin (exclue) de la section
  lines: string[];    // contenu brut entre les titres
}

export async function parseHeadingsInFile(app: App, file: TFile): Promise<Record<string, SectionInfo>> {
  const raw = await app.vault.read(file);
  const lines = raw.split("\n");

  const sections: Record<string, SectionInfo> = {};
  let currentTitle: string | null = null;
  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^# ([^\n#].*?)\s*$/); // # Titre (niveau 1)

    if (match) {
      if (currentTitle !== null) {
        sections[currentTitle] = {
          start: currentStart,
          end: i,
          lines: lines.slice(currentStart + 1, i)
        };
      }
      currentTitle = match[1].trim();
      currentStart = i;
    }
  }

  // dernière section
  if (currentTitle !== null) {
    sections[currentTitle] = {
      start: currentStart,
      end: lines.length,
      lines: lines.slice(currentStart + 1)
    };
  }

  return sections;
}
