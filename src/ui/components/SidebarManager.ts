/**
 * Gestionnaire de la barre latérale
 */

import { LayoutBox } from "../../core/layout/layoutFileRepo";
import { UI_CONSTANTS } from "../../core/constants";
import { DOMHelper } from "../utils/DOMHelper";
import { BoxState } from "./BoxRenderer";

export interface SidebarCallbacks {
    onTitleChange?: (boxId: string, newTitle: string) => void;
    onDeleteBox?: (boxId: string) => void;
}

export class SidebarManager {
    private sidebar: HTMLElement;
    private selectionSection: HTMLElement;
    private actionsSection: HTMLElement;
    private helpSection: HTMLElement;
    private currentBox: BoxState | null = null;
    private callbacks: SidebarCallbacks;

    constructor(container: HTMLElement, callbacks: SidebarCallbacks = {}) {
        this.callbacks = callbacks;
        this.createSidebar(container);
    }

    private createSidebar(container: HTMLElement): void {
        this.sidebar = DOMHelper.createElement('div', 'sidebar');
        
        DOMHelper.applyStyles(this.sidebar, {
            position: 'absolute',
            left: DOMHelper.px(UI_CONSTANTS.EDITOR_WIDTH_PX + 15),
            top: '0',
            width: '280px',
            height: '100%',
            backgroundColor: '#f9f9f9',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '15px',
            boxSizing: 'border-box',
            overflow: 'auto'
        });

        this.createSelectionSection();
        this.createActionsSection();
        this.createHelpSection();

        container.appendChild(this.sidebar);
    }

    private createSelectionSection(): void {
        const sectionTitle = DOMHelper.createElement('h3');
        sectionTitle.textContent = 'Box Sélectionnée';
        DOMHelper.applyStyles(sectionTitle, {
            margin: '0 0 15px 0',
            fontSize: '16px',
            color: '#333'
        });

        this.selectionSection = DOMHelper.createElement('div', 'selection-section');
        DOMHelper.applyStyles(this.selectionSection, {
            marginBottom: '25px',
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '6px'
        });

        this.selectionSection.appendChild(sectionTitle);
        
        const noSelection = DOMHelper.createElement('p', 'no-selection');
        noSelection.textContent = 'Aucune box sélectionnée. Cliquez sur une box pour l\'éditer.';
        DOMHelper.applyStyles(noSelection, {
            color: '#666',
            fontSize: '14px',
            fontStyle: 'italic',
            margin: '0'
        });
        
        this.selectionSection.appendChild(noSelection);
        this.sidebar.appendChild(this.selectionSection);
    }

    private createActionsSection(): void {
        const sectionTitle = DOMHelper.createElement('h3');
        sectionTitle.textContent = 'Actions';
        DOMHelper.applyStyles(sectionTitle, {
            margin: '0 0 15px 0',
            fontSize: '16px',
            color: '#333'
        });

        this.actionsSection = DOMHelper.createElement('div', 'actions-section');
        DOMHelper.applyStyles(this.actionsSection, {
            marginBottom: '25px',
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '6px'
        });

        this.actionsSection.appendChild(sectionTitle);

        // Bouton supprimer (initialement désactivé)
        const deleteButton = DOMHelper.createElement('button', 'delete-button');
        deleteButton.textContent = '🗑️ Supprimer la box';
        DOMHelper.applyStyles(deleteButton, {
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            opacity: '0.5',
            pointerEvents: 'none'
        });

        deleteButton.addEventListener('click', () => {
            if (this.currentBox && this.callbacks.onDeleteBox) {
                this.callbacks.onDeleteBox(this.currentBox.box.id);
            }
        });

        this.actionsSection.appendChild(deleteButton);
        this.sidebar.appendChild(this.actionsSection);
    }

