// src/ui/editor/index.ts

/**
 * Point d'entrée pour l'architecture modulaire de l'éditeur de layout.
 * 
 * Exports:
 * - LayoutEditor : Composant principal orchestrateur
 * - Types : Interfaces et types partagés
 * - Composants modulaires : GridCanvas, BoxManager, etc.
 */

// Composant principal
export { LayoutEditor } from "./layoutEditor";

// Types et interfaces
export type {
  LayoutEditorCallbacks,
  BoxState,
  DragState,
  GridPosition,
  EditorEvents,
  EditorConfig,
  EditorComponent,
  EventHandler
} from "./types";

// Composants modulaires (pour usage avancé/tests)
export { GridCanvas } from "./gridCanvas";
export { BoxManager } from "./boxManager";
export { DragDropHandler } from "./dragDropHandler";
export { SelectionManager, type SelectionInfo } from "./selectionManager";
export { Sidebar } from "./sidebar";

/**
 * @example Utilisation standard
 * ```typescript
 * import { LayoutEditor } from "./ui/editor";
 * 
 * const editor = new LayoutEditor(app, layout, {
 *   onSave: (layout) => saveLayout(layout),
 *   onCancel: () => console.log('Cancelled')
 * });
 * editor.open();
 * ```
 * 
 * @example Utilisation avancée avec composants
 * ```typescript
 * import { GridCanvas, BoxManager, type EditorConfig } from "./ui/editor";
 * 
 * const config: EditorConfig = { gridSize: 24, cellSize: 26, ... };
 * const gridCanvas = new GridCanvas(config);
 * const boxManager = new BoxManager(config, events);
 * ```
 */