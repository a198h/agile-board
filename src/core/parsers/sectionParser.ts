// src/sectionParser.ts
import { TFile, App } from "obsidian";
import { SectionInfo, SectionRegistry, Result, PluginError } from "../../types";

// Re-export SectionInfo pour rétrocompatibilité
export type { SectionInfo } from "../../types";

/**
 * Fonction utilitaire pour formater un PluginError en message lisible.
 * Gère tous les variants de l'union type PluginError.
 * @param error L'erreur à formater
 * @returns Message d'erreur formaté
 */
export function formatPluginError(error: PluginError): string {
  switch (error.type) {
    case 'LAYOUT_NOT_FOUND':
      return `Tableau '${error.layoutName}' introuvable`;
    case 'INVALID_LAYOUT_FORMAT':
      return error.details;
    case 'FILE_SYSTEM_ERROR':
      return error.error.message;
    case 'VALIDATION_ERROR':
      return error.errors.join(', ');
    case 'SECTION_MISSING':
      return `Section '${error.sectionTitle}' manquante`;
    case 'PARSING_ERROR':
      return error.details;
    case 'NETWORK_ERROR':
      return error.message;
    case 'PERMISSION_ERROR':
      return error.message;
    case 'INITIALIZATION_ERROR':
      return error.details;
    default:
      return 'Erreur inconnue';
  }
}

/**
 * Utilitaires fonctionnels pour le parsing et la manipulation de sections markdown.
 * Architecture séparée entre fonctions pures (logique métier) et fonctions avec effets (IO).
 * Toutes les fonctions pures sont testables en isolation sans dépendances externes.
 * 
 * @example
 * ```typescript
 * // Parsing pur d'un contenu
 * const sections = parseMarkdownSections(content);
 * 
 * // Validation fonctionnelle
 * const result = validateRequiredSections(content, ['Intro', 'Conclusion']);
 * ```
 */

/**
 * Parse le contenu markdown et extrait toutes les sections de niveau 1.
 * Fonction pure avec validation des entrées et gestion d'erreur explicite.
 * @param content Contenu markdown complet (doit être non-null)
 * @returns Result contenant la registry des sections ou l'erreur de parsing
 * @throws Jamais (utilise le type Result pour la gestion d'erreur)
 */
