// src/core/components/markdownEditor.ts
import { App } from "obsidian";
import { BaseUIComponent } from "../baseComponent";
import { MarkdownProcessor } from "../business/markdownProcessor";
import { ElementFactory } from "../dom/elementFactory";
import { ErrorHandler, ErrorSeverity } from "../errorHandler";
import { debounce } from "ts-debounce";

/**
 * Configuration pour l'éditeur markdown.
 */
export interface MarkdownEditorConfig {
  readonly content: string;
  readonly onContentChange: (content: string) => void;
  readonly onExitEdit: () => void;
}

/**
 * Composant dédié à l'édition markdown.
 * Gère la saisie, l'auto-complétion et les raccourcis clavier.
 */
export class MarkdownEditor extends BaseUIComponent {
  private textArea: HTMLTextAreaElement;
  private currentContent: string;
  private debouncedOnChange: (content: string) => void;
  private autoExitTimeout?: NodeJS.Timeout;
  private app: App;

  constructor(
    container: HTMLElement,
    app: App,
    private config: MarkdownEditorConfig
  ) {
    super(container, app);
    this.app = app;
    this.currentContent = config.content;
    this.debouncedOnChange = debounce(config.onContentChange, 1000);

    this.initializeEditor();
  }

  /**
   * Initialise l'éditeur.
   */
  private initializeEditor(): void {
    this.setupContainer();
    this.createTextArea();
    this.setupEventHandlers();
    this.focusEditor();
  }

  /**
   * Configure le container principal.
   */
  private setupContainer(): void {
    if (!this.containerEl) return;
    
    this.containerEl.empty();
    this.containerEl.className = "agile-board-editor";
    
    ElementFactory.applyStyles(this.containerEl, {
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      display: "block",
      position: "relative" // Permet le positionnement absolu des enfants
    });
  }

  /**
   * Crée la zone de texte pour l'édition.
   */
  private createTextArea(): void {
    if (!this.containerEl) return;
    
    // Créer un toolbar avec bouton de fermeture
    const toolbar = ElementFactory.createElement('div', {
      className: 'agile-board-editor-toolbar',
      styles: {
        position: 'absolute',
        top: '0.25rem',
        right: '0.25rem',
        zIndex: '10',
        display: 'flex',
        gap: '0.25rem'
      }
    });

    const closeButton = ElementFactory.createElement('button', {
      textContent: '✕',
      className: 'agile-board-close-btn',
      styles: {
        background: 'var(--background-primary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '3px',
        padding: '0.25rem 0.5rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }
    });

    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.config.onExitEdit();
    });

    toolbar.appendChild(closeButton);
    this.containerEl.appendChild(toolbar);
    
