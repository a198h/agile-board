/**
 * Gestionnaire d'erreurs unifié pour l'interface utilisateur
 */

import { Notice } from "obsidian";
import { TIMING_CONSTANTS } from "../../core/constants";
import { createContextLogger } from "../../core/logger";

export class UIErrorHandler {
    private static readonly logger = createContextLogger('UIErrorHandler');

    /**
     * Affiche une erreur à l'utilisateur et la log
     */
    static showError(message: string, error?: Error | unknown, duration: number = TIMING_CONSTANTS.IMPORT_TIMEOUT_MS): void {
        new Notice(`❌ ${message}`, duration);
        
        if (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`${message}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
        } else {
            this.logger.error(message);
        }
    }

    /**
     * Affiche un avertissement à l'utilisateur
     */
    static showWarning(message: string, duration: number = 5000): void {
        new Notice(`⚠️ ${message}`, duration);
        this.logger.warn(message);
    }

    /**
     * Affiche un succès à l'utilisateur
     */
    static showSuccess(message: string, duration: number = 4000): void {
        new Notice(`✅ ${message}`, duration);
        this.logger.info(message);
    }

    /**
     * Affiche une information à l'utilisateur
     */
    static showInfo(message: string, duration: number = 4000): void {
        new Notice(`ℹ️ ${message}`, duration);
        this.logger.info(message);
    }

    /**
     * Gère une erreur lors d'une opération sur les layouts
     */
    static handleLayoutError(operation: string, layoutName: string, error: Error | unknown): void {
        const message = `Erreur lors de ${operation} du tableau "${layoutName}"`;
        this.showError(message, error);
    }

    /**
     * Gère une erreur de validation
     */
    static handleValidationError(errors: readonly string[]): void {
        const message = `Validation échouée:\n${errors.join('\n')}`;
        this.showError(message, undefined, TIMING_CONSTANTS.IMPORT_TIMEOUT_MS);
    }
}