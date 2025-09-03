// src/core/layout/layoutDownloader.ts
import { Plugin, requestUrl, Notice } from "obsidian";
import { Result, PluginError } from "../../types";
import { createContextLogger } from "../logger";

/**
 * Service de téléchargement automatique des layouts par défaut depuis GitHub.
 * Utilisé pour BRAT et les installations qui ne peuvent pas inclure le dossier layouts.
 * 
 * Architecture:
 * 1. Vérification de l'existence des layouts par défaut
 * 2. Téléchargement depuis GitHub release si manquants
 * 3. Extraction automatique dans le bon dossier
 * 4. Gestion d'erreur gracieuse avec fallback
 * 
 * @example
 * ```typescript
 * const downloader = new LayoutDownloader(plugin);
 * await downloader.ensureDefaultLayouts();
 * ```
 */
export class LayoutDownloader {
  private readonly logger = createContextLogger('LayoutDownloader');
  private readonly GITHUB_REPO = 'a198h/agile-board';
  private readonly LAYOUTS_FILENAME = 'layouts.zip';
  
  // Layouts par défaut attendus
  private readonly DEFAULT_LAYOUTS = [
    'eisenhower.json',
    'swot.json', 
    'moscow.json',
    'effort_impact.json',
    'cornell.json',
    'today.json'
  ] as const;

  constructor(private readonly plugin: Plugin) {}

