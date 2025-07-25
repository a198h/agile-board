// src/core/lifecycle.ts
import { Component, EventRef, App } from "obsidian";
import { ErrorHandler, ErrorSeverity } from "./errorHandler";
import { PluginError } from "../types";

/**
 * Interface pour les ressources qui nécessitent un nettoyage.
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Interface pour les composants avec cycle de vie.
 */
export interface LifecycleAware {
  onLoad?(): void | Promise<void>;
  onUnload?(): void | Promise<void>;
}

/**
 * Gestionnaire de cycle de vie pour les ressources et composants.
 * Assure un nettoyage proper lors de la destruction.
 */
export class LifecycleManager implements Disposable {
  private readonly disposables: Disposable[] = [];
  private readonly eventRefs: EventRef[] = [];
  private readonly intervals: number[] = [];
  private readonly timeouts: number[] = [];
  private readonly components: LifecycleAware[] = [];
  private isDisposed = false;

  constructor(private readonly app?: App) {}

  /**
   * Enregistre un objet disposable pour nettoyage automatique.
   * @param disposable Ressource à nettoyer
   */
  public registerDisposable(disposable: Disposable): void {
    if (this.isDisposed) {
      ErrorHandler.handleError(
        new Error("Tentative d'enregistrement sur un LifecycleManager disposé"),
        'LifecycleManager.registerDisposable',
        { severity: ErrorSeverity.WARNING }
      );
      return;
    }
    this.disposables.push(disposable);
  }

  /**
   * Enregistre une référence d'événement pour nettoyage automatique.
   * @param eventRef Référence d'événement Obsidian
   */
  public registerEventRef(eventRef: EventRef): void {
    if (this.isDisposed) return;
    this.eventRefs.push(eventRef);
  }

  /**
   * Enregistre un interval pour nettoyage automatique.
   * @param intervalId ID de l'interval
   */
  public registerInterval(intervalId: number): void {
    if (this.isDisposed) return;
    this.intervals.push(intervalId);
  }

  /**
   * Enregistre un timeout pour nettoyage automatique.
   * @param timeoutId ID du timeout
   */
  public registerTimeout(timeoutId: number): void {
    if (this.isDisposed) return;
    this.timeouts.push(timeoutId);
  }

  /**
   * Enregistre un composant avec cycle de vie.
   * @param component Composant à gérer
   */
  public registerComponent(component: LifecycleAware): void {
    if (this.isDisposed) return;
    this.components.push(component);
  }

  /**
   * Crée un helper pour les event listeners DOM avec nettoyage automatique.
   * @param element Element DOM
   * @param event Type d'événement
   * @param listener Fonction d'écoute
   * @param options Options d'événement
   */
  public addEventListenerDisposable<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (this.isDisposed) return;
    
    element.addEventListener(event, listener, options);
    
    this.registerDisposable({
      dispose: () => element.removeEventListener(event, listener, options)
    });
  }

  /**
   * Crée un interval géré automatiquement.
   * @param callback Fonction à exécuter
   * @param delay Délai en millisecondes
   * @returns ID de l'interval
   */
  public createManagedInterval(callback: () => void, delay: number): number {
    if (this.isDisposed) return -1;
    
    const intervalId = window.setInterval(callback, delay);
    this.registerInterval(intervalId);
    return intervalId;
  }

  /**
   * Crée un timeout géré automatiquement.
   * @param callback Fonction à exécuter
   * @param delay Délai en millisecondes
   * @returns ID du timeout
   */
  public createManagedTimeout(callback: () => void, delay: number): number {
    if (this.isDisposed) return -1;
    
    const timeoutId = window.setTimeout(callback, delay);
    this.registerTimeout(timeoutId);
    return timeoutId;
  }

  /**
   * Initialise tous les composants enregistrés.
   */
  public async initializeComponents(): Promise<void> {
    for (const component of this.components) {
      try {
        if (component.onLoad) {
          await component.onLoad();
        }
      } catch (error) {
        const pluginError: PluginError = {
          type: 'INITIALIZATION_ERROR',
          component: component.constructor.name,
          details: error instanceof Error ? error.message : String(error)
        };
        ErrorHandler.handleError(pluginError, 'LifecycleManager.initializeComponents', {
          severity: ErrorSeverity.ERROR
        });
      }
    }
  }

  /**
   * Nettoie toutes les ressources enregistrées.
   */
  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    // Nettoyer les composants dans l'ordre inverse
    for (let i = this.components.length - 1; i >= 0; i--) {
      const component = this.components[i];
      try {
        if (component.onUnload) {
          // Note: on ne peut pas attendre les promises en mode synchrone
          const result = component.onUnload();
          if (result instanceof Promise) {
            result.catch(error => {
              ErrorHandler.handleError(error, 'LifecycleManager.dispose.component.onUnload', {
                severity: ErrorSeverity.WARNING
              });
            });
          }
        }
      } catch (error) {
        ErrorHandler.handleError(error, 'LifecycleManager.dispose.component', {
          severity: ErrorSeverity.WARNING
        });
      }
    }

    // Nettoyer les disposables
    for (const disposable of this.disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        ErrorHandler.handleError(error, 'LifecycleManager.dispose.disposable', {
          severity: ErrorSeverity.WARNING
        });
      }
    }

    // Nettoyer les événements
    for (const eventRef of this.eventRefs) {
      try {
        if (this.app) {
          this.app.vault.offref(eventRef);
        }
      } catch (error) {
        ErrorHandler.handleError(error, 'LifecycleManager.dispose.eventRef', {
          severity: ErrorSeverity.WARNING
        });
      }
    }

    // Nettoyer les intervals
    for (const intervalId of this.intervals) {
      try {
        clearInterval(intervalId);
      } catch (error) {
        ErrorHandler.handleError(error, 'LifecycleManager.dispose.interval', {
          severity: ErrorSeverity.WARNING
        });
      }
    }

    // Nettoyer les timeouts
    for (const timeoutId of this.timeouts) {
      try {
        clearTimeout(timeoutId);
      } catch (error) {
        ErrorHandler.handleError(error, 'LifecycleManager.dispose.timeout', {
          severity: ErrorSeverity.WARNING
        });
      }
    }

    // Vider les collections
    this.disposables.length = 0;
    this.eventRefs.length = 0;
    this.intervals.length = 0;
    this.timeouts.length = 0;
    this.components.length = 0;
  }

  /**
   * Vérifie si le gestionnaire a été disposé.
   * @returns true si disposé
   */
  public get disposed(): boolean {
    return this.isDisposed;
  }

  /**
   * Retourne le nombre de ressources enregistrées.
   * @returns Statistiques des ressources
   */
  public getResourceStats(): {
    disposables: number;
    eventRefs: number;
    intervals: number;
    timeouts: number;
    components: number;
  } {
    return {
      disposables: this.disposables.length,
      eventRefs: this.eventRefs.length,
      intervals: this.intervals.length,
      timeouts: this.timeouts.length,
      components: this.components.length
    };
  }
}

/**
 * Décorateur pour marquer automatiquement une méthode comme nécessitant un nettoyage.
 * Utilise le LifecycleManager du contexte pour enregistrer les ressources.
 */
export function managedResource(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(this: { lifecycleManager?: LifecycleManager }, ...args: any[]) {
    const result = originalMethod.apply(this, args);
    
    // Si la méthode retourne quelque chose de disposable, l'enregistrer
    if (result && typeof result.dispose === 'function' && this.lifecycleManager) {
      this.lifecycleManager.registerDisposable(result);
    }
    
    return result;
  };
  
  return descriptor;
}