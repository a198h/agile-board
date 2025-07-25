// tests/setup.ts
import 'jest-dom/extend-expect';

// Configuration globale pour les tests
beforeEach(() => {
  // Nettoyer le DOM avant chaque test
  document.body.innerHTML = '';
  
  // Réinitialiser les mocks
  jest.clearAllMocks();
  
  // Mock de getComputedStyle par défaut
  Object.defineProperty(window, 'getComputedStyle', {
    value: jest.fn(() => ({
      width: '100px',
      height: '100px',
      paddingLeft: '0px',
      paddingRight: '0px',
      paddingTop: '0px',
      paddingBottom: '0px'
    })),
    writable: true
  });
  
  // Mock de requestAnimationFrame
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: jest.fn((cb) => setTimeout(cb, 0)),
    writable: true
  });
  
  // Mock de requestIdleCallback
  Object.defineProperty(window, 'requestIdleCallback', {
    value: jest.fn((cb) => setTimeout(cb, 0)),
    writable: true
  });
});

// Configuration globale des console methods pour éviter le spam pendant les tests
global.console = {
  ...console,
  // Désactiver les logs de debug pendant les tests
  debug: jest.fn(),
  log: jest.fn(),
  // Garder les erreurs et warnings visibles
  error: console.error,
  warn: console.warn,
  info: console.info
};