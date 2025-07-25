// src/sectionParser.ts
import { TFile, App } from "obsidian";
import { SectionInfo, SectionRegistry, Result, PluginError } from "./types";

// Re-export SectionInfo pour rétrocompatibilité
export type { SectionInfo } from "./types";

/**
 * Utilitaires pour le parsing et la manipulation de sections markdown.
 * Toutes les fonctions sont pures sauf celles qui interagissent avec le système de fichiers.
 */

/**
 * Parse le contenu markdown et extrait toutes les sections de niveau 1.
 * Fonction pure qui ne dépend que du contenu en entrée.
 * @param content Contenu markdown complet
 * @returns Registry des sections indexées par titre
 */
export function parseMarkdownSections(content: string): SectionRegistry {
  const lines = content.split("\n");
  const sections: Record<string, SectionInfo> = {};
  
  let currentTitle: string | null = null;
  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const titleMatch = extractLevelOneTitle(line);

    if (titleMatch) {
      // Sauvegarder la section précédente si elle existe
      if (currentTitle !== null) {
        sections[currentTitle] = createSectionInfo(
          currentTitle,
          currentStart,
          i,
          lines
        );
      }
      
      currentTitle = titleMatch;
      currentStart = i;
    }
  }

  // Traiter la dernière section
  if (currentTitle !== null) {
    sections[currentTitle] = createSectionInfo(
      currentTitle,
      currentStart,
      lines.length,
      lines
    );
  }

  return sections;
}

/**
 * Extrait le titre d'une ligne si c'est un heading de niveau 1.
 * @param line Ligne à analyser
 * @returns Titre extrait ou null si ce n'est pas un titre de niveau 1
 */
export function extractLevelOneTitle(line: string): string | null {
  const match = line.match(/^# ([^\n#].*?)\s*$/);
  return match ? match[1].trim() : null;
}

/**
 * Crée un objet SectionInfo à partir des paramètres.
 * @param title Titre de la section
 * @param start Ligne de début (incluse)
 * @param end Ligne de fin (exclue)
 * @param allLines Toutes les lignes du document
 * @returns Objet SectionInfo
 */
function createSectionInfo(
  title: string,
  start: number,
  end: number,
  allLines: readonly string[]
): SectionInfo {
  return {
    title,
    start,
    end,
    lines: allLines.slice(start + 1, end)
  };
}

/**
 * Vérifie si une section avec le titre donné existe dans le contenu.
 * @param content Contenu markdown
 * @param title Titre à chercher
 * @returns true si la section existe
 */
export function sectionExists(content: string, title: string): boolean {
  const titlePattern = `# ${title}`;
  return content.includes(titlePattern);
}

/**
 * Génère le markdown pour créer une nouvelle section.
 * @param title Titre de la section
 * @param content Contenu initial (optionnel)
 * @returns Markdown formaté pour la section
 */
export function generateSectionMarkdown(title: string, content = ""): string {
  const section = `# ${title}\n\n${content}`;
  return content ? section : section.trim() + "\n\n";
}

/**
 * Insère des sections manquantes dans le contenu markdown.
 * @param originalContent Contenu original
 * @param missingTitles Titres des sections à ajouter
 * @returns Nouveau contenu avec les sections ajoutées
 */
export function insertMissingSections(
  originalContent: string,
  missingTitles: readonly string[]
): string {
  if (missingTitles.length === 0) {
    return originalContent;
  }

  const sectionsToAdd = missingTitles
    .map(title => generateSectionMarkdown(title))
    .join("");

  return originalContent.trimEnd() + "\n\n" + sectionsToAdd;
}

/**
 * Valide qu'un contenu markdown contient toutes les sections requises.
 * @param content Contenu à valider
 * @param requiredTitles Titres requis
 * @returns Résultat de validation avec les sections manquantes
 */
export function validateRequiredSections(
  content: string,
  requiredTitles: readonly string[]
): Result<SectionRegistry, { missingTitles: string[] }> {
  const sections = parseMarkdownSections(content);
  const existingTitles = Object.keys(sections);
  
  const missingTitles = requiredTitles.filter(
    title => !existingTitles.includes(title)
  );

  if (missingTitles.length > 0) {
    return {
      success: false,
      error: { missingTitles }
    };
  }

  return {
    success: true,
    data: sections
  };
}

// === Fonctions avec effets de bord (interactions Obsidian) ===

/**
 * Parse les sections d'un fichier Obsidian.
 * @param app Instance Obsidian
 * @param file Fichier à parser
 * @returns Registry des sections du fichier
 */
export async function parseHeadingsInFile(
  app: App, 
  file: TFile
): Promise<SectionRegistry> {
  const content = await app.vault.read(file);
  return parseMarkdownSections(content);
}

/**
 * Insère une section dans un fichier si elle n'existe pas déjà.
 * @param app Instance Obsidian
 * @param file Fichier à modifier
 * @param title Titre de la section à ajouter
 * @returns Promise résolue quand l'opération est terminée
 */
export async function insertSectionIfMissing(
  app: App, 
  file: TFile, 
  title: string
): Promise<void> {
  const content = await app.vault.read(file);
  
  if (sectionExists(content, title)) {
    return;
  }

  const newContent = insertMissingSections(content, [title]);
  await app.vault.modify(file, newContent);
}
