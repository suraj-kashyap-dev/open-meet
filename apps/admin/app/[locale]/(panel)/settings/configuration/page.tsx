import type { Metadata } from 'next';

import { SettingsSubpageShell } from '@/components/settings/settings-subpage-shell';
import { ConfigurationForm } from '@/features/configuration/components/configuration-form';

export const metadata: Metadata = {
  title: 'Configuration · Open Meet Admin',
};

export default function ConfigurationSettingsPage() {
  return (
    <SettingsSubpageShell titleKey="hub.cards.configuration.title">
      <ConfigurationForm />
    </SettingsSubpageShell>
  );
}
