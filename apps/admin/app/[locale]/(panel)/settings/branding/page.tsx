import type { Metadata } from 'next';

import { BrandingForm } from '@/features/branding/components/branding-form';

export const metadata: Metadata = {
  title: 'Branding · Open Meet Admin',
};

export default function BrandingSettingsPage() {
  return <BrandingForm />;
}
