import type { Metadata } from 'next';

import { ConfigurationForm } from '@/features/configuration/components/configuration-form';

export const metadata: Metadata = {
  title: 'Configuration · Open Meet Admin',
};

export default function ConfigurationSettingsPage() {
  return <ConfigurationForm />;
}
