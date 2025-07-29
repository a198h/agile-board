// src/markdownBox.ts
import { App, MarkdownRenderer } from "obsidian";

export class MarkdownBox {
  boxEl: HTMLElement;
  previewEl: HTMLElement;
  editorEl: HTMLTextAreaElement;
  content = "";
  private containerOriginalHeight: string;

  constructor(
    private app: App,
    container: HTMLElement,
    initial: string,
    private onChange: (newContent: string) => void
  ) {
    this.content = initial;
    
    
    // Mémoriser la hauteur originale du container
    this.containerOriginalHeight = container.style.height || getComputedStyle(container).height;

    // ATTENTION : Ne pas modifier le display du container car cela interfère avec CSS Grid
    // Le container garde son display original pour préserver les propriétés de grille
    if (container.classList.contains("agile-board-frame")) {
      // Seulement définir les propriétés qui ne cassent pas CSS Grid
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      // Ne pas toucher à display, height, etc. - laisser CSS Grid gérer
    }


    // Création de la boîte
    this.boxEl = container.createDiv("box");
    this.boxEl.style.display = "flex";
    this.boxEl.style.flexDirection = "column";
    this.boxEl.style.overflow = "hidden"; // Important : empêche tout débordement
    this.boxEl.style.height = "100%";
    this.boxEl.style.maxHeight = "100%";
    this.boxEl.style.boxSizing = "border-box";
    this.boxEl.style.padding = "0.25rem";
    // this.boxEl.style.border = "solid";

    // Éléments de prévisualisation
    this.previewEl = this.boxEl.createDiv("preview");
    this.previewEl.style.flex = "1";
    this.previewEl.style.overflow = "auto"; // permet le scroll interne si besoin

    // Zone d'édition
    this.editorEl = this.boxEl.createEl("textarea", { cls: "editor" });
    // Respecter la configuration de vérification orthographique d'Obsidian
    // @ts-ignore - accès aux paramètres internes d'Obsidian
    this.editorEl.spellcheck = this.app.vault.config?.spellcheck ?? false;
    this.editorEl.style.width = "100%";
    this.editorEl.style.flex = "1"; // prend tout l'espace vertical
    this.editorEl.style.minHeight = "0";
    this.editorEl.style.boxSizing = "border-box";
    this.editorEl.style.resize = "none";
    this.editorEl.style.overflow = "auto";
    this.editorEl.style.display = "none"; // masqué par défaut

    this.renderPreview();

    // Événement de clic pour ouvrir l'éditeur
    this.previewEl.addEventListener("click", (event) => {
      // Éviter l'édition si on clique sur un élément interactif
      if (!this.isInteractiveElement(event.target as HTMLElement)) {
        this.openEditor();
      }
    });

    // Changement → maj rendu + notify
    this.editorEl.addEventListener("blur", async () => {
      await this.closeEditor();
    });

    // Preview en live pendant la frappe
    this.editorEl.addEventListener("input", () => {
      this.content = this.editorEl.value;
      this.renderPreview();
    });
    
    // Gestion des touches pour améliorer l'expérience
    this.editorEl.addEventListener("keydown", (event) => {
      // Échapper pour annuler l'édition
      if (event.key === "Escape") {
        this.editorEl.value = this.content; // Restore original content
        this.closeEditor();
        return;
      }
      
      // Ctrl+Enter pour valider
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        this.closeEditor();
        return;
      }
      
      // Auto-indentation pour les listes
      if (event.key === "Enter") {
        const textarea = this.editorEl;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const currentLine = textBeforeCursor.split('\n').pop() || '';
        
        // Détection des listes à puces
        const listMatch = currentLine.match(/^(\s*[-*+])\s/);
        // Détection des listes numérotées
        const numberedListMatch = currentLine.match(/^(\s*)(\d+)\. (.*)$/);
        
        if (listMatch) {
          event.preventDefault();
          const listPrefix = listMatch[1];
          const newText = textarea.value.substring(0, cursorPos) + 
                         '\n' + listPrefix + ' ' + 
                         textarea.value.substring(cursorPos);
          textarea.value = newText;
          textarea.setSelectionRange(cursorPos + listPrefix.length + 2, cursorPos + listPrefix.length + 2);
          
          // Trigger input event to update preview
          this.content = textarea.value;
          this.renderPreview();
        } else if (numberedListMatch) {
          event.preventDefault();
          const [, indent, currentNumber, content] = numberedListMatch;
          
          if (!content.trim()) {
            // Ligne vide - supprimer la liste
            const lines = textarea.value.split('\n');
            const lineIndex = textBeforeCursor.split('\n').length - 1;
            lines.splice(lineIndex, 1);
            textarea.value = lines.join('\n');
            const newPos = cursorPos - currentLine.length - (lineIndex > 0 ? 1 : 0);
            textarea.setSelectionRange(newPos, newPos);
          } else {
            // Continuer avec le numéro suivant
            const nextNumber = parseInt(currentNumber) + 1;
            const newLine = `\n${indent}${nextNumber}. `;
            let newValue = textarea.value.substring(0, cursorPos) + newLine + textarea.value.substring(cursorPos);
            
            // Renuméroter les lignes suivantes
            newValue = this.renumberFollowingListItems(newValue, cursorPos + newLine.length, indent, nextNumber);
            
            textarea.value = newValue;
            const newPos = cursorPos + newLine.length;
            textarea.setSelectionRange(newPos, newPos);
          }
          
          // Trigger input event to update preview
          this.content = textarea.value;
          this.renderPreview();
        }
      }
    });


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

