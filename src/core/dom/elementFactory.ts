// src/core/dom/elementFactory.ts
import { LayoutBlock } from "../../types";

/**
 * Configuration pour la création d'éléments.
 */
export interface ElementConfig {
  className?: string;
  styles?: Partial<CSSStyleDeclaration>;
  attributes?: Record<string, string>;
  textContent?: string;
}

/**
 * Factory centralisée pour la création d'éléments DOM avec styles cohérents.
 * Élimine la duplication de code et assure la consistance visuelle.
 */
export class ElementFactory {
  /**
   * Crée un container de grille principal pour l'affichage des layouts.
   * @returns Element de grille configuré
   */
  public static createGridContainer(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "agile-board-grid";
    
    this.applyStyles(grid, {
      display: "grid",
      gridTemplateColumns: "repeat(24, 1fr)",
      gap: "0.5rem",
      padding: "1rem",
      minHeight: "90vh",
      maxHeight: "90vh"
    });
    
    return grid;
  }

  /**
   * Crée une frame pour un bloc de layout.
   * @param block Configuration du bloc
   * @returns Element de frame configuré
   */
  public static createLayoutFrame(block: LayoutBlock): HTMLElement {
    const frame = document.createElement("section");
    frame.className = "agile-board-frame";
    frame.setAttribute("data-title", block.title);
    
    this.applyStyles(frame, {
      gridColumn: `${block.x + 1} / span ${block.w}`,
      gridRow: `${block.y + 1} / span ${block.h}`,
      minHeight: "100px",
      border: "1px solid var(--background-modifier-border)",
      padding: "0.5rem",
      backgroundColor: "var(--background-primary)",
      borderRadius: "0.5rem",
      overflow: "auto"
    });
    
    return frame;
  }

  /**
   * Crée un titre pour une frame.
   * @param title Texte du titre
   * @returns Element de titre configuré
   */
  public static createFrameTitle(title: string): HTMLElement {
    const titleEl = document.createElement("strong");
    titleEl.className = "agile-board-frame-title";
    titleEl.textContent = title;
    
    this.applyStyles(titleEl, {
      display: "block",
      marginBottom: "0.5em",
      color: "var(--text-normal)",
      fontSize: "1em",
      fontWeight: "600"
    });
    
    return titleEl;
  }

  /**
   * Crée un container d'erreur avec style cohérent.
   * @param title Titre de l'erreur
   * @param message Message d'erreur
   * @returns Element d'erreur configuré
   */
  public static createErrorContainer(title: string, message: string): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "agile-board-error";
    
    this.applyStyles(overlay, {
      padding: "2rem",
      textAlign: "center",
      backgroundColor: "var(--background-secondary)",
      border: "2px dashed var(--color-accent)",
      borderRadius: "1rem",
      fontSize: "1.1em",
      marginBottom: "1rem"
    });

    const h2 = document.createElement("h2");
    h2.textContent = title;
    overlay.appendChild(h2);

    const p = document.createElement("p");
    p.textContent = message;
    overlay.appendChild(p);

