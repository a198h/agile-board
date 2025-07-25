// tests/__mocks__/obsidian.ts

// Mock des classes principales d'Obsidian
export class App {
  vault = new Vault();
  workspace = new Workspace();
  metadataCache = new MetadataCache();
}

export class Vault {
  read = jest.fn().mockResolvedValue('Mocked file content');
  getResourcePath = jest.fn().mockReturnValue('mock://resource/path');
}

export class Workspace {
  openLinkText = jest.fn();
}

export class MetadataCache {
  getFirstLinkpathDest = jest.fn().mockReturnValue(new TFile());
}

export class TFile {
  path = 'mock/path.md';
  name = 'mock.md';
  extension = 'md';
  stat = { ctime: Date.now(), mtime: Date.now(), size: 100 };
}

export class Component {
  load = jest.fn();
  unload = jest.fn();
  addChild = jest.fn();
  removeChild = jest.fn();
}

export class MarkdownRenderer {
  static renderMarkdown = jest.fn().mockResolvedValue(undefined);
}

// Mock des interfaces principales
export interface MarkdownPostProcessorContext {
  docId: string;
  sourcePath: string;
  frontmatter: any;
}

export interface EventRef {
  off: jest.Mock;
}

// Mock des fonctions utilitaires
export const Notice = jest.fn();
export const Platform = {
  isDesktopApp: true,
  isMobileApp: false,
  isDesktop: true,
  isMobile: false
};

// Configuration par défaut pour les mocks
beforeEach(() => {
  jest.clearAllMocks();
});