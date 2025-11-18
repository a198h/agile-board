// src/core/logging-config.ts
import { Plugin } from "obsidian";
import { Logger, LogLevel } from "./logger";

/**
 * Configuration du système de logging pour différents environnements.
 */
export class LoggingConfig {
  /**
   * Configure le logging pour l'environnement de développement.
   */
  public static setupDevelopment(): void {
    Logger.getInstance({
      level: LogLevel.DEBUG,
      showNoticesForErrors: true,
      showNoticesForWarnings: true,
      includeTimestamp: true,
      includeContext: true,
      maxLogHistory: 2000
    });
  }

  /**
   * Configure le logging pour l'environnement de production.
   */
  public static setupProduction(): void {
    Logger.getInstance({
      level: LogLevel.INFO,
      showNoticesForErrors: true,
      showNoticesForWarnings: false,
      includeTimestamp: false,
      includeContext: true,
      maxLogHistory: 500
    });
  }

  /**
   * Configure le logging pour les tests.
   */
  public static setupTesting(): void {
    Logger.getInstance({
      level: LogLevel.ERROR,
      showNoticesForErrors: false,
      showNoticesForWarnings: false,
      includeTimestamp: true,
      includeContext: true,
      maxLogHistory: 100
    });
  }

  /**
   * Configure le logging avec un niveau minimal (pour performance).
   */
  public static setupMinimal(): void {
    Logger.getInstance({
      level: LogLevel.ERROR,
      showNoticesForErrors: true,
      showNoticesForWarnings: false,
      includeTimestamp: false,
      includeContext: false,
      maxLogHistory: 50
    });
  }

  /**
   * Désactive complètement le logging.
   */
  public static disable(): void {
    Logger.getInstance({
      level: LogLevel.OFF,
      showNoticesForErrors: false,
      showNoticesForWarnings: false,
      includeTimestamp: false,
      includeContext: false,
      maxLogHistory: 0
    });
  }

  /**
   * Configure le logging basé sur la variable d'environnement NODE_ENV.
   */
  public static setupAutomatic(): void {
    const nodeEnv = process.env.NODE_ENV;
    
    switch (nodeEnv) {
      case 'development':
        this.setupDevelopment();
        break;
      case 'test':
        this.setupTesting();
        break;
      case 'production':
      default:
        this.setupProduction();
        break;
    }
  }

  /**
   * Crée une commande Obsidian pour changer le niveau de logging.
   * @param plugin Plugin pour enregistrer la commande
   */
  public static addLogLevelCommands(plugin: Plugin): void {
    // Commande pour définir le niveau DEBUG
    plugin.addCommand({
      id: 'set-log-level-debug',
      name: 'Activer le logging debug',
      callback: () => {
        Logger.getInstance().setLevel(LogLevel.DEBUG);
      }
    });

    // Commande pour définir le niveau INFO
    plugin.addCommand({
      id: 'set-log-level-info',
      name: 'Activer le logging info',
      callback: () => {
        Logger.getInstance().setLevel(LogLevel.INFO);
      }
    });

    // Commande pour définir le niveau WARN
    plugin.addCommand({
      id: 'set-log-level-warn',
      name: 'Activer le logging warn uniquement',
      callback: () => {
        Logger.getInstance().setLevel(LogLevel.WARN);
      }
    });

    // Commande pour définir le niveau ERROR
    plugin.addCommand({
      id: 'set-log-level-error',
      name: 'Activer le logging error uniquement',
      callback: () => {
        Logger.getInstance().setLevel(LogLevel.ERROR);
      }
    });

    // Commande pour désactiver le logging
    plugin.addCommand({
      id: 'disable-logging',
      name: 'Désactiver le logging',
      callback: () => {
        Logger.getInstance().setLevel(LogLevel.OFF);
      }
    });

    // Commande pour afficher les statistiques de logging
    plugin.addCommand({
      id: 'show-log-stats',
      name: 'Afficher les statistiques de logging',
      callback: () => {
        const logger = Logger.getInstance();
        const stats = logger.getStats();
        console.debug('📊 Statistiques de logging:', stats);
        
        // Créer un résumé lisible
        const summary = [
          `Total d'entrées: ${stats.totalEntries}`,
          `Répartition: ${Object.entries(stats.entriesByLevel)
            .map(([level, count]) => `${level}: ${count}`)
            .join(', ')}`,
          stats.oldestEntry ? `Période: ${stats.oldestEntry.toLocaleString()} - ${stats.newestEntry?.toLocaleString()}` : ''
        ].filter(Boolean).join('\n');

        new (window as unknown as { Notice: new (message: string, duration: number) => unknown }).Notice(`📊 Statistiques de logging:\n${summary}`, 10000);
      }
    });

    // Commande pour exporter l'historique des logs
    plugin.addCommand({
      id: 'export-log-history',
      name: 'Exporter l\'historique des logs',
      callback: () => {
        const logger = Logger.getInstance();
        const history = logger.exportHistory();
        
        // Créer un blob et le télécharger
        const blob = new Blob([history], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agile-board-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        new (window as unknown as { Notice: new (message: string, duration: number) => unknown }).Notice('📄 Historique des logs exporté', 3000);
      }
    });
  }
}