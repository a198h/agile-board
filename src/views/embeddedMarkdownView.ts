// src/embeddedMarkdownView.ts
import { App, TFile, Component, WorkspaceLeaf } from "obsidian";
import { SectionInfo } from "../core/parsers/sectionParser";
import { debounce } from "ts-debounce";
import { createContextLogger } from "../core/logger";

export class EmbeddedMarkdownView {
  private component: Component;
  private debouncedOnChange: (content: string) => void;
  private isUpdating = false;
  private tempFile: TFile | null = null;
  private tempLeaf: WorkspaceLeaf | null = null;
  private readonly logger = createContextLogger('EmbeddedMarkdownView');

  constructor(
    private app: App,
    private container: HTMLElement,
    private sourceFile: TFile,
    private sectionTitle: string,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    this.component = new Component();
    const debouncedFn = debounce((content: string) => {
      void this.onChange(content);
    }, 300);
    this.debouncedOnChange = (content: string) => {
      void debouncedFn(content);
    };

    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Créer un fichier temporaire pour cette section
      await this.createTemporaryFile();
      
      // Créer une leaf et ouvrir le fichier dedans
      await this.createEmbeddedLeaf();
      
      // Configurer la synchronisation
      this.setupSynchronization();
      
    } catch (error) {
      this.logger.error(`Erreur initialisation EmbeddedMarkdownView pour ${this.sectionTitle}:`, error);
      this.renderFallback();
    }
  }

  private async createTemporaryFile(): Promise<void> {
    const sectionContent = this.section.lines.join('\n');
    const tempFileName = `.agile-board-temp-${this.sectionTitle}-${Date.now()}.md`;
    
    // Créer le fichier temporaire dans le dossier du plugin
    try {
      this.tempFile = await this.app.vault.create(tempFileName, sectionContent);
    } catch (error) {
      this.logger.error(`Erreur création fichier temporaire pour ${this.sectionTitle}:`, error);
      throw error;
    }
  }

  private async createEmbeddedLeaf(): Promise<void> {
    if (!this.tempFile) return;

    // Préparer le container pour la leaf
    this.container.empty();
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      overflow: hidden;
    `;

    // Créer une nouvelle leaf dans le container
    // Approche : utiliser l'API workspace pour créer une leaf "détachée"
    const workspace = this.app.workspace;
    
    // Créer un div qui agira comme container pour la leaf
    const leafContainer = this.container.createDiv();
    leafContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;

    try {
      // Ouvrir le fichier temporaire dans une nouvelle leaf
      this.tempLeaf = workspace.getLeaf('tab');
      
      // Modifier le container de la leaf pour qu'elle s'affiche dans notre div
      if (this.tempLeaf) {
        // Approche différente : on ne peut pas modifier containerEl directement
        // On va utiliser le DOM pour déplacer le contenu
        
        // Ouvrir le fichier temporaire
        await this.tempLeaf.openFile(this.tempFile);
        
        // Forcer le mode Live Preview
        const view = this.tempLeaf.view;
        if (view && 'setState' in view) {
          await (view as unknown as { setState: (state: unknown, result: unknown) => Promise<void> }).setState({
            mode: 'source',
            source: false // Live Preview
          }, {});
        }
        
      }
    } catch (error) {
      this.logger.error(`Erreur création leaf pour ${this.sectionTitle}:`, error);
      throw error;
    }
  }

  private setupSynchronization(): void {
    if (!this.tempFile) return;

    // Écouter les changements du fichier temporaire
    const fileModifiedHandler = (file: TFile) => {
      if (file.path === this.tempFile?.path && !this.isUpdating) {
        void this.syncToSourceFile();
      }
    };

    this.app.vault.on('modify', fileModifiedHandler);
    
    // Nettoyer l'event listener quand on détruit la vue
    this.component.registerEvent(
      this.app.vault.on('modify', fileModifiedHandler)
    );
  }

  private async syncToSourceFile(): Promise<void> {
    if (!this.tempFile) return;

    try {
      const tempContent = await this.app.vault.read(this.tempFile);
      this.debouncedOnChange(tempContent);
    } catch (error) {
      this.logger.error(`Erreur synchronisation pour ${this.sectionTitle}:`, error);
    }
  }

  private renderFallback(): void {
    this.container.empty();
    
    const fallbackEl = this.container.createDiv('markdown-fallback');
    fallbackEl.style.cssText = `
      padding: 1rem;
      border: 1px dashed var(--text-error);
      border-radius: 4px;
      background: var(--background-secondary);
      color: var(--text-error);
    `;
    
    fallbackEl.createEl('h4').textContent = `❌ Erreur: ${this.sectionTitle}`;
    fallbackEl.createEl('p').textContent = 'Impossible de créer la vue embarquée. Utilisation du mode dégradé.';
    
    const content = fallbackEl.createEl('pre');
    content.textContent = this.section.lines.join('\n');
    content.style.cssText = `
      white-space: pre-wrap;
      margin-top: 1rem;
      padding: 0.5rem;
      background: var(--background-primary);
      border-radius: 4px;
    `;
  }

  // Méthode pour mettre à jour le contenu depuis l'extérieur
  async updateContent(newSection: SectionInfo): Promise<void> {
    this.section = newSection;
    
    if (this.tempFile) {
      this.isUpdating = true;
      
      try {
        const newContent = newSection.lines.join('\n');
        await this.app.vault.modify(this.tempFile, newContent);
      } finally {
        // Délai pour éviter les conflits de synchronisation
        setTimeout(() => {
          this.isUpdating = false;
        }, 100);
      }
    }
  }

  // Méthode pour obtenir le contenu actuel
  async getContent(): Promise<string> {
    if (this.tempFile) {
      try {
        return await this.app.vault.read(this.tempFile);
      } catch (error) {
        this.logger.error(`Erreur lecture fichier temporaire pour ${this.sectionTitle}:`, error);
      }
    }
    return this.section.lines.join('\n');
  }

  // Méthode pour nettoyer la vue
  async destroy(): Promise<void> {
    // Fermer et nettoyer la leaf
    if (this.tempLeaf) {
      this.tempLeaf.detach();
      this.tempLeaf = null;
    }
    
    // Supprimer le fichier temporaire
    if (this.tempFile) {
      try {
        await this.app.fileManager.trashFile(this.tempFile);
      } catch (error) {
        this.logger.error(`Erreur suppression fichier temporaire pour ${this.sectionTitle}:`, error);
      }
      this.tempFile = null;
    }
    
    // Nettoyer le component
    this.component.unload();
    
    // Nettoyer le container
    this.container.empty();
    
    this.logger.debug('EmbeddedMarkdownView détruite pour:', this.sectionTitle);
  }
}