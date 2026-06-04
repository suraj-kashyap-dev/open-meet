'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { byteSize } from '@/components/shared/chat';

export function useFormatSize(): (bytes: number) => string {
  const t = useTranslations('chat');

  return useCallback(
    (bytes: number) => {
      const s = byteSize(bytes);
      if (s.unit === 'B') return t('size-bytes', { bytes: s.bytes });
      if (s.unit === 'KB') return t('size-kb', { kb: s.kb });
      return t('size-mb', { mb: s.mb });
    },
    [t],
  );
}
