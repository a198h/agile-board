// src/core/business/index.ts

/**
 * Point d'entrée pour toute la logique métier pure.
 */

export { GridCalculator, type CollisionResult, type GridPosition, type GridDimensions } from './gridCalculator';
export { MarkdownProcessor, type TaskParseResult, type MarkdownPreprocessResult } from './markdownProcessor';