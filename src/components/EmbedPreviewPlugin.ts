/**
 * EmbedPreviewPlugin - Plugin CM6 pour afficher les embeds ![[...]] dans les cadres
 *
 * Inspiré du système Live Preview d'Obsidian, ce plugin :
 * - Détecte les embeds ![[...]] dans le texte
 * - Résout les fichiers cibles via metadataCache
 * - Affiche les images directement
 * - Rend les notes Markdown embarquées
 * - Masque le texte brut ![[...]]
 */

import { App, TFile } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

/**
 * Widget CM6 pour afficher un embed (image, note, etc.)
 */
class EmbedWidget extends WidgetType {
  constructor(
    private app: App,
    private srcPath: string,
    private linkText: string,
    private tfile: TFile | null
  ) {
    super();
  }

  eq(other: EmbedWidget): boolean {
    return other.linkText === this.linkText && other.tfile?.path === this.tfile?.path;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.classList.add('agile-embed-wrapper');

    if (!this.tfile) {
      wrapper.textContent = `⚠ ${this.linkText} introuvable`;
      wrapper.classList.add('agile-embed-error');
      return wrapper;
    }

    // Image - en mode édition, afficher un lien pour pouvoir éditer le texte source
    // Le rendu de l'image se fera en mode preview via MarkdownRenderer
    if (this.isImageExt(this.tfile.extension)) {
      const link = document.createElement('a');
      link.classList.add('internal-link', 'agile-embed-link');
      link.textContent = `🖼️ ${this.tfile.basename}`;
      link.href = this.tfile.path;
      link.style.textDecoration = 'none';
      link.style.color = 'var(--link-color)';
      wrapper.appendChild(link);
      return wrapper;
    }

    // Fichier .base - en mode édition, on veut voir le texte source pour l'éditer
    // Le rendu de la base se fera en mode preview via MarkdownRenderer
    if (this.tfile.extension === 'base') {
      const link = document.createElement('a');
      link.classList.add('internal-link', 'agile-embed-link');
      link.textContent = `🗂️ ${this.tfile.basename}`;
      link.href = this.tfile.path;
      link.style.textDecoration = 'none';
      link.style.color = 'var(--link-color)';
      wrapper.appendChild(link);
      return wrapper;
    }

    // Note Markdown - afficher juste un lien en mode édition
    if (this.tfile.extension === 'md') {
      const link = document.createElement('a');
      link.classList.add('internal-link', 'agile-embed-link');
      link.textContent = `📄 ${this.tfile.basename}`;
      link.href = this.tfile.path;
      link.style.textDecoration = 'none';
      link.style.color = 'var(--link-color)';
      wrapper.appendChild(link);
      return wrapper;
    }

    // Fallback fichier générique
    const span = document.createElement('span');
    span.classList.add('agile-embed-file');
    span.textContent = `[${this.tfile.name}]`;
    wrapper.appendChild(span);

    return wrapper;
  }

  ignoreEvent(): boolean {
    return false; // Autoriser les événements (clic, etc.)
  }

  private isImageExt(ext: string): boolean {
    const lower = ext.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'avif', 'heic'].includes(lower);
  }
}

/**
 * Plugin CM6 pour afficher les embeds
 */
class EmbedPreviewPluginValue {
  decorations: DecorationSet;

  constructor(
    private view: EditorView,
    private app: App,
    private srcPath: string
  ) {
    this.decorations = this.buildDecorations();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations();
    }
  }

  buildDecorations(): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const docText = this.view.state.doc.toString();

    // Regex pour trouver tous les ![[...]]
    const embedRE = /!\[\[([^\]]+)\]\]/g;
    let match;

    const matches: Array<{ from: number; to: number; inner: string; tfile: TFile | null }> = [];

    while ((match = embedRE.exec(docText)) !== null) {
      const fullMatch = match[0];
      const inner = match[1]; // le chemin cible

      const from = match.index;
      const to = from + fullMatch.length;

      // Résoudre la cible -> TFile
      const tfile = this.app.metadataCache.getFirstLinkpathDest(inner, this.srcPath) as TFile | null;

      matches.push({ from, to, inner, tfile });
    }

    // Ajouter les décorations dans l'ordre
    for (const { from, to, inner, tfile } of matches) {
      // D'abord masquer le texte brut ![[...]]
      const hiddenText = Decoration.replace({
        inclusive: true,
        widget: new EmbedWidget(this.app, this.srcPath, inner, tfile),
      });

      // Ajouter la décoration replace avec widget intégré
      builder.add(from, to, hiddenText);
    }

    return builder.finish();
  }
}

/**
 * Crée le plugin d'embeds pour un EditorView
 */
export function embedPreviewPlugin(app: App, srcPath: string) {
  return ViewPlugin.fromClass(
    class {
      plugin: EmbedPreviewPluginValue;

      constructor(view: EditorView) {
        this.plugin = new EmbedPreviewPluginValue(view, app, srcPath);
      }

      update(update: ViewUpdate) {
        this.plugin.update(update);
      }

      get decorations() {
        return this.plugin.decorations;
      }
    },
    {
      decorations: v => v.decorations
    }
  );
}