    return overlay;
  }

  /**
   * Crée une liste d'éléments manquants.
   * @param items Liste des éléments à afficher
   * @returns Element de liste configuré
   */
  public static createMissingItemsList(items: string[]): HTMLElement {
    const list = document.createElement("ul");
    list.className = "agile-board-missing-list";
    
    this.applyStyles(list, {
      textAlign: "left",
      margin: "1rem auto",
      maxWidth: "300px"
    });

    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = `# ${item}`;
      list.appendChild(li);
    }

    return list;
  }

  /**
   * Crée un bouton d'action avec style cohérent.
   * @param text Texte du bouton
   * @param action Fonction à exécuter au clic
   * @returns Element de bouton configuré
   */
  public static createActionButton(
    text: string, 
    action: () => void,
    variant: 'primary' | 'secondary' = 'primary'
  ): HTMLElement {
    const button = document.createElement("button");
    button.className = variant === 'primary' ? "mod-cta" : "mod-muted";
    button.textContent = text;
    
    this.applyStyles(button, {
      marginTop: "1em",
      cursor: "pointer"
    });
    
    button.addEventListener("click", action);
    return button;
  }

  /**
   * Crée un container de prévisualisation markdown.
   * @returns Element de prévisualisation configuré
   */
  public static createPreviewContainer(): HTMLElement {
    const preview = document.createElement("div");
    preview.className = "agile-board-preview";
    
    this.applyStyles(preview, {
      width: "100%",
      height: "100%",
      overflow: "auto",
      padding: "0.5rem",
      cursor: "text",
      boxSizing: "border-box"
    });
    
    return preview;
  }

  /**
   * Crée un container d'édition markdown.
   * @returns Element d'édition configuré
   */
  public static createEditorContainer(): HTMLElement {
    const editor = document.createElement("div");
    editor.className = "agile-board-editor";
    
    this.applyStyles(editor, {
      width: "100%",
      height: "100%",
      display: "none",
      boxSizing: "border-box"
    });
    
    return editor;
  }

  /**
   * Crée une textarea pour l'édition.
   * @param spellcheck - Activer ou désactiver la vérification orthographique
   * @returns Textarea configurée
   */
  public static createTextArea(spellcheck: boolean = false): HTMLTextAreaElement {
    const textArea = document.createElement("textarea");
    textArea.className = "agile-board-textarea";
    textArea.spellcheck = spellcheck;
    
    this.applyStyles(textArea, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      border: "none",
      outline: "none",
      resize: "none",
      fontFamily: "var(--font-text)",
      fontSize: "var(--font-size-normal)",
      background: "transparent",
      color: "var(--text-normal)",
      padding: "0.5rem",
      boxSizing: "border-box",
      lineHeight: "1.6"
    });
    
    return textArea;
  }

  /**
   * Crée un placeholder pour contenu vide.
   * @param message Message du placeholder
   * @returns Element de placeholder configuré
   */
  public static createEmptyPlaceholder(message: string): HTMLElement {
    const placeholder = document.createElement("div");
    placeholder.className = "agile-board-placeholder";
    placeholder.textContent = message;
    
    this.applyStyles(placeholder, {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      minHeight: "80px",
      color: "var(--text-muted)",
      fontStyle: "italic",
      cursor: "text",
      userSelect: "none"
    });
    
    return placeholder;
  }

  /**
   * Applique des styles CSS à un élément de manière type-safe.
   * @param element Element cible
   * @param styles Styles à appliquer
   */
  public static applyStyles(
    element: HTMLElement, 
    styles: Partial<CSSStyleDeclaration>
  ): void {
    Object.assign(element.style, styles);
  }

  /**
   * Crée un élément avec configuration complète.
   * @param tag Type d'élément
   * @param config Configuration de l'élément
   * @returns Element configuré
   */
  public static createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    config: ElementConfig = {}
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    
    if (config.className) {
      element.className = config.className;
    }
    
    if (config.styles) {
      this.applyStyles(element, config.styles);
    }
    
    if (config.attributes) {
      Object.entries(config.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    if (config.textContent) {
      element.textContent = config.textContent;
    }
    
    return element;
  }
}

/**
 * Helper spécialisé pour les éléments d'image et de média.
 */
export class MediaElementFactory {
  /**
   * Crée un élément image avec gestion d'erreur.
   * @param src Source de l'image
   * @param alt Texte alternatif
   * @param onClick Action au clic optionnelle
   * @returns Element image configuré
   */
  public static createImage(
    src: string, 
    alt: string,
    onClick?: () => void
  ): HTMLImageElement {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.className = "agile-board-image";
    
    ElementFactory.applyStyles(img as any, {
      maxWidth: "100%",
      height: "auto",
      borderRadius: "4px",
      cursor: onClick ? "pointer" : "default"
    });
    
    if (onClick) {
      img.addEventListener("click", (e) => {
        e.preventDefault();
        onClick();
      });
    }
    
    return img;
  }

  /**
   * Crée un placeholder d'erreur pour les médias non trouvés.
   * @param mediaName Nom du média
   * @param type Type de média
   * @returns Element d'erreur configuré
   */
  public static createMediaError(
    mediaName: string, 
    type: 'image' | 'embed'
  ): HTMLElement {
    const errorDiv = document.createElement("div");
    errorDiv.className = "agile-board-media-error";
    errorDiv.textContent = `${type === 'image' ? 'Image' : 'Fichier'} non trouvé: ${mediaName}`;
    
    ElementFactory.applyStyles(errorDiv, {
      padding: "1rem",
      border: "2px dashed var(--text-error)",
      borderRadius: "4px",
      textAlign: "center",
      color: "var(--text-error)",
      background: "var(--background-secondary)",
      fontFamily: "var(--font-monospace)",
      fontSize: "0.9em"
    });
    
    return errorDiv;
  }
}