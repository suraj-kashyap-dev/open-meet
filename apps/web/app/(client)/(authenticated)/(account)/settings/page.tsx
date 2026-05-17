import type { Metadata } from 'next';

import { SettingsForm } from '@/features/account/components/settings-form';

export const metadata: Metadata = {
  title: 'Settings',
};

export default function SettingsPage() {
  return <SettingsForm />;
}
