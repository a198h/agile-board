// src/core/baseComponent.ts
import { Component, App } from "obsidian";
import { LifecycleManager, LifecycleAware, Disposable } from "./lifecycle";
import { ErrorHandler, ErrorSeverity } from "./errorHandler";

/**
 * Composant de base qui fournit une gestion automatique du cycle de vie.
 * Simplifie la création de composants robustes avec nettoyage automatique.
 */
export abstract class BaseComponent extends Component implements LifecycleAware, Disposable {
  protected readonly lifecycleManager: LifecycleManager;
  private isLoaded = false;

  constructor(app?: App) {
    super();
    this.lifecycleManager = new LifecycleManager(app);
  }

  /**
   * Initialise le composant. À surcharger par les classes dérivées.
   */
  public async onLoad(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      await this.doLoad();
      this.isLoaded = true;
    } catch (error) {
      ErrorHandler.handleError(error, `${this.constructor.name}.onLoad`, {
        severity: ErrorSeverity.ERROR
      });
      throw error;
    }
  }

  /**
   * Nettoie le composant. À surcharger par les classes dérivées.
   */
  public onUnload(): void {
    if (!this.isLoaded) return;
    
    try {
      this.doUnload();
      this.isLoaded = false;
    } catch (error) {
      ErrorHandler.handleError(error, `${this.constructor.name}.onUnload`, {
        severity: ErrorSeverity.WARNING
      });
    }
  }

  /**
   * Implémentation de l'interface Disposable.
   */
  public dispose(): void {
    this.onUnload();
    this.lifecycleManager.dispose();
    this.unload();
  }

  /**
   * Méthode d'initialisation à implémenter par les classes dérivées.
   */
  protected abstract doLoad(): Promise<void> | void;

  /**
   * Méthode de nettoyage à implémenter par les classes dérivées.
   */
  protected abstract doUnload(): void;

  /**
   * Helper pour enregistrer des event listeners DOM avec nettoyage automatique.
   * @param element Element DOM
   * @param event Type d'événement
   * @param listener Fonction d'écoute
   * @param options Options d'événement
   */
  protected addManagedEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.lifecycleManager.addEventListenerDisposable(element, event, listener, options);
  }

  /**
   * Helper pour créer des intervals gérés automatiquement.
   * @param callback Fonction à exécuter
   * @param delay Délai en millisecondes
   * @returns ID de l'interval
   */
  protected createManagedInterval(callback: () => void, delay: number): number {
    return this.lifecycleManager.createManagedInterval(callback, delay);
  }

  /**
   * Helper pour créer des timeouts gérés automatiquement.
   * @param callback Fonction à exécuter
   * @param delay Délai en millisecondes
   * @returns ID du timeout
   */
  protected createManagedTimeout(callback: () => void, delay: number): number {
    return this.lifecycleManager.createManagedTimeout(callback, delay);
  }

  /**
   * Helper pour enregistrer des ressources disposables.
   * @param disposable Ressource à nettoyer automatiquement
   */
  protected registerDisposable(disposable: Disposable): void {
    this.lifecycleManager.registerDisposable(disposable);
  }

  /**
   * Helper pour enregistrer des sous-composants.
   * @param component Composant à gérer
   */
  protected registerSubComponent(component: LifecycleAware): void {
    this.lifecycleManager.registerComponent(component);
  }

  /**
   * Vérifie si le composant est chargé.
   * @returns true si le composant est chargé
   */
  public get loaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Obtient les statistiques des ressources gérées.
   * @returns Statistiques des ressources
   */
  protected getResourceStats() {
    return this.lifecycleManager.getResourceStats();
  }
}

/**
 * Composant de base spécialisé pour les éléments UI avec DOM.
 * Fournit des helpers supplémentaires pour la gestion des éléments DOM.
 */
export abstract class BaseUIComponent extends BaseComponent {
  protected containerEl?: HTMLElement;

  constructor(containerEl?: HTMLElement, app?: App) {
    super(app);
    this.containerEl = containerEl;
  }

  /**
   * Crée un élément enfant avec nettoyage automatique.
   * @param tag Type d'élément à créer
   * @param cls Classes CSS optionnelles
   * @param parent Element parent (par défaut: this.containerEl)
   * @returns Element créé
   */
  protected createManagedElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls?: string,
    parent?: HTMLElement
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (cls) {
      element.className = cls;
    }

    const parentEl = parent || this.containerEl;
    if (parentEl) {
      parentEl.appendChild(element);
    }

    // Enregistrer pour nettoyage automatique
    this.registerDisposable({
      dispose: () => {
        if (element.parentElement) {
          element.parentElement.removeChild(element);
        }
      }
    });

    return element;
  }

  /**
   * Vide le container principal avec nettoyage des event listeners.
   */
  protected clearContainer(): void {
    if (this.containerEl) {
      // Le LifecycleManager s'occupera de nettoyer les event listeners
      this.containerEl.empty();
    }
  }

  /**
   * Définit le container principal.
   * @param containerEl Nouveau container
   */
  protected setContainer(containerEl: HTMLElement): void {
    this.clearContainer();
    this.containerEl = containerEl;
  }

  protected doUnload(): void {
    this.clearContainer();
  }
}