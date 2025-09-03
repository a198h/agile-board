/**
 * Utilitaires pour la manipulation du DOM
 */

import { UI_CONSTANTS, COLOR_CONSTANTS } from "../../core/constants";

export class DOMHelper {
    /**
     * Applique les styles z-index selon le contexte
     */
    static applyZIndex(element: HTMLElement, context: keyof typeof UI_CONSTANTS.Z_INDEX): void {
        element.style.zIndex = UI_CONSTANTS.Z_INDEX[context].toString();
    }

    /**
     * Obtient une couleur de la palette selon l'index
     */
    static getColorFromPalette(colorIndex: number): string {
        const normalizedIndex = colorIndex % COLOR_CONSTANTS.TOTAL_COLORS;
        const colorVar = `${COLOR_CONSTANTS.COLOR_PREFIX}${normalizedIndex}`;
        return getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    }

    /**
     * Obtient une couleur de bordure de la palette selon l'index
     */
    static getBorderColorFromPalette(colorIndex: number): string {
        const normalizedIndex = colorIndex % COLOR_CONSTANTS.TOTAL_COLORS;
        const colorVar = `${COLOR_CONSTANTS.BORDER_PREFIX}${normalizedIndex}`;
        return getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    }

    /**
     * Crée un élément avec classes CSS et styles
     */
    static createElement<T extends keyof HTMLElementTagNameMap>(
        tag: T,
        className?: string,
        styles?: Partial<CSSStyleDeclaration>
    ): HTMLElementTagNameMap[T] {
        const element = document.createElement(tag);
        
        if (className) {
            element.className = className;
        }
        
        if (styles) {
            Object.assign(element.style, styles);
        }
        
        return element;
    }

    /**
     * Applique des styles en lot à un élément
     */
    static applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
        Object.assign(element.style, styles);
    }

    /**
     * Convertit des pixels en valeur CSS
     */
    static px(value: number): string {
        return `${value}px`;
    }

    /**
     * Nettoie tous les enfants d'un élément
     */
    static clearChildren(element: HTMLElement): void {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * Ajoute un event listener avec nettoyage automatique
     */
    static addEventListenerWithCleanup<K extends keyof HTMLElementEventMap>(
        element: HTMLElement,
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
        cleanupRegistry?: (() => void)[]
    ): void {
        element.addEventListener(type, listener);
        
        if (cleanupRegistry) {
            cleanupRegistry.push(() => element.removeEventListener(type, listener));
        }
    }
}