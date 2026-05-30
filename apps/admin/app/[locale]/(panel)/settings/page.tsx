import type { Metadata } from 'next';

import { SettingsHub } from '@/components/settings/settings-hub';

export const metadata: Metadata = {
  title: 'Settings · Open Meet Admin',
};

export default function SettingsHubPage() {
  return <SettingsHub />;
}
