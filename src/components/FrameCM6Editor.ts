/**
 * FrameCM6Editor - Éditeur CodeMirror 6 pour les cadres Agile Board
 *
 * Approche inspirée de Orgmode CM6 : chaque cadre a sa propre instance EditorView
 * avec son propre document indépendant, synchronisé avec la section correspondante
 * de la note Markdown.
 */

import { App, MarkdownView, TFile } from 'obsidian';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

/**
 * Extrait les extensions CM6 de l'éditeur actif d'Obsidian.
 * Cela nous permet de réutiliser les extensions Live Preview (wiki-links, checkboxes, etc.)
 */
function extractObsidianExtensions(app: App): Extension[] {
  const activeView = app.workspace.getActiveViewOfType(MarkdownView);

  if (!activeView || !activeView.editor) {
    console.warn('⚠️ [FrameCM6Editor] Pas d\'éditeur actif pour extraire les extensions');
    return [];
  }

  // @ts-ignore - accès aux propriétés internes CM6
  const cm = activeView.editor.cm;

  if (!cm || !cm.state) {
    console.warn('⚠️ [FrameCM6Editor] Pas de state CM6 disponible');
    return [];
  }

  // Récupérer les extensions de l'état actuel
  // @ts-ignore - state.extensions n'est pas dans les types publics mais existe
  const extensions = cm.state.extensions || [];

  console.log('📦 [FrameCM6Editor] Extensions Obsidian extraites:', extensions.length);
  return extensions;
}

export interface FrameCM6EditorOptions {
  /** Contenu initial du cadre */
  initialContent: string;
  /** Fichier source (pour résoudre les embeds) */
  sourceFile: TFile;
  /** Callback appelé quand le contenu change */
  onChange?: (content: string) => void;
  /** Callback appelé quand l'éditeur perd le focus */
  onBlur?: () => void;
  /** Placeholder si vide */
  placeholder?: string;
}

/**
 * Éditeur CM6 pour un cadre individuel.
 * Chaque cadre a son propre EditorView isolé.
 */
export class FrameCM6Editor {
  private view: EditorView | null = null;
  private container: HTMLElement;

  constructor(
    private app: App,
    container: HTMLElement,
    private options: FrameCM6EditorOptions
  ) {
    this.container = container;
    this.initialize();
  }

  /**
   * Initialise l'éditeur CM6 dans le conteneur.
   */
  private initialize(): void {
    // Tenter d'extraire les extensions Obsidian pour Live Preview (images, embeds, etc.)
    const obsidianExtensions = extractObsidianExtensions(this.app);

    // Extensions de base pour l'éditeur
    const extensions: Extension[] = [
      // PRIORITÉ: Extensions Obsidian si disponibles (Live Preview complet)
      ...obsidianExtensions,

      // Fallback: Support Markdown basique si pas d'extensions Obsidian
      ...(obsidianExtensions.length === 0 ? [markdown()] : []),

      // Historique (undo/redo)
      history(),

      // Keymaps de base + ESC pour quitter
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        // ESC pour quitter l'édition
        {
          key: 'Escape',
          run: () => {
            if (this.options.onBlur) {
              this.options.onBlur();
            }
            return true;
          }
        }
      ]),

      // Listener pour détecter les changements
      EditorView.updateListener.of((update) => {
        if (update.docChanged && this.options.onChange) {
          const newContent = this.view?.state.doc.toString() || '';
          this.options.onChange(newContent);
        }
      }),

      // Theme de base (on ajoutera les classes Obsidian après)
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: 'var(--font-text-size)',
          fontFamily: 'var(--font-text)',
        },
        '.cm-scroller': {
          overflow: 'auto',
          height: '100%',
        },
        '.cm-content': {
          padding: '8px',
        },
      }),

      // Wrap des lignes
      EditorView.lineWrapping,
    ];

    // Créer l'état initial
    const state = EditorState.create({
      doc: this.options.initialContent,
      extensions,
    });

    // Créer l'EditorView
    this.view = new EditorView({
      state,
      parent: this.container,
    });

    // Appliquer les classes CSS Obsidian pour le thème
    this.container.classList.add('markdown-source-view', 'mod-cm6', 'is-live-preview');
    this.view.dom.classList.add('cm-s-obsidian');

    // Gérer le blur sur le contentDOM (l'élément qui reçoit réellement le focus)
    if (this.view.contentDOM) {
      this.view.contentDOM.addEventListener('blur', (e) => {
        // Petit délai pour éviter les faux positifs (click sur scrollbar, etc.)
        setTimeout(() => {
          // Vérifier si le focus est vraiment sorti de l'éditeur
          if (!this.container.contains(document.activeElement)) {
            if (this.options.onBlur) {
              this.options.onBlur();
            }
          }
        }, 100);
      });
    }
  }

  /**
   * Récupère le contenu actuel de l'éditeur.
   */
  public getContent(): string {
    return this.view?.state.doc.toString() || '';
  }

  /**
   * Met à jour le contenu de l'éditeur (sync descendante).
   */
  public setContent(content: string): void {
    if (!this.view) return;

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content,
      },
    });

    console.log('🔄 [FrameCM6Editor] Contenu mis à jour:', content.substring(0, 50));
  }

  /**
   * Donne le focus à l'éditeur.
   */
  public focus(): void {
    if (this.view) {
      this.view.focus();
    }
  }

  /**
   * Détruit l'éditeur et nettoie les ressources.
   */
  public destroy(): void {
    if (this.view) {
      this.view.destroy();
      this.view = null;
      console.log('🗑️ [FrameCM6Editor] Éditeur détruit');
    }
  }
}