    // Respecter la configuration de vérification orthographique d'Obsidian
    // @ts-ignore - accès aux paramètres internes d'Obsidian
    const spellcheck = this.app.vault.config?.spellcheck ?? false;
    this.textArea = ElementFactory.createTextArea(spellcheck);
    this.textArea.value = this.currentContent;
    this.containerEl.appendChild(this.textArea);
  }

  /**
   * Configure les gestionnaires d'événements.
   */
  private setupEventHandlers(): void {
    this.setupInputHandler();
    this.setupBlurHandler();
    this.setupKeyboardHandlers();
  }

  /**
   * Gestionnaire pour les modifications de texte.
   */
  private setupInputHandler(): void {
    this.textArea.addEventListener('input', () => {
      this.currentContent = this.textArea.value;
      this.debouncedOnChange(this.currentContent);
      
      // Réinitialiser le timer à chaque modification
      this.resetAutoExitTimer();
    });
  }

  /**
   * Gestionnaire pour la perte de focus.
   */
  private setupBlurHandler(): void {
    // Gestionnaire blur sur le textarea
    this.textArea.addEventListener('blur', (e) => {
      // Délai pour permettre d'autres interactions
      setTimeout(() => {
        // Vérifier si le focus n'est pas sur un autre élément de l'éditeur
        if (!this.containerEl?.contains(document.activeElement)) {
          this.config.onExitEdit();
        }
      }, 100);
    });

    // Gestionnaire de clic global pour sortir de l'édition
    const handleGlobalClick = (e: MouseEvent) => {
      if (!this.containerEl?.contains(e.target as Node)) {
        document.removeEventListener('click', handleGlobalClick);
        this.config.onExitEdit();
      }
    };

    // Ajouter le gestionnaire global après un court délai
    setTimeout(() => {
      document.addEventListener('click', handleGlobalClick);
    }, 100);
  }

  /**
   * Gestionnaires pour les raccourcis clavier.
   */
  private setupKeyboardHandlers(): void {
    this.textArea.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Escape':
          this.handleEscapeKey(e);
          break;
        case 'Enter':
          this.handleEnterKey(e);
          break;
        case 'Tab':
          this.handleTabKey(e);
          break;
      }
    });
  }

  /**
   * Gère la touche Escape.
   */
  private handleEscapeKey(e: KeyboardEvent): void {
    e.preventDefault();
    this.config.onExitEdit();
  }

  /**
   * Gère la touche Entrée pour l'auto-complétion des listes.
   */
  private handleEnterKey(e: KeyboardEvent): void {
    try {
      const cursorPos = this.textArea.selectionStart;
      const result = MarkdownProcessor.handleListContinuation(this.currentContent, cursorPos);
      
      if (result) {
        e.preventDefault();
        this.updateContentAndCursor(result.content, result.newCursorPos);
      }
    } catch (error) {
      ErrorHandler.handleError(error, "MarkdownEditor.handleEnterKey", {
        severity: ErrorSeverity.WARNING,
        context: { cursorPos: this.textArea.selectionStart }
      });
    }
  }

  /**
   * Gère la touche Tab pour l'indentation.
   */
  private handleTabKey(e: KeyboardEvent): void {
    e.preventDefault();
    
    const start = this.textArea.selectionStart;
    const end = this.textArea.selectionEnd;
    const selectedText = this.textArea.value.substring(start, end);
    
    if (e.shiftKey) {
      // Shift+Tab : désindenter
      this.handleUnindent(start, end, selectedText);
    } else {
      // Tab : indenter
      this.handleIndent(start, end, selectedText);
    }
  }

  /**
   * Gère l'indentation.
   */
  private handleIndent(start: number, end: number, selectedText: string): void {
    if (selectedText.includes('\n')) {
      // Sélection multiligne : indenter chaque ligne
      const indentedText = selectedText
        .split('\n')
        .map(line => line.length > 0 ? '  ' + line : line)
        .join('\n');
      
      this.replaceSelection(start, end, indentedText);
      this.textArea.selectionStart = start;
      this.textArea.selectionEnd = start + indentedText.length;
    } else {
      // Insertion simple de tabulation
      this.insertTextAtCursor('  ');
    }
  }

  /**
   * Gère la désindentation.
   */
  private handleUnindent(start: number, end: number, selectedText: string): void {
    if (selectedText.includes('\n')) {
      // Sélection multiligne : désindenter chaque ligne
      const unindentedText = selectedText
        .split('\n')
        .map(line => line.startsWith('  ') ? line.substring(2) : line)
        .join('\n');
      
      this.replaceSelection(start, end, unindentedText);
      this.textArea.selectionStart = start;
      this.textArea.selectionEnd = start + unindentedText.length;
    } else {
      // Supprimer l'indentation au début de la ligne
      const lineStart = this.currentContent.lastIndexOf('\n', start - 1) + 1;
      const lineText = this.currentContent.substring(lineStart, start);
      
      if (lineText.endsWith('  ')) {
        this.replaceSelection(start - 2, start, '');
      }
    }
  }

  /**
   * Remplace la sélection actuelle par le nouveau texte.
   */
  private replaceSelection(start: number, end: number, newText: string): void {
    const content = this.textArea.value;
    const newContent = content.substring(0, start) + newText + content.substring(end);
    
    this.textArea.value = newContent;
    this.currentContent = newContent;
    this.debouncedOnChange(this.currentContent);
  }

  /**
   * Insère du texte à la position du curseur.
   */
  private insertTextAtCursor(text: string): void {
    const cursorPos = this.textArea.selectionStart;
    const content = this.textArea.value;
    
    const newContent = content.substring(0, cursorPos) + text + content.substring(cursorPos);
    const newCursorPos = cursorPos + text.length;
    
    this.updateContentAndCursor(newContent, newCursorPos);
  }

  /**
   * Met à jour le contenu et la position du curseur.
   */
  private updateContentAndCursor(newContent: string, newCursorPos: number): void {
    this.textArea.value = newContent;
    this.currentContent = newContent;
    
    this.textArea.selectionStart = newCursorPos;
    this.textArea.selectionEnd = newCursorPos;
    
    this.debouncedOnChange(this.currentContent);
  }

  /**
   * Met le focus sur l'éditeur.
   */
  focusEditor(): void {
    // Utiliser requestAnimationFrame pour s'assurer que l'élément est visible
    requestAnimationFrame(() => {
      this.textArea.focus();
      
      // Placer le curseur à la fin du texte
      const length = this.textArea.value.length;
      this.textArea.setSelectionRange(length, length);
    });

    // Timeout de sécurité : fermer l'éditeur après 30 secondes d'inactivité
    this.resetAutoExitTimer();
  }

  /**
   * Réinitialise le timer de fermeture automatique.
   */
  private resetAutoExitTimer(): void {
    if (this.autoExitTimeout) {
      clearTimeout(this.autoExitTimeout);
    }
    
    this.autoExitTimeout = setTimeout(() => {
      console.debug('MarkdownEditor: Fermeture automatique après timeout');
      this.config.onExitEdit();
    }, 30000); // 30 secondes
  }

  /**
   * Met à jour le contenu de l'éditeur.
   */
  updateContent(newContent: string): void {
    const cursorPos = this.textArea.selectionStart;
    this.currentContent = newContent;
    this.textArea.value = newContent;
    
    // Restaurer la position du curseur si possible
    const newPos = Math.min(cursorPos, newContent.length);
    this.textArea.setSelectionRange(newPos, newPos);
  }

  /**
   * Retourne le contenu actuel.
   */
  getContent(): string {
    return this.textArea.value;
  }

  /**
   * Vérifie si l'éditeur a le focus.
   */
  hasFocus(): boolean {
    return document.activeElement === this.textArea;
  }

  /**
   * Sélectionne tout le texte.
   */
  selectAll(): void {
    this.textArea.select();
  }

  /**
   * Insère du texte à la position actuelle du curseur.
   */
  insertText(text: string): void {
    this.insertTextAtCursor(text);
    this.textArea.focus();
  }

  /**
   * Obtient la sélection actuelle.
   */
  getSelection(): { start: number; end: number; text: string } {
    const start = this.textArea.selectionStart;
    const end = this.textArea.selectionEnd;
    const text = this.textArea.value.substring(start, end);
    
    return { start, end, text };
  }

  /**
   * Définit la sélection.
   */
  setSelection(start: number, end: number): void {
    this.textArea.setSelectionRange(start, end);
    this.textArea.focus();
  }

  protected doLoad(): void {
    // Déjà initialisé dans le constructeur
  }

  protected doUnload(): void {
    // Nettoyer le timer de fermeture automatique
    if (this.autoExitTimeout) {
      clearTimeout(this.autoExitTimeout);
      this.autoExitTimeout = undefined;
    }
    
    // Nettoyage automatique via BaseUIComponent
  }
}