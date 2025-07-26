// src/core/business/markdownProcessor.ts

/**
 * Résultat du pré-traitement markdown.
 */
export interface MarkdownPreprocessResult {
  readonly content: string;
  readonly replacements: readonly MarkdownReplacement[];
}

/**
 * Remplacement d'élément markdown.
 */
export interface MarkdownReplacement {
  readonly placeholder: string;
  readonly type: 'image' | 'embed';
  readonly name: string;
  readonly index: number;
}

/**
 * Configuration pour le parsing de tâches.
 */
export interface TaskParseResult {
  readonly isTask: boolean;
  readonly isChecked: boolean;
  readonly text: string;
  readonly prefix: string;
}

/**
 * Processeur pur pour les opérations markdown.
 * Logique métier testable sans dépendances DOM ou Obsidian.
 */
export class MarkdownProcessor {
  private static readonly IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg|webp)$/i;
  private static readonly EMBED_PATTERN = /!\[\[([^\]]+)\]\]/g;
  private static readonly TASK_PATTERN = /^(\s*)([-*+])\s(\[.?\])\s(.*)$/;
  private static readonly LIST_PATTERN = /^(\s*)([-*+]|\d+\.)\s(.*)$/;

  /**
   * Pré-traite le contenu markdown pour extraire les éléments spéciaux.
   * @param content Contenu markdown source
   * @returns Contenu traité et liste des remplacements
   */
  public static preprocessMarkdown(content: string): MarkdownPreprocessResult {
    let processedContent = content;
    const replacements: MarkdownReplacement[] = [];

    // Extraire tous les éléments ![[]]
    const allMatches = Array.from(content.matchAll(this.EMBED_PATTERN));
    
    allMatches.forEach((match, index) => {
      const fileName = match[1];
      const isImage = this.IMAGE_EXTENSIONS.test(fileName);
      
      const placeholder = `<span data-agile-${isImage ? 'image' : 'embed'}="${index}" data-name="${fileName}">${isImage ? 'IMAGE' : 'EMBED'}_PLACEHOLDER_${index}</span>`;
      
      processedContent = processedContent.replace(match[0], placeholder);
      
      replacements.push({
        placeholder: `${isImage ? 'IMAGE' : 'EMBED'}_PLACEHOLDER_${index}`,
        type: isImage ? 'image' : 'embed',
        name: fileName,
        index
      });
    });

    return {
      content: processedContent,
      replacements
    };
  }

  /**
   * Parse une ligne pour détecter si c'est une tâche.
   * @param line Ligne à analyser
   * @returns Résultat du parsing
   */
  public static parseTaskLine(line: string): TaskParseResult {
    const match = line.match(this.TASK_PATTERN);
    
    if (!match) {
      return {
        isTask: false,
        isChecked: false,
        text: line,
        prefix: ''
      };
    }

    const [, indent, bullet, checkbox, text] = match;
    const isChecked = checkbox === '[x]' || checkbox === '[X]';

    return {
      isTask: true,
      isChecked,
      text: text.trim(),
      prefix: `${indent}${bullet}`
    };
  }

  /**
   * Met à jour l'état d'une tâche dans le contenu markdown.
   * @param content Contenu markdown
   * @param taskText Texte de la tâche à modifier
   * @param isChecked Nouvel état
   * @returns Contenu modifié
   */
  public static updateTaskInContent(
    content: string,
    taskText: string,
    isChecked: boolean
  ): string {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const taskResult = this.parseTaskLine(line);
      
      if (taskResult.isTask && taskResult.text === taskText) {
        const newCheckbox = isChecked ? '[x]' : '[ ]';
        lines[i] = `${taskResult.prefix} ${newCheckbox} ${taskResult.text}`;
        break;
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Gère l'auto-complétion des listes lors de l'appui sur Entrée.
   * @param content Contenu actuel
   * @param cursorPos Position du curseur
   * @returns Nouveau contenu et nouvelle position du curseur
   */
  public static handleListContinuation(
    content: string,
    cursorPos: number
  ): { content: string; newCursorPos: number } | null {
    const lineStart = content.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineEnd = content.indexOf('\n', cursorPos);
    const currentLine = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

    const listMatch = currentLine.match(this.LIST_PATTERN);
    const taskMatch = this.parseTaskLine(currentLine);

    if (taskMatch.isTask) {
      if (taskMatch.text.trim() === '') {
        // Ligne de tâche vide → sortir de la liste
        return this.exitList(content, cursorPos, lineStart);
      } else {
        // Créer une nouvelle tâche
        const newTask = `\n${taskMatch.prefix} [ ] `;
        return this.insertTextAtCursor(content, cursorPos, newTask);
      }
    } else if (listMatch) {
      const [, indent, bullet, text] = listMatch;
      
      if (text.trim() === '') {
        // Ligne de liste vide → sortir de la liste
        return this.exitList(content, cursorPos, lineStart);
      } else {
        // Créer un nouvel item
        let newBullet = bullet;
        
        // Si c'est une liste numérotée, incrémenter le numéro
        if (/\d+\./.test(bullet)) {
          const num = parseInt(bullet) + 1;
          newBullet = `${num}.`;
        }
        
        const newItem = `\n${indent}${newBullet} `;
        return this.insertTextAtCursor(content, cursorPos, newItem);
      }
    }

    return null;
  }

  /**
   * Sort d'une liste en supprimant la ligne vide et ajoutant une ligne normale.
   * @param content Contenu actuel
   * @param cursorPos Position du curseur
   * @param lineStart Début de la ligne actuelle
   * @returns Nouveau contenu et position
   */
  private static exitList(
    content: string,
    cursorPos: number,
    lineStart: number
  ): { content: string; newCursorPos: number } {
    const beforeList = content.substring(0, lineStart);
    const afterList = content.substring(cursorPos);
    
    const newContent = beforeList.trimEnd() + '\n\n' + afterList;
    const newCursorPos = beforeList.trimEnd().length + 2;
    
    return { content: newContent, newCursorPos };
  }

  /**
   * Insère du texte à la position du curseur.
   * @param content Contenu actuel
   * @param cursorPos Position du curseur
   * @param text Texte à insérer
   * @returns Nouveau contenu et position
   */
  private static insertTextAtCursor(
    content: string,
    cursorPos: number,
    text: string
  ): { content: string; newCursorPos: number } {
    const newContent = content.substring(0, cursorPos) + text + content.substring(cursorPos);
    const newCursorPos = cursorPos + text.length;
    
    return { content: newContent, newCursorPos };
  }

  /**
   * Parse manuellement le markdown en HTML basique.
   * @param markdown Contenu markdown
   * @returns HTML généré
   */
  public static parseMarkdownToHTML(markdown: string): string {
    let html = markdown;
    
    // Traiter les headings
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Traiter les images AVANT les liens (pour éviter les conflits)
    html = html.replace(this.EMBED_PATTERN, (_, imageName) => {
      if (this.IMAGE_EXTENSIONS.test(imageName)) {
        return `<img src="#" class="image-embed" data-src="${imageName}" alt="${imageName}" style="max-width: 100%; height: auto;">`;
      } else {
        return `<a href="#" class="internal-link" data-href="${imageName}">${imageName}</a>`;
      }
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

  /**
   * Vérifie si un élément est interactif (ne doit pas déclencher l'édition).
   * @param element Element à vérifier
   * @param container Container de référence
   * @returns true si l'élément est interactif
   */
  public static isInteractiveElement(element: HTMLElement, container: HTMLElement): boolean {
    let current = element;
    
    while (current && current !== container) {
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

  /**
   * Normalise les fins de ligne dans le contenu.
   * @param content Contenu à normaliser
   * @returns Contenu avec fins de ligne uniformes
   */
  public static normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Compte les lignes dans un contenu.
   * @param content Contenu à analyser
   * @returns Nombre de lignes
   */
  public static countLines(content: string): number {
    return content.split('\n').length;
  }

  /**
   * Extrait un aperçu du contenu (premières lignes).
   * @param content Contenu source
   * @param maxLines Nombre maximum de lignes
   * @returns Aperçu du contenu
   */
  public static extractPreview(content: string, maxLines: number = 3): string {
    const lines = content.split('\n').slice(0, maxLines);
    return lines.join('\n');
  }
}