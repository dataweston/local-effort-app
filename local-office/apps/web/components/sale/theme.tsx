import type { CSSProperties, ReactNode } from 'react';

import type { NormalizedSale } from '../../lib/sales';

export type SaleTheme = {
  layout: 'standard' | 'paikka';
  background: string;
  foreground: string;
  surface: string;
  border: string;
  muted: string;
  accent: string;
  buttonVariant: 'solid' | 'outline';
  cardStyle: 'solid' | 'frosted';
};

const STANDARD_BASE: SaleTheme = {
  layout: 'standard',
  background: '#0f172a',
  foreground: '#f8fafc',
  surface: 'rgba(15, 23, 42, 0.55)',
  border: 'rgba(148, 163, 184, 0.25)',
  muted: 'rgba(226, 232, 240, 0.85)',
  accent: '#f97316',
  buttonVariant: 'solid',
  cardStyle: 'solid'
};

const PAIKKA_BASE: SaleTheme = {
  layout: 'paikka',
  background: '#f6f3ed',
  foreground: '#1f1b16',
  surface: 'rgba(255, 255, 255, 0.82)',
  border: 'rgba(33, 24, 18, 0.14)',
  muted: 'rgba(66, 56, 48, 0.7)',
  accent: '#b45309',
  buttonVariant: 'solid',
  cardStyle: 'frosted'
};

export function createSaleTheme(sale: NormalizedSale): SaleTheme {
  const base = sale.layoutVariant === 'paikka' ? PAIKKA_BASE : STANDARD_BASE;
  const themeOverrides = sale.theme ?? {};

  const resolved: SaleTheme = {
    ...base,
    layout: sale.layoutVariant === 'paikka' ? 'paikka' : 'standard',
    background: themeOverrides.backgroundColor ?? base.background,
    foreground: themeOverrides.foregroundColor ?? base.foreground,
    surface: themeOverrides.surfaceColor ?? base.surface,
    border: themeOverrides.borderColor ?? base.border,
    muted: themeOverrides.mutedColor ?? base.muted,
    accent: themeOverrides.accentColor ?? base.accent,
    buttonVariant: themeOverrides.buttonVariant === 'outline' ? 'outline' : base.buttonVariant,
    cardStyle: themeOverrides.cardStyle === 'frosted' ? 'frosted' : base.cardStyle
  };

  return resolved;
}

export function saleThemeStyles(theme: SaleTheme): CSSProperties {
  return {
    '--sale-bg': theme.background,
    '--sale-fg': theme.foreground,
    '--sale-surface': theme.surface,
    '--sale-border': theme.border,
    '--sale-muted': theme.muted,
    '--sale-accent': theme.accent
  } as CSSProperties;
}

export type SaleLayoutProps = {
  sale: NormalizedSale;
  theme: SaleTheme;
  children?: ReactNode;
};
