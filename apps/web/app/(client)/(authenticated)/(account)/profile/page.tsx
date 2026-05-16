import type { Metadata } from 'next';

import { ProfileForm } from '@/components/client/account/profile-form';

export const metadata: Metadata = {
  title: 'Profile',
};

export default function ProfilePage() {
  return <ProfileForm />;
}
