import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Toaster } from '@open-meet/ui/sonner';

import { isRtl, routing } from '@/i18n/routing';
import { getBranding } from '@/lib/branding';
import { Providers } from '@/providers';
import '../globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { appName } = await getBranding();

  return {
    metadataBase: new URL('http://localhost:3001'),
    title: {
      default: `${appName} · Admin`,
      template: `%s · ${appName} Admin`,
    },
    description: `Administration console for ${appName}.`,
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const branding = await getBranding();

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <Providers initialBranding={branding}>
            {children}
            <Toaster position="bottom-right" />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
