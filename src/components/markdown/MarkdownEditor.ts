// src/components/markdown/MarkdownEditor.ts
import { App } from "obsidian";
import { BaseUIComponent } from "../../core/baseComponent";

/**
 * Composant responsable de l'édition markdown avec textarea simple.
 * Gère les raccourcis clavier et la continuation automatique des listes.
 */
export class MarkdownEditor extends BaseUIComponent {
  private textArea: HTMLTextAreaElement | null = null;
  private onContentChange: (content: string) => void;
  private onExitEdit: () => void;

  constructor(
    container: HTMLElement,
    app: App,
    private content: string,
    callbacks: {
      onContentChange: (content: string) => void;
      onExitEdit: () => void;
    }
  ) {
    super(container, app);
    this.onContentChange = callbacks.onContentChange;
    this.onExitEdit = callbacks.onExitEdit;
  }

  /**
   * Initialise et affiche l'éditeur.
   */
  initialize(): void {
    if (!this.containerEl) return;

    this.containerEl.empty();
    this.createTextArea();
    this.setupEventListeners();
    this.focus();
  }

  /**
   * Crée le textarea avec les styles appropriés.
   */
  private createTextArea(): void {
    if (!this.containerEl) return;

    this.textArea = this.containerEl.createEl('textarea');
    
    // Respecter la configuration de vérification orthographique d'Obsidian
    // @ts-ignore - accès aux paramètres internes d'Obsidian
    this.textArea.spellcheck = this.app.vault.config?.spellcheck ?? false;
    
    this.textArea.style.cssText = `
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
    
    this.textArea.value = this.content;
  }

  /**
   * Configure les gestionnaires d'événements.
   */
  private setupEventListeners(): void {
    if (!this.textArea) return;

    this.textArea.addEventListener('input', () => {
      if (this.textArea) {
        this.content = this.textArea.value;
        this.onContentChange(this.content);
      }
    });
    
    this.textArea.addEventListener('blur', () => {
      setTimeout(() => this.onExitEdit(), 100);
    });
    
    this.textArea.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /**
   * Gère les raccourcis clavier.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.textArea) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.onExitEdit();
    } else if (e.key === 'Enter') {
      this.handleEnterKey(e);
    }
  }

  /**
   * Gère la touche Entrée pour continuer automatiquement les listes et checkboxes.
   */
  private handleEnterKey(e: KeyboardEvent): void {
    if (!this.textArea) return;

    const cursorPos = this.textArea.selectionStart;
    const value = this.textArea.value;
    
    const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineEnd = value.indexOf('\n', cursorPos);
    const currentLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
    
    const checkboxPattern = /^(\s*)(- \[([ x])\] )(.*)$/;
    const listPattern = /^(\s*)(- )(.*)$/;
    const numberedListPattern = /^(\s*)(\d+\. )(.*)$/;
    
    const checkboxMatch = currentLine.match(checkboxPattern);
    const listMatch = currentLine.match(listPattern);
    const numberedMatch = currentLine.match(numberedListPattern);
    
    if (checkboxMatch) {
      this.handleCheckboxContinuation(e, checkboxMatch, cursorPos, value, lineStart, lineEnd);
    } else if (listMatch) {
      this.handleListContinuation(e, listMatch, cursorPos, value, lineStart, lineEnd);
    } else if (numberedMatch) {
      // Ligne de liste numérotée - implémentation simplifiée
      const [, indent, marker, content] = numberedMatch;
      const currentNumber = parseInt(marker);
      
      if (!content.trim()) {
        e.preventDefault();
        const before = value.substring(0, lineStart);
        const after = value.substring(lineEnd === -1 ? value.length : lineEnd);
        this.textArea.value = before + after;
        this.textArea.setSelectionRange(before.length, before.length);
      } else {
        e.preventDefault();
        const nextNumber = currentNumber + 1;
        const newLine = `\n${indent}${nextNumber}. `;
        const before = value.substring(0, cursorPos);
        const after = value.substring(cursorPos);
        this.textArea.value = before + newLine + after;
        const newPos = cursorPos + newLine.length;
        this.textArea.setSelectionRange(newPos, newPos);
      }
      
      this.content = this.textArea.value;
      this.onContentChange(this.content);
    }
  }

  private handleCheckboxContinuation(
    e: KeyboardEvent,
    match: RegExpMatchArray,
    cursorPos: number,
    value: string,
    lineStart: number,
    lineEnd: number
  ): void {
    if (!this.textArea) return;

    const [, indent, , , content] = match;
    
    if (!content.trim()) {
      e.preventDefault();
      const before = value.substring(0, lineStart);
      const after = value.substring(lineEnd === -1 ? value.length : lineEnd);
      this.textArea.value = before + after;
      this.textArea.setSelectionRange(before.length, before.length);
    } else {
      e.preventDefault();
      const newLine = `\n${indent}- [ ] `;
      const before = value.substring(0, cursorPos);
      const after = value.substring(cursorPos);
      this.textArea.value = before + newLine + after;
      const newPos = cursorPos + newLine.length;
      this.textArea.setSelectionRange(newPos, newPos);
    }
    
    this.content = this.textArea.value;
    this.onContentChange(this.content);
  }

  private handleListContinuation(
    e: KeyboardEvent,
    match: RegExpMatchArray,
    cursorPos: number,
    value: string,
    lineStart: number,
    lineEnd: number
  ): void {
    if (!this.textArea) return;

    const [, indent, marker, content] = match;
    
    if (!content.trim()) {
      e.preventDefault();
      const before = value.substring(0, lineStart);
      const after = value.substring(lineEnd === -1 ? value.length : lineEnd);
      this.textArea.value = before + after;
      this.textArea.setSelectionRange(before.length, before.length);
    } else {
      e.preventDefault();
      const newLine = `\n${indent}${marker}`;
      const before = value.substring(0, cursorPos);
      const after = value.substring(cursorPos);
      this.textArea.value = before + newLine + after;
      const newPos = cursorPos + newLine.length;
      this.textArea.setSelectionRange(newPos, newPos);
    }
    
    this.content = this.textArea.value;
    this.onContentChange(this.content);
  }

  /**
   * Met le focus sur l'éditeur.
   */
  private focus(): void {
    if (!this.textArea) return;

    this.textArea.focus();
    this.textArea.setSelectionRange(this.textArea.value.length, this.textArea.value.length);
  }

  protected doLoad(): void {
    this.initialize();
  }

  protected doUnload(): void {
    this.textArea = null;
  }
}