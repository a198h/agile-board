// src/core/errorHandler.ts
import { Notice } from "obsidian";
import { PluginError } from "../types";
import { createContextLogger } from "./logger";

/**
 * Niveau de sévérité des erreurs.
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning', 
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Configuration pour l'affichage d'une erreur.
 */
export interface ErrorDisplayOptions {
  severity: ErrorSeverity;
  showNotice: boolean;
  noticeDuration: number;
  logToConsole: boolean;
  userMessage?: string;
}

/**
 * Contexte d'erreur avec informations supplémentaires.
 */
export interface ErrorContext {
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  userMessage?: string;
  showNotice?: boolean;
  noticeDuration?: number;
  logToConsole?: boolean;
}

/**
 * Gestionnaire centralisé des erreurs du plugin.
 * Fournit une interface unifiée pour la gestion et l'affichage des erreurs.
 */
export class ErrorHandler {
  private static readonly DEFAULT_OPTIONS: ErrorDisplayOptions = {
    severity: ErrorSeverity.ERROR,
    showNotice: true,
    noticeDuration: 5000,
    logToConsole: true
  };
  
  private static readonly logger = createContextLogger('ErrorHandler');

  /**
   * Gère une erreur du plugin de manière centralisée.
   * @param error Erreur à traiter
   * @param context Contexte d'où vient l'erreur
   * @param options Options d'affichage ou contexte étendu
   */
  public static handleError(
    error: PluginError | Error,
    context: string,
    options: Partial<ErrorDisplayOptions> | Partial<ErrorContext> = {}
  ): void {
    // Convertir ErrorContext vers ErrorDisplayOptions si nécessaire
    const finalOptions: ErrorDisplayOptions = {
      ...this.DEFAULT_OPTIONS,
      ...options,
      severity: options.severity || this.DEFAULT_OPTIONS.severity
    };
    
    // Logger l'erreur avec le niveau approprié et le contexte
    const contextInfo = 'context' in options ? options.context : undefined;
    const message = this.isPluginError(error) 
      ? this.formatPluginErrorMessage(error)
      : error.message;
    
    // Préparer les données de log avec contexte étendu
    const logData = { context, error, ...(contextInfo || {}) };
    
    switch (finalOptions.severity) {
      case ErrorSeverity.INFO:
        this.logger.info(message, logData);
        break;
      case ErrorSeverity.WARNING:
        this.logger.warn(message, logData);
        break;
      case ErrorSeverity.ERROR:
        this.logger.error(message, logData);
        break;
      case ErrorSeverity.CRITICAL:
        this.logger.error(`CRITIQUE: ${message}`, logData);
        break;
    }
    
    if (this.isPluginError(error)) {
      this.handlePluginError(error, context, finalOptions);
    } else {
      this.handleGenericError(error, context, finalOptions);
    }
  }

  /**
   * Crée un gestionnaire d'erreurs spécialisé pour un contexte donné.
   * @param context Contexte du gestionnaire
   * @returns Fonction de gestion d'erreurs
   */
  public static createContextHandler(context: string) {
    return (error: PluginError | Error, options: Partial<ErrorDisplayOptions> = {}) => {
      this.handleError(error, context, options);
    };
  }

  /**
   * Vérifie si une erreur est une PluginError typée.
   * @param error Erreur à vérifier
   * @returns true si c'est une PluginError
   */
  private static isPluginError(error: unknown): error is PluginError {
    return typeof error === 'object' && error !== null && 'type' in error;
  }

  /**
   * Traite une erreur typée du plugin.
   * @param error Erreur du plugin
   * @param context Contexte
   * @param options Options d'affichage
   */
  private static handlePluginError(
    error: PluginError,
    context: string,
    options: ErrorDisplayOptions
  ): void {
    const message = this.formatPluginErrorMessage(error);
    const userMessage = options.userMessage || this.getUserFriendlyMessage(error);

    if (options.logToConsole) {
      this.logToConsole(error, context, options.severity, message);
    }

    if (options.showNotice) {
      this.showNoticeToUser(userMessage, options);
    }
  }

  /**
   * Traite une erreur générique.
   * @param error Erreur générique
   * @param context Contexte
   * @param options Options d'affichage
   */
  private static handleGenericError(
    error: Error,
    context: string,
    options: ErrorDisplayOptions
  ): void {
    const message = `${context}: ${error.message}`;
    const userMessage = options.userMessage || "Une erreur inattendue s'est produite.";

    if (options.logToConsole) {
      this.logToConsole(error, context, options.severity, message);
    }

    if (options.showNotice) {
      this.showNoticeToUser(userMessage, options);
    }
  }