  private isInteractiveElement(element: HTMLElement): boolean {
    // Vérifier si l'élément ou ses parents sont interactifs
    let current = element;
    while (current && current !== this.previewEl) {
      const tag = current.tagName.toLowerCase();
      
      // Éléments interactifs standard
      if (['a', 'button', 'input', 'textarea', 'select', 'img'].includes(tag)) {
        return true;
      }
      
      // Éléments avec des classes spéciales d'Obsidian
      if (current.classList.contains('internal-link') || 
          current.classList.contains('external-link') ||
          current.classList.contains('image-embed') ||
          current.classList.contains('file-embed') ||
          current.classList.contains('tag') ||
          current.classList.contains('cm-link') ||
          current.classList.contains('dataview')) {
        return true;
      }
      
      // Éléments avec attributs interactifs
      if (current.hasAttribute('href') || 
          current.hasAttribute('src') ||
          current.hasAttribute('data-href') ||
          current.hasAttribute('data-path')) {
        return true;
      }
      
      current = current.parentElement!;
    }
    
    return false;
  }


  async renderPreview() {
    this.previewEl.empty();

    // Force le conteneur à occuper tout l'espace disponible
    this.previewEl.style.position = "relative";
    this.previewEl.style.width = "100%";
    this.previewEl.style.height = "100%";
    this.previewEl.style.minHeight = "60px"; // adapte si besoin

    if (!this.content.trim()) {
      const placeholder = document.createElement("div");
      placeholder.innerText = "Cliquez pour commencer à écrire…";
      // Styles en dur pour occuper tout l'espace et centrer le texte
      placeholder.style.position = "absolute";
      placeholder.style.top = "0";
      placeholder.style.left = "0";
      placeholder.style.right = "0";
      placeholder.style.bottom = "0";
      placeholder.style.width = "100%";
      placeholder.style.height = "100%";
      placeholder.style.display = "flex";
      placeholder.style.alignItems = "center";
      placeholder.style.justifyContent = "center";
      placeholder.style.opacity = "0.5";
      placeholder.style.cursor = "text";
      placeholder.style.userSelect = "none";
      placeholder.style.fontStyle = "italic";
      this.previewEl.appendChild(placeholder);
    } else {
      // Nettoie le style si contenu non vide
      this.previewEl.style.position = "";
      this.previewEl.style.minHeight = "";
      await MarkdownRenderer.render(
        this.app,
        this.content,
        this.previewEl,
        this.app.workspace.getActiveFile()?.path ?? "",
        this.app.workspace.getActiveFile() as any
      );
    }
  }

  openEditor() {
    this.editorEl.value = this.content;
    this.previewEl.style.display = "none";
    this.editorEl.style.display = "block";
    
    // S'assurer que le container conserve ses propriétés de grille ET sa hauteur
    const container = this.boxEl.parentElement;
    
    if (container && container.classList.contains("agile-board-frame")) {
      // Sauvegarder les propriétés CSS Grid existantes
      const computedStyle = getComputedStyle(container);
      const gridColumn = computedStyle.gridColumn;
      const gridRow = computedStyle.gridRow;
      const currentHeight = computedStyle.height;
      
      // Préserver la hauteur ET les propriétés de grille
      container.style.height = currentHeight;
      container.style.minHeight = currentHeight;
      container.style.maxHeight = currentHeight;
      
      // IMPORTANT : Préserver les propriétés de grille qui pourraient être écrasées
      if (gridColumn && gridColumn !== 'auto') {
        container.style.gridColumn = gridColumn;
      }
      if (gridRow && gridRow !== 'auto') {
        container.style.gridRow = gridRow;
      }
    }
    
    // S'assurer que l'éditeur occupe tout l'espace disponible
    this.editorEl.style.height = "100%";
    this.editorEl.style.minHeight = "calc(100% - 1rem)";
    
    this.editorEl.focus();
    
    // Placer le curseur à la fin du texte
    this.editorEl.setSelectionRange(this.content.length, this.content.length);
  }
  
  private async closeEditor() {
    this.content = this.editorEl.value;
    this.editorEl.style.display = "none";
    this.previewEl.style.display = "block";
    
    // Rétablir le comportement flexible du container
    const container = this.boxEl.parentElement;
    if (container && container.classList.contains("agile-board-frame")) {
      // Retirer les contraintes de hauteur fixe pour permettre au contenu de s'adapter
      container.style.minHeight = "100px"; // Hauteur minimum raisonnable
      container.style.maxHeight = "100%";   // Reprendre la hauteur de la grille
      // Garder la hauteur actuelle comme base
      // container.style.height reste inchangé pour conserver la taille
    }
    
    await this.renderPreview();
    this.onChange(this.content);
  }
}
