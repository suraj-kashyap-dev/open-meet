import { defineRouting } from 'next-intl/routing';

export const locales = [
  'en',
  'ar',
  'es',
  'zh',
  'ru',
  'tr',
  'hi',
  'pt',
  'fr',
  'de',
  'ja',
  'ko',
  'id',
  'it',
  'bn',
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const rtlLocales: readonly Locale[] = ['ar'];

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
});
