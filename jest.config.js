// jest.config.js
module.exports = {
  // Environnement de test
  testEnvironment: 'jsdom',
  
  // Extensions de fichiers à traiter
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Pattern pour les fichiers de test
  testMatch: [
    '<rootDir>/tests/**/*.test.(ts|tsx|js)',
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/?(*.)(spec|test).(ts|tsx|js)'
  ],
  
  // Transformation des fichiers TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Modules à ignorer lors de la transformation
  transformIgnorePatterns: [
    'node_modules/(?!(obsidian)/)'
  ],
  
  // Configuration des alias de modules
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Configuration de la couverture de code
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.ts', // Point d'entrée principal
    '!src/**/__tests__/**',
    '!src/**/*.test.*'
  ],
  
  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Répertoire de sortie pour la couverture
  coverageDirectory: 'coverage',
  
  // Formats de rapport de couverture
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Fichiers de configuration pour Jest
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Variables d'environnement globales
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Mock des modules externes
  moduleNameMapping: {
    '^obsidian$': '<rootDir>/tests/__mocks__/obsidian.ts'
  },
  
  // Configuration pour les tests asynchrones
  testTimeout: 10000,
  
  // Affichage verbeux des résultats
  verbose: true,
  
  // Nettoyage automatique des mocks
  clearMocks: true,
  restoreMocks: true
};