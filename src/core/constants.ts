/**
 * Application constants and configuration values
 */

// Grid System
export const GRID_CONSTANTS = {
    SIZE: 24,
    MAX_INDEX: 23, // SIZE - 1
    MIN_SIZE: 1,
    CELL_SIZE_PX: 26,
    TOTAL_WIDTH_PX: 624, // SIZE * CELL_SIZE_PX
    PADDING_PX: 18,
    CONTAINER_WIDTH_PX: 650
} as const;

// UI Layout
export const UI_CONSTANTS = {
    EDITOR_WIDTH_PX: 650,
    EDITOR_HEIGHT_PX: 650,
    RESIZE_HANDLE_SIZE_PX: 8,
    MIN_BOX_SIZE: 1,
    Z_INDEX: {
        GRID: 1,
        BOX: 5,
        SELECTED_BOX: 10,
        RESIZE_HANDLE: 15,
        MODAL: 100
    }
} as const;

// Timeouts and Delays
export const TIMING_CONSTANTS = {
    IMPORT_TIMEOUT_MS: 8000,
    FILE_OPERATION_DELAY_MS: 200,
    DEBOUNCE_DELAY_MS: 300
} as const;

// Color System
export const COLOR_CONSTANTS = {
    TOTAL_COLORS: 12,
    COLOR_PREFIX: '--agile-board-color-',
    BORDER_PREFIX: '--agile-board-border-'
} as const;

// Validation
export const VALIDATION_CONSTANTS = {
    NAME_PATTERN: /^[a-zA-Z0-9_\s-]+$/,
    SLUG_PATTERN: /[^a-zA-Z0-9-_]/g,
    MAX_NAME_LENGTH: 100,
    MIN_NAME_LENGTH: 1
} as const;

// File System
export const FILE_CONSTANTS = {
    LAYOUTS_DIR: 'layouts',
    FILE_EXTENSION: '.json',
    ENCODING: 'utf8'
} as const;

// ID Generation
export const ID_CONSTANTS = {
    RANDOM_STRING_LENGTH: 9,
    RANDOM_STRING_START: 2,
    BOX_ID_SEPARATOR: '-box-',
    DATE_PRECISION: 36
} as const;

// ID Generation helper
export const generateBoxId = (): string => {
    return `box-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};