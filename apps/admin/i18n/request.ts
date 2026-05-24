import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

/**
 * One JSON file per namespace under `lang/<locale>/<namespace>.json`
 * (Laravel/Filament-style directory layout). Add a namespace here when you
 * add its files.
 */
const NAMESPACES = ['common', 'auth', 'accept-invite', 'nav', 'accounts', 'configuration'] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const entries = await Promise.all(
    NAMESPACES.map(
      async (ns) => [ns, (await import(`../lang/${locale}/${ns}.json`)).default] as const,
    ),
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
