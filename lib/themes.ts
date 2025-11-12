export interface ColorTheme {
  id: string;
  name: string;
  displayName: string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textLight: string;
  };
}

export const themes: ColorTheme[] = [
  {
    id: "blue",
    name: "Blau",
    displayName: "Klassisches Blau",
    colors: {
      primary: "#3B82F6", // blue-500
      primaryLight: "#60A5FA", // blue-400
      primaryDark: "#2563EB", // blue-600
      secondary: "#1E40AF", // blue-800
      accent: "#60A5FA", // blue-400
      background: "#F9FAFB", // gray-50
      surface: "#FFFFFF",
      text: "#111827", // gray-900
      textLight: "#6B7280", // gray-500
    },
  },
  {
    id: "green",
    name: "Grün",
    displayName: "Frisches Grün",
    colors: {
      primary: "#10B981", // emerald-500
      primaryLight: "#34D399", // emerald-400
      primaryDark: "#059669", // emerald-600
      secondary: "#047857", // emerald-700
      accent: "#34D399", // emerald-400
      background: "#F0FDF4", // green-50
      surface: "#FFFFFF",
      text: "#111827", // gray-900
      textLight: "#6B7280", // gray-500
    },
  },
  {
    id: "purple",
    name: "Lila",
    displayName: "Elegantes Lila",
    colors: {
      primary: "#8B5CF6", // violet-500
      primaryLight: "#A78BFA", // violet-400
      primaryDark: "#7C3AED", // violet-600
      secondary: "#6D28D9", // violet-700
      accent: "#A78BFA", // violet-400
      background: "#FAF5FF", // purple-50
      surface: "#FFFFFF",
      text: "#111827", // gray-900
      textLight: "#6B7280", // gray-500
    },
  },
  {
    id: "orange",
    name: "Orange",
    displayName: "Warmes Orange",
    colors: {
      primary: "#F97316", // orange-500
      primaryLight: "#FB923C", // orange-400
      primaryDark: "#EA580C", // orange-600
      secondary: "#C2410C", // orange-700
      accent: "#FB923C", // orange-400
      background: "#FFF7ED", // orange-50
      surface: "#FFFFFF",
      text: "#111827", // gray-900
      textLight: "#6B7280", // gray-500
    },
  },
  {
    id: "dark",
    name: "Dunkel",
    displayName: "Dunkler Modus",
    colors: {
      primary: "#6366F1", // indigo-500
      primaryLight: "#818CF8", // indigo-400
      primaryDark: "#4F46E5", // indigo-600
      secondary: "#312E81", // indigo-900
      accent: "#818CF8", // indigo-400
      background: "#111827", // gray-900
      surface: "#1F2937", // gray-800
      text: "#F9FAFB", // gray-50
      textLight: "#9CA3AF", // gray-400
    },
  },
];

export function getThemeById(id: string): ColorTheme {
  return themes.find((t) => t.id === id) || themes[0];
}

export function applyTheme(theme: ColorTheme): string {
  // Returns CSS custom properties as a string for inline styles or style tag
  return `
    --color-primary: ${theme.colors.primary};
    --color-primary-light: ${theme.colors.primaryLight};
    --color-primary-dark: ${theme.colors.primaryDark};
    --color-secondary: ${theme.colors.secondary};
    --color-accent: ${theme.colors.accent};
    --color-background: ${theme.colors.background};
    --color-surface: ${theme.colors.surface};
    --color-text: ${theme.colors.text};
    --color-text-light: ${theme.colors.textLight};
  `.trim();
}

export function getThemeStyles(theme: ColorTheme): React.CSSProperties {
  return {
    "--color-primary": theme.colors.primary,
    "--color-primary-light": theme.colors.primaryLight,
    "--color-primary-dark": theme.colors.primaryDark,
    "--color-secondary": theme.colors.secondary,
    "--color-accent": theme.colors.accent,
    "--color-background": theme.colors.background,
    "--color-surface": theme.colors.surface,
    "--color-text": theme.colors.text,
    "--color-text-light": theme.colors.textLight,
  } as React.CSSProperties;
}