    private createHelpSection(): void {
        const sectionTitle = DOMHelper.createElement('h3');
        sectionTitle.textContent = 'Aide';
        DOMHelper.applyStyles(sectionTitle, {
            margin: '0 0 15px 0',
            fontSize: '16px',
            color: '#333'
        });

        this.helpSection = DOMHelper.createElement('div', 'help-section');
        DOMHelper.applyStyles(this.helpSection, {
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '6px'
        });

        this.helpSection.appendChild(sectionTitle);

        const helpText = DOMHelper.createElement('div');
        helpText.innerHTML = `
            <p><strong>Créer une box :</strong><br>
            Cliquez et glissez sur la grille</p>
            
            <p><strong>Déplacer une box :</strong><br>
            Cliquez et glissez la box</p>
            
            <p><strong>Redimensionner :</strong><br>
            Sélectionnez puis utilisez les poignées circulaires</p>
            
            <p><strong>Renommer :</strong><br>
            Sélectionnez et modifiez le titre à droite</p>
        `;

        DOMHelper.applyStyles(helpText, {
            fontSize: '12px',
            color: '#666',
            lineHeight: '1.4'
        });

        // Styliser les paragraphes
        helpText.querySelectorAll('p').forEach(p => {
            DOMHelper.applyStyles(p as HTMLElement, {
                margin: '0 0 12px 0'
            });
        });

        // Styliser le texte en gras
        helpText.querySelectorAll('strong').forEach(strong => {
            DOMHelper.applyStyles(strong as HTMLElement, {
                color: '#333'
            });
        });

        this.helpSection.appendChild(helpText);
        this.sidebar.appendChild(this.helpSection);
    }

    selectBox(boxState: BoxState): void {
        this.currentBox = boxState;
        this.updateSelectionDisplay();
        this.updateActionsState();
    }

    clearSelection(): void {
        this.currentBox = null;
        this.updateSelectionDisplay();
        this.updateActionsState();
    }

    private updateSelectionDisplay(): void {
        // Nettoyer le contenu existant sauf le titre
        const title = this.selectionSection.querySelector('h3');
        DOMHelper.clearChildren(this.selectionSection);
        if (title) {
            this.selectionSection.appendChild(title);
        }

        if (this.currentBox) {
            this.createBoxEditor();
        } else {
            const noSelection = DOMHelper.createElement('p', 'no-selection');
            noSelection.textContent = 'Aucune box sélectionnée. Cliquez sur une box pour l\'éditer.';
            DOMHelper.applyStyles(noSelection, {
                color: '#666',
                fontSize: '14px',
                fontStyle: 'italic',
                margin: '0'
            });
            this.selectionSection.appendChild(noSelection);
        }
    }

    private createBoxEditor(): void {
        if (!this.currentBox) return;

        const box = this.currentBox.box;

        // Informations de la box
        const info = DOMHelper.createElement('div', 'box-info');
        info.innerHTML = `
            <p><strong>Position :</strong> ${box.x + 1}, ${box.y + 1}</p>
            <p><strong>Taille :</strong> ${box.w} × ${box.h}</p>
        `;

        DOMHelper.applyStyles(info, {
            fontSize: '12px',
            color: '#666',
            marginBottom: '15px'
        });

        info.querySelectorAll('p').forEach(p => {
            DOMHelper.applyStyles(p as HTMLElement, {
                margin: '0 0 5px 0'
            });
        });

        this.selectionSection.appendChild(info);

        // Édition du titre
        const titleLabel = DOMHelper.createElement('label');
        titleLabel.textContent = 'Titre :';
        DOMHelper.applyStyles(titleLabel, {
            display: 'block',
            marginBottom: '5px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333'
        });

        const titleInput = DOMHelper.createElement('input') as HTMLInputElement;
        titleInput.type = 'text';
        titleInput.value = box.title;
        DOMHelper.applyStyles(titleInput, {
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
        });

        titleInput.addEventListener('input', () => {
            if (this.currentBox && this.callbacks.onTitleChange) {
                this.callbacks.onTitleChange(this.currentBox.box.id, titleInput.value);
            }
        });

        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                titleInput.blur();
            }
        });

        this.selectionSection.appendChild(titleLabel);
        this.selectionSection.appendChild(titleInput);
    }

    private updateActionsState(): void {
        const deleteButton = this.actionsSection.querySelector('.delete-button') as HTMLElement;
        if (deleteButton) {
            if (this.currentBox) {
                DOMHelper.applyStyles(deleteButton, {
                    opacity: '1',
                    pointerEvents: 'auto'
                });
            } else {
                DOMHelper.applyStyles(deleteButton, {
                    opacity: '0.5',
                    pointerEvents: 'none'
                });
            }
        }
    }

    updateBoxInfo(box: LayoutBox): void {
        if (this.currentBox && this.currentBox.box.id === box.id) {
            this.currentBox.box = box;
            this.updateSelectionDisplay();
        }
    }

    getSidebar(): HTMLElement {
        return this.sidebar;
    }
}