// src/types.ts

export interface LayoutBlock {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutModel {
  model: string;
  blocks: LayoutBlock[];
}
