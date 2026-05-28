'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@open-meet/ui/cn';

const EXTERNAL_SCHEME = /^(https?:|mailto:)/i;

/**
 * Renders message markdown safely (react-markdown does NOT render raw HTML
 * unless rehype-raw is added, which it is not — so user content can't inject
 * markup). Mentions are encoded as markdown links `[@name](userId)` whose href
 * has no scheme; those render as a highlighted chip instead of an anchor.
 */
export function MessageContent({
  content,
  currentUserId,
  className,
}: {
  content: string;
  currentUserId?: string;
  className?: string;
}) {
  const components: Components = {
    a({ href, children }) {
      const url = href ?? '';

      if (EXTERNAL_SCHEME.test(url)) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            {children}
          </a>
        );
      }

      const isMe = currentUserId !== undefined && url === currentUserId;
      return (
        <span
          className={cn(
            'rounded px-1 font-medium',
            isMe ? 'bg-accent/20 text-accent' : 'text-accent',
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
        'whitespace-pre-wrap break-words text-sm leading-relaxed',
        '[&_p]:m-0 [&_p+p]:mt-2',
        '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:ps-5',
        '[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] dark:[&_code]:bg-white/10',
        '[&_pre]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/10 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 dark:[&_pre]:bg-white/10',
        '[&_blockquote]:my-1 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-2 [&_blockquote]:text-muted-foreground',
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