export function parseMarkdownSections(content: string): Result<SectionRegistry, PluginError> {
  // Validation des entrées
  if (typeof content !== 'string') {
    return {
      success: false,
      error: {
        type: 'PARSING_ERROR',
        details: 'Le contenu doit être une chaîne de caractères'
      }
    };
  }

  try {
    const parseResult = parseMarkdownSectionsUnsafe(content);
    return { success: true, data: parseResult };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'PARSING_ERROR',
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Version interne non-sécurisée du parsing pour la performance.
 * Fonction pure optimisée sans validation d'entrée.
 * @param content Contenu validé
 * @returns Registry des sections
 */
function parseMarkdownSectionsUnsafe(content: string): SectionRegistry {
  const lines = content.split("\n");
  const sections: Record<string, SectionInfo> = {};
  
  let currentSection: {
    title: string;
    start: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const titleMatch = extractLevelOneTitle(line);

    if (titleMatch) {
      // Finaliser la section précédente
      if (currentSection !== null) {
        sections[currentSection.title] = createSectionInfo(
          currentSection.title,
          currentSection.start,
          i,
          lines
        );
      }
      
      // Démarrer la nouvelle section
      currentSection = {
        title: titleMatch,
        start: i
      };
    }
  }

  // Finaliser la dernière section
  if (currentSection !== null) {
    sections[currentSection.title] = createSectionInfo(
      currentSection.title,
      currentSection.start,
      lines.length,
      lines
    );
  }

  return sections;
}

/**
 * Version legacy pour compatibilité arrière.
 * @deprecated Utiliser parseMarkdownSections() qui retourne un Result
 * @param content Contenu markdown
 * @returns Registry des sections (peut lever une exception)
 */
export function parseMarkdownSectionsLegacy(content: string): SectionRegistry {
  const result = parseMarkdownSections(content);
  if (!result.success) {
    throw new Error(`Erreur de parsing: ${formatPluginError(result.error)}`);
  }
  return result.data;
}

/**
 * Extrait le titre d'une ligne si c'est un heading de niveau 1.
 * Fonction pure avec validation stricte du format markdown.
 * @param line Ligne à analyser (doit être non-null)
 * @returns Titre extrait et normalisé, ou null si format invalide
 * @example
 * ```typescript
 * extractLevelOneTitle('# Mon Titre') // → 'Mon Titre'
 * extractLevelOneTitle('## Niveau 2') // → null
 * extractLevelOneTitle('# ') // → null (titre vide)
 * ```
 */
export function extractLevelOneTitle(line: string): string | null {
  if (typeof line !== 'string') {
    return null;
  }

  // Pattern strict pour un titre de niveau 1:
  // - Début de ligne: ^
  // - Un seul #: # 
  // - Espace obligatoire: \s+
  // - Contenu non-vide: ([^\n#].+?)
  // - Espaces finaux optionnels: \s*
  // - Fin de ligne: $
  const match = line.match(/^#\s+([^\n#].+?)\s*$/);
  
  if (!match) {
    return null;
  }

  const title = match[1].trim();
  
  // Vérifier que le titre n'est pas vide après nettoyage
  return title.length > 0 ? title : null;
}

/**
 * Factory function pour créer un objet SectionInfo validé.
 * Fonction pure avec validation des contraintes métier.
 * @param title Titre de la section (non-vide)
 * @param start Ligne de début (incluse, >= 0)
 * @param end Ligne de fin (exclue, > start)
 * @param allLines Toutes les lignes du document
 * @returns Objet SectionInfo immutable
 * @throws {Error} Si les paramètres violent les contraintes
 */
function createSectionInfo(
  title: string,
  start: number,
  end: number,
  allLines: readonly string[]
): SectionInfo {
  // Validations strictes
  if (!title || title.trim().length === 0) {
    throw new Error('Le titre de section ne peut pas être vide');
  }
  
  if (start < 0 || end <= start || end > allLines.length) {
    throw new Error(`Indices invalides: start=${start}, end=${end}, total=${allLines.length}`);
  }

  // Extraction sécurisée du contenu (sans la ligne de titre)
  const contentLines = allLines.slice(start + 1, end);
  
  return {
    title: title.trim(),
    start,
    end,
    lines: Object.freeze([...contentLines]) // Immutabilité profonde
  };
}

/**
 * Vérifie si une section avec le titre donné existe dans le contenu.
 * Fonction pure avec validation stricte qui évite les faux positifs.
 * @param content Contenu markdown à analyser
 * @param title Titre exact à chercher
 * @returns true si une section de niveau 1 avec ce titre existe
 * @example
 * ```typescript
 * sectionExists('# Introduction\ncontenu', 'Introduction') // → true
 * sectionExists('## Introduction\ncontenu', 'Introduction') // → false
 * sectionExists('# Introduction Avancee', 'Introduction') // → false
 * ```
 */
export function sectionExists(content: string, title: string): boolean {
  if (!content || !title) {
    return false;
  }

  const normalizedTitle = title.trim();
  if (normalizedTitle.length === 0) {
    return false;
  }

  // Recherche avec pattern exact pour éviter les faux positifs
  const lines = content.split('\n');
  return lines.some(line => {
    const extractedTitle = extractLevelOneTitle(line);
    return extractedTitle === normalizedTitle;
  });
}

/**
 * Version optimisée pour vérifier l'existence de plusieurs sections.
 * @param content Contenu markdown
 * @param titles Titres à chercher
 * @returns Map associant chaque titre à son existence
 */
export function sectionsExist(content: string, titles: readonly string[]): Map<string, boolean> {
  const result = new Map<string, boolean>();
  
  if (!content || titles.length === 0) {
    titles.forEach(title => result.set(title, false));
    return result;
  }

  // Parse une seule fois pour toutes les vérifications
  const parseResult = parseMarkdownSections(content);
  const existingSections = parseResult.success 
    ? Object.keys(parseResult.data)
    : [];

  titles.forEach(title => {
    result.set(title, existingSections.includes(title.trim()));
  });

  return result;
}

/**
 * Génère le markdown pour créer une nouvelle section.
 * Fonction pure avec validation et normalisation des entrées.
 * @param title Titre de la section (sera normalisé)
 * @param content Contenu initial (optionnel)
 * @returns Markdown formaté et validé pour la section
 * @throws {Error} Si le titre est invalide
 * @example
 * ```typescript
 * generateSectionMarkdown('Introduction') // → '# Introduction\n\n'
 * generateSectionMarkdown('Todo', '- Item 1') // → '# Todo\n\n- Item 1\n\n'
 * ```
 */
export function generateSectionMarkdown(title: string, content = ""): string {
  if (!title || typeof title !== 'string') {
    throw new Error('Le titre est requis et doit être une chaîne');
  }

  const normalizedTitle = title.trim();
  if (normalizedTitle.length === 0) {
    throw new Error('Le titre ne peut pas être vide');
  }

  // Vérifier que le titre ne contient pas de caractères problématiques
  if (normalizedTitle.includes('\n') || normalizedTitle.includes('#')) {
    throw new Error('Le titre ne peut pas contenir de retours à la ligne ou de #');
  }

  const normalizedContent = typeof content === 'string' ? content : '';
  
  // Génération avec formatage cohérent
  const sectionHeader = `# ${normalizedTitle}\n\n`;
  
  if (normalizedContent.trim().length === 0) {
    return sectionHeader;
  }
  
  // S'assurer qu'il y a une ligne vide à la fin
  const contentWithNewline = normalizedContent.endsWith('\n') 
    ? normalizedContent + '\n'
    : normalizedContent + '\n\n';
  
  return sectionHeader + contentWithNewline;
}

/**
 * Version sécurisée qui retourne un Result au lieu de lever une exception.
 * @param title Titre de la section
 * @param content Contenu initial
 * @returns Result contenant le markdown généré ou l'erreur
 */
export function generateSectionMarkdownSafe(
  title: string, 
  content = ""
): Result<string> {
  try {
    const markdown = generateSectionMarkdown(title, content);
    return { success: true, data: markdown };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        errors: [error instanceof Error ? error.message : String(error)]
      }
    };
  }
}

/**
 * Insère des sections manquantes dans le contenu markdown.
 * Fonction pure avec gestion d'erreur intégrée et validation.
 * @param originalContent Contenu original (non-null)
 * @param missingTitles Titres des sections à ajouter
 * @returns Result contenant le nouveau contenu ou les erreurs
 */
export function insertMissingSections(
  originalContent: string,
  missingTitles: readonly string[]
): Result<string> {
  // Validation des entrées
  if (typeof originalContent !== 'string') {
    return {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        errors: ['Le contenu original doit être une chaîne']
      }
    };
  }

  if (missingTitles.length === 0) {
    return { success: true, data: originalContent };
  }

  try {
    // Générer toutes les sections avec validation
    const sectionResults = missingTitles.map(title => 
      generateSectionMarkdownSafe(title)
    );

    // Vérifier les erreurs
    const failures = sectionResults.filter(r => !r.success);
    if (failures.length > 0) {
      const allErrors = failures.flatMap(f => 
        f.success ? [] : (f.error.type === 'VALIDATION_ERROR' ? f.error.errors : [formatPluginError(f.error)])
      );
      
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: allErrors
        }
      };
    }

    // Concaténer les sections générées
    const sectionsToAdd = sectionResults
      .map(r => r.success ? r.data : '')
      .join('');

    // Construire le contenu final avec formatage cohérent
    const cleanedOriginal = originalContent.trimEnd();
    const separator = cleanedOriginal.length > 0 ? '\n\n' : '';
    const finalContent = cleanedOriginal + separator + sectionsToAdd;

    return { success: true, data: finalContent };
    
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'PARSING_ERROR',
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Version legacy pour compatibilité.
 * @deprecated Utiliser insertMissingSections() qui retourne un Result
 */