  /**
   * Formate un message d'erreur pour les PluginError.
   * @param error Erreur du plugin
   * @returns Message formaté
   */
  private static formatPluginErrorMessage(error: PluginError): string {
    switch (error.type) {
      case 'LAYOUT_NOT_FOUND': {
        const available = error.availableLayouts ? ` (disponibles: ${error.availableLayouts.join(', ')})` : '';
        return `Tableau "${error.layoutName}" introuvable${available}`;
      }

      case 'INVALID_LAYOUT_FORMAT': {
        const filePath = error.filePath ? ` dans ${error.filePath}` : '';
        return `Format de tableau invalide${filePath}: ${error.details}`;
      }

      case 'FILE_SYSTEM_ERROR': {
        const fileInfo = error.filePath ? ` (${error.filePath})` : '';
        const operation = error.operation ? ` lors de l'opération "${error.operation}"` : '';
        return `Erreur système de fichiers${fileInfo}${operation}: ${error.error.message}`;
      }

      case 'VALIDATION_ERROR': {
        const modelInfo = error.modelName ? ` dans le modèle "${error.modelName}"` : '';
        return `Erreurs de validation${modelInfo}: ${error.errors.join(', ')}`;
      }

      case 'SECTION_MISSING': {
        const sectionFileInfo = error.filePath ? ` dans ${error.filePath}` : '';
        return `Section manquante${sectionFileInfo}: ${error.sectionTitle}`;
      }

      case 'PARSING_ERROR': {
        const parseFileInfo = error.filePath ? ` dans ${error.filePath}` : '';
        const lineInfo = error.lineNumber ? ` (ligne ${error.lineNumber})` : '';
        return `Erreur de parsing${parseFileInfo}${lineInfo}: ${error.details}`;
      }

      case 'NETWORK_ERROR': {
        const urlInfo = error.url ? ` (${error.url})` : '';
        return `Erreur réseau${urlInfo}: ${error.message}`;
      }

      case 'PERMISSION_ERROR': {
        const resourceInfo = error.resource ? ` pour "${error.resource}"` : '';
        return `Erreur de permission${resourceInfo}: ${error.message}`;
      }

      case 'INITIALIZATION_ERROR':
        return `Erreur d'initialisation du composant "${error.component}": ${error.details}`;

      default:
        return 'Erreur inconnue du plugin';
    }
  }

  /**
   * Génère un message convivial pour l'utilisateur.
   * @param error Erreur du plugin
   * @returns Message pour l'utilisateur
   */
  private static getUserFriendlyMessage(error: PluginError): string {
    switch (error.type) {
      case 'LAYOUT_NOT_FOUND': {
        const suggestions = error.availableLayouts?.length
          ? ` Modèles disponibles : ${error.availableLayouts.join(', ')}`
          : '';
        return `Le modèle "${error.layoutName}" n'existe pas. Vérifiez le nom dans le frontmatter.${suggestions}`;
      }

      case 'INVALID_LAYOUT_FORMAT':
        return 'Les fichiers de tableau contiennent des erreurs de format. Vérifiez la syntaxe JSON.';

      case 'FILE_SYSTEM_ERROR':
        return 'Impossible d\'accéder au fichier. Vérifiez les permissions et l\'emplacement.';

      case 'VALIDATION_ERROR':
        return 'Le modèle de tableau contient des erreurs de configuration. Consultez la console pour plus de détails.';

      case 'SECTION_MISSING':
        return `La section "${error.sectionTitle}" est requise mais introuvable. Ajoutez-la au document ou utilisez l'outil de réinitialisation.`;

      case 'PARSING_ERROR':
        return 'Erreur lors de l\'analyse du fichier. Vérifiez le format et la syntaxe.';

      case 'NETWORK_ERROR':
        return 'Problème de connectivité réseau. Vérifiez votre connexion internet.';

      case 'PERMISSION_ERROR':
        return 'Permissions insuffisantes pour cette opération. Vérifiez les droits d\'accès.';

      case 'INITIALIZATION_ERROR':
        return 'Erreur lors de l\'initialisation d\'Agile Board. Redémarrez Obsidian ou contactez le support.';
      
      default:
        return 'Une erreur s\'est produite dans Agile Board. Consultez la console pour plus d\'informations.';
    }
  }

  /**
   * Affiche un message dans la console avec le bon niveau.
   * @param error Erreur
   * @param context Contexte
   * @param severity Sévérité
   * @param message Message
   */
  private static logToConsole(
    error: unknown,
    context: string,
    severity: ErrorSeverity,
    message: string
  ): void {
    const prefix = this.getSeverityIcon(severity);
    const fullMessage = `${prefix} [Agile Board] ${context}: ${message}`;

    switch (severity) {
      case ErrorSeverity.INFO:
        console.debug(fullMessage, error);
        break;
      case ErrorSeverity.WARNING:
        console.warn(fullMessage, error);
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        console.error(fullMessage, error);
        break;
    }
  }

  /**
   * Affiche une notice à l'utilisateur.
   * @param message Message à afficher
   * @param options Options d'affichage
   */
  private static showNoticeToUser(
    message: string,
    options: ErrorDisplayOptions
  ): void {
    const icon = this.getSeverityIcon(options.severity);
    const fullMessage = `${icon} ${message}`;
    
    new Notice(fullMessage, options.noticeDuration);
  }

  /**
   * Obtient l'icône correspondant à la sévérité.
   * @param severity Sévérité
   * @returns Icône
   */
  private static getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'ℹ️';
      case ErrorSeverity.WARNING:
        return '⚠️';
      case ErrorSeverity.ERROR:
        return '❌';
      case ErrorSeverity.CRITICAL:
        return '🚨';
      default:
        return '❌';
    }
  }
}