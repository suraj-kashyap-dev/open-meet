'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@open-meet/ui/cn';

import { MediaLightbox } from './media-lightbox';

const EXTERNAL_SCHEME = /^(https?:|mailto:)/i;

export function MessageContent({
  content,
  currentUserId,
  className,
  inverted = false,
}: {
  content: string;
  currentUserId?: string;
  className?: string;
  inverted?: boolean;
}) {
  const components: Components = {
    img({ src, alt }) {
      const url = typeof src === 'string' ? src : '';

      if (!url) {
        return null;
      }

      return (
        <MediaLightbox
          src={url}
          alt={typeof alt === 'string' ? alt : ''}
          className="my-1 inline-block max-w-xs align-middle"
          thumbClassName="max-h-60"
        />
      );
    },
    a({ href, children }) {
      const url = href ?? '';

      if (EXTERNAL_SCHEME.test(url)) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'underline underline-offset-2',
              inverted
                ? 'text-accent-foreground/90 decoration-accent-foreground/40'
                : 'text-accent',
            )}
          >
            {children}
          </a>
        );
      }

      const isMe = currentUserId !== undefined && url === currentUserId;
      return (
        <span
          className={cn(
            'rounded px-1 font-semibold',
            inverted
              ? isMe
                ? 'bg-white/30 text-accent-foreground ring-1 ring-inset ring-white/20'
                : 'bg-white/15 text-accent-foreground'
              : isMe
                ? 'bg-accent/20 text-accent'
                : 'text-accent',
          )}
          data-mention={url}
        >
          {children}
        </span>
      );
    },
  };

  return (
    <div
      className={cn(
        'whitespace-pre-wrap break-words text-[15px] leading-[1.5]',
        '[&_p]:m-0 [&_p+p]:mt-2',
        '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:ps-5',
        inverted
          ? '[&_code]:rounded [&_code]:bg-white/20 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_pre]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-white/15 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:my-1 [&_blockquote]:border-s-2 [&_blockquote]:border-accent-foreground/40 [&_blockquote]:ps-2 [&_blockquote]:text-accent-foreground/85'
          : '[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] dark:[&_code]:bg-white/10 [&_pre]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/10 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 dark:[&_pre]:bg-white/10 [&_blockquote]:my-1 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-2 [&_blockquote]:text-muted-foreground',
        '[&_img]:my-1 [&_img]:max-h-60 [&_img]:rounded-md',
        '[&_a]:break-words',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