export function insertMissingSectionsLegacy(
  originalContent: string,
  missingTitles: readonly string[]
): string {
  const result = insertMissingSections(originalContent, missingTitles);
  if (!result.success) {
    throw new Error(`Erreur d'insertion: ${formatPluginError(result.error)}`);
  }
  return result.data;
}

/**
 * Valide qu'un contenu markdown contient toutes les sections requises.
 * Fonction pure avec validation complète et rapport détaillé.
 * @param content Contenu markdown à valider
 * @param requiredTitles Titres requis (normalisés automatiquement)
 * @returns Result avec la registry validée ou les erreurs détaillées
 * @example
 * ```typescript
 * const result = validateRequiredSections(content, ['Intro', 'Conclusion']);
 * if (result.success) {
 *   console.log('Sections validées:', Object.keys(result.data));
 * } else {
 *   console.log('Sections manquantes:', result.error.missingTitles);
 * }
 * ```
 */
export function validateRequiredSections(
  content: string,
  requiredTitles: readonly string[]
): Result<SectionRegistry, { missingTitles: string[]; invalidTitles: string[] }> {
  // Validation des entrées
  if (typeof content !== 'string') {
    return {
      success: false,
      error: {
        missingTitles: [...requiredTitles],
        invalidTitles: ['Contenu invalide']
      }
    };
  }

  if (requiredTitles.length === 0) {
    const parseResult = parseMarkdownSections(content);
    return parseResult.success 
      ? { success: true, data: parseResult.data }
      : {
          success: false,
          error: {
            missingTitles: [],
            invalidTitles: ['Erreur de parsing']
          }
        };
  }

  // Parser le contenu
  const parseResult = parseMarkdownSections(content);
  if (!parseResult.success) {
    return {
      success: false,
      error: {
        missingTitles: [...requiredTitles],
        invalidTitles: [`Erreur de parsing: ${formatPluginError(parseResult.error)}`]
      }
    };
  }

  const sections = parseResult.data;
  const existingTitles = Object.keys(sections);
  
  // Normalisation et filtrage des titres requis
  const { validTitles, invalidTitles } = categorizeRequiredTitles(requiredTitles);
  
  // Détection des titres manquants
  const missingTitles = validTitles.filter(
    title => !existingTitles.includes(title)
  );

  if (missingTitles.length > 0 || invalidTitles.length > 0) {
    return {
      success: false,
      error: { missingTitles, invalidTitles }
    };
  }

  return {
    success: true,
    data: sections
  };
}

