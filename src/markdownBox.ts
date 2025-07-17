// src/markdownBox.ts
import { App, MarkdownRenderer } from "obsidian";

export class MarkdownBox {
  boxEl: HTMLElement;
  previewEl: HTMLElement;
  editorEl: HTMLTextAreaElement;
  content = "";

  constructor(
    private app: App,
    container: HTMLElement,
    initial: string,
    private onChange: (newContent: string) => void
  ) {
    this.content = initial;

    // Contrôle la hauteur du cadre parent (agile-board-frame)
    if (container.classList.contains("agile-board-frame")) {
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.height = "100%";
      container.style.minHeight = "100px";
      container.style.maxHeight = "100%";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden"; // ← important ici aussi
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
    this.previewEl.style.position = "relative";
    
    // Bouton d'édition
    this.createEditButton();

    // Zone d'édition
    this.editorEl = this.boxEl.createEl("textarea", { cls: "editor" });
    this.editorEl.style.width = "100%";
    this.editorEl.style.flex = "1"; // prend tout l'espace vertical
    this.editorEl.style.minHeight = "0";
    this.editorEl.style.boxSizing = "border-box";
    this.editorEl.style.resize = "none";
    this.editorEl.style.overflow = "auto";
    this.editorEl.style.display = "none"; // masqué par défaut

    this.renderPreview();

    // Clic sélectif sur le rendu → édition (évite les éléments interactifs)
    this.previewEl.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      
      // Ne pas intercepter les clics sur les éléments interactifs
      if (this.isInteractiveElement(target)) {
        return;
      }
      
      // Vérifier si on clique sur l'icône d'édition
      if (target.classList.contains('edit-button') || target.closest('.edit-button')) {
        event.stopPropagation();
        this.openEditor();
        return;
      }
      
      // Pour les autres clics, ne pas ouvrir l'éditeur automatiquement
      // L'utilisateur doit cliquer sur l'icône d'édition
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
        
        // Détection des listes
        const listMatch = currentLine.match(/^(\s*[-*+])\s/);
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
        }
      }
    });


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

  private createEditButton() {
    const editBtn = document.createElement("button");
    editBtn.className = "edit-button";
    editBtn.innerHTML = "✏️";
    editBtn.title = "Modifier ce cadre";
    editBtn.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 12px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 10;
    `;
    
    // Afficher le bouton au survol du cadre
    this.previewEl.addEventListener("mouseenter", () => {
      editBtn.style.opacity = "1";
    });
    
    this.previewEl.addEventListener("mouseleave", () => {
      editBtn.style.opacity = "0";
    });
    
    // Clic sur le bouton d'édition
    editBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.openEditor();
    });
    
    this.previewEl.appendChild(editBtn);
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
      placeholder.innerText = "Cliquez sur ✏️ pour éditer…";
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
      placeholder.style.cursor = "default";
      placeholder.style.userSelect = "none";
      placeholder.style.fontStyle = "italic";
      this.previewEl.appendChild(placeholder);
    } else {
      // Nettoie le style si contenu non vide
      this.previewEl.style.position = "";
      this.previewEl.style.minHeight = "";
      await MarkdownRenderer.renderMarkdown(
        this.content,
        this.previewEl,
        this.app.workspace.getActiveFile()?.path ?? "",
        this.app.workspace.getActiveFile() as any
      );
    }
    
    // Recréer le bouton d'édition après chaque rendu
    this.createEditButton();
  }

  openEditor() {
    this.editorEl.value = this.content;
    this.previewEl.style.display = "none";
    this.editorEl.style.display = "block";
    this.editorEl.focus();
    
    // Placer le curseur à la fin du texte
    this.editorEl.setSelectionRange(this.content.length, this.content.length);
  }
  
  private async closeEditor() {
    this.content = this.editorEl.value;
    this.editorEl.style.display = "none";
    this.previewEl.style.display = "block";
    await this.renderPreview();
    this.onChange(this.content);
  }
}
