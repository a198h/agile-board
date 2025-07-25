// src/core/logger.ts
import { Notice } from "obsidian";

/**
 * Niveaux de logging disponibles.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4
}

/**
 * Configuration du logger.
 */
export interface LoggerConfig {
  level: LogLevel;
  showNoticesForErrors: boolean;
  showNoticesForWarnings: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
  maxLogHistory: number;
}

/**
 * Entrée de log historique.
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

/**
 * Logger centralisé pour Agile Board avec support des niveaux et historique.
 * Fournit un logging cohérent dans toute l'application.
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logHistory: LogEntry[] = [];

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      showNoticesForErrors: true,
      showNoticesForWarnings: false,
      includeTimestamp: true,
      includeContext: true,
      maxLogHistory: 1000,
      ...config
    };
  }

  /**
   * Obtient l'instance singleton du logger.
   * @param config Configuration optionnelle (uniquement au premier appel)
   * @returns Instance du logger
   */
  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Met à jour la configuration du logger.
   * @param config Nouvelle configuration
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log de niveau DEBUG.
   * @param context Contexte du log
   * @param message Message
   * @param data Données optionnelles
   */
  public debug(context: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  /**
   * Log de niveau INFO.
   * @param context Contexte du log
   * @param message Message
   * @param data Données optionnelles
   */
  public info(context: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, context, message, data);
  }

  /**
   * Log de niveau WARN.
   * @param context Contexte du log
   * @param message Message
   * @param data Données optionnelles
   */
  public warn(context: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, context, message, data);
  }

  /**
   * Log de niveau ERROR.
   * @param context Contexte du log
   * @param message Message
   * @param data Données optionnelles
   */
  public error(context: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, context, message, data);
  }

  /**
   * Méthode de logging principale.
   * @param level Niveau de log
   * @param context Contexte
   * @param message Message
   * @param data Données optionnelles
   */
  private log(level: LogLevel, context: string, message: string, data?: any): void {
    // Vérifier si le niveau est suffisant
    if (level < this.config.level) {
      return;
    }

    // Créer l'entrée de log
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      context,
      message,
      data
    };

    // Ajouter à l'historique
    this.addToHistory(entry);

    // Formater et afficher
    const formattedMessage = this.formatLogMessage(entry);
    this.outputToConsole(level, formattedMessage, data);

    // Afficher notice si configuré
    if (this.shouldShowNotice(level)) {
      this.showNotice(level, message);
    }
  }

  /**
   * Formate un message de log.
   * @param entry Entrée de log
   * @returns Message formaté
   */
  private formatLogMessage(entry: LogEntry): string {
    const parts: string[] = [];

    // Icon du niveau
    parts.push(this.getLevelIcon(entry.level));

    // Timestamp si configuré
    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp.toISOString()}]`);
    }

    // Contexte si configuré
    if (this.config.includeContext) {
      parts.push(`[${entry.context}]`);
    }

    // Message
    parts.push(entry.message);

    return parts.join(' ');
  }

  /**
   * Obtient l'icône pour un niveau de log.
   * @param level Niveau
   * @returns Icône
   */
  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      default:
        return '📝';
    }
  }

  /**
   * Affiche le log dans la console appropriée.
   * @param level Niveau
   * @param message Message formaté
   * @param data Données optionnelles
   */
  private outputToConsole(level: LogLevel, message: string, data?: any): void {
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        if (data !== undefined) {
          console.log(message, data);
        } else {
          console.log(message);
        }
        break;
      case LogLevel.WARN:
        if (data !== undefined) {
          console.warn(message, data);
        } else {
          console.warn(message);
        }
        break;
      case LogLevel.ERROR:
        if (data !== undefined) {
          console.error(message, data);
        } else {
          console.error(message);
        }
        break;
    }
  }

  /**
   * Vérifie si une notice doit être affichée pour ce niveau.
   * @param level Niveau de log
   * @returns true si une notice doit être affichée
   */
  private shouldShowNotice(level: LogLevel): boolean {
    switch (level) {
      case LogLevel.ERROR:
        return this.config.showNoticesForErrors;
      case LogLevel.WARN:
        return this.config.showNoticesForWarnings;
      default:
        return false;
    }
  }

  /**
   * Affiche une notice Obsidian.
   * @param level Niveau
   * @param message Message
   */
  private showNotice(level: LogLevel, message: string): void {
    const icon = this.getLevelIcon(level);
    const duration = level === LogLevel.ERROR ? 8000 : 5000;
    new Notice(`${icon} ${message}`, duration);
  }

  /**
   * Ajoute une entrée à l'historique.
   * @param entry Entrée à ajouter
   */
  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);

    // Limiter la taille de l'historique
    if (this.logHistory.length > this.config.maxLogHistory) {
      this.logHistory.shift();
    }
  }

  /**
   * Obtient l'historique des logs.
   * @param level Niveau minimum optionnel
   * @param maxEntries Nombre maximum d'entrées
   * @returns Historique filtré
   */
  public getHistory(level?: LogLevel, maxEntries?: number): LogEntry[] {
    let history = this.logHistory;

    // Filtrer par niveau si spécifié
    if (level !== undefined) {
      history = history.filter(entry => entry.level >= level);
    }

    // Limiter le nombre d'entrées si spécifié
    if (maxEntries !== undefined) {
      history = history.slice(-maxEntries);
    }

    return [...history]; // Retourner une copie
  }

  /**
   * Vide l'historique des logs.
   */
  public clearHistory(): void {
    this.logHistory.length = 0;
  }

  /**
   * Obtient le niveau de log actuel.
   * @returns Niveau de log
   */
  public getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Change le niveau de log.
   * @param level Nouveau niveau
   */
  public setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info('Logger', `Niveau de log changé vers ${LogLevel[level]}`);
  }

  /**
   * Obtient des statistiques sur l'utilisation du logger.
   * @returns Statistiques
   */
  public getStats(): {
    totalEntries: number;
    entriesByLevel: Record<string, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entriesByLevel: Record<string, number> = {};
    
    // Compter par niveau
    for (const entry of this.logHistory) {
      const levelName = LogLevel[entry.level];
      entriesByLevel[levelName] = (entriesByLevel[levelName] || 0) + 1;
    }

    return {
      totalEntries: this.logHistory.length,
      entriesByLevel,
      oldestEntry: this.logHistory[0]?.timestamp,
      newestEntry: this.logHistory[this.logHistory.length - 1]?.timestamp
    };
  }

  /**
   * Exporte l'historique en format texte.
   * @param level Niveau minimum optionnel
   * @returns Historique en texte
   */
  public exportHistory(level?: LogLevel): string {
    const history = this.getHistory(level);
    return history.map(entry => {
      const timestamp = entry.timestamp.toISOString();
      const levelName = LogLevel[entry.level].padEnd(5);
      const data = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
      return `${timestamp} | ${levelName} | [${entry.context}] ${entry.message}${data}`;
    }).join('\n');
  }
}

/**
 * Helper pour créer un logger contextualisé.
 * Simplifie l'usage en évitant de répéter le contexte.
 */
export class ContextLogger {
  constructor(
    private readonly context: string,
    private readonly logger: Logger = Logger.getInstance()
  ) {}

  debug(message: string, data?: any): void {
    this.logger.debug(this.context, message, data);
  }

  info(message: string, data?: any): void {
    this.logger.info(this.context, message, data);
  }

  warn(message: string, data?: any): void {
    this.logger.warn(this.context, message, data);
  }

  error(message: string, data?: any): void {
    this.logger.error(this.context, message, data);
  }
}

/**
 * Fonctions utilitaires pour l'usage global.
 */
export const logger = Logger.getInstance();

export function createContextLogger(context: string): ContextLogger {
  return new ContextLogger(context);
}