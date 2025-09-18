// src/components/markdown/GridLayoutManager.ts

/**
 * Composant responsable de la gestion du passage entre grille CSS et positionnement absolu.
 * Nécessaire pour l'édition inline sans perturbation du layout.
 */
export class GridLayoutManager {
  private isConverted = false;

  /**
   * Convertit temporairement la grille CSS en positionnement absolu.
   */
  convertToAbsolute(containerEl: HTMLElement): void {
    if (!containerEl) return;
    
    const gridContainer = this.findGridContainer(containerEl);
    if (!gridContainer || this.isAlreadyConverted(gridContainer)) {
      return;
    }
    
    const originalDisplay = getComputedStyle(gridContainer).display;
    gridContainer.setAttribute('data-original-display', originalDisplay);
    
    const framePositions = this.captureFramePositions(gridContainer);
    this.applyAbsolutePositioning(framePositions);
    this.convertGridToBlock(gridContainer);
    
    this.isConverted = true;
  }

  /**
   * Restaure la grille CSS depuis le positionnement absolu.
   */
  restoreToGrid(): void {
    if (!this.isConverted) return;
    
    const gridContainer = document.querySelector('[data-agile-converted]') as HTMLElement;
    if (!gridContainer) return;
    
    this.restoreFrameStyles(gridContainer);
    this.restoreGridContainer(gridContainer);
    
    this.isConverted = false;
  }

  private findGridContainer(containerEl: HTMLElement): HTMLElement | null {
    let currentElement = containerEl.parentElement;
    
    while (currentElement) {
      if (currentElement.classList.contains('agile-board-grid')) {
        return currentElement;
      }
      currentElement = currentElement.parentElement;
    }
    
    console.warn('Could not find .agile-board-grid container');
    return null;
  }

  private isAlreadyConverted(gridContainer: HTMLElement): boolean {
    return gridContainer.hasAttribute('data-agile-converted');
  }

  private captureFramePositions(gridContainer: HTMLElement): Array<{
    element: HTMLElement;
    left: number;
    top: number;
    width: number;
    height: number;
  }> {
    const framePositions: Array<{
      element: HTMLElement;
      left: number;
      top: number;
      width: number;
      height: number;
    }> = [];
    
    const allFrames = gridContainer.querySelectorAll('.agile-board-frame');
    const containerRect = gridContainer.getBoundingClientRect();
    
    allFrames.forEach(frame => {
      const frameElement = frame as HTMLElement;
      const rect = frameElement.getBoundingClientRect();
      
      const left = rect.left - containerRect.left;
      const top = rect.top - containerRect.top;
      
      framePositions.push({
        element: frameElement,
        left,
        top,
        width: rect.width,
        height: rect.height
      });
    });
    
    return framePositions;
  }

  private applyAbsolutePositioning(framePositions: Array<{
    element: HTMLElement;
    left: number;
    top: number;
    width: number;
    height: number;
  }>): void {
    framePositions.forEach(pos => {
      const frameElement = pos.element;
      
      // Sauvegarder les styles originaux
      this.saveOriginalStyles(frameElement);
      
      // Appliquer le positionnement absolu
      frameElement.style.position = 'absolute';
      frameElement.style.left = pos.left + 'px';
      frameElement.style.top = pos.top + 'px';
      frameElement.style.width = pos.width + 'px';
      frameElement.style.height = pos.height + 'px';
      frameElement.style.gridColumn = 'unset';
      frameElement.style.gridRow = 'unset';
      frameElement.style.zIndex = '1';
    });
  }

  private saveOriginalStyles(frameElement: HTMLElement): void {
    frameElement.setAttribute('data-original-position', frameElement.style.position || 'static');
    frameElement.setAttribute('data-original-left', frameElement.style.left || '');
    frameElement.setAttribute('data-original-top', frameElement.style.top || '');
    frameElement.setAttribute('data-original-width', frameElement.style.width || '');
    frameElement.setAttribute('data-original-height', frameElement.style.height || '');
    frameElement.setAttribute('data-original-grid-column', frameElement.style.gridColumn || '');
    frameElement.setAttribute('data-original-grid-row', frameElement.style.gridRow || '');
  }

  private convertGridToBlock(gridContainer: HTMLElement): void {
    gridContainer.style.display = 'block';
    gridContainer.style.position = 'relative';
    gridContainer.setAttribute('data-agile-converted', 'true');
  }

  private restoreFrameStyles(gridContainer: HTMLElement): void {
    const allFrames = gridContainer.querySelectorAll('.agile-board-frame');
    
    allFrames.forEach(frame => {
      const frameElement = frame as HTMLElement;
      
      frameElement.style.position = frameElement.getAttribute('data-original-position') || '';
      frameElement.style.left = frameElement.getAttribute('data-original-left') || '';
      frameElement.style.top = frameElement.getAttribute('data-original-top') || '';
      frameElement.style.width = frameElement.getAttribute('data-original-width') || '';
      frameElement.style.height = frameElement.getAttribute('data-original-height') || '';
      frameElement.style.gridColumn = frameElement.getAttribute('data-original-grid-column') || '';
      frameElement.style.gridRow = frameElement.getAttribute('data-original-grid-row') || '';
      frameElement.style.zIndex = '';
      
      this.removeOriginalStyleAttributes(frameElement);
    });
  }

  private removeOriginalStyleAttributes(frameElement: HTMLElement): void {
    frameElement.removeAttribute('data-original-position');
    frameElement.removeAttribute('data-original-left');
    frameElement.removeAttribute('data-original-top');
    frameElement.removeAttribute('data-original-width');
    frameElement.removeAttribute('data-original-height');
    frameElement.removeAttribute('data-original-grid-column');
    frameElement.removeAttribute('data-original-grid-row');
  }

  private restoreGridContainer(gridContainer: HTMLElement): void {
    const originalDisplay = gridContainer.getAttribute('data-original-display') || 'grid';
    gridContainer.style.display = originalDisplay;
    gridContainer.style.position = '';
    gridContainer.removeAttribute('data-agile-converted');
    gridContainer.removeAttribute('data-original-display');
  }
}