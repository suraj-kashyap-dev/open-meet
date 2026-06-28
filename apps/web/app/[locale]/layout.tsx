import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { isRtl, routing } from '@/i18n/routing';
import { getBranding } from '@/lib/branding';
import { BrandingProvider } from '@/components/web/branding/branding-provider';
import { buildAccentBootstrapScript } from '@/components/web/theme/accent-cache';
import { AccentProvider } from '@/components/web/theme/accent-provider';
import { buildAccentCss } from '@/components/web/theme/accent-css';
import { Providers } from '@/providers';
import { Toaster } from '@open-meet/ui/sonner';
import '../globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { appName } = await getBranding();

  return {
    metadataBase: new URL('http://localhost:3000'),
    title: {
      default: `${appName} · Connect & Collaborate`,
      template: `%s · ${appName}`,
    },
    description:
      'Real-time video conferencing for distributed teams. No downloads, no friction - open a link and start talking.',
    keywords: ['video conferencing', 'meetings', 'webrtc', 'team collaboration'],
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
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
      <head>
        <style
          dangerouslySetInnerHTML={{ __html: buildAccentCss(branding.accentColor ?? 'indigo') }}
        />
        <script dangerouslySetInnerHTML={{ __html: buildAccentBootstrapScript() }} />
      </head>
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <BrandingProvider value={branding}>
            <Providers>
              <AccentProvider>{children}</AccentProvider>
              <Toaster position="bottom-right" />
            </Providers>
          </BrandingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