  /**
   * S'assure que tous les layouts par défaut sont disponibles.
   * Télécharge automatiquement si nécessaire.
   * @returns Result indiquant le succès de l'opération
   */
  async ensureDefaultLayouts(): Promise<Result<void>> {
    try {
      // Étape 1: Vérifier l'existence des layouts
      const checkResult = await this.checkDefaultLayouts();
      
      if (checkResult.allPresent) {
        this.logger.debug(`Tous les layouts par défaut sont présents (${checkResult.foundCount}/${this.DEFAULT_LAYOUTS.length})`);
        return { success: true, data: undefined };
      }

      this.logger.info(`Layouts manquants détectés (${checkResult.foundCount}/${this.DEFAULT_LAYOUTS.length}). Téléchargement automatique...`);
      
      // Étape 2: Télécharger et installer
      const downloadResult = await this.downloadAndInstallLayouts();
      
      if (!downloadResult.success) {
        // Fallback: créer des layouts basiques
        this.logger.warn('Téléchargement échoué, création de layouts de fallback');
        return this.createFallbackLayouts();
      }

      this.logger.info('Layouts par défaut installés avec succès via téléchargement automatique');
      return { success: true, data: undefined };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'INITIALIZATION_ERROR',
          component: 'LayoutDownloader',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Vérifie la présence des layouts par défaut.
   * @returns Résultat de la vérification avec compteurs
   */
  private async checkDefaultLayouts(): Promise<{
    allPresent: boolean;
    foundCount: number;
    missingLayouts: string[];
  }> {
    const layoutsPath = this.getLayoutsPath();
    const missingLayouts: string[] = [];
    let foundCount = 0;

    for (const layoutFile of this.DEFAULT_LAYOUTS) {
      const fullPath = `${layoutsPath}/${layoutFile}`;
      
      if (await this.plugin.app.vault.adapter.exists(fullPath)) {
        foundCount++;
      } else {
        missingLayouts.push(layoutFile);
      }
    }

    return {
      allPresent: missingLayouts.length === 0,
      foundCount,
      missingLayouts
    };
  }

  /**
   * Télécharge et installe les layouts depuis GitHub release.
   * @returns Result de l'opération de téléchargement
   */
  private async downloadAndInstallLayouts(): Promise<Result<void>> {
    try {
      // Étape 1: Obtenir la version courante depuis manifest
      const currentVersion = this.plugin.manifest.version;
      const downloadUrl = `https://github.com/${this.GITHUB_REPO}/releases/download/${currentVersion}/${this.LAYOUTS_FILENAME}`;
      
      this.logger.debug(`Téléchargement depuis: ${downloadUrl}`);
      
      // Étape 2: Télécharger le fichier zip
      const response = await requestUrl({
        url: downloadUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Obsidian-Agile-Board-Plugin'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.text}`);
      }

      // Étape 3: Sauvegarder le zip temporairement
      const zipPath = `${this.getPluginPath()}/layouts-temp.zip`;
      await this.plugin.app.vault.adapter.writeBinary(zipPath, response.arrayBuffer);

      // Étape 4: Extraire (simulation - Obsidian ne supporte pas zip nativement)
      // On va plutôt télécharger les fichiers individuellement
      await this.downloadIndividualLayouts(currentVersion);
      
      // Nettoyer le fichier temporaire
      if (await this.plugin.app.vault.adapter.exists(zipPath)) {
        await this.plugin.app.vault.adapter.remove(zipPath);
      }

      return { success: true, data: undefined };

    } catch (error) {
      this.logger.error('Erreur lors du téléchargement des layouts', error);
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : String(error),
          url: `https://github.com/${this.GITHUB_REPO}/releases`
        }
      };
    }
  }

  /**
   * Télécharge les fichiers de layouts individuellement depuis GitHub.
   * Plus fiable que l'extraction zip dans l'environnement Obsidian.
   * @param version Version de release à télécharger
   */
  private async downloadIndividualLayouts(version: string): Promise<void> {
    const layoutsPath = this.getLayoutsPath();
    
    // S'assurer que le dossier layouts existe
    if (!await this.plugin.app.vault.adapter.exists(layoutsPath)) {
      await this.plugin.app.vault.adapter.mkdir(layoutsPath);
    }

    for (const layoutFile of this.DEFAULT_LAYOUTS) {
      try {
        const fileUrl = `https://raw.githubusercontent.com/${this.GITHUB_REPO}/main/layouts/${layoutFile}`;
        
        const response = await requestUrl({
          url: fileUrl,
          method: 'GET',
          headers: {
            'User-Agent': 'Obsidian-Agile-Board-Plugin'
          }
        });

        if (response.status === 200) {
          const filePath = `${layoutsPath}/${layoutFile}`;
          await this.plugin.app.vault.adapter.write(filePath, response.text);
          this.logger.debug(`Layout téléchargé: ${layoutFile}`);
        }
        
      } catch (error) {
        this.logger.warn(`Impossible de télécharger ${layoutFile}:`, error);
        // Continuer avec les autres fichiers
      }
    }
  }

  /**
   * Crée des layouts de fallback basiques si le téléchargement échoue.
   * @returns Result de la création de fallback
   */
  private async createFallbackLayouts(): Promise<Result<void>> {
    try {
      const layoutsPath = this.getLayoutsPath();
      
      // S'assurer que le dossier existe
      if (!await this.plugin.app.vault.adapter.exists(layoutsPath)) {
        await this.plugin.app.vault.adapter.mkdir(layoutsPath);
      }

      // Layout Eisenhower minimal
      const eisenhowerLayout = [
        { "title": "Urgent et Important", "x": 0, "y": 0, "w": 12, "h": 12 },
        { "title": "Important, Non Urgent", "x": 12, "y": 0, "w": 12, "h": 12 },
        { "title": "Urgent, Non Important", "x": 0, "y": 12, "w": 12, "h": 12 },
        { "title": "Non Urgent, Non Important", "x": 12, "y": 12, "w": 12, "h": 12 }
      ];

      const eisenhowerPath = `${layoutsPath}/eisenhower.json`;
      await this.plugin.app.vault.adapter.write(
        eisenhowerPath, 
        JSON.stringify(eisenhowerLayout, null, 2)
      );

      // Notifier l'utilisateur
      new Notice('Agile Board: Layout de base créé. Téléchargement complet échoué, mais fonctionnalité de base disponible.', 5000);
      
      this.logger.info('Layout de fallback Eisenhower créé');
      return { success: true, data: undefined };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'FILE_SYSTEM_ERROR',
          error: error instanceof Error ? error : new Error(String(error)),
          operation: 'createFallbackLayouts'
        }
      };
    }
  }

  /**
   * Retourne le chemin du dossier layouts.
   * @returns Chemin absolu vers le dossier layouts
   */
  private getLayoutsPath(): string {
    return `${this.getPluginPath()}/layouts`;
  }

  /**
   * Retourne le chemin du plugin.
   * @returns Chemin absolu vers le dossier du plugin
   */
  private getPluginPath(): string {
    // @ts-ignore - accès aux propriétés internes d'Obsidian
    return `${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;
  }
}