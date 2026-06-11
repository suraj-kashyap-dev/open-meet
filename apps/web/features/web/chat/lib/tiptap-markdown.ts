interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: Mark[];
}

function inlineNode(node: DocNode): string {
  if (node.type === 'hardBreak') {
    return '\n';
  }

  if (node.type === 'mention') {
    const id = String(node.attrs?.id ?? '');
    const label = String(node.attrs?.label ?? node.attrs?.id ?? '');

    return `[@${label}](${id})`;
  }

  if (node.type === 'text') {
    let text = node.text ?? '';
    const marks = node.marks ?? [];
    const has = (t: string) => marks.some((m) => m.type === t);

    if (has('code')) {
      text = '`' + text + '`';
    }

    if (has('bold')) {
      text = `**${text}**`;
    }

    if (has('italic')) {
      text = `_${text}_`;
    }

    if (has('strike')) {
      text = `~~${text}~~`;
    }

    const link = marks.find((m) => m.type === 'link');

    if (link) {
      text = `[${text}](${String(link.attrs?.href ?? '')})`;
    }

    return text;
  }

  return '';
}

function inline(content?: DocNode[]): string {
  return (content ?? []).map(inlineNode).join('');
}

function listItemText(item: DocNode): string {
  return (item.content ?? []).map((c) => inline(c.content)).join(' ');
}

function block(node: DocNode): string {
  switch (node.type) {
    case 'heading':
      return `${'#'.repeat(Number(node.attrs?.level ?? 1))} ${inline(node.content)}`;
    case 'blockquote':
      return (node.content ?? [])
        .map((c) => inline(c.content))
        .map((line) => `> ${line}`)
        .join('\n');

    case 'codeBlock': {
      const lang = String(node.attrs?.language ?? '');
      const body = (node.content ?? []).map((c) => c.text ?? '').join('');

      return '```' + lang + '\n' + body + '\n```';
    }

    case 'bulletList':
      return (node.content ?? []).map((li) => `- ${listItemText(li)}`).join('\n');

    case 'orderedList': {
      let i = Number(node.attrs?.start ?? 1);

      return (node.content ?? []).map((li) => `${i++}. ${listItemText(li)}`).join('\n');
    }

    case 'horizontalRule':
      return '---';
    case 'paragraph':
    default:
      return inline(node.content);
  }
}

/** Serialize a Tiptap/ProseMirror JSON document to markdown matching the chat render pipeline. */
export function tiptapToMarkdown(doc: DocNode | null | undefined): string {
  if (!doc?.content) {
    return '';
  }

  return doc.content
    .map(block)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
