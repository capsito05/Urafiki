export interface ThemePalette {
  id: string;
  label: string;
  emoji: string;
  bg: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textMuted: string;
  accentCoral: string;
  accentGold: string;
  buttonText: string;
}

export const THEMES: ThemePalette[] = [
  {
    id: 'noir',
    label: 'Cola',
    emoji: '⚫',
    bg: '#0d0d0d',
    surface: '#1a1a1a',
    surfaceLight: '#262626',
    text: '#ffffff',
    textMuted: '#b3b3b3',
    accentCoral: '#ff3d3d',
    accentGold: '#ffc857',
    buttonText: '#1a1a1a',
  },
  {
    id: 'jaune',
    label: 'Fanta',
    emoji: '🟡',
    bg: '#ffc107',
    surface: '#ffd54a',
    surfaceLight: '#ffe082',
    text: '#ff6f00',
    textMuted: '#8c4a00',
    accentCoral: '#ff6f00',
    accentGold: '#ffffff',
    buttonText: '#ffffff',
  },
  {
    id: 'rouge',
    label: 'Cerise',
    emoji: '🔴',
    bg: '#d62839',
    surface: '#b71c2c',
    surfaceLight: '#e23e50',
    text: '#ffe066',
    textMuted: '#ffc1c1',
    accentCoral: '#ffe066',
    accentGold: '#ffffff',
    buttonText: '#401010',
  },
  {
    id: 'violet',
    label: 'Raisin',
    emoji: '🟣',
    bg: '#6a3fa0',
    surface: '#5a3389',
    surfaceLight: '#7c4fbe',
    text: '#ffffff',
    textMuted: '#d8c5f0',
    accentCoral: '#ffc857',
    accentGold: '#ff3d81',
    buttonText: '#3a1f5c',
  },
  {
    id: 'rose',
    label: 'Fraise',
    emoji: '🩷',
    bg: '#ffffff',
    surface: '#fdebf3',
    surfaceLight: '#fbd1e4',
    text: '#ff3d81',
    textMuted: '#b85c82',
    accentCoral: '#ff3d81',
    accentGold: '#6a3fa0',
    buttonText: '#ffffff',
  },
  {
    id: 'bleu',
    label: 'Myrtille',
    emoji: '🔵',
    bg: '#2563eb',
    surface: '#1e4fc4',
    surfaceLight: '#3b6fe0',
    text: '#ffffff',
    textMuted: '#c7d6fa',
    accentCoral: '#ffd54a',
    accentGold: '#ff3d81',
    buttonText: '#1e3a8a',
  },
  {
    id: 'beige',
    label: 'Cream Soda',
    emoji: '🟤',
    bg: '#f1e4cf',
    surface: '#e8d5b7',
    surfaceLight: '#ddc49e',
    text: '#6b4226',
    textMuted: '#8c6a4a',
    accentCoral: '#d62839',
    accentGold: '#6a3fa0',
    buttonText: '#ffffff',
  },
  {
    id: 'marron',
    label: 'Chocolat',
    emoji: '🟫',
    bg: '#4b2e1e',
    surface: '#3a2214',
    surfaceLight: '#5c3a26',
    text: '#f1e4cf',
    textMuted: '#c9ae8e',
    accentCoral: '#ffc107',
    accentGold: '#ff6f00',
    buttonText: '#3a2214',
  },
];

export const BUBBLE_COLORS = ['#2563eb', '#f1e4cf', '#4b2e1e', '#ffffff', '#ffc107', '#d62839', '#6a3fa0', '#ff3d81'];

export function applyTheme(theme: ThemePalette) {
  const root = document.documentElement;
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-light', theme.surfaceLight);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--text-muted', theme.textMuted);
  root.style.setProperty('--accent-coral', theme.accentCoral);
  root.style.setProperty('--accent-gold', theme.accentGold);
  root.style.setProperty('--button-text', theme.buttonText);
}