/**
 * Catégorise les titres requis en valides et invalides.
 * @param requiredTitles Titres à catégoriser
 * @returns Titres validés et invalidés
 */
function categorizeRequiredTitles(requiredTitles: readonly string[]): {
  validTitles: string[];
  invalidTitles: string[];
} {
  const validTitles: string[] = [];
  const invalidTitles: string[] = [];

  requiredTitles.forEach(title => {
    if (typeof title === 'string' && title.trim().length > 0) {
      const normalizedTitle = title.trim();
      if (!normalizedTitle.includes('\n') && !normalizedTitle.includes('#')) {
        validTitles.push(normalizedTitle);
      } else {
        invalidTitles.push(`Titre invalide: "${title}"`);
      }
    } else {
      invalidTitles.push(`Titre vide ou invalide: "${title}"`);
    }
  });

  return { validTitles, invalidTitles };
}

/**
 * Crée un rapport de validation détaillé pour diagnostic.
 * @param content Contenu à analyser
 * @param requiredTitles Titres requis
 * @returns Rapport complet de validation
 */
export function createSectionValidationReport(
  content: string,
  requiredTitles: readonly string[]
): {
  isValid: boolean;
  totalSections: number;
  requiredSections: number;
  missingSections: string[];
  extraSections: string[];
  invalidTitles: string[];
  errors: string[];
} {
  const result = validateRequiredSections(content, requiredTitles);
  
  if (result.success) {
    const allSections = Object.keys(result.data);
    const { validTitles } = categorizeRequiredTitles(requiredTitles);
    const extraSections = allSections.filter(
      section => !validTitles.includes(section)
    );

    return {
      isValid: true,
      totalSections: allSections.length,
      requiredSections: validTitles.length,
      missingSections: [],
      extraSections,
      invalidTitles: [],
      errors: []
    };
  } else {
    return {
      isValid: false,
      totalSections: 0,
      requiredSections: requiredTitles.length,
      missingSections: result.error.missingTitles,
      extraSections: [],
      invalidTitles: result.error.invalidTitles,
      errors: result.error.invalidTitles
    };
  }
}

// === Fonctions avec effets de bord (interactions Obsidian) ===
// Ces fonctions interagissent avec le système de fichiers et ne sont pas pures

/**
 * Parse les sections d'un fichier Obsidian avec gestion d'erreur.
 * Fonction avec effet de bord qui interagit avec le système de fichiers.
 * @param app Instance Obsidian pour l'accès au vault
 * @param file Fichier Obsidian à parser
 * @returns Promise résolue avec la registry des sections
 * @throws {PluginError} En cas d'erreur de lecture ou de parsing
 */
export async function parseHeadingsInFile(
  app: App, 
  file: TFile
): Promise<SectionRegistry> {
  try {
    const content = await app.vault.read(file);
    const parseResult = parseMarkdownSections(content);
    
    if (!parseResult.success) {
      const error: PluginError = {
        type: 'PARSING_ERROR',
        details: formatPluginError(parseResult.error),
        filePath: file.path
      };
      throw new Error(formatPluginError(error));
    }
    
    return parseResult.data;
  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      // Déjà un PluginError, le relancer
      throw error;
    }
    
    // Wrapper les autres erreurs
    const pluginError: PluginError = {
      type: 'FILE_SYSTEM_ERROR',
      error: error instanceof Error ? error : new Error(String(error)),
      filePath: file.path,
      operation: 'read'
    };
    throw new Error(formatPluginError(pluginError));
  }
}

