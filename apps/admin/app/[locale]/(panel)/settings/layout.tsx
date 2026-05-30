import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  setRequestLocale(locale);

  return children;
}
