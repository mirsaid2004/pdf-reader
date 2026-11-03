export const READER_THEMES = ["light", "sepia", "dark"] as const;
export type ReaderTheme = (typeof READER_THEMES)[number];

export const isReaderTheme = (value: string): value is ReaderTheme =>
  (READER_THEMES as readonly string[]).includes(value);

type ThemeStyle = {
  label: string;
  /** CSS filter applied to the canvas layer only (the text layer is untouched). */
  canvasFilter: string;
  /** Background behind the pages. */
  surface: string;
  /** Swatch colour for the theme picker. */
  swatch: string;
};

export const THEME_STYLES: Record<ReaderTheme, ThemeStyle> = {
  light: {
    label: "Light",
    canvasFilter: "none",
    surface: "#e4e4e7",
    swatch: "#ffffff",
  },
  sepia: {
    label: "Sepia",
    canvasFilter: "sepia(0.6) brightness(0.95)",
    surface: "#cdbf9f",
    swatch: "#f1e4c4",
  },
  // Inverting a white page gives a dark one; hue-rotate keeps colours roughly true.
  dark: {
    label: "Dark",
    canvasFilter: "invert(0.92) hue-rotate(180deg)",
    surface: "#111113",
    swatch: "#1c1c1e",
  },
};
