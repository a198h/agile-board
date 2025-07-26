// src/core/index.ts

/**
 * Point d'entrée principal pour l'architecture core du plugin Agile Board.
 * Exporte tous les composants, services et utilitaires de base.
 */

// Architecture de base
export { BaseComponent, BaseUIComponent } from './baseComponent';
export { LifecycleManager, type LifecycleAware, type Disposable } from './lifecycle';
export { ErrorHandler, ErrorSeverity, type ErrorContext, type ErrorDisplayOptions } from './errorHandler';
export { Logger, LogLevel, createContextLogger } from './logger';
export { LoggingConfig } from './logging-config';

// Composants UI modulaires
export * from './components';

// Utilitaires DOM
export * from './dom';

// Logique métier pure
export * from './business';

// Services de layout
export { LayoutValidator } from './layout/layoutValidator';
export { LayoutLoader } from './layout/layoutLoader';