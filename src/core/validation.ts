// src/core/validation.ts
import { PluginError } from "../types";
import { VALIDATION_CONSTANTS } from "./constants";

/**
 * Résultat d'une validation.
 */
export interface ValidationResult {
  isValid: boolean;
  error?: PluginError;
}

/**
 * Utilitaires de validation pour les entrées utilisateur et les données.
 */
export class ValidationUtils {
  /**
   * Valide qu'une chaîne n'est pas vide ou null.
   * @param value Valeur à valider
   * @param fieldName Nom du champ pour les erreurs
   * @returns Résultat de validation
   */
  public static validateNonEmptyString(value: unknown, fieldName: string): ValidationResult {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`${fieldName} doit être une chaîne de caractères`]
        }
      };
    }

    if (!value.trim()) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`${fieldName} ne peut pas être vide`]
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Valide qu'un nombre est dans une plage donnée.
   * @param value Valeur à valider
   * @param fieldName Nom du champ
   * @param min Valeur minimum (inclusive)
   * @param max Valeur maximum (inclusive)
   * @returns Résultat de validation
   */
  public static validateNumberRange(
    value: unknown, 
    fieldName: string, 
    min: number, 
    max: number
  ): ValidationResult {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`${fieldName} doit être un nombre valide`]
        }
      };
    }

    if (value < min || value > max) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`${fieldName} doit être entre ${min} et ${max} (reçu: ${value})`]
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Valide qu'un entier est positif.
   * @param value Valeur à valider
   * @param fieldName Nom du champ
   * @returns Résultat de validation
   */
  public static validatePositiveInteger(value: unknown, fieldName: string): ValidationResult {
    if (!Number.isInteger(value as number) || (value as number) <= 0) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`${fieldName} doit être un entier positif (reçu: ${String(value)})`]
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Valide qu'une valeur est dans une liste d'options autorisées.
   * @param value Valeur à valider
   * @param allowedValues Liste des valeurs autorisées
   * @param fieldName Nom du champ
   * @returns Résultat de validation
   */
  public static validateEnum<T>(
    value: unknown, 
    allowedValues: readonly T[], 
    fieldName: string
  ): ValidationResult {
    if (!allowedValues.includes(value as T)) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [
            `${fieldName} doit être l'une des valeurs: ${allowedValues.join(', ')} (reçu: ${String(value)})`
          ]
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Valide qu'un objet a toutes les propriétés requises.
   * @param obj Objet à valider
   * @param requiredProperties Propriétés requises
   * @param objectName Nom de l'objet pour les erreurs
   * @returns Résultat de validation
   */
  public static validateRequiredProperties(
    obj: unknown, 
    requiredProperties: readonly string[], 
    objectName: string
  ): ValidationResult {
    if (typeof obj !== 'object' || obj === null) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`${objectName} doit être un objet`]
        }
      };
    }

    const missingProps = requiredProperties.filter(prop => !(prop in (obj as Record<string, unknown>)));
    
    if (missingProps.length > 0) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: [`${objectName} manque les propriétés requises: ${missingProps.join(', ')}`]
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Valide un nom de modèle de layout.
   * @param modelName Nom à valider
   * @returns Résultat de validation
   */
  public static validateLayoutModelName(modelName: unknown): ValidationResult {
    const stringValidation = this.validateNonEmptyString(modelName, 'nom du modèle');
    if (!stringValidation.isValid) {
      return stringValidation;
    }

    const name = modelName as string;
    
    // Vérifier les caractères autorisés (alphanumériques, espaces, tirets, underscores)
    if (!VALIDATION_CONSTANTS.NAME_PATTERN.test(name)) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: ['Le nom du modèle ne peut contenir que des lettres, chiffres, espaces, tirets et underscores']
        }
      };
    }

    // Vérifier la longueur
    if (name.length > 50) {
      return {
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          errors: ['Le nom du modèle ne peut pas dépasser 50 caractères']
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Combine plusieurs résultats de validation.
   * @param validations Résultats de validation à combiner
   * @returns Résultat combiné
   */
  public static combineValidationResults(validations: ValidationResult[]): ValidationResult {
    const errors: string[] = [];
    
    for (const validation of validations) {
      if (!validation.isValid && validation.error?.type === 'VALIDATION_ERROR') {
        errors.push(...validation.error.errors);
      }
    }

    if (errors.length === 0) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: {
        type: 'VALIDATION_ERROR',
        errors
      }
    };
  }
}