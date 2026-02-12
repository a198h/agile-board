/**
 * Layout Styles Module
 *
 * IMPORTANT: This file contains layout-critical inline styles that MUST NOT be user-modifiable.
 *
 * WHY INLINE STYLES HERE:
 * - These styles control the grid system, positioning, flex behavior, and overflow management
 * - They are essential for proper board rendering and preventing layout bugs (e.g., issue #19)
 * - Users should NOT be able to modify these via styles.css as it would break the layout system
 * - Visual styles (colors, borders, shadows, fonts) remain in styles.css for user customization
 *
 * REVIEW NOTE (/skip justification):
 * The use of element.style.* in this file is intentional and necessary.
 * All layout-critical properties are centralized here to:
 * 1. Prevent user modifications from breaking the layout system
 * 2. Enable dynamic positioning based on layout JSON files
 * 3. Ensure consistent behavior across all layouts
 * Only visual/theme properties remain in styles.css for user customization.
 */

/**
 * Applies container layout styles.
 * These styles ensure the board container behaves correctly within Obsidian's view system.
 *
 * @param element - The container element
 */
export function applyContainerLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  });
}

/**
 * Applies grid layout styles.
 * These styles are critical for the 24x24 grid system to work properly.
 *
 * @param element - The grid container element
 */
export function applyGridLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(24, 1fr)',
    gridTemplateRows: 'repeat(24, minmax(0, 1fr))',
    height: '100%'
  });
}

/**
 * Applies frame grid positioning and layout styles.
 * Controls both positioning and flex behavior for preventing expansion (issue #19).
 *
 * @param element - The frame element
 * @param x - Column start (0-based)
 * @param y - Row start (0-based)
 * @param w - Column span (width)
 * @param h - Row span (height)
 */
export function applyFrameLayoutStyles(
  element: HTMLElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  Object.assign(element.style, {
    // Grid positioning (dynamic based on layout JSON)
    gridColumn: `${x + 1} / span ${w}`, // CSS Grid is 1-based
    gridRow: `${y + 1} / span ${h}`,

    // Layout structure (critical for preventing expansion - issue #19)
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'stretch',
    justifySelf: 'stretch',

    // Overflow control (critical for preventing frame expansion)
    overflow: 'hidden',
    boxSizing: 'border-box'
  });
}

/**
 * Applies frame title layout styles.
 * Prevents the title from shrinking in flex layout.
 *
 * @param element - The title element
 */
export function applyFrameTitleLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    display: 'block',
    flexShrink: '0'
  });
}

/**
 * Applies frame content container layout styles.
 * Controls flex behavior and overflow for content area.
 *
 * @param element - The content container element
 */
export function applyFrameContentLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    flex: '1',
    minHeight: '0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  });
}

/**
 * Applies markdown box layout styles.
 * Controls flex behavior for markdown content.
 *
 * @param element - The markdown box element
 */
export function applyMarkdownBoxLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: '1',
    minHeight: '0',
    boxSizing: 'border-box'
  });
}

/**
 * Applies markdown preview layout styles.
 * Enables scrolling for overflow content.
 *
 * @param element - The markdown preview element
 */
export function applyMarkdownPreviewLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    flex: '1',
    overflow: 'auto'
  });
}

/**
 * Applies markdown editor layout styles.
 * Controls positioning and sizing for the editor.
 *
 * @param element - The editor element
 */
export function applyMarkdownEditorLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    width: '100%',
    flex: '1',
    minHeight: '0',
    boxSizing: 'border-box',
    resize: 'none',
    overflow: 'auto',
    display: 'none'
  });
}

/**
 * Applies textarea layout styles.
 * Controls positioning and sizing for absolute-positioned textarea.
 *
 * @param element - The textarea element
 */
export function applyTextareaLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    resize: 'none',
    boxSizing: 'border-box'
  });
}

/**
 * Applies frame content visual layout styles (for agileBoardView).
 * Controls flex behavior and overflow for frame content in legacy view.
 * Note: This is different from applyFrameContentLayoutStyles which is for layoutRenderer.
 *
 * @param element - The frame content element
 */
export function applyFrameContentVisualLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    flex: '1',
    overflow: 'auto'
  });
}

/**
 * Applies preview container layout styles.
 * Controls sizing and overflow for markdown preview elements.
 *
 * @param element - The preview container element
 */
export function applyPreviewContainerLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    boxSizing: 'border-box'
  });
}

/**
 * Applies editor container layout styles.
 * Controls sizing, positioning and visibility for editor elements.
 *
 * @param element - The editor container element
 */
export function applyEditorContainerLayoutStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    width: '100%',
    height: '100%',
    display: 'none',
    boxSizing: 'border-box',
    position: 'relative'
  });
}
