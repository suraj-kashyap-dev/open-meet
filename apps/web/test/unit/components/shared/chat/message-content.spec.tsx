import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageContent } from '@/components/shared/chat/message-content';

describe('MessageContent', () => {
  it('should render plain text', () => {
    const { container } = render(<MessageContent content="hello world" />);

    expect(container.textContent).toContain('hello world');
  });

  it('should render a [@name](userId) mention as a highlighted chip, not a link', () => {
    const { container } = render(<MessageContent content="hi [@Ada](u1) there" />);

    const chip = container.querySelector('[data-mention="u1"]');

    expect(chip).not.toBeNull();

    expect(chip?.textContent).toBe('@Ada');

    expect(container.querySelector('a[href="u1"]')).toBeNull();
  });

  it('should emphasize a mention of the current viewer', () => {
    const { container } = render(<MessageContent content="[@Me](u9)" currentUserId="u9" />);
    const chip = container.querySelector('[data-mention="u9"]');

    expect(chip?.className).toContain('bg-accent/20');
  });

  it('should render an external markdown link as a new-tab anchor', () => {
    const { container } = render(<MessageContent content="see [docs](https://example.com)" />);
    const link = container.querySelector('a[href="https://example.com"]');

    expect(link).not.toBeNull();

    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('should NOT render raw HTML embedded in content (XSS-safe)', () => {
    const { container } = render(
      <MessageContent content={'<img src=x onerror="alert(1)"> hello'} />,
    );

    expect(container.querySelector('img')).toBeNull();

    expect(container.textContent).toContain('hello');
  });

  it('should render markdown emphasis and code', () => {
    const { container } = render(<MessageContent content={'**bold** and `code`'} />);

    expect(container.querySelector('strong')?.textContent).toBe('bold');

    expect(container.querySelector('code')?.textContent).toBe('code');
  });
});
