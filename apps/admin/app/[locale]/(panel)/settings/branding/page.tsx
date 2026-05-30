import type { Metadata } from 'next';

import { SettingsSubpageShell } from '@/components/settings/settings-subpage-shell';
import { BrandingForm } from '@/features/branding/components/branding-form';

export const metadata: Metadata = {
  title: 'Branding · Open Meet Admin',
};

export default function BrandingSettingsPage() {
  return (
    <SettingsSubpageShell titleKey="hub.cards.branding.title">
      <BrandingForm />
    </SettingsSubpageShell>
  );
}
