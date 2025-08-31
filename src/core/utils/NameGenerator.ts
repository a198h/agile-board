/**
 * Utilitaires pour la génération de noms uniques
 */

import { VALIDATION_CONSTANTS } from "../constants";

export class NameGenerator {
    /**
     * Génère un nom unique basé sur un nom de base et une liste de noms existants
     */
    static generateUniqueName(baseName: string, existingNames: string[]): string {
        let counter = 1;
        let candidateName = baseName;
        
        // Limite de sécurité pour éviter les boucles infinies
        const maxAttempts = 1000;
        
        while (existingNames.includes(candidateName) && counter < maxAttempts) {
            candidateName = `${baseName} ${counter}`;
            counter++;
        }
        
        if (counter >= maxAttempts) {
            // Fallback avec timestamp si on atteint la limite
            candidateName = `${baseName} ${Date.now()}`;
        }
        
        return candidateName;
    }

    /**
     * Convertit un nom en slug valide pour les fichiers
     */
    static nameToSlug(name: string): string {
        return name.replace(VALIDATION_CONSTANTS.SLUG_PATTERN, '_').toLowerCase();
    }

    /**
     * Valide qu'un nom respecte les contraintes
     */
    static isValidName(name: string): boolean {
        return name.length >= VALIDATION_CONSTANTS.MIN_NAME_LENGTH 
            && name.length <= VALIDATION_CONSTANTS.MAX_NAME_LENGTH
            && VALIDATION_CONSTANTS.NAME_PATTERN.test(name);
    }

    /**
     * Nettoie un nom pour qu'il respecte les contraintes
     */
    static sanitizeName(name: string): string {
        // Supprimer les caractères non autorisés
        let cleaned = name.replace(/[^a-zA-Z0-9_\s-]/g, '');
        
        // Limiter la longueur
        if (cleaned.length > VALIDATION_CONSTANTS.MAX_NAME_LENGTH) {
            cleaned = cleaned.substring(0, VALIDATION_CONSTANTS.MAX_NAME_LENGTH);
        }
        
        // Assurer qu'il n'est pas vide
        if (cleaned.length < VALIDATION_CONSTANTS.MIN_NAME_LENGTH) {
            cleaned = 'Layout';
        }
        
        return cleaned.trim();
    }
}