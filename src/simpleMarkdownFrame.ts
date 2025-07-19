// src/simpleMarkdownFrame.ts
import { App, TFile, Component, MarkdownRenderer } from "obsidian";
import { SectionInfo } from "./sectionParser";
import { debounce } from "ts-debounce";

export class SimpleMarkdownFrame {
  private previewContainer: HTMLElement;
  private editorContainer: HTMLElement;
  private textArea: HTMLTextAreaElement;
  private isEditing = false;
  private component: Component;
  private debouncedOnChange: (content: string) => void;
  private markdownContent: string;

  constructor(
    private app: App,
    private container: HTMLElement,
    private file: TFile,
    private section: SectionInfo,
    private onChange: (content: string) => void
  ) {
    this.component = new Component();
    this.markdownContent = this.section.lines.join('\n');
    this.debouncedOnChange = debounce(this.onChange, 1000); // Augmenter le délai pour lire les logs
    
    this.initializeFrame();
  }

  private initializeFrame(): void {
    this.setupContainer();
    this.createPreviewContainer();
    this.createEditorContainer();
    this.showPreviewMode();
  }

  private setupContainer(): void {
    this.container.empty();
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    `;
  }

  private createPreviewContainer(): void {
    this.previewContainer = this.container.createDiv('simple-markdown-preview');
    this.previewContainer.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      padding: 0.5rem;
      cursor: text;
      box-sizing: border-box;
    `;
    
    this.renderMarkdown();
    this.setupPreviewEvents();
  }

