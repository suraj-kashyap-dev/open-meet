'use client';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';

import { AvatarUploader } from './avatar-uploader';
import { PageHeader, SectionCard } from './section';
import { PasswordForm } from './password-form';
import { ProfileEditForm } from './profile-edit-form';

export function ProfileForm() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Update how you appear to others in meetings and chats."
      />

      <SectionCard title="Profile image" description="Optional. A square image works best.">
        <AvatarUploader user={user} />
      </SectionCard>

      <SectionCard title="Personal details" description="Your display name, email, and bio.">
        <ProfileEditForm user={user} />
      </SectionCard>

      <SectionCard title="Password" description="Change the password used to sign in.">
        <PasswordForm />
      </SectionCard>
    </div>
  );
}
