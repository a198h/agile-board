// src/components/markdown/LinkHandler.ts
import { App, TFile } from "obsidian";

/**
 * Composant responsable de la gestion des liens internes et externes.
 * Gère les liens Obsidian, Dataview et Tasks.
 */
export class LinkHandler {
  constructor(
    private app: App,
    private file: TFile,
    private container: HTMLElement
  ) {}

  /**
   * Configure tous les types de liens dans le container.
   */
  setupAllLinks(): void {
    this.setupInternalLinks();
    this.setupDataviewTasksLinks();
    this.setupUniversalLinkHandler();
  }

  /**
   * Configure les liens internes pour qu'ils fonctionnent correctement.
   */
  private setupInternalLinks(): void {
    const internalLinks = this.container.querySelectorAll('a[data-href], a.internal-link, a[href^="#"], span[data-href], span.internal-link');
    
    internalLinks.forEach(link => {
      const linkElement = link as HTMLAnchorElement;
      
      if (linkElement.dataset.agileLinkSetup === 'true') {
        return;
      }
      
      linkElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const href = linkElement.getAttribute('data-href') || 
                    linkElement.getAttribute('href') || 
                    linkElement.textContent;
        
        if (href && href !== '#') {
          this.app.workspace.openLinkText(href, this.file.path);
        }
      });
      
      linkElement.dataset.agileLinkSetup = 'true';
    });
  }

  /**
   * Configure spécifiquement les liens dans les blocs Dataview et Tasks.
   */
  private setupDataviewTasksLinks(): void {
    const dataviewTasksSelectors = [
      '.dataview a',
      '.block-language-dataview a', 
      '.dataview-result a',
      '.tasks-layout a',
      '.task-list-item a',
      '[data-task] a',
      '.dataview-list-item a',
      '.dataview-table a',
      '.dataview span[data-href]',
      '.block-language-dataview span[data-href]',
      '.tasks-layout span[data-href]'
    ];
    
    dataviewTasksSelectors.forEach(selector => {
      const links = this.container.querySelectorAll(selector);
      
      links.forEach(link => {
        const linkElement = link as HTMLAnchorElement;
        
        if (linkElement.dataset.agileDataviewSetup === 'true') {
          return;
        }
        
        linkElement.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const href = linkElement.getAttribute('data-href') || 
                      linkElement.getAttribute('href') || 
                      linkElement.textContent;
          
          if (href && href !== '#') {
            const cleanHref = this.cleanHref(href);
            this.app.workspace.openLinkText(cleanHref, this.file.path);
          }
        });
        
        linkElement.dataset.agileDataviewSetup = 'true';
      });
    });
    
    // Configuration additionnelle : TOUS les éléments avec data-href
    const allDataHrefElements = this.container.querySelectorAll('[data-href]');
    allDataHrefElements.forEach(element => {
      const el = element as HTMLElement;
      
      if (el.dataset.agileGenericSetup === 'true') {
        return;
      }
      
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const href = el.getAttribute('data-href');
        if (href) {
          const cleanHref = this.cleanHref(href);
          this.app.workspace.openLinkText(cleanHref, this.file.path);
        }
      });
      
      el.dataset.agileGenericSetup = 'true';
    });
  }

  /**
   * Configure un gestionnaire universel pour détecter tous les liens.
   */
  private setupUniversalLinkHandler(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (this.handleUniversalLink(target, e)) {
        return;
      }
    });
  }

  /**
   * Gestionnaire universel de liens - analyse chaque clic pour détecter les liens.
   */
  private handleUniversalLink(target: HTMLElement, event: MouseEvent): boolean {
    // Vérifier si c'est l'icône de lien Tasks 🔗
    if (this.isTasksLinkIcon(target)) {
      return false; // Laisser Tasks gérer le clic
    }
    
    let currentElement: HTMLElement | null = target;
    let depth = 0;
    
    while (currentElement && depth < 5) {
      // Vérifier si l'élément actuel est l'icône de lien Tasks
      if (this.isTasksLinkIcon(currentElement)) {
        return false; // Laisser Tasks gérer le clic
      }
      
      const linkInfo = this.extractLinkInfo(currentElement);
      if (linkInfo) {
        event.preventDefault();
        event.stopPropagation();
        
        this.app.workspace.openLinkText(linkInfo.href, this.file.path);
        return true;
      }
      
      currentElement = currentElement.parentElement;
      depth++;
    }
    
    return false;
  }

  /**
   * Extrait les informations de lien d'un élément.
   */
  private extractLinkInfo(element: HTMLElement): { href: string } | null {
    // Tag A avec href ou data-href
    if (element.tagName === 'A') {
      const href = element.getAttribute('data-href') || 
                  element.getAttribute('href') || 
                  element.textContent;
      if (href && href !== '#') {
        return { href: this.cleanHref(href) };
      }
    }
    
    // SPAN avec data-href (Dataview/Tasks)
    if (element.tagName === 'SPAN' && element.getAttribute('data-href')) {
      const href = element.getAttribute('data-href');
      if (href) {
        return { href: this.cleanHref(href) };
      }
    }
    
    // Élément avec classe internal-link et texte
    if (element.classList.contains('internal-link')) {
      const href = element.getAttribute('data-href') || 
                  element.textContent;
      if (href) {
        return { href: this.cleanHref(href) };
      }
    }
    
    // Dans un contexte Dataview/Tasks, vérifier le texte pour des noms de fichiers
    // Mais exclure l'icône de lien Tasks
    if (element.closest('.dataview') || element.closest('.tasks-layout')) {
      // Ignorer l'icône de lien Tasks 🔗
      if (this.isTasksLinkIcon(element)) {
        return null;
      }
      
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
    return text.length > 0 && 
           text.length < 200 && 
           !text.includes('\n') &&
           (text.includes(' ') || 
            /^[A-Z]/.test(text) || 
            /\w+/.test(text));
  }

  /**
   * Vérifie si un élément est l'icône de lien Tasks (🔗).
   */
  private isTasksLinkIcon(element: HTMLElement): boolean {
    const text = element.textContent?.trim();
    
    // Vérifier si c'est exactement l'icône 🔗
    if (text === '🔗') {
      return true;
    }
    
    // Vérifier si c'est dans un contexte Tasks
    if (element.closest('.tasks-layout') || element.closest('.task-list-item')) {
      return text === '🔗';
    }
    
    return false;
  }

  /**
   * Vérifie si un élément est un élément interactif qu'il ne faut pas intercepter.
   */
  isInteractiveElement(element: HTMLElement): boolean {
    return element.tagName === 'A' || 
           element.tagName === 'BUTTON' || 
           element.tagName === 'INPUT' ||
           element.closest('a') !== null || 
           element.closest('button') !== null ||
           element.closest('input') !== null ||
           element.classList.contains('dataview') ||
           element.closest('.dataview') !== null ||
           element.closest('.block-language-dataview') !== null ||
           element.closest('.dataview-result') !== null ||
           element.closest('.tasks-layout') !== null ||
           element.classList.contains('internal-link') ||
           element.classList.contains('external-link') ||
           element.classList.contains('tag') ||
           element.classList.contains('cm-link') ||
           element.classList.contains('file-embed') ||
           element.classList.contains('image-embed') ||
           element.classList.contains('task-list-item-checkbox') ||
           element.closest('.internal-link') !== null ||
           element.closest('.external-link') !== null ||
           element.closest('.tag') !== null ||
           element.closest('.file-embed') !== null ||
           element.closest('.image-embed') !== null ||
           element.closest('.task-list-item-checkbox') !== null ||
           element.getAttribute('data-href') !== null ||
           element.closest('[data-href]') !== null ||
           // Bases Obsidian - ne pas intercepter les clics sur les éléments interactifs
           element.closest('.agile-embed-base') !== null ||
           element.closest('.base-view') !== null ||
           element.closest('.base-view-header') !== null ||
           element.closest('.base-view-toolbar') !== null;
  }
}