/**
 * Version sécurisée qui retourne un Result au lieu de lever une exception.
 * @param app Instance Obsidian
 * @param file Fichier à parser
 * @returns Promise avec Result contenant les sections ou l'erreur
 */
export async function parseHeadingsInFileSafe(
  app: App, 
  file: TFile
): Promise<Result<SectionRegistry>> {
  try {
    const sections = await parseHeadingsInFile(app, file);
    return { success: true, data: sections };
  } catch (error) {
    return {
      success: false,
      error: error as PluginError
    };
  }
}

/**
 * Insère une section dans un fichier si elle n'existe pas déjà.
 * Fonction avec effet de bord qui modifie le système de fichiers.
 * @param app Instance Obsidian pour l'accès au vault
 * @param file Fichier Obsidian à modifier
 * @param title Titre de la section à ajouter
 * @returns Promise résolue quand l'opération est terminée
 * @throws {PluginError} En cas d'erreur de lecture, validation ou écriture
 */
export async function insertSectionIfMissing(
  app: App, 
  file: TFile, 
  title: string
): Promise<void> {
  try {
    // Lecture du contenu actuel
    const content = await app.vault.read(file);
    
    // Vérification d'existence
    if (sectionExists(content, title)) {
      return; // Section déjà présente
    }

    // Insertion de la section manquante
    const insertResult = insertMissingSections(content, [title]);
    
    if (!insertResult.success) {
      const error: PluginError = {
        type: 'VALIDATION_ERROR',
        errors: insertResult.error.type === 'VALIDATION_ERROR' ? insertResult.error.errors : [formatPluginError(insertResult.error)],
        modelName: title
      };
      throw new Error(formatPluginError(error));
    }

    // Écriture du contenu modifié
    await app.vault.modify(file, insertResult.data);
    
  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      // Déjà un PluginError
      throw error;
    }
    
    // Wrapper les erreurs système
    const pluginError: PluginError = {
      type: 'FILE_SYSTEM_ERROR',
      error: error instanceof Error ? error : new Error(String(error)),
      filePath: file.path,
      operation: 'insert-section'
    };
    throw new Error(formatPluginError(pluginError));
  }
}

/**
 * Insère plusieurs sections manquantes dans un fichier.
 * Version batch pour améliorer les performances.
 * @param app Instance Obsidian
 * @param file Fichier à modifier
 * @param titles Titres des sections à ajouter
 * @returns Promise résolue avec le nombre de sections ajoutées
 * @throws {PluginError} En cas d'erreur
 */
export async function insertMissingSectionsInFile(
  app: App,
  file: TFile,
  titles: readonly string[]
): Promise<number> {
  if (titles.length === 0) {
    return 0;
  }

  try {
    const content = await app.vault.read(file);
    
    // Déterminer quelles sections sont réellement manquantes
    const existenceMap = sectionsExist(content, titles);
    const missingTitles = titles.filter(title => !existenceMap.get(title));
    
    if (missingTitles.length === 0) {
      return 0; // Aucune section à ajouter
    }

    // Insérer toutes les sections manquantes en une seule opération
    const insertResult = insertMissingSections(content, missingTitles);
    
    if (!insertResult.success) {
      const error: PluginError = {
        type: 'VALIDATION_ERROR',
        errors: insertResult.error.type === 'VALIDATION_ERROR' ? insertResult.error.errors : [formatPluginError(insertResult.error)],
      };
      throw new Error(formatPluginError(error));
    }

    await app.vault.modify(file, insertResult.data);
    return missingTitles.length;
    
  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    const pluginError: PluginError = {
      type: 'FILE_SYSTEM_ERROR',
      error: error instanceof Error ? error : new Error(String(error)),
      filePath: file.path,
      operation: 'insert-sections-batch'
    };
    throw new Error(formatPluginError(pluginError));
  }
}

/**
 * Version sécurisée d'insertion qui retourne un Result.
 * @param app Instance Obsidian
 * @param file Fichier à modifier
 * @param title Titre de la section
 * @returns Promise avec Result indiquant le succès
 */
export async function insertSectionIfMissingSafe(
  app: App,
  file: TFile,
  title: string
): Promise<Result<void>> {
  try {
    await insertSectionIfMissing(app, file, title);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error as PluginError
    };
  }
}
