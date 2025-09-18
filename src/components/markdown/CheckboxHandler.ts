// src/components/markdown/CheckboxHandler.ts

/**
 * Composant responsable de la gestion des checkboxes markdown.
 * Gère la synchronisation des états de checkbox avec le contenu markdown.
 */
export class CheckboxHandler {
  constructor(
    private container: HTMLElement,
    private onContentChange: (content: string) => void
  ) {}

  /**
   * Configure la gestion des checkboxes dans le container.
   */
  setupCheckboxHandlers(): void {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
      const checkboxElement = checkbox as HTMLInputElement;
      
      if (checkboxElement.dataset.agileCheckboxSetup === 'true') {
        return;
      }
      
      checkboxElement.addEventListener('change', (e) => {
        e.stopPropagation();
        this.saveCheckboxChange();
      });
      
      checkboxElement.dataset.agileCheckboxSetup = 'true';
    });
  }

  /**
   * Sauvegarde les changements de checkbox dans le contenu markdown.
   */
  private saveCheckboxChange(): void {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
    
    // Cette méthode nécessite le contenu markdown actuel pour pouvoir le modifier
    // Dans la refactorisation, on va déléguer cette responsabilité au composant parent
    const event = new CustomEvent('checkbox-changed', {
      detail: {
        checkboxes: Array.from(checkboxes).map(cb => ({
          checked: (cb as HTMLInputElement).checked
        }))
      }
    });
    
    this.container.dispatchEvent(event);
  }

  /**
   * Met à jour le contenu markdown en fonction de l'état des checkboxes.
   */
  updateMarkdownContent(markdownContent: string): string {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
    let updatedContent = markdownContent;
    let checkboxIndex = 0;
    
    updatedContent = updatedContent.replace(/- \[([ x])\]/g, (match, current) => {
      if (checkboxIndex < checkboxes.length) {
        const checkbox = checkboxes[checkboxIndex] as HTMLInputElement;
        const newState = checkbox.checked ? 'x' : ' ';
        checkboxIndex++;
        return `- [${newState}]`;
      }
      return match;
    });
    
    return updatedContent;
  }
}