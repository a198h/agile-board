// src/core/dom/elementFactory.ts
import { LayoutBlock } from "../../types";
import { setGridPosition } from "./cssHelper";

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

    // Set grid position using CSS custom properties
    setGridPosition(frame, block.x, block.y, block.w, block.h);

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
    return preview;
  }

  /**
   * Crée un container d'édition markdown.
   * @returns Element d'édition configuré
   */
  public static createEditorContainer(): HTMLElement {
    const editor = document.createElement("div");
    editor.className = "agile-board-editor";
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
    img.className = onClick ? "agile-board-image agile-board-image--clickable" : "agile-board-image";

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
    return errorDiv;
  }
}