  private createEditorContainer(): void {
    this.editorContainer = this.container.createDiv('simple-markdown-editor');
    this.editorContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: none;
      box-sizing: border-box;
    `;

    this.textArea = this.editorContainer.createEl('textarea');
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
    
    this.textArea.value = this.markdownContent;
    this.setupEditorEvents();
  }

  private async renderMarkdown(): Promise<void> {
    this.previewContainer.empty();
    
    if (!this.markdownContent.trim()) {
      this.renderEmptyState();
      return;
    }

    console.log('🔍 Rendu markdown hybride pour contenu:', this.markdownContent);

    try {
      // PRÉ-TRAITEMENT: Extraire les ![[]] avant MarkdownRenderer
      const preprocessedContent = this.preprocessMarkdown(this.markdownContent);
      
      // Approche hybride: utiliser MarkdownRenderer 
      await MarkdownRenderer.renderMarkdown(
        preprocessedContent.content,
        this.previewContainer,
        this.file.path,
        this.component
      );
      
      // POST-TRAITEMENT: Remettre les éléments traités
      this.postProcessRendering(preprocessedContent.replacements);
      
      console.log('✅ Markdown rendu avec approche hybride');
      console.log('🔍 HTML rendu:', this.previewContainer.innerHTML);
      
    } catch (error) {
      console.error('❌ Erreur rendu markdown, fallback vers parseur manuel:', error);
      // Fallback vers notre parseur manuel
      const renderedHTML = this.parseMarkdownToHTML(this.markdownContent);
      this.previewContainer.innerHTML = renderedHTML;
      this.setupLinksAndImages();
    }
  }

  private preprocessMarkdown(content: string): { content: string; replacements: Array<{ placeholder: string; type: 'image' | 'embed'; name: string }> } {
    console.log('🔍 Pré-traitement du markdown...');
    
    let processedContent = content;
    const replacements: Array<{ placeholder: string; type: 'image' | 'embed'; name: string }> = [];
    
    // Traiter tous les ![[]] en une seule fois pour éviter les doublons
    const allMatches = content.match(/!\[\[([^\]]+)\]\]/g);
    if (allMatches) {
      console.log(`🔍 Éléments ![[]] trouvés: ${allMatches.length}`);
      
      let placeholderIndex = 0;
      allMatches.forEach((match) => {
        const fileName = match.replace(/!\[\[([^\]]+)\]\]/, '$1');
        
        // Vérifier si c'est une image ou un fichier
        const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(fileName);
        
        if (isImage) {
          // Utiliser un span HTML valide comme placeholder
          const placeholder = `<span data-agile-image="${placeholderIndex}" data-name="${fileName}">IMAGE_PLACEHOLDER_${placeholderIndex}</span>`;
          processedContent = processedContent.replace(match, placeholder);
          replacements.push({ placeholder: `IMAGE_PLACEHOLDER_${placeholderIndex}`, type: 'image', name: fileName });
          console.log(`🖼️ Image extraite: ${fileName} → span placeholder`);
        } else {
          // Utiliser un span HTML valide comme placeholder
          const placeholder = `<span data-agile-embed="${placeholderIndex}" data-name="${fileName}">EMBED_PLACEHOLDER_${placeholderIndex}</span>`;
          processedContent = processedContent.replace(match, placeholder);
          replacements.push({ placeholder: `EMBED_PLACEHOLDER_${placeholderIndex}`, type: 'embed', name: fileName });
          console.log(`📄 Embed extrait: ${fileName} → span placeholder`);
        }
        
        placeholderIndex++;
      });
    }
    
    console.log('🔍 Contenu pré-traité:', processedContent);
    return { content: processedContent, replacements };
  }

  private postProcessRendering(replacements: Array<{ placeholder: string; type: 'image' | 'embed'; name: string }>): void {
    console.log('🔍 Post-traitement du rendu...');
    console.log(`🔍 Replacements à traiter: ${replacements.length}`);
    
    // Debug: afficher le HTML actuel
    console.log('🔍 HTML actuel:', this.previewContainer.innerHTML);
    
    // Traiter les placeholders d'images
    const imagePlaceholders = this.previewContainer.querySelectorAll('span[data-agile-image]');
    console.log(`🖼️ Placeholders d'images trouvés: ${imagePlaceholders.length}`);
    imagePlaceholders.forEach(span => {
      const fileName = span.getAttribute('data-name');
      if (fileName) {
        console.log(`🖼️ Remplacement placeholder image: ${fileName}`);
        this.replaceImageSpan(span as HTMLElement, fileName);
      }
    });
    
    // Traiter les placeholders d'embeds
    const embedPlaceholders = this.previewContainer.querySelectorAll('span[data-agile-embed]');
    console.log(`📄 Placeholders d'embeds trouvés: ${embedPlaceholders.length}`);
    embedPlaceholders.forEach(span => {
      const fileName = span.getAttribute('data-name');
      if (fileName) {
        console.log(`📄 Remplacement placeholder embed: ${fileName}`);
        this.replaceEmbedSpan(span as HTMLElement, fileName);
      }
    });
    
    // Rechercher les liens internes qui ne fonctionnent pas
    const links = this.previewContainer.querySelectorAll('a[data-href]');
    console.log(`🔗 Liens trouvés: ${links.length}`);
    links.forEach(link => {
      const href = link.getAttribute('data-href');
      if (href && !(link as HTMLAnchorElement).onclick) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          console.log(`🔗 Clic sur lien post-traité: ${href}`);
          this.app.workspace.openLinkText(href, this.file.path);
        });
      }
    });
  }

  private parseMarkdownToHTML(markdown: string): string {
    let html = markdown;
    
    // Traiter les headings
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // IMPORTANT: Traiter les images AVANT les liens (pour éviter les conflits)
    html = html.replace(/!\[\[([^\]]+)\]\]/g, (_, imageName) => {
      return `<img src="#" class="image-embed" data-src="${imageName}" alt="${imageName}" style="max-width: 100%; height: auto;">`;
    });
    
    // Traiter les liens internes [[text]] (après les images)
    html = html.replace(/\[\[([^\]]+)\]\]/g, (_, linkText) => {
      return `<a href="#" class="internal-link" data-href="${linkText}">${linkText}</a>`;
    });
    
    // Traiter les listes
    html = html.replace(/^[\s]*[-*+] (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    
    // Traiter les listes numérotées
    html = html.replace(/^[\s]*\d+\. (.*$)/gm, '<li>$1</li>');
    
    // Traiter les paragraphes
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Nettoyer les paragraphes vides
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');
    
    return html;
  }

  private replaceImageSpan(span: HTMLElement, imageName: string): void {
    console.log(`🖼️ Remplacement span image: ${imageName}`);
    
    // Résoudre le chemin de l'image
    const imageFile = this.app.metadataCache.getFirstLinkpathDest(imageName, this.file.path);
    
    if (imageFile) {
      const imagePath = this.app.vault.getResourcePath(imageFile);
      const img = document.createElement('img');
      img.src = imagePath;
      img.alt = imageName;
      img.style.cssText = 'max-width: 100%; height: auto; border-radius: 4px; cursor: pointer;';
      img.setAttribute('data-src', imageName);
      
      // Ajouter l'événement de clic pour l'image
      img.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`🖼️ Clic sur image: ${imageName}`);
        this.app.workspace.openLinkText(imageName, this.file.path);
      });
      
      // Remplacer le span par l'image
      span.parentElement?.replaceChild(img, span);
      console.log(`✅ Image span remplacée: ${imageName}`);
    } else {
      // Image non trouvée, créer un placeholder d'erreur
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'padding: 1rem; border: 2px dashed var(--text-error); border-radius: 4px; text-align: center; color: var(--text-error); background: var(--background-secondary); font-family: var(--font-monospace);';
      errorDiv.textContent = `Image non trouvée: ${imageName}`;
      
      span.parentElement?.replaceChild(errorDiv, span);
      console.log(`❌ Image non trouvée: ${imageName}`);
    }
  }

  private replaceEmbedSpan(span: HTMLElement, fileName: string): void {
    console.log(`📄 Remplacement span embed: ${fileName}`);
    
    // Chercher le fichier
    const targetFile = this.app.metadataCache.getFirstLinkpathDest(fileName, this.file.path);
    
    if (targetFile) {
      // Créer un embed temporaire avec chargement asynchrone
      const embedDiv = document.createElement('div');
      embedDiv.className = 'markdown-embed';
      embedDiv.style.cssText = 'border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 1rem; margin: 0.5rem 0; background: var(--background-primary-alt); cursor: pointer;';
      embedDiv.setAttribute('data-file', fileName);
      
      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = 'font-weight: bold; margin-bottom: 0.5rem; color: var(--text-accent); font-size: 0.9em;';
      titleDiv.textContent = `📄 ${fileName}`;
      embedDiv.appendChild(titleDiv);
      
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'color: var(--text-muted); font-style: italic;';
      contentDiv.textContent = 'Chargement...';
      embedDiv.appendChild(contentDiv);
      
      // Remplacer le span par l'embed
      span.parentElement?.replaceChild(embedDiv, span);
      
      // Charger le contenu de façon asynchrone
      this.loadEmbedContent(fileName);
      
      console.log(`✅ Embed span remplacé: ${fileName}`);
    } else {
      // Fichier non trouvé, créer un placeholder d'erreur
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'padding: 1rem; border: 2px dashed var(--text-error); border-radius: 4px; text-align: center; color: var(--text-error); background: var(--background-secondary); font-family: var(--font-monospace);';
      errorDiv.textContent = `Fichier non trouvé: ${fileName}`;
      
      span.parentElement?.replaceChild(errorDiv, span);
      console.log(`❌ Fichier non trouvé: ${fileName}`);
    }
  }

  private replaceImagePlaceholder(placeholder: string, imageName: string): void {
    console.log(`🖼️ Remplacement placeholder image: ${placeholder} → ${imageName}`);
    
    // Chercher le placeholder dans tous les nœuds de texte
    const textNodes = this.getAllTextNodes(this.previewContainer);
    let placeholderNode = null;
    
    for (const node of textNodes) {
      if (node.textContent && node.textContent.includes(placeholder)) {
        placeholderNode = node;
        break;
      }
    }
    
    if (placeholderNode && placeholderNode.parentElement) {
      // Résoudre le chemin de l'image
      const imageFile = this.app.metadataCache.getFirstLinkpathDest(imageName, this.file.path);
      
      if (imageFile) {
        const imagePath = this.app.vault.getResourcePath(imageFile);
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = imageName;
        img.style.cssText = 'max-width: 100%; height: auto; border-radius: 4px; cursor: pointer;';
        img.setAttribute('data-src', imageName);
        
        // Remplacer le texte du placeholder
        const newText = placeholderNode.textContent!.replace(placeholder, '');
        if (newText.trim()) {
          placeholderNode.textContent = newText;
          placeholderNode.parentElement.insertBefore(img, placeholderNode);
        } else {
          placeholderNode.parentElement.replaceChild(img, placeholderNode);
        }
        
        // Ajouter l'événement de clic pour l'image
        img.addEventListener('click', (e) => {
          e.preventDefault();
          console.log(`🖼️ Clic sur image: ${imageName}`);
          this.app.workspace.openLinkText(imageName, this.file.path);
        });
        
        console.log(`✅ Image placeholder remplacée: ${imageName}`);
      } else {
        // Image non trouvée, créer un placeholder d'erreur
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 1rem; border: 2px dashed var(--text-error); border-radius: 4px; text-align: center; color: var(--text-error); background: var(--background-secondary); font-family: var(--font-monospace);';
        errorDiv.textContent = `Image non trouvée: ${imageName}`;
        
        const newText = placeholderNode.textContent!.replace(placeholder, '');
        if (newText.trim()) {
          placeholderNode.textContent = newText;
          placeholderNode.parentElement.insertBefore(errorDiv, placeholderNode);
        } else {
          placeholderNode.parentElement.replaceChild(errorDiv, placeholderNode);
        }
        
        console.log(`❌ Image non trouvée: ${imageName}`);
      }
    } else {
      console.log(`❌ Placeholder non trouvé dans le DOM: ${placeholder}`);
    }
  }

  private getAllTextNodes(element: HTMLElement): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node: Node | null;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    
    return textNodes;
  }

  private replaceEmbedPlaceholder(placeholder: string, fileName: string): void {
    console.log(`📄 Remplacement placeholder embed: ${placeholder} → ${fileName}`);
    
    // Chercher le placeholder dans tous les nœuds de texte
    const textNodes = this.getAllTextNodes(this.previewContainer);
    let placeholderNode = null;
    
    for (const node of textNodes) {
      if (node.textContent && node.textContent.includes(placeholder)) {
        placeholderNode = node;
        break;
      }
    }
    
    if (placeholderNode && placeholderNode.parentElement) {
      // Chercher le fichier
      const targetFile = this.app.metadataCache.getFirstLinkpathDest(fileName, this.file.path);
      
      if (targetFile) {
        // Créer un embed temporaire avec chargement asynchrone
        const embedDiv = document.createElement('div');
        embedDiv.className = 'markdown-embed';
        embedDiv.style.cssText = 'border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 1rem; margin: 0.5rem 0; background: var(--background-primary-alt); cursor: pointer;';
        embedDiv.setAttribute('data-file', fileName);
        
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-weight: bold; margin-bottom: 0.5rem; color: var(--text-accent); font-size: 0.9em;';
        titleDiv.textContent = `📄 ${fileName}`;
        embedDiv.appendChild(titleDiv);
        
        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'color: var(--text-muted); font-style: italic;';
        contentDiv.textContent = 'Chargement...';
        embedDiv.appendChild(contentDiv);
        
        // Remplacer le texte du placeholder
        const newText = placeholderNode.textContent!.replace(placeholder, '');
        if (newText.trim()) {
          placeholderNode.textContent = newText;
          placeholderNode.parentElement.insertBefore(embedDiv, placeholderNode);
        } else {
          placeholderNode.parentElement.replaceChild(embedDiv, placeholderNode);
        }
        
        // Charger le contenu de façon asynchrone
        this.loadEmbedContent(fileName);
        
        console.log(`✅ Embed placeholder remplacé: ${fileName}`);
      } else {
        // Fichier non trouvé, créer un placeholder d'erreur
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 1rem; border: 2px dashed var(--text-error); border-radius: 4px; text-align: center; color: var(--text-error); background: var(--background-secondary); font-family: var(--font-monospace);';
        errorDiv.textContent = `Fichier non trouvé: ${fileName}`;
        
        const newText = placeholderNode.textContent!.replace(placeholder, '');
        if (newText.trim()) {
          placeholderNode.textContent = newText;
          placeholderNode.parentElement.insertBefore(errorDiv, placeholderNode);
        } else {
          placeholderNode.parentElement.replaceChild(errorDiv, placeholderNode);
        }
        
        console.log(`❌ Fichier non trouvé: ${fileName}`);
      }
    } else {
      console.log(`❌ Placeholder non trouvé dans le DOM: ${placeholder}`);
    }
  }

  private async loadEmbedContent(fileName: string): Promise<void> {
    const embedEl = this.previewContainer.querySelector(`[data-file="${fileName}"]`);
    if (!embedEl) return;
    
    const targetFile = this.app.metadataCache.getFirstLinkpathDest(fileName, this.file.path);
    if (!targetFile) return;
    
    try {
      const fileContent = await this.app.vault.read(targetFile);
      const lines = fileContent.split('\n').slice(0, 10); // Limiter à 10 lignes
      const preview = lines.join('\n');
      
      // Mettre à jour le contenu
      const contentDiv = embedEl.querySelector('div:last-child');
      if (contentDiv) {
        contentDiv.innerHTML = this.parseMarkdownToHTML(preview);
      }
      
      // Ajouter l'événement de clic pour ouvrir le fichier
      embedEl.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`📄 Clic sur embed: ${fileName}`);
        this.app.workspace.openLinkText(fileName, this.file.path);
      });
      
      console.log(`✅ Contenu embed chargé: ${fileName}`);
    } catch (error) {
      console.error(`❌ Erreur chargement embed: ${fileName}`, error);
      const contentDiv = embedEl.querySelector('div:last-child');
      if (contentDiv) {
        contentDiv.textContent = `❌ Erreur: ${fileName}`;
      }
    }
  }

  private setupTaskCheckboxes(): void {
    const checkboxes = this.previewContainer.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
    console.log(`☑️ Cases à cocher trouvées: ${checkboxes.length}`);
    
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const isChecked = target.checked;
        
        console.log(`☑️ Case ${isChecked ? 'cochée' : 'décochée'}`);
        
        // Trouver l'élément li parent pour identifier la tâche
        const listItem = target.closest('li.task-list-item');
        if (listItem) {
          this.updateTaskInMarkdown(listItem as HTMLElement, isChecked);
        }
      });
    });
  }

  private updateTaskInMarkdown(listItem: HTMLElement, isChecked: boolean): void {
    // Récupérer le texte de la tâche
    const taskText = this.getTaskText(listItem);
    console.log(`📝 Mise à jour tâche: "${taskText}" → ${isChecked ? 'cochée' : 'décochée'}`);
    
    // Mettre à jour le markdown source
    const currentContent = this.markdownContent;
    const lines = currentContent.split('\n');
    
    // Chercher la ligne correspondante
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pattern pour les tâches: - [ ] ou - [x] suivi du texte
      const taskPattern = /^(\s*[-*+]\s)\[.\](\s.*)$/;
      const match = line.match(taskPattern);
      
      if (match && this.lineContainsTask(line, taskText)) {
        const [, prefix, suffix] = match;
        const newCheckbox = isChecked ? '[x]' : '[ ]';
        lines[i] = `${prefix}${newCheckbox}${suffix}`;
        
        console.log(`✅ Ligne mise à jour: ${lines[i]}`);
        break;
      }
    }
    
    // Sauvegarder le contenu modifié
    const newContent = lines.join('\n');
    this.markdownContent = newContent;
    
    // Déclencher la sauvegarde debounced
    this.debouncedOnChange(this.markdownContent);
  }

  private getTaskText(listItem: HTMLElement): string {
    // Récupérer le texte de la tâche sans la case à cocher
    const textNode = listItem.childNodes[listItem.childNodes.length - 1];
    return textNode?.textContent?.trim() || '';
  }

  private lineContainsTask(line: string, taskText: string): boolean {
    // Vérifier si la ligne contient le texte de la tâche
    const lineText = line.replace(/^(\s*[-*+]\s)\[.\](\s)/, '').trim();
    return lineText === taskText;
  }

  private setupLinksAndImages(): void {
    // Gérer les cases à cocher des tâches
    this.setupTaskCheckboxes();
    
    // Gérer les liens internes
    const internalLinks = this.previewContainer.querySelectorAll('a.internal-link');
    internalLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('data-href');
        if (href) {
          console.log(`🔗 Clic sur lien interne: ${href}`);
          this.app.workspace.openLinkText(href, this.file.path);
        }
      });
    });
    
    // Gérer les images
    const images = this.previewContainer.querySelectorAll('img.image-embed');
    images.forEach(img => {
      const imageName = img.getAttribute('data-src');
      if (imageName) {
        console.log(`🖼️ Traitement image: ${imageName}`);
        
        // Résoudre le chemin de l'image
        const imageFile = this.app.metadataCache.getFirstLinkpathDest(imageName, this.file.path);
        console.log(`🔍 Fichier image résolu:`, imageFile);
        
        if (imageFile) {
          const imagePath = this.app.vault.getResourcePath(imageFile);
          img.setAttribute('src', imagePath);
          console.log(`✅ Image trouvée, path: ${imagePath}`);
        } else {
          // Image non trouvée, afficher un placeholder
          (img as HTMLImageElement).style.display = 'none';
          const placeholder = document.createElement('div');
          placeholder.className = 'image-placeholder';
          placeholder.style.cssText = `
            padding: 1rem;
            border: 2px dashed var(--text-error);
            border-radius: 4px;
            text-align: center;
            color: var(--text-error);
            background: var(--background-secondary);
            font-family: var(--font-monospace);
          `;
          placeholder.textContent = `Image non trouvée: ${imageName}`;
          img.parentNode?.insertBefore(placeholder, img);
          console.log(`❌ Image non trouvée: ${imageName}`);
        }
        
        // Ajouter le clic pour ouvrir l'image
        img.addEventListener('click', (e) => {
          e.preventDefault();
          console.log(`🖼️ Clic sur image: ${imageName}`);
          this.app.workspace.openLinkText(imageName, this.file.path);
        });
      }
    });
  }



  private async renderFileEmbed(embedElement: HTMLElement, fileName: string): Promise<void> {
    console.log(`📄 Rendu embed pour fichier: ${fileName}`);
    
    // Chercher le fichier
    const targetFile = this.app.metadataCache.getFirstLinkpathDest(fileName, this.file.path);
    
    if (targetFile) {
      try {
        // Lire le contenu du fichier
        const fileContent = await this.app.vault.read(targetFile);
        
        // Créer un container pour l'embed
        const embedContainer = document.createElement('div');
        embedContainer.className = 'markdown-embed';
        embedContainer.style.cssText = `
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          padding: 1rem;
          margin: 0.5rem 0;
          background: var(--background-primary-alt);
        `;
        
        // Ajouter un titre
        const embedTitle = document.createElement('div');
        embedTitle.className = 'markdown-embed-title';
        embedTitle.style.cssText = `
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: var(--text-accent);
          font-size: 0.9em;
        `;
        embedTitle.textContent = `📄 ${fileName}`;
        embedContainer.appendChild(embedTitle);
        
        // Ajouter le contenu
        const embedContent = document.createElement('div');
        embedContent.className = 'markdown-embed-content';
        
        // Rendu simple du contenu (premières lignes)
        const lines = fileContent.split('\n').slice(0, 10); // Limiter à 10 lignes
        const preview = lines.join('\n');
        const renderedHTML = this.parseMarkdownToHTML(preview);
        embedContent.innerHTML = renderedHTML;
        
        embedContainer.appendChild(embedContent);
        
        // Ajouter un clic pour ouvrir le fichier complet
        embedContainer.addEventListener('click', (e) => {
          e.preventDefault();
          console.log(`📄 Clic sur embed: ${fileName}`);
          this.app.workspace.openLinkText(fileName, this.file.path);
        });
        
        // Remplacer l'embed original
        embedElement.replaceWith(embedContainer);
        
        console.log(`✅ Embed rendu pour: ${fileName}`);
        
      } catch (error) {
        console.error(`❌ Erreur lecture fichier embed: ${fileName}`, error);
        embedElement.textContent = `❌ Erreur: ${fileName}`;
      }
    } else {
      console.log(`❌ Fichier embed non trouvé: ${fileName}`);
      embedElement.textContent = `❌ Fichier non trouvé: ${fileName}`;
    }
  }

  private renderEmptyState(): void {
    const placeholder = this.previewContainer.createDiv('empty-placeholder');
    placeholder.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 80px;
      color: var(--text-muted);
      font-style: italic;
      cursor: text;
    `;
    placeholder.textContent = "Cliquez pour commencer à écrire...";
  }


  private setupPreviewEvents(): void {
    this.previewContainer.addEventListener('click', (e) => {
      if (!this.isInteractiveElement(e.target as HTMLElement)) {
        console.log('🖱️ Clic sur preview → mode édition');
        this.enterEditMode();
      }
    });
  }

  private setupEditorEvents(): void {
    this.textArea.addEventListener('input', () => {
      this.markdownContent = this.textArea.value;
      this.debouncedOnChange(this.markdownContent);
    });

    this.textArea.addEventListener('blur', () => {
      console.log('📝 Blur sur textarea → mode preview');
      this.exitEditMode();
    });

    this.textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        console.log('⌨️ Escape → mode preview');
        this.exitEditMode();
      } else if (e.key === 'Enter') {
        this.handleEnterKey(e);
      }
    });
  }

  private handleEnterKey(e: KeyboardEvent): void {
    const textarea = this.textArea;
    const cursorPos = textarea.selectionStart;
    const content = textarea.value;
    
    // Trouver le début de la ligne actuelle
    const lineStart = content.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineEnd = content.indexOf('\n', cursorPos);
    const currentLine = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
    
    console.log(`📝 Ligne actuelle: "${currentLine}"`);
    
    // Détecter les différents types de listes
    const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s(.*)$/);
    const taskMatch = currentLine.match(/^(\s*)([-*+])\s(\[.\])\s(.*)$/);
    
    if (taskMatch) {
      // Liste de tâches
      const [, indent, bullet, , text] = taskMatch;
      
      if (text.trim() === '') {
        // Ligne de tâche vide → sortir de la liste
        e.preventDefault();
        this.exitList(cursorPos, lineStart);
      } else {
        // Créer une nouvelle tâche
        e.preventDefault();
        const newTask = `\n${indent}${bullet} [ ] `;
        this.insertTextAtCursor(newTask);
      }
    } else if (listMatch) {
      // Liste normale
      const [, indent, bullet, text] = listMatch;
      
      if (text.trim() === '') {
        // Ligne de liste vide → sortir de la liste
        e.preventDefault();
        this.exitList(cursorPos, lineStart);
      } else {
        // Créer un nouvel item
        e.preventDefault();
        let newBullet = bullet;
        
        // Si c'est une liste numérotée, incrémenter le numéro
        if (/\d+\./.test(bullet)) {
          const num = parseInt(bullet) + 1;
          newBullet = `${num}.`;
        }
        
        const newItem = `\n${indent}${newBullet} `;
        this.insertTextAtCursor(newItem);
      }
    }
    // Si ce n'est pas une liste, laisser le comportement par défaut
  }
  
  private exitList(cursorPos: number, lineStart: number): void {
    const textarea = this.textArea;
    const content = textarea.value;
    
    // Supprimer la ligne de liste vide et ajouter une ligne normale
    const beforeList = content.substring(0, lineStart);
    const afterList = content.substring(cursorPos);
    
    textarea.value = beforeList.trimEnd() + '\n\n' + afterList;
    
    // Positionner le curseur après les deux nouvelles lignes
    const newCursorPos = beforeList.trimEnd().length + 2;
    textarea.selectionStart = newCursorPos;
    textarea.selectionEnd = newCursorPos;
    
    console.log('📝 Sortie de la liste');
  }
  
  private insertTextAtCursor(text: string): void {
    const textarea = this.textArea;
    const cursorPos = textarea.selectionStart;
    const content = textarea.value;
    
    textarea.value = content.substring(0, cursorPos) + text + content.substring(cursorPos);
    
    // Positionner le curseur à la fin du texte inséré
    const newCursorPos = cursorPos + text.length;
    textarea.selectionStart = newCursorPos;
    textarea.selectionEnd = newCursorPos;
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    let current = element;
    while (current && current !== this.previewContainer) {
      const tag = current.tagName.toLowerCase();
      
      // Éléments interactifs standard
      if (['a', 'button', 'input', 'textarea', 'select', 'img'].includes(tag)) {
        return true;
      }
      
      // Classes spéciales d'Obsidian
      if (current.classList.contains('internal-link') || 
          current.classList.contains('external-link') ||
          current.classList.contains('image-embed') ||
          current.classList.contains('file-embed') ||
          current.classList.contains('tag') ||
          current.classList.contains('math') ||
          current.classList.contains('frontmatter')) {
        return true;
      }
      
      // Attributs interactifs
      if (current.hasAttribute('href') || 
          current.hasAttribute('src') ||
          current.hasAttribute('data-href') ||
          current.hasAttribute('data-path') ||
          current.hasAttribute('data-link')) {
        return true;
      }
      
      current = current.parentElement!;
    }
    
    return false;
  }

  private enterEditMode(): void {
    this.isEditing = true;
    this.previewContainer.style.display = 'none';
    this.editorContainer.style.display = 'block';
    
    // Synchroniser le contenu
    this.textArea.value = this.markdownContent;
    this.textArea.focus();
  }

  private async exitEditMode(): Promise<void> {
    if (!this.isEditing) return;
    
    this.isEditing = false;
    this.markdownContent = this.textArea.value;
    
    this.editorContainer.style.display = 'none';
    this.previewContainer.style.display = 'block';
    
    // Re-rendre le preview
    await this.renderMarkdown();
  }

  private showPreviewMode(): void {
    this.previewContainer.style.display = 'block';
    this.editorContainer.style.display = 'none';
    this.isEditing = false;
  }

  // Méthodes publiques
  async updateContent(newSection: SectionInfo): Promise<void> {
    this.section = newSection;
    this.markdownContent = newSection.lines.join('\n');
    
    if (this.isEditing) {
      this.textArea.value = this.markdownContent;
    } else {
      await this.renderMarkdown();
    }
  }

  getContent(): string {
    if (this.isEditing) {
      return this.textArea.value;
    }
    return this.markdownContent;
  }

  focusEditor(): void {
    this.enterEditMode();
  }

  async focusPreview(): Promise<void> {
    await this.exitEditMode();
  }

  isInEditMode(): boolean {
    return this.isEditing;
  }

  destroy(): void {
    this.component.unload();
    this.container.empty();
    console.log('🗑️ SimpleMarkdownFrame détruite');
  }
}