// src/core/components/taskManager.ts
import { MarkdownProcessor } from "../business/markdownProcessor";
import { ErrorHandler, ErrorSeverity } from "../errorHandler";

/**
 * Configuration pour le gestionnaire de tâches.
 */
export interface TaskManagerConfig {
  readonly onTaskUpdate: (newContent: string) => void;
}

/**
 * Gestionnaire pour les cases à cocher des tâches dans le markdown.
 * Sépare la logique de gestion des tâches du composant principal.
 */
export class TaskManager {
  constructor(
    private container: HTMLElement,
    private content: string,
    private config: TaskManagerConfig
  ) {}

  /**
   * Configure tous les checkboxes de tâches dans le container.
   */
  public setupTaskCheckboxes(): void {
    try {
      const checkboxes = this.container.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
      
      checkboxes.forEach((checkbox) => {
        this.attachTaskHandler(checkbox as HTMLInputElement);
      });
    } catch (error) {
      ErrorHandler.handleError(error, "TaskManager.setupTaskCheckboxes", {
        severity: ErrorSeverity.ERROR,
        context: { containerElement: this.container.tagName }
      });
    }
  }

  /**
   * Attache un gestionnaire d'événement à un checkbox de tâche.
   */
  private attachTaskHandler(checkbox: HTMLInputElement): void {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const isChecked = target.checked;
      
      const listItem = target.closest('li.task-list-item');
      if (listItem) {
        this.updateTask(listItem as HTMLElement, isChecked);
      }
    });
  }

  /**
   * Met à jour une tâche spécifique.
   */
  private updateTask(listItem: HTMLElement, isChecked: boolean): void {
    try {
      const taskText = this.extractTaskText(listItem);
      const updatedContent = MarkdownProcessor.updateTaskInContent(
        this.content,
        taskText,
        isChecked
      );
      
      this.content = updatedContent;
      this.config.onTaskUpdate(this.content);
    } catch (error) {
      ErrorHandler.handleError(error, "TaskManager.updateTask", {
        severity: ErrorSeverity.WARNING,
        context: { isChecked, taskElement: listItem.tagName }
      });
    }
  }

  /**
   * Extrait le texte d'une tâche depuis l'élément DOM.
   */
  private extractTaskText(listItem: HTMLElement): string {
    // Obtenir le texte de la tâche en excluant le checkbox
    const textNode = listItem.childNodes[listItem.childNodes.length - 1];
    return textNode?.textContent?.trim() || '';
  }

  /**
   * Met à jour le contenu géré.
   */
  public updateContent(newContent: string): void {
    this.content = newContent;
  }

  /**
   * Obtient le contenu actuel.
   */
  public getContent(): string {
    return this.content;
  }

  /**
   * Compte le nombre de tâches dans le container.
   */
  public getTaskStats(): { total: number; completed: number; pending: number } {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
    const total = checkboxes.length;
    const completed = Array.from(checkboxes).filter(cb => (cb as HTMLInputElement).checked).length;
    
    return {
      total,
      completed,
      pending: total - completed
    };
  }

  /**
   * Coche ou décoche toutes les tâches.
   */
  public toggleAllTasks(checked: boolean): void {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
    
    checkboxes.forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      if (input.checked !== checked) {
        input.checked = checked;
        
        const listItem = input.closest('li.task-list-item');
        if (listItem) {
          this.updateTask(listItem as HTMLElement, checked);
        }
      }
    });
  }

  /**
   * Ajoute une nouvelle tâche à la fin du contenu.
   */
  public addNewTask(taskText: string, checked = false): void {
    const marker = checked ? '[x]' : '[ ]';
    const newTaskLine = `- ${marker} ${taskText}`;
    
    const updatedContent = this.content.trim() + '\n' + newTaskLine;
    this.content = updatedContent;
    this.config.onTaskUpdate(this.content);
  }

  /**
   * Supprime une tâche spécifique.
   */
  public removeTask(taskText: string): void {
    const lines = this.content.split('\n');
    const filteredLines = lines.filter(line => {
      const cleanLine = line.trim();
      return !(cleanLine.includes('[ ]') || cleanLine.includes('[x]')) ||
             !cleanLine.includes(taskText);
    });
    
    const updatedContent = filteredLines.join('\n');
    this.content = updatedContent;
    this.config.onTaskUpdate(this.content);
  }
}