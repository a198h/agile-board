/**
 * Helper for managing CSS properties safely.
 * Provides utilities for setting CSS custom properties (variables)
 * without direct style manipulation.
 */

/**
 * Sets CSS custom properties on an element.
 * Use this for dynamic values that must be computed at runtime.
 *
 * @param element - The HTML element to apply properties to
 * @param props - Record of CSS custom property names and values
 *
 * @example
 * ```ts
 * setCssProps(frame, {
 *   '--ab-col-start': '1',
 *   '--ab-col-span': '12',
 *   '--ab-row-start': '1',
 *   '--ab-row-span': '8'
 * });
 * ```
 */
export function setCssProps(
  element: HTMLElement,
  props: Record<string, string | number>
): void {
  for (const [key, value] of Object.entries(props)) {
    // Only allow CSS custom properties (variables starting with --)
    if (!key.startsWith('--')) {
      console.warn(
        `cssHelper: Attempted to set non-custom property "${key}". ` +
        'Only CSS custom properties (--*) are allowed.'
      );
      continue;
    }

    element.style.setProperty(key, String(value));
  }
}

/**
 * Sets grid position using CSS custom properties.
 *
 * @param element - The HTML element to position
 * @param x - Column start (0-based)
 * @param y - Row start (0-based)
 * @param w - Column span (width)
 * @param h - Row span (height)
 */
export function setGridPosition(
  element: HTMLElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  setCssProps(element, {
    '--ab-col-start': String(x + 1), // CSS Grid is 1-based
    '--ab-col-span': String(w),
    '--ab-row-start': String(y + 1), // CSS Grid is 1-based
    '--ab-row-span': String(h)
  });
}
