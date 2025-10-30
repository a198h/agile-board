/**
 * Système d'internationalisation pour Agile Board
 * 
 * Gère les traductions avec fallback automatique vers l'anglais.
 * Les traductions sont organisées par contexte (settings.*, editor.*, etc.)
 */

interface Translations {
  [key: string]: string | Translations;
}

interface LocaleData {
  [locale: string]: Translations;
}

class I18n {
  private currentLanguage: string = 'en';
  private translations: LocaleData = {};
  private fallbackLanguage: string = 'en';

  /**
   * Définit la langue courante du plugin
   * @param lang Code de langue (ex: 'en', 'fr')
   */
  setLanguage(lang: string): void {
    // Normaliser la langue avec gestion spéciale du chinois
    const lowerLang = lang.toLowerCase();
    
    // Mapping des codes de langue chinois vers zh-CN
    if (lowerLang === 'zh' || lowerLang === 'zh-cn' || lowerLang === 'zh-hans' || lowerLang === 'zh_cn') {
      this.currentLanguage = 'zh-CN';
      return;
    }
    
    // Normalisation standard (en-US → en)
    const normalizedLang = lang.split('-')[0].toLowerCase();
    this.currentLanguage = normalizedLang;
  }

  /**
   * Charge les traductions pour une langue donnée
   * @param lang Code de langue
   * @param translations Données de traduction
   */
  loadTranslations(lang: string, translations: Translations): void {
    this.translations[lang] = translations;
  }

  /**
   * Récupère une traduction par sa clé
   * @param key Clé de traduction (ex: 'settings.header', 'editor.empty')
   * @param params Paramètres pour interpolation
   * @returns Texte traduit avec fallback vers l'anglais
   */
  t(key: string, params?: Record<string, string | number>): string {
    // Essayer la langue courante
    let result = this.getTranslation(key, this.currentLanguage);
    
    if (!result) {
      // Fallback vers l'anglais
      if (this.currentLanguage !== this.fallbackLanguage) {
        result = this.getTranslation(key, this.fallbackLanguage);
      }
    }

    if (!result) {
      // Si aucune traduction trouvée, retourner la clé
      console.warn(`[i18n] Translation key not found: ${key}`);
      result = key;
    }

    // Traiter les paramètres
    if (params && result) {
      // Remplacer les paramètres dans le texte
      Object.entries(params).forEach(([paramKey, value]) => {
        const placeholder = `{${paramKey}}`;
        result = result!.replace(new RegExp(placeholder, 'g'), String(value));
      });
      
      // Gérer les pluriels
      if (typeof params.count === 'number') {
        const pluralSuffix = params.count > 1 ? 's' : '';
        result = result!.replace(/{plural}/g, pluralSuffix);
      }
    }

    return result;
  }

  /**
   * Récupère une traduction pour une langue spécifique
   * @param key Clé de traduction (notation pointée)
   * @param lang Code de langue
   * @returns Traduction ou null si non trouvée
   */
  private getTranslation(key: string, lang: string): string | null {
    const translations = this.translations[lang];
    if (!translations) {
      return null;
    }

    // Navigation dans l'objet avec notation pointée
    const keys = key.split('.');
    let current: any = translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  /**
   * Obtient la langue courante
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }
}

// Instance globale
const i18n = new I18n();

/**
 * Fonction de traduction globale
 * @param key Clé de traduction
 * @param params Paramètres pour interpolation (ex: {name: 'test', count: 5})
 * @returns Texte traduit
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}

/**
 * Définit la langue courante
 * @param lang Code de langue
 */
export function setLanguage(lang: string): void {
  i18n.setLanguage(lang);
}

/**
 * Charge les traductions
 * @param lang Code de langue
 * @param translations Données de traduction
 */
export function loadTranslations(lang: string, translations: Translations): void {
  i18n.loadTranslations(lang, translations);
}

/**
 * Initialise les traductions par défaut
 */
export async function initializeI18n(): Promise<void> {
  try {
    // Charger les traductions anglaises (fallback)
    const enTranslations = await import('../locales/en.json');
    loadTranslations('en', enTranslations.default);

    // Charger les traductions françaises
    const frTranslations = await import('../locales/fr.json');
    loadTranslations('fr', frTranslations.default);

    // Charger les traductions espagnoles
    const esTranslations = await import('../locales/es.json');
    loadTranslations('es', esTranslations.default);

    // Charger les traductions allemandes
    const deTranslations = await import('../locales/de.json');
    loadTranslations('de', deTranslations.default);

    // Charger les traductions portugaises
    const ptTranslations = await import('../locales/pt.json');
    loadTranslations('pt', ptTranslations.default);

    // Charger les traductions chinoises (simplifiées)
    const zhCNTranslations = await import('../locales/zh-CN.json');
    loadTranslations('zh-CN', zhCNTranslations.default);

    // Charger les traductions russes
    const ruTranslations = await import('../locales/ru.json');
    loadTranslations('ru', ruTranslations.default);
  } catch (error) {
    console.error('[i18n] Failed to load translations:', error);
  }
}