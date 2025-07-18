// src/obsidianLinkDecorator.ts
import { ViewPlugin, Decoration, DecorationSet, ViewUpdate, WidgetType } from "@codemirror/view";
import { Range } from "@codemirror/state";
import { App } from "obsidian";

// Widget pour les liens internes [[]]
class InternalLinkWidget extends WidgetType {
  constructor(
    private app: App,
    private linkText: string,
    private filePath: string
  ) {
    super();
  }

  toDOM() {
    const linkEl = document.createElement("span");
    linkEl.className = "cm-hmd-internal-link";
    linkEl.textContent = this.linkText;
    linkEl.style.cssText = `
      color: var(--link-color);
      text-decoration: none;
      cursor: pointer;
      border-bottom: 1px solid var(--link-color);
      border-radius: 2px;
      padding: 0 2px;
    `;
    
    // Gestion du clic
    linkEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`🔗 Clic sur lien: ${this.linkText}`);
      this.app.workspace.openLinkText(this.linkText, this.filePath);
    });
    
    // Gestion du hover
    linkEl.addEventListener('mouseenter', () => {
      linkEl.style.backgroundColor = 'var(--link-hover-color)';
    });
    
    linkEl.addEventListener('mouseleave', () => {
      linkEl.style.backgroundColor = 'transparent';
    });
    
    return linkEl;
  }
}

// Widget pour les images ![[]]
class ImageWidget extends WidgetType {
  constructor(
    private app: App,
    private imageName: string,
    private filePath: string
  ) {
    super();
  }

  toDOM() {
    const container = document.createElement("div");
    container.className = "cm-image-embed";
    container.style.cssText = `
      margin: 0.5rem 0;
      text-align: center;
    `;
    
    // Résoudre le chemin de l'image
    const imageFile = this.app.metadataCache.getFirstLinkpathDest(this.imageName, this.filePath);
    
    if (imageFile) {
      const img = document.createElement("img");
      img.src = this.app.vault.getResourcePath(imageFile);
      img.alt = this.imageName;
      img.style.cssText = `
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        cursor: pointer;
      `;
      
      // Clic pour ouvrir l'image
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.app.workspace.openLinkText(this.imageName, this.filePath);
      });
      
      container.appendChild(img);
    } else {
      // Image non trouvée
      const placeholder = document.createElement("span");
      placeholder.className = "cm-image-placeholder";
      placeholder.textContent = `![[${this.imageName}]]`;
      placeholder.style.cssText = `
        color: var(--text-error);
        background: var(--background-secondary);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--font-monospace);
      `;
      container.appendChild(placeholder);
    }
    
    return container;
  }
}

// Widget pour les délimiteurs [[ et ]]
class LinkDelimiterWidget extends WidgetType {
  constructor(private delimiter: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-formatting-link";
    span.textContent = this.delimiter;
    span.style.cssText = `
      color: var(--text-muted);
      font-size: 0.9em;
      opacity: 0.7;
    `;
    return span;
  }
}

// Plugin principal pour les décorations
export function obsidianLinkDecorator(app: App, filePath: string) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    
    constructor(view: any) {
      this.decorations = this.buildDecorations(view);
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
    
    buildDecorations(view: any): DecorationSet {
      const decorations: Range<Decoration>[] = [];
      const doc = view.state.doc;
      
      // Regex pour les liens internes [[text]]
      const internalLinkRegex = /\[\[([^\]]+)\]\]/g;
      
      // Regex pour les images ![[text]]
      const imageRegex = /!\[\[([^\]]+)\]\]/g;
      
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        
        // Chercher les images d'abord (plus spécifique)
        let match;
        while ((match = imageRegex.exec(lineText)) !== null) {
          const from = line.from + match.index;
          const to = line.from + match.index + match[0].length;
          const imageName = match[1];
          
          // Décoration pour remplacer toute l'image ![[...]]
          decorations.push(
            Decoration.replace({
              widget: new ImageWidget(app, imageName, filePath),
              block: false
            }).range(from, to)
          );
        }
        
        // Réinitialiser pour les liens internes
        imageRegex.lastIndex = 0;
        
        // Chercher les liens internes [[text]]
        while ((match = internalLinkRegex.exec(lineText)) !== null) {
          // Vérifier que ce n'est pas une image
          if (match.index > 0 && lineText[match.index - 1] === '!') {
            continue;
          }
          
          const from = line.from + match.index;
          const to = line.from + match.index + match[0].length;
          const linkText = match[1];
          
          // Décoration pour [[ (début)
          decorations.push(
            Decoration.replace({
              widget: new LinkDelimiterWidget("[["),
              block: false
            }).range(from, from + 2)
          );
          
          // Décoration pour le texte du lien
          decorations.push(
            Decoration.replace({
              widget: new InternalLinkWidget(app, linkText, filePath),
              block: false
            }).range(from + 2, to - 2)
          );
          
          // Décoration pour ]] (fin)
          decorations.push(
            Decoration.replace({
              widget: new LinkDelimiterWidget("]]"),
              block: false
            }).range(to - 2, to)
          );
        }
        
        // Réinitialiser pour la prochaine ligne
        internalLinkRegex.lastIndex = 0;
      }
      
      return Decoration.set(decorations);
    }
  }, {
    decorations: (plugin) => plugin.decorations
  });
}