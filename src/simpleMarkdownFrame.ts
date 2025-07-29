// src/simpleMarkdownFrame.ts
import { App, TFile, Component, MarkdownRenderer } from "obsidian";
import { SectionInfo } from "./sectionParser";
import { BaseUIComponent } from "./core/baseComponent";

/**
 * Frame markdown simplifié utilisant une architecture modulaire.
 * Gère l'affichage et l'édition de sections markdown dans un layout en grille.
 */
export class SimpleMarkdownFrame extends BaseUIComponent {
  private isEditing = false;
  private markdownContent: string;
  private component: Component;

  constructor(
    container: HTMLElement,
    private app: App,
    private file: TFile,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    super(container, app);
    this.markdownContent = this.section.lines.join('\n');
    this.component = new Component();
    
    // Enregistrer le component pour nettoyage automatique
    this.registerDisposable({
      dispose: () => this.component.unload()
    });
    
    this.initializeFrame();
  }

  /**
   * Initialise le frame avec le mode prévisualisation.
   */
  private async initializeFrame(): Promise<void> {
    this.setupContainer();
    await this.showPreviewMode();
  }

  /**
   * Configure le container principal.
   */
  private setupContainer(): void {
    if (!this.containerEl) return;
    
    this.containerEl.empty();
    this.containerEl.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    `;
  }

  /**
   * Affiche le mode prévisualisation.
   */
  private async showPreviewMode(): Promise<void> {
    
    // Nettoyer les composants existants
    this.cleanupComponents();

    // Rendu de prévisualisation avec support Dataview/Tasks
    if (this.containerEl) {
      this.containerEl.empty();
      this.containerEl.style.cssText = `
        width: 100%;
        height: 100%;
        overflow: auto;
        padding: 0.5rem;
        cursor: text;
        box-sizing: border-box;
      `;
      
      if (!this.markdownContent.trim()) {
        const placeholder = this.containerEl.createDiv();
        placeholder.textContent = "Cliquez pour commencer à écrire...";
        placeholder.style.cssText = `
          color: var(--text-muted);
          font-style: italic;
        `;
      } else {
        try {
          // Utiliser MarkdownRenderer d'Obsidian pour Dataview/Tasks
          await MarkdownRenderer.renderMarkdown(
            this.markdownContent,
            this.containerEl,
            this.file.path,
            this.component
          );
          
          // Configurer manuellement les liens après le rendu d'Obsidian
          this.setupInternalLinks();
          // Configurer spécifiquement les liens Dataview/Tasks
          this.setupDataviewTasksLinks();
          // Configurer la sauvegarde des checkboxes
          this.setupCheckboxHandlers();
          
        } catch (error) {
          console.warn('MarkdownRenderer failed, falling back to simple HTML:', error);
          // Fallback vers rendu simple
          this.containerEl.innerHTML = this.parseMarkdownToHTML(this.markdownContent);
          this.setupInternalLinks();
          this.setupDataviewTasksLinks();
          this.setupCheckboxHandlers();
        }
      }
      
      // Gestionnaire de clic pour passer en mode édition
      this.containerEl.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        
        // NOUVEAU: Gestionnaire universel de liens - vérifier si c'est un lien avant tout
        if (this.handleUniversalLink(target, e)) {
          return; // Le lien a été traité, ne pas continuer
        }
        
        // Vérifier tous les types d'éléments interactifs d'Obsidian
        if (target.tagName === 'A' || 
            target.tagName === 'BUTTON' || 
            target.tagName === 'INPUT' ||
            target.closest('a') || 
            target.closest('button') ||
            target.closest('input') ||
            target.classList.contains('dataview') ||
            target.closest('.dataview') ||
            target.closest('.block-language-dataview') ||
            target.closest('.dataview-result') ||
            target.closest('.tasks-layout') ||
            target.classList.contains('internal-link') ||
            target.classList.contains('external-link') ||
            target.classList.contains('tag') ||
            target.classList.contains('cm-link') ||
            target.classList.contains('file-embed') ||
            target.classList.contains('image-embed') ||
            target.classList.contains('task-list-item-checkbox') ||
            target.closest('.internal-link') ||
            target.closest('.external-link') ||
            target.closest('.tag') ||
            target.closest('.file-embed') ||
            target.closest('.image-embed') ||
            target.closest('.task-list-item-checkbox') ||
            target.getAttribute('data-href') ||
            target.closest('[data-href]')) {
          return; // Laisser les éléments interactifs fonctionner
        }
        
        this.enterEditMode();
      });
    }
    
    this.isEditing = false;
  }

  /**
   * Convertit le markdown en HTML simple.
   */
  private parseMarkdownToHTML(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
  }

  /**
   * Passe en mode édition.
   */
  private enterEditMode(): void {
    if (this.isEditing) {
        return;
    }

    // Convertir la grille CSS en positionnement absolu
    this.createDimensionPreservingWrapper();
    this.continueEnterEditMode();
  }
  
  /**
   * Continue le processus d'entrée en mode édition après verrouillage.
   */
  private continueEnterEditMode(): void {
    
    // Nettoyer les composants existants
    this.cleanupComponents();

    // Créer directement un textarea simple
    if (this.containerEl) {
      this.containerEl.empty();
      
      const textArea = this.containerEl.createEl('textarea');
      // Respecter la configuration de vérification orthographique d'Obsidian
      // @ts-ignore - accès aux paramètres internes d'Obsidian
      textArea.spellcheck = this.app.vault.config?.spellcheck ?? false;
      textArea.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        resize: none;
        font-family: var(--font-text);
        font-size: var(--font-size-normal);
        background: transparent;
        color: var(--text-normal);
        padding: 0.5rem;
        box-sizing: border-box;
        line-height: 1.6;
      `;
      
      textArea.value = this.markdownContent;
      
      // Focus immédiat
      textArea.focus();
      textArea.setSelectionRange(textArea.value.length, textArea.value.length);
      
      // Gestionnaires d'événements simples
      textArea.addEventListener('input', () => {
        this.markdownContent = textArea.value;
        this.onChange(this.markdownContent);
      });
      
      textArea.addEventListener('blur', () => {
        setTimeout(() => this.exitEditMode(), 100);
      });
      
      textArea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.exitEditMode();
        } else if (e.key === 'Enter') {
          this.handleEnterKey(e, textArea);
        }
      });
    }

    this.isEditing = true;
  }

  /**
   * Gère la touche Entrée pour continuer automatiquement les listes et checkboxes.
   */
  private handleEnterKey(e: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    const cursorPos = textArea.selectionStart;
    const value = textArea.value;
    
    // Trouver le début et la fin de la ligne actuelle
    const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineEnd = value.indexOf('\n', cursorPos);
    const currentLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
    
    // Patterns pour détecter les listes et checkboxes
    const checkboxPattern = /^(\s*)(- \[([ x])\] )(.*)$/;
    const listPattern = /^(\s*)(- )(.*)$/;
    const numberedListPattern = /^(\s*)(\d+\. )(.*)$/;
    
    const checkboxMatch = currentLine.match(checkboxPattern);
    const listMatch = currentLine.match(listPattern);
    const numberedMatch = currentLine.match(numberedListPattern);
    
    if (checkboxMatch) {
      // Ligne de checkbox (priorité sur liste simple)
      const [, indent, , , content] = checkboxMatch;
      
      if (!content.trim()) {
        // Ligne vide - supprimer la checkbox
        e.preventDefault();
        const before = value.substring(0, lineStart);
        const after = value.substring(lineEnd === -1 ? value.length : lineEnd);
        textArea.value = before + after;
        textArea.setSelectionRange(before.length, before.length);
      } else {
        // Continuer avec une nouvelle checkbox
        e.preventDefault();
        const newLine = `\n${indent}- [ ] `;
        const before = value.substring(0, cursorPos);
        const after = value.substring(cursorPos);
        textArea.value = before + newLine + after;
        const newPos = cursorPos + newLine.length;
        textArea.setSelectionRange(newPos, newPos);
      }
      
      this.markdownContent = textArea.value;
      this.onChange(this.markdownContent);
      
    } else if (listMatch) {
      // Ligne de liste simple
      const [, indent, marker, content] = listMatch;
      
      if (!content.trim()) {
        // Ligne vide - supprimer la liste
        e.preventDefault();
        const before = value.substring(0, lineStart);
        const after = value.substring(lineEnd === -1 ? value.length : lineEnd);
        textArea.value = before + after;
        textArea.setSelectionRange(before.length, before.length);
      } else {
        // Continuer la liste
        e.preventDefault();
        const newLine = `\n${indent}${marker}`;
        const before = value.substring(0, cursorPos);
        const after = value.substring(cursorPos);
        textArea.value = before + newLine + after;
        const newPos = cursorPos + newLine.length;
        textArea.setSelectionRange(newPos, newPos);
      }
      
      this.markdownContent = textArea.value;
      this.onChange(this.markdownContent);
      
    } else if (numberedMatch) {
      // Ligne de liste numérotée
      const [, indent, marker, content] = numberedMatch;
      const currentNumber = parseInt(marker);
      
      if (!content.trim()) {
        // Ligne vide - supprimer la liste
        e.preventDefault();
        const before = value.substring(0, lineStart);
        const after = value.substring(lineEnd === -1 ? value.length : lineEnd);
        textArea.value = before + after;
        textArea.setSelectionRange(before.length, before.length);
      } else {
        // Continuer avec le numéro suivant
        e.preventDefault();
        const nextNumber = currentNumber + 1;
        const newLine = `\n${indent}${nextNumber}. `;
        const before = value.substring(0, cursorPos);
        const after = value.substring(cursorPos);
        let newValue = before + newLine + after;
        
        // Renuméroter les lignes suivantes
        newValue = this.renumberFollowingListItems(newValue, cursorPos + newLine.length, indent, nextNumber);
        
        textArea.value = newValue;
        const newPos = cursorPos + newLine.length;
        textArea.setSelectionRange(newPos, newPos);
      }
      
      this.markdownContent = textArea.value;
      this.onChange(this.markdownContent);
    }
  }

  /**
   * Renumérotise les éléments de liste numérotée qui suivent la position donnée.
   * @param content Contenu du textarea
   * @param startPos Position où commencer la recherche
   * @param expectedIndent Indentation attendue pour la liste
   * @param startNumber Numéro à partir duquel commencer la renumérotation
   * @returns Contenu avec les numéros mis à jour
   */
  private renumberFollowingListItems(content: string, startPos: number, expectedIndent: string, startNumber: number): string {
    const lines = content.split('\n');
    let lineStartPos = 0;
    let currentLineIndex = 0;
    
    // Trouver l'index de ligne correspondant à startPos
    for (let i = 0; i < lines.length; i++) {
      if (lineStartPos + lines[i].length >= startPos) {
        currentLineIndex = i;
        break;
      }
      lineStartPos += lines[i].length + 1; // +1 pour le \n
    }
    
    let expectedNumber = startNumber + 1;
    
    // Parcourir les lignes suivantes et renuméroter
    for (let i = currentLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const numberedListPattern = new RegExp(`^(${expectedIndent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(\\d+\\. )(.*)$`);
      const match = line.match(numberedListPattern);
      
      if (match) {
        const [, indent, , content] = match;
        lines[i] = `${indent}${expectedNumber}. ${content}`;
        expectedNumber++;
      } else {
        // Si on trouve une ligne qui ne match pas le pattern, arrêter la renumérotation
        // (soit indentation différente, soit pas une liste numérotée)
        const otherIndentPattern = /^(\s*)(\d+\. )/;
        const otherMatch = line.match(otherIndentPattern);
        if (otherMatch && otherMatch[1] !== expectedIndent) {
          // Indentation différente, arrêter
          break;
        } else if (!line.trim() || line.startsWith(expectedIndent)) {
          // Ligne vide ou même indentation sans numéro, continuer
          continue;
        } else {
          // Autre contenu, arrêter
          break;
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Quitte le mode édition et retourne à la prévisualisation.
   */
  private async exitEditMode(): Promise<void> {
    if (!this.isEditing) {
      return;
    }

    await this.showPreviewMode();
    
    // Restaurer la grille CSS depuis le positionnement absolu
    this.removeDimensionPreservingWrapper();
  }


  /**
   * Convertit temporairement la grille CSS en positionnement absolu.
   */
  private createDimensionPreservingWrapper(): void {
    if (!this.containerEl) return;
    
    // Trouver le container de grille principal
    let gridContainer: HTMLElement | null = null;
    let currentElement = this.containerEl.parentElement;
    
    while (currentElement) {
      if (currentElement.classList.contains('agile-board-grid')) {
        gridContainer = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (!gridContainer) {
      console.warn('Could not find .agile-board-grid container');
      return;
    }
    
    // Éviter la double conversion
    if (gridContainer.hasAttribute('data-agile-converted')) {
      return;
    }
    
    
    // Sauvegarder le display original
    const originalDisplay = getComputedStyle(gridContainer).display;
    gridContainer.setAttribute('data-original-display', originalDisplay);
    
    // Capturer toutes les positions AVANT tout changement pour éviter les chevauchements
    const framePositions: Array<{element: HTMLElement, left: number, top: number, width: number, height: number}> = [];
    
    const allFrames = gridContainer.querySelectorAll('.agile-board-frame');
    allFrames.forEach((frame, index) => {
      const frameElement = frame as HTMLElement;
      const rect = frameElement.getBoundingClientRect();
      const containerRect = gridContainer!.getBoundingClientRect();
      
      // Calculer la position relative au container
      const left = rect.left - containerRect.left;
      const top = rect.top - containerRect.top;
      
      framePositions.push({
        element: frameElement,
        left,
        top,
        width: rect.width,
        height: rect.height
      });
      
    });
    
    // Maintenant appliquer les positions capturées
    framePositions.forEach((pos, index) => {
      const frameElement = pos.element;
      
      // Sauvegarder les styles originaux
      frameElement.setAttribute('data-original-position', frameElement.style.position || 'static');
      frameElement.setAttribute('data-original-left', frameElement.style.left || '');
      frameElement.setAttribute('data-original-top', frameElement.style.top || '');
      frameElement.setAttribute('data-original-width', frameElement.style.width || '');
      frameElement.setAttribute('data-original-height', frameElement.style.height || '');
      frameElement.setAttribute('data-original-grid-column', frameElement.style.gridColumn || '');
      frameElement.setAttribute('data-original-grid-row', frameElement.style.gridRow || '');
      
      // Appliquer le positionnement absolu avec les positions capturées
      frameElement.style.position = 'absolute';
      frameElement.style.left = pos.left + 'px';
      frameElement.style.top = pos.top + 'px';
      frameElement.style.width = pos.width + 'px';
      frameElement.style.height = pos.height + 'px';
      frameElement.style.gridColumn = 'unset';
      frameElement.style.gridRow = 'unset';
      frameElement.style.zIndex = '1'; // Assurer que tous les frames sont au même niveau
      
    });
    
    // Changer le container en block et le rendre relatif
    gridContainer.style.display = 'block';
    gridContainer.style.position = 'relative';
    gridContainer.setAttribute('data-agile-converted', 'true');
    
  }

  /**
   * Restaure la grille CSS depuis le positionnement absolu.
   */
  private removeDimensionPreservingWrapper(): void {
    
    // Trouver le container converti
    const gridContainer = document.querySelector('[data-agile-converted]') as HTMLElement;
    if (!gridContainer) {
      return;
    }
    
    // Restaurer tous les frames
    const allFrames = gridContainer.querySelectorAll('.agile-board-frame');
    allFrames.forEach((frame, index) => {
      const frameElement = frame as HTMLElement;
      
      
      // Restaurer les styles originaux
      frameElement.style.position = frameElement.getAttribute('data-original-position') || '';
      frameElement.style.left = frameElement.getAttribute('data-original-left') || '';
      frameElement.style.top = frameElement.getAttribute('data-original-top') || '';
      frameElement.style.width = frameElement.getAttribute('data-original-width') || '';
      frameElement.style.height = frameElement.getAttribute('data-original-height') || '';
      frameElement.style.gridColumn = frameElement.getAttribute('data-original-grid-column') || '';
      frameElement.style.gridRow = frameElement.getAttribute('data-original-grid-row') || '';
      frameElement.style.zIndex = ''; // Retirer le z-index
      
      // Supprimer les attributs de sauvegarde
      frameElement.removeAttribute('data-original-position');
      frameElement.removeAttribute('data-original-left');
      frameElement.removeAttribute('data-original-top');
      frameElement.removeAttribute('data-original-width');
      frameElement.removeAttribute('data-original-height');
      frameElement.removeAttribute('data-original-grid-column');
      frameElement.removeAttribute('data-original-grid-row');
    });
    
    // Restaurer le container de grille
    const originalDisplay = gridContainer.getAttribute('data-original-display') || 'grid';
    gridContainer.style.display = originalDisplay;
    gridContainer.style.position = '';
    gridContainer.removeAttribute('data-agile-converted');
    gridContainer.removeAttribute('data-original-display');
    
  }


  /**
   * Configure les liens internes pour qu'ils fonctionnent correctement.
   */
  private setupInternalLinks(): void {
    if (!this.containerEl) return;
    
    // Trouver tous les liens internes dans le contenu rendu (A et SPAN)
    const internalLinks = this.containerEl.querySelectorAll('a[data-href], a.internal-link, a[href^="#"], span[data-href], span.internal-link');
    
    internalLinks.forEach(link => {
      const linkElement = link as HTMLAnchorElement;
      
      // Éviter de dupliquer les gestionnaires
      if (linkElement.dataset.agileLinkSetup === 'true') {
        return;
      }
      
      linkElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Récupérer le lien depuis différents attributs possibles
        const href = linkElement.getAttribute('data-href') || 
                    linkElement.getAttribute('href') || 
                    linkElement.textContent;
        
        if (href && href !== '#') {
          // Utiliser l'API d'Obsidian pour ouvrir le lien
          this.app.workspace.openLinkText(href, this.file.path);
        }
      });
      
      // Marquer comme configuré
      linkElement.dataset.agileLinkSetup = 'true';
    });
    
  }

  /**
   * Configure spécifiquement les liens dans les blocs Dataview et Tasks.
   */
  private setupDataviewTasksLinks(): void {
    if (!this.containerEl) return;
    
    // Sélecteurs pour les liens dans Dataview et Tasks - version étendue
    const dataviewTasksSelectors = [
      '.dataview a',
      '.block-language-dataview a', 
      '.dataview-result a',
      '.tasks-layout a',
      '.task-list-item a',
      '[data-task] a',
      // Sélecteurs plus génériques pour capturer tous les liens dans les blocs
      '.dataview-list-item a',
      '.dataview-table a',
      '.dataview span[data-href]', // Liens avec data-href
      '.block-language-dataview span[data-href]',
      '.tasks-layout span[data-href]'
    ];
    
    let totalLinks = 0;
    
    dataviewTasksSelectors.forEach(selector => {
      const links = this.containerEl!.querySelectorAll(selector);
      
      links.forEach(link => {
        const linkElement = link as HTMLAnchorElement;
        
        // Éviter de dupliquer les gestionnaires
        if (linkElement.dataset.agileDataviewSetup === 'true') {
          return;
        }
        
        linkElement.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Récupérer le lien depuis différents attributs possibles
          const href = linkElement.getAttribute('data-href') || 
                      linkElement.getAttribute('href') || 
                      linkElement.textContent;
          
          if (href && href !== '#') {
            
            // Nettoyer le href s'il contient des caractères spéciaux de Dataview
            let cleanHref = href.replace(/^\[\[|\]\]$/g, ''); // Enlever [[ ]]
            cleanHref = cleanHref.split('|')[0]; // Prendre seulement la partie avant |
            
            // Utiliser l'API d'Obsidian pour ouvrir le lien
            this.app.workspace.openLinkText(cleanHref, this.file.path);
          }
        });
        
        // Marquer comme configuré
        linkElement.dataset.agileDataviewSetup = 'true';
        totalLinks++;
      });
    });
    
    
    // Configuration additionnelle : TOUS les éléments avec data-href
    const allDataHrefElements = this.containerEl.querySelectorAll('[data-href]');
    allDataHrefElements.forEach(element => {
      const el = element as HTMLElement;
      
      // Skip si déjà configuré
      if (el.dataset.agileGenericSetup === 'true') {
        return;
      }
      
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const href = el.getAttribute('data-href');
        if (href) {
          
          // Nettoyer le href
          let cleanHref = href.replace(/^\[\[|\]\]$/g, '');
          cleanHref = cleanHref.split('|')[0];
          
          this.app.workspace.openLinkText(cleanHref, this.file.path);
        }
      });
      
      el.dataset.agileGenericSetup = 'true';
    });
    
  }

  /**
   * Gestionnaire universel de liens - analyse chaque clic pour détecter les liens.
   */
  private handleUniversalLink(target: HTMLElement, event: MouseEvent): boolean {
    // Parcourir l'élément cliqué et ses parents pour trouver un lien
    let currentElement: HTMLElement | null = target;
    let depth = 0;
    
    while (currentElement && depth < 5) {
      // Vérifier si l'élément actuel est un lien
      const linkInfo = this.extractLinkInfo(currentElement);
      if (linkInfo) {
        event.preventDefault();
        event.stopPropagation();
        
        // Ouvrir le lien
        this.app.workspace.openLinkText(linkInfo.href, this.file.path);
        return true; // Lien traité
      }
      
      currentElement = currentElement.parentElement;
      depth++;
    }
    
    return false; // Pas un lien
  }

  /**
   * Extrait les informations de lien d'un élément.
   */
  private extractLinkInfo(element: HTMLElement): { href: string } | null {
    // 1. Tag A avec href ou data-href
    if (element.tagName === 'A') {
      const href = element.getAttribute('data-href') || 
                  element.getAttribute('href') || 
                  element.textContent;
      if (href && href !== '#') {
        return { href: this.cleanHref(href) };
      }
    }
    
    // 2. SPAN avec data-href (Dataview/Tasks)
    if (element.tagName === 'SPAN' && element.getAttribute('data-href')) {
      const href = element.getAttribute('data-href');
      if (href) {
        return { href: this.cleanHref(href) };
      }
    }
    
    // 3. Élément avec classe internal-link et texte
    if (element.classList.contains('internal-link')) {
      const href = element.getAttribute('data-href') || 
                  element.textContent;
      if (href) {
        return { href: this.cleanHref(href) };
      }
    }
    
    // 4. Dans un contexte Dataview/Tasks, vérifier le texte pour des noms de fichiers
    if (element.closest('.dataview') || element.closest('.tasks-layout')) {
      const text = element.textContent?.trim();
      if (text && this.looksLikeFileName(text)) {
        return { href: this.cleanHref(text) };
      }
    }
    
    return null;
  }

  /**
   * Nettoie un href de ses caractères spéciaux.
   */
  private cleanHref(href: string): string {
    return href.replace(/^\[\[|\]\]$/g, '') // Enlever [[ ]]
               .split('|')[0]               // Prendre seulement la partie avant |
               .trim();
  }

  /**
   * Détermine si un texte ressemble à un nom de fichier.
   */
  private looksLikeFileName(text: string): boolean {
    // Heuristiques pour détecter les noms de fichiers
    return text.length > 0 && 
           text.length < 200 && 
           !text.includes('\n') &&
           (text.includes(' ') || // Nom avec espaces
            /^[A-Z]/.test(text) || // Commence par majuscule
            /\w+/.test(text));     // Contient des mots
  }

  /**
   * Configure la sauvegarde automatique des changements de checkbox.
   */
  private setupCheckboxHandlers(): void {
    if (!this.containerEl) return;
    
    // Trouver toutes les checkboxes de tâches
    const checkboxes = this.containerEl.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
      const checkboxElement = checkbox as HTMLInputElement;
      
      // Éviter de dupliquer les gestionnaires
      if (checkboxElement.dataset.agileCheckboxSetup === 'true') {
        return;
      }
      
      checkboxElement.addEventListener('change', (e) => {
        e.stopPropagation();
        
        // Sauvegarder immédiatement le changement
        this.saveCheckboxChange();
      });
      
      // Marquer comme configuré
      checkboxElement.dataset.agileCheckboxSetup = 'true';
    });
    
  }

  /**
   * Sauvegarde les changements de checkbox dans le contenu markdown.
   */
  private saveCheckboxChange(): void {
    if (!this.containerEl) return;
    
    // Récupérer l'état actuel de toutes les checkboxes
    const checkboxes = this.containerEl.querySelectorAll('input[type="checkbox"]');
    
    // Mettre à jour le contenu markdown en fonction de l'état des checkboxes
    let updatedContent = this.markdownContent;
    let checkboxIndex = 0;
    
    // Remplacer les checkbox dans le markdown selon leur état actuel
    updatedContent = updatedContent.replace(/- \[([ x])\]/g, (match, current) => {
      if (checkboxIndex < checkboxes.length) {
        const checkbox = checkboxes[checkboxIndex] as HTMLInputElement;
        const newState = checkbox.checked ? 'x' : ' ';
        checkboxIndex++;
        return `- [${newState}]`;
      }
      return match;
    });
    
    // Mettre à jour le contenu et notifier le changement
    this.markdownContent = updatedContent;
    this.onChange(this.markdownContent);
    
    // Re-rendre le contenu pour appliquer les styles du thème
    this.refreshPreview();
    
  }

  /**
   * Re-rend le contenu en mode prévisualisation pour appliquer les styles.
   */
  private async refreshPreview(): Promise<void> {
    if (this.isEditing || !this.containerEl) return;
    
    
    // Sauvegarder l'état de scroll avant le re-rendu
    const scrollTop = this.containerEl.scrollTop;
    
    // Re-rendre le contenu
    await this.showPreviewMode();
    
    // Restaurer la position de scroll
    this.containerEl.scrollTop = scrollTop;
  }

  /**
   * Nettoie les composants actifs.
   */
  private cleanupComponents(): void {
    // Nettoyage simple
    this.containerEl?.empty();
  }

  /**
   * Met à jour le contenu du frame.
   */
  async updateContent(newContent: string): Promise<void> {
    this.markdownContent = newContent;

    if (!this.isEditing) {
      await this.showPreviewMode();
    }
  }

  /**
   * Retourne le contenu actuel.
   */
  getContent(): string {
    return this.markdownContent;
  }

  /**
   * Force l'entrée en mode édition.
   */
  startEditing(): void {
    this.enterEditMode();
  }

  /**
   * Vérifie si le frame est en mode édition.
   */
  isEditMode(): boolean {
    return this.isEditing;
  }

  /**
   * Obtient le titre de la section.
   */
  getSectionTitle(): string {
    return this.section.title;
  }

  /**
   * Met le focus sur l'éditeur si en mode édition.
   */
  focus(): void {
    if (this.isEditing && this.containerEl) {
      const textArea = this.containerEl.querySelector('textarea');
      if (textArea) {
        textArea.focus();
      }
    }
  }

  protected doLoad(): void {
    // Déjà initialisé dans le constructeur
  }

  protected doUnload(): void {
    // Supprimer le wrapper si nécessaire
    this.removeDimensionPreservingWrapper();
    this.cleanupComponents();
  }
}