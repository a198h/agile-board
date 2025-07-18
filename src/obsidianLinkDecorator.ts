// src/obsidianLinkDecorator.ts
import { ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { Range } from "@codemirror/state";
import { App } from "obsidian";

// Plugin principal pour les décorations - approche native Obsidian
export function obsidianLinkDecorator(app: App, filePath: string, isReadOnly: () => boolean) {
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
      
      // Si en mode édition, pas de décorateurs !
      if (!isReadOnly()) {
        return Decoration.set([]);
      }
      
      const doc = view.state.doc;
      
      // Regex pour les liens internes [[text]]
      const internalLinkRegex = /\[\[([^\]]+)\]\]/g;
      
      // Regex pour les images ![[text]]
      const imageRegex = /!\[\[([^\]]+)\]\]/g;
      
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        
        // Traiter les images d'abord
        let match;
        while ((match = imageRegex.exec(lineText)) !== null) {
          const from = line.from + match.index;
          const to = line.from + match.index + match[0].length;
          const imageName = match[1];
          
          // Marquer toute l'image comme un élément spécial
          decorations.push(
            Decoration.mark({
              class: "cm-image-embed",
              attributes: {
                "data-image": imageName,
                "data-file-path": filePath,
                "title": `Image: ${imageName}`
              }
            }).range(from, to)
          );
        }
        
        // Réinitialiser pour les liens internes
        imageRegex.lastIndex = 0;
        
        // Traiter les liens internes [[text]]
        while ((match = internalLinkRegex.exec(lineText)) !== null) {
          // Vérifier que ce n'est pas une image
          if (match.index > 0 && lineText[match.index - 1] === '!') {
            continue;
          }
          
          const from = line.from + match.index;
          const to = line.from + match.index + match[0].length;
          const linkText = match[1];
          
          // Marquer les délimiteurs [[]]
          decorations.push(
            Decoration.mark({
              class: "cm-formatting-link"
            }).range(from, from + 2)
          );
          
          decorations.push(
            Decoration.mark({
              class: "cm-formatting-link"
            }).range(to - 2, to)
          );
          
          // Marquer le contenu du lien avec une approche native
          decorations.push(
            Decoration.mark({
              class: "cm-hmd-internal-link",
              attributes: {
                "tabindex": "-1",
                "href": "#",
                "data-link-text": linkText,
                "data-file-path": filePath,
                "title": `Lien vers: ${linkText}`
              }
            }).range(from + 2, to - 2)
          );
        }
        
        // Réinitialiser pour la prochaine ligne
        internalLinkRegex.lastIndex = 0;
      }
      
      return Decoration.set(decorations);
    }
  }, {
    decorations: (plugin) => plugin.decorations,
    
    // Gestionnaire d'événements pour les liens
    eventHandlers: {
      click: (event, view) => {
        const target = event.target as HTMLElement;
        
        // Vérifier si c'est un lien interne
        if (target.classList.contains('cm-hmd-internal-link')) {
          const linkText = target.getAttribute('data-link-text');
          const filePath = target.getAttribute('data-file-path');
          
          if (linkText && filePath) {
            event.preventDefault();
            event.stopPropagation();
            
            console.log(`🔗 Clic sur lien natif: ${linkText}`);
            
            // Ouvrir le lien via Obsidian
            setTimeout(() => {
              app.workspace.openLinkText(linkText, filePath);
            }, 0);
            
            return true;
          }
        }
        
        // Vérifier si c'est une image
        if (target.classList.contains('cm-image-embed')) {
          const imageName = target.getAttribute('data-image');
          const filePath = target.getAttribute('data-file-path');
          
          if (imageName && filePath) {
            event.preventDefault();
            event.stopPropagation();
            
            console.log(`🖼️ Clic sur image: ${imageName}`);
            
            setTimeout(() => {
              app.workspace.openLinkText(imageName, filePath);
            }, 0);
            
            return true;
          }
        }
        
        return false;
      }
    }
  });
}