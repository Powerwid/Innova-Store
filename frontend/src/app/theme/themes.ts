import type { ThemeDefinition } from 'vuetify'

export const appThemes = {
  storeEmerald: {
    dark: false,
    colors: {
      background: '#f4f7fb',
      surface: '#ffffff',
      'surface-variant': '#eef2f7',
      primary: '#0f766e',
      'primary-darken-1': '#115e59',
      secondary: '#0f172a',
      accent: '#14b8a6',
      success: '#16a34a',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#2563eb',
    },
  },
  storeOcean: {
    dark: false,
    colors: {
      background: '#f3f7fc',
      surface: '#ffffff',
      'surface-variant': '#eaf1fb',
      primary: '#2563eb',
      'primary-darken-1': '#1d4ed8',
      secondary: '#172554',
      accent: '#0ea5e9',
      success: '#16a34a',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#0284c7',
    },
  },
  storeAmber: {
    dark: false,
    colors: {
      background: '#fff8f1',
      surface: '#ffffff',
      'surface-variant': '#fff0df',
      primary: '#ea580c',
      'primary-darken-1': '#c2410c',
      secondary: '#431407',
      accent: '#f59e0b',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      info: '#2563eb',
    },
  },
  storeViolet: {
    dark: false,
    colors: {
      background: '#f8f7fc',
      surface: '#ffffff',
      'surface-variant': '#f0edfa',
      primary: '#7c3aed',
      'primary-darken-1': '#6d28d9',
      secondary: '#2e1065',
      accent: '#a855f7',
      success: '#16a34a',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#2563eb',
    },
  },
  storeDark: {
    dark: true,
    colors: {
      background: '#0d1117',
      surface: '#171c24',
      'surface-variant': '#202936',
      primary: '#38bdf8',
      'primary-darken-1': '#0284c7',
      secondary: '#f8fafc',
      accent: '#2dd4bf',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#fb7185',
      info: '#60a5fa',
    },
  },
} satisfies Record<string, ThemeDefinition>

export type AppThemeName = keyof typeof appThemes

export interface ThemeOption {
  value: AppThemeName
  label: string
  description: string
  primary: string
  surface: string
  dark: boolean
}

export const themeOptions: ThemeOption[] = [
  { value: 'storeEmerald', label: 'Esmeralda', description: 'Claro', primary: '#0f766e', surface: '#f4f7fb', dark: false },
  { value: 'storeOcean', label: 'Océano', description: 'Claro', primary: '#2563eb', surface: '#f3f7fc', dark: false },
  { value: 'storeAmber', label: 'Ámbar', description: 'Claro', primary: '#ea580c', surface: '#fff8f1', dark: false },
  { value: 'storeViolet', label: 'Violeta', description: 'Claro', primary: '#7c3aed', surface: '#f8f7fc', dark: false },
  { value: 'storeDark', label: 'Nocturno', description: 'Oscuro', primary: '#38bdf8', surface: '#171c24', dark: true },
]

export function isAppThemeName(value: unknown): value is AppThemeName {
  return typeof value === 'string' && value in appThemes
}
