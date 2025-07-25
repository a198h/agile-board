// tests/unit/gridCalculator.test.ts
import { LayoutBlock } from "../../src/types";
import { GridCalculator } from "../../src/core/business/gridCalculator";

describe("GridCalculator", () => {
  describe("detectCollisions", () => {
    it("should detect no collisions when blocks don't overlap", () => {
      const blocks: LayoutBlock[] = [
        { title: "Block 1", x: 0, y: 0, w: 5, h: 5 },
        { title: "Block 2", x: 6, y: 0, w: 5, h: 5 },
        { title: "Block 3", x: 0, y: 6, w: 5, h: 5 }
      ];

      const result = GridCalculator.detectCollisions(blocks);

      expect(result.hasCollision).toBe(false);
      expect(result.collidingBlocks).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect collision when blocks overlap", () => {
      const blocks: LayoutBlock[] = [
        { title: "Block 1", x: 0, y: 0, w: 5, h: 5 },
        { title: "Block 2", x: 3, y: 3, w: 5, h: 5 } // Overlap with Block 1
      ];

      const result = GridCalculator.detectCollisions(blocks);

      expect(result.hasCollision).toBe(true);
      expect(result.collidingBlocks).toHaveLength(1);
      expect(result.collidingBlocks[0][0].title).toBe("Block 1");
      expect(result.collidingBlocks[0][1].title).toBe("Block 2");
      expect(result.errors[0]).toContain("collision");
    });

    it("should detect multiple collisions", () => {
      const blocks: LayoutBlock[] = [
        { title: "Block 1", x: 0, y: 0, w: 10, h: 10 },
        { title: "Block 2", x: 5, y: 5, w: 5, h: 5 },   // Overlaps with Block 1
        { title: "Block 3", x: 7, y: 7, w: 5, h: 5 }    // Overlaps with Block 1 and 2
      ];

      const result = GridCalculator.detectCollisions(blocks);

      expect(result.hasCollision).toBe(true);
      expect(result.collidingBlocks.length).toBeGreaterThan(1);
    });
  });

  describe("validateGridBounds", () => {
    it("should validate blocks within grid bounds", () => {
      const blocks: LayoutBlock[] = [
        { title: "Valid Block", x: 0, y: 0, w: 12, h: 10 },
        { title: "Edge Block", x: 23, y: 99, w: 1, h: 1 }
      ];

      const result = GridCalculator.validateGridBounds(blocks);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject blocks outside grid width", () => {
      const blocks: LayoutBlock[] = [
        { title: "Too Wide", x: 20, y: 0, w: 10, h: 5 } // x + w = 30 > 24
      ];

      const result = GridCalculator.validateGridBounds(blocks);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("largeur");
    });

    it("should reject blocks outside grid height", () => {
      const blocks: LayoutBlock[] = [
        { title: "Too Tall", x: 0, y: 95, w: 5, h: 10 } // y + h = 105 > 100
      ];

      const result = GridCalculator.validateGridBounds(blocks);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("hauteur");
    });

    it("should reject blocks with negative positions", () => {
      const blocks: LayoutBlock[] = [
        { title: "Negative X", x: -1, y: 0, w: 5, h: 5 },
        { title: "Negative Y", x: 0, y: -1, w: 5, h: 5 }
      ];

      const result = GridCalculator.validateGridBounds(blocks);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("calculateOptimalLayout", () => {
    it("should arrange blocks without overlaps", () => {
      const blocks: LayoutBlock[] = [
        { title: "Block 1", x: 0, y: 0, w: 12, h: 10 },
        { title: "Block 2", x: 0, y: 0, w: 12, h: 10 },  // Same position - needs optimization
        { title: "Block 3", x: 0, y: 0, w: 6, h: 5 }     // Same position - needs optimization
      ];

      const result = GridCalculator.calculateOptimalLayout(blocks);

      expect(result.optimizedBlocks).toHaveLength(3);
      
      // Verify no collisions in optimized layout
      const collisionCheck = GridCalculator.detectCollisions(result.optimizedBlocks);
      expect(collisionCheck.hasCollision).toBe(false);
    });

    it("should preserve valid layouts", () => {
      const blocks: LayoutBlock[] = [
        { title: "Block 1", x: 0, y: 0, w: 12, h: 10 },
        { title: "Block 2", x: 12, y: 0, w: 12, h: 10 },
        { title: "Block 3", x: 0, y: 10, w: 24, h: 10 }
      ];

      const result = GridCalculator.calculateOptimalLayout(blocks);

      expect(result.optimizedBlocks).toHaveLength(3);
      expect(result.changes).toHaveLength(0); // No changes needed
    });
  });

  describe("getGridPosition", () => {
    it("should convert pixel coordinates to grid position", () => {
      const pixelPos = { x: 150, y: 200 };
      const gridSize = { cellWidth: 50, cellHeight: 40 };

      const result = GridCalculator.getGridPosition(pixelPos, gridSize);

      expect(result.column).toBe(3); // 150 / 50 = 3
      expect(result.row).toBe(5);    // 200 / 40 = 5
    });

    it("should handle fractional positions by rounding down", () => {
      const pixelPos = { x: 125, y: 185 };
      const gridSize = { cellWidth: 50, cellHeight: 40 };

      const result = GridCalculator.getGridPosition(pixelPos, gridSize);

      expect(result.column).toBe(2); // Math.floor(125 / 50) = 2
      expect(result.row).toBe(4);    // Math.floor(185 / 40) = 4
    });

    it("should constrain positions within grid bounds", () => {
      const pixelPos = { x: 2000, y: 5000 }; // Far outside
      const gridSize = { cellWidth: 50, cellHeight: 40 };

      const result = GridCalculator.getGridPosition(pixelPos, gridSize);

      expect(result.column).toBeLessThan(24);
      expect(result.row).toBeLessThan(100);
    });
  });

  describe("calculateGridArea", () => {
    it("should calculate area for single block", () => {
      const block: LayoutBlock = { title: "Test", x: 0, y: 0, w: 6, h: 4 };

      const area = GridCalculator.calculateGridArea([block]);

      expect(area.totalCells).toBe(24); // 6 * 4 = 24
      expect(area.usedCells).toBe(24);
      expect(area.coverage).toBe(1); // 100% of used area
    });

    it("should calculate area for multiple blocks", () => {
      const blocks: LayoutBlock[] = [
        { title: "Block 1", x: 0, y: 0, w: 12, h: 10 }, // 120 cells
        { title: "Block 2", x: 12, y: 0, w: 12, h: 10 } // 120 cells
      ];

      const area = GridCalculator.calculateGridArea(blocks);

      expect(area.totalCells).toBe(2400); // 24 * 100 = 2400 (full grid)
      expect(area.usedCells).toBe(240);   // 120 + 120 = 240
      expect(area.coverage).toBe(0.1);    // 240 / 2400 = 0.1 (10%)
    });
  });
});