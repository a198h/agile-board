// tests/unit/dimensionManager.test.ts
import { DimensionManager } from "../../src/core/dom/dimensionManager";

// Mock DOM methods for testing
const mockElement = () => {
  const element = {
    style: {
      width: '',
      height: '',
      minWidth: '',
      minHeight: '',
      maxWidth: '',
      maxHeight: ''
    },
    getBoundingClientRect: jest.fn(() => ({
      width: 200,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 200
    }))
  } as unknown as HTMLElement;

  // Mock getComputedStyle for this element
  Object.defineProperty(window, 'getComputedStyle', {
    value: jest.fn(() => ({
      width: '200px',
      height: '100px',
      paddingLeft: '10px',
      paddingRight: '10px',
      paddingTop: '5px',
      paddingBottom: '5px'
    }))
  });

  return element;
};

describe("DimensionManager", () => {
  beforeEach(() => {
    DimensionManager.clearAllSnapshots();
  });

  describe("lockDimensions", () => {
    it("should lock element dimensions", () => {
      const element = mockElement();
      
      const result = DimensionManager.lockDimensions(element);
      
      expect(result).toBe(true);
      expect(element.style.width).toBe('200px');
      expect(element.style.height).toBe('100px');
      expect(element.style.minWidth).toBe('200px');
      expect(element.style.minHeight).toBe('100px');
      expect(element.style.maxWidth).toBe('200px');
      expect(element.style.maxHeight).toBe('100px');
    });

    it("should return false for null element", () => {
      const result = DimensionManager.lockDimensions(null as any);
      
      expect(result).toBe(false);
    });

    it("should track locked state", () => {
      const element = mockElement();
      
      DimensionManager.lockDimensions(element);
      
      expect(DimensionManager.isLocked(element)).toBe(true);
    });
  });

  describe("lockHeight", () => {
    it("should lock only height dimension", () => {
      const element = mockElement();
      
      const result = DimensionManager.lockHeight(element);
      
      expect(result).toBe(true);
      expect(element.style.height).toBe('100px');
      expect(element.style.minHeight).toBe('100px');
      expect(element.style.maxHeight).toBe('100px');
      expect(element.style.width).toBe(''); // Width not locked
    });
  });

  describe("lockWidth", () => {
    it("should lock only width dimension", () => {
      const element = mockElement();
      
      const result = DimensionManager.lockWidth(element);
      
      expect(result).toBe(true);
      expect(element.style.width).toBe('200px');
      expect(element.style.minWidth).toBe('200px');
      expect(element.style.maxWidth).toBe('200px');
      expect(element.style.height).toBe(''); // Height not locked
    });
  });

  describe("unlockDimensions", () => {
    it("should restore original dimensions", () => {
      const element = mockElement();
      
      // Set initial styles
      element.style.width = '150px';
      element.style.height = '75px';
      
      // Lock and then unlock
      DimensionManager.lockDimensions(element);
      const result = DimensionManager.unlockDimensions(element);
      
      expect(result).toBe(true);
      expect(element.style.width).toBe('150px'); // Restored
      expect(element.style.height).toBe('75px'); // Restored
      expect(DimensionManager.isLocked(element)).toBe(false);
    });

    it("should return false if element was not locked", () => {
      const element = mockElement();
      
      const result = DimensionManager.unlockDimensions(element);
      
      expect(result).toBe(false);
    });
  });

  describe("relaxDimensions", () => {
    it("should remove min/max constraints but keep width/height", () => {
      const element = mockElement();
      
      // Set initial styles
      element.style.minWidth = '50px';
      element.style.maxWidth = '150px';
      
      DimensionManager.lockDimensions(element);
      const result = DimensionManager.relaxDimensions(element);
      
      expect(result).toBe(true);
      expect(element.style.width).toBe('200px'); // Kept
      expect(element.style.height).toBe('100px'); // Kept
      expect(element.style.minWidth).toBe('50px'); // Restored
      expect(element.style.maxWidth).toBe('150px'); // Restored
    });
  });

  describe("getComputedDimensions", () => {
    it("should return computed dimensions", () => {
      const element = mockElement();
      
      const dimensions = DimensionManager.getComputedDimensions(element);
      
      expect(dimensions.width).toBe(200);
      expect(dimensions.height).toBe(100);
      expect(dimensions.contentWidth).toBe(200);
      expect(dimensions.contentHeight).toBe(100);
    });

    it("should return zeros for null element", () => {
      const dimensions = DimensionManager.getComputedDimensions(null as any);
      
      expect(dimensions.width).toBe(0);
      expect(dimensions.height).toBe(0);
      expect(dimensions.contentWidth).toBe(0);
      expect(dimensions.contentHeight).toBe(0);
    });
  });

  describe("getAvailableSpace", () => {
    it("should calculate available space excluding padding", () => {
      const element = mockElement();
      
      const space = DimensionManager.getAvailableSpace(element);
      
      expect(space.width).toBe(180); // 200 - 10 - 10
      expect(space.height).toBe(90);  // 100 - 5 - 5
    });

    it("should return zeros for null element", () => {
      const space = DimensionManager.getAvailableSpace(null as any);
      
      expect(space.width).toBe(0);
      expect(space.height).toBe(0);
    });
  });

  describe("maintainAspectRatio", () => {
    it("should maintain aspect ratio based on width", () => {
      const element = mockElement();
      const ratio = 2; // width:height = 2:1
      
      DimensionManager.maintainAspectRatio(element, ratio, 'width');
      
      expect(element.style.height).toBe('100px'); // 200 / 2 = 100
    });

    it("should maintain aspect ratio based on height", () => {
      const element = mockElement();
      const ratio = 2; // width:height = 2:1
      
      DimensionManager.maintainAspectRatio(element, ratio, 'height');
      
      expect(element.style.width).toBe('200px'); // 100 * 2 = 200
    });

    it("should handle invalid ratio gracefully", () => {
      const element = mockElement();
      
      expect(() => {
        DimensionManager.maintainAspectRatio(element, 0, 'width');
      }).not.toThrow();
      
      expect(() => {
        DimensionManager.maintainAspectRatio(element, -1, 'width');
      }).not.toThrow();
    });
  });

  describe("applyConstrainedDimensions", () => {
    it("should apply specified dimensions", () => {
      const element = mockElement();
      
      DimensionManager.applyConstrainedDimensions(element, {
        width: '300px',
        height: '150px',
        minWidth: '250px',
        maxHeight: '200px'
      });
      
      expect(element.style.width).toBe('300px');
      expect(element.style.height).toBe('150px');
      expect(element.style.minWidth).toBe('250px');
      expect(element.style.maxHeight).toBe('200px');
      expect(DimensionManager.isLocked(element)).toBe(true);
    });

    it("should skip undefined dimensions", () => {
      const element = mockElement();
      const originalWidth = element.style.width;
      
      DimensionManager.applyConstrainedDimensions(element, {
        height: '150px'
        // width is undefined, should not be changed
      });
      
      expect(element.style.width).toBe(originalWidth);
      expect(element.style.height).toBe('150px');
    });
  });
});