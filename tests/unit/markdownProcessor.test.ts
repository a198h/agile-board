// tests/unit/markdownProcessor.test.ts
import { MarkdownProcessor } from "../../src/core/business/markdownProcessor";

describe("MarkdownProcessor", () => {
  describe("parseMarkdownToHTML", () => {
    it("should convert simple markdown to HTML", () => {
      const markdown = "# Title\n\nSome **bold** text.";
      
      const result = MarkdownProcessor.parseMarkdownToHTML(markdown);
      
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<strong>bold</strong>");
    });

    it("should handle lists correctly", () => {
      const markdown = "- Item 1\n- Item 2\n  - Nested item";
      
      const result = MarkdownProcessor.parseMarkdownToHTML(markdown);
      
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>Item 1</li>");
      expect(result).toContain("<li>Item 2");
      expect(result).toContain("Nested item");
    });

    it("should process task lists", () => {
      const markdown = "- [ ] Unchecked task\n- [x] Checked task";
      
      const result = MarkdownProcessor.parseMarkdownToHTML(markdown);
      
      expect(result).toContain('type="checkbox"');
      expect(result).toContain('checked="checked"');
      expect(result).toContain("task-list-item");
    });
  });

  describe("preprocessMarkdown", () => {
    it("should extract image embeds", () => {
      const markdown = "Text with ![[image.png]] embedded.";
      
      const result = MarkdownProcessor.preprocessMarkdown(markdown);
      
      expect(result.content).toContain('data-agile-image');
      expect(result.replacements).toHaveLength(1);
      expect(result.replacements[0].type).toBe('image');
      expect(result.replacements[0].name).toBe('image.png');
    });

    it("should extract file embeds", () => {
      const markdown = "See ![[document.md]] for details.";
      
      const result = MarkdownProcessor.preprocessMarkdown(markdown);
      
      expect(result.content).toContain('data-agile-embed');
      expect(result.replacements).toHaveLength(1);
      expect(result.replacements[0].type).toBe('embed');
      expect(result.replacements[0].name).toBe('document.md');
    });

    it("should handle multiple embeds", () => {
      const markdown = "![[image.jpg]] and ![[doc.pdf]] and ![[note.md]]";
      
      const result = MarkdownProcessor.preprocessMarkdown(markdown);
      
      expect(result.replacements).toHaveLength(3);
      expect(result.replacements[0].type).toBe('image'); // .jpg
      expect(result.replacements[1].type).toBe('embed');  // .pdf
      expect(result.replacements[2].type).toBe('embed');  // .md
    });
  });

  describe("handleListContinuation", () => {
    it("should continue numbered lists", () => {
      const content = "1. First item\n2. Second item\n";
      const cursorPos = content.length; // At end
      
      const result = MarkdownProcessor.handleListContinuation(content, cursorPos);
      
      expect(result).toBeDefined();
      expect(result!.content).toContain("3. ");
      expect(result!.newCursorPos).toBeGreaterThan(cursorPos);
    });

    it("should continue bullet lists", () => {
      const content = "- First item\n- Second item\n";
      const cursorPos = content.length;
      
      const result = MarkdownProcessor.handleListContinuation(content, cursorPos);
      
      expect(result).toBeDefined();
      expect(result!.content).toContain("- ");
    });

    it("should continue task lists", () => {
      const content = "- [ ] Task 1\n- [x] Task 2\n";
      const cursorPos = content.length;
      
      const result = MarkdownProcessor.handleListContinuation(content, cursorPos);
      
      expect(result).toBeDefined();
      expect(result!.content).toContain("- [ ] ");
    });

    it("should not continue when not in a list", () => {
      const content = "Regular paragraph\n";
      const cursorPos = content.length;
      
      const result = MarkdownProcessor.handleListContinuation(content, cursorPos);
      
      expect(result).toBeNull();
    });

    it("should handle indented lists", () => {
      const content = "  - Indented item\n  - Another item\n";
      const cursorPos = content.length;
      
      const result = MarkdownProcessor.handleListContinuation(content, cursorPos);
      
      expect(result).toBeDefined();
      expect(result!.content).toContain("  - "); // Preserve indentation
    });
  });

  describe("updateTaskInContent", () => {
    it("should check an unchecked task", () => {
      const content = "- [ ] Task to complete\n- [x] Already done";
      const taskText = "Task to complete";
      
      const result = MarkdownProcessor.updateTaskInContent(content, taskText, true);
      
      expect(result).toContain("- [x] Task to complete");
      expect(result).toContain("- [x] Already done"); // Unchanged
    });

    it("should uncheck a checked task", () => {
      const content = "- [x] Completed task\n- [ ] Not done";
      const taskText = "Completed task";
      
      const result = MarkdownProcessor.updateTaskInContent(content, taskText, false);
      
      expect(result).toContain("- [ ] Completed task");
      expect(result).toContain("- [ ] Not done"); // Unchanged
    });

    it("should handle multiple tasks with same text", () => {
      const content = "- [ ] Same task\n- [x] Same task\n- [ ] Different task";
      const taskText = "Same task";
      
      const result = MarkdownProcessor.updateTaskInContent(content, taskText, true);
      
      // Should update first occurrence only
      const lines = result.split('\n');
      expect(lines[0]).toBe("- [x] Same task"); // First one changed
      expect(lines[1]).toBe("- [x] Same task"); // Second unchanged
    });
  });

  describe("extractPreview", () => {
    it("should extract first few lines", () => {
      const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      
      const result = MarkdownProcessor.extractPreview(content, 3);
      
      expect(result).toBe("Line 1\nLine 2\nLine 3");
    });

    it("should handle content shorter than limit", () => {
      const content = "Short content";
      
      const result = MarkdownProcessor.extractPreview(content, 10);
      
      expect(result).toBe("Short content");
    });

    it("should respect word boundaries when truncating", () => {
      const content = "This is a very long line that should be truncated at word boundaries to avoid breaking words in the middle";
      
      const result = MarkdownProcessor.extractPreview(content, 1, 50);
      
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).not.toMatch(/\s+$/); // No trailing whitespace
    });
  });

  describe("isInteractiveElement", () => {
    it("should identify interactive elements", () => {
      const link = document.createElement('a');
      const button = document.createElement('button');
      const input = document.createElement('input');
      const container = document.createElement('div');
      
      expect(MarkdownProcessor.isInteractiveElement(link, container)).toBe(true);
      expect(MarkdownProcessor.isInteractiveElement(button, container)).toBe(true);
      expect(MarkdownProcessor.isInteractiveElement(input, container)).toBe(true);
    });

    it("should identify non-interactive elements", () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      const p = document.createElement('p');
      const container = document.createElement('div');
      
      expect(MarkdownProcessor.isInteractiveElement(div, container)).toBe(false);
      expect(MarkdownProcessor.isInteractiveElement(span, container)).toBe(false);
      expect(MarkdownProcessor.isInteractiveElement(p, container)).toBe(false);
    });

    it("should handle elements with interactive classes", () => {
      const div = document.createElement('div');
      div.className = 'internal-link';
      const container = document.createElement('div');
      
      expect(MarkdownProcessor.isInteractiveElement(div, container)).toBe(true);
    });
  });
});