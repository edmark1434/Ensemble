/**
 * markdownPaste.ts
 * Utility to convert pasted rich HTML (e.g. from ChatGPT, Notion, Google Docs)
 * and plain formatted text into clean, structured Markdown for textareas.
 */

interface WalkContext {
  insideLi?: boolean;
  listType?: 'ul' | 'ol';
  listIndex?: number;
  listLevel?: number;
}

/**
 * Checks if the HTML clipboard contains actual semantic rich tags.
 */
export function hasRichHtml(html: string): boolean {
  if (!html || typeof html !== 'string') return false;
  // Look for meaningful rich text tags
  return /<(p|ul|ol|li|strong|b|em|i|h[1-6]|br|blockquote|pre|code|a|hr)[\s>]/i.test(html);
}

/**
 * Converts a DOM node into Markdown string recursively.
 */
function walkNode(node: Node, ctx: WalkContext = {}): string {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    // Collapse excess whitespace inside text nodes but preserve words
    return text.replace(/[\r\n\t]+/g, ' ');
  }

  // Element node
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Strip irrelevant or non-content elements
  if (['style', 'script', 'head', 'meta', 'svg', 'button', 'noscript', 'canvas'].includes(tag)) {
    return '';
  }

  const getChildrenMarkdown = (nextCtx: WalkContext = ctx): string => {
    let result = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      result += walkNode(el.childNodes[i], nextCtx);
    }
    return result;
  };

  switch (tag) {
    case 'h1':
      return `\n\n# ${getChildrenMarkdown().trim()}\n\n`;
    case 'h2':
      return `\n\n## ${getChildrenMarkdown().trim()}\n\n`;
    case 'h3':
      return `\n\n### ${getChildrenMarkdown().trim()}\n\n`;
    case 'h4':
      return `\n\n#### ${getChildrenMarkdown().trim()}\n\n`;
    case 'h5':
    case 'h6':
      return `\n\n##### ${getChildrenMarkdown().trim()}\n\n`;

    case 'p': {
      const text = getChildrenMarkdown().trim();
      if (!text) return '';
      // If inside an <li>, don't generate double newlines which breaks the list
      return ctx.insideLi ? `${text} ` : `\n\n${text}\n\n`;
    }

    case 'br':
      return '\n';

    case 'hr':
      return '\n\n---\n\n';

    case 'strong':
    case 'b': {
      const content = getChildrenMarkdown();
      if (!content.trim()) return content;
      const leading = content.match(/^\s*/)?.[0] || '';
      const trailing = content.match(/\s*$/)?.[0] || '';
      return `${leading}**${content.trim()}**${trailing}`;
    }

    case 'em':
    case 'i': {
      const content = getChildrenMarkdown();
      if (!content.trim()) return content;
      const leading = content.match(/^\s*/)?.[0] || '';
      const trailing = content.match(/\s*$/)?.[0] || '';
      return `${leading}*${content.trim()}*${trailing}`;
    }

    case 'code': {
      const isInsidePre = el.parentElement?.tagName.toLowerCase() === 'pre';
      if (isInsidePre) {
        return el.textContent || '';
      }
      const codeText = (el.textContent || '').trim();
      return codeText ? `\`${codeText}\`` : '';
    }

    case 'pre': {
      const blockText = (el.textContent || '').trim();
      return blockText ? `\n\n\`\`\`\n${blockText}\n\`\`\`\n\n` : '';
    }

    case 'blockquote': {
      const bqText = getChildrenMarkdown().trim();
      if (!bqText) return '';
      const lines = bqText.split('\n').map(l => `> ${l}`).join('\n');
      return `\n\n${lines}\n\n`;
    }

    case 'ul': {
      let listMd = '\n\n';
      let idx = 0;
      const currentLevel = ctx.listLevel || 0;
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
          listMd += walkNode(child, { ...ctx, listType: 'ul', listIndex: idx++, listLevel: currentLevel });
        }
      }
      return listMd + '\n\n';
    }

    case 'ol': {
      let listMd = '\n\n';
      let idx = 1;
      const currentLevel = ctx.listLevel || 0;
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
          listMd += walkNode(child, { ...ctx, listType: 'ol', listIndex: idx++, listLevel: currentLevel });
        }
      }
      return listMd + '\n\n';
    }

    case 'li': {
      const currentLevel = ctx.listLevel || 0;
      const content = getChildrenMarkdown({ ...ctx, insideLi: true, listLevel: currentLevel + 1 }).trim();
      if (!content) return '';
      const indent = '  '.repeat(currentLevel);
      const prefix = ctx.listType === 'ol' ? `${ctx.listIndex || 1}. ` : '- ';
      return `${indent}${prefix}${content}\n`;
    }

    case 'a': {
      const href = el.getAttribute('href');
      const text = getChildrenMarkdown().trim();
      if (!text) return '';
      return href ? `[${text}](${href})` : text;
    }

    case 'div': {
      const content = getChildrenMarkdown();
      return content ? `\n${content}\n` : '';
    }

    default:
      return getChildrenMarkdown();
  }
}

/**
 * Converts rich HTML string to structured Markdown.
 */
export function htmlToMarkdown(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const md = walkNode(doc.body);
    return cleanUpMarkdown(md);
  } catch (err) {
    console.error('Failed to parse HTML to Markdown:', err);
    return '';
  }
}

/**
 * Normalizes plain text that might contain unicode bullets (•, ○, o) or squashed sections.
 */
export function cleanPlainTextToMarkdown(text: string): string {
  return autoFormatDescription(text);
}

/**
 * Auto-formats any text (squashed text, plain text with bullets, or raw AI output)
 * into structured Markdown with bold headers and clean bullet lists.
 */
export function autoFormatDescription(rawText: string): string {
  if (!rawText) return '';
  let res = rawText.trim();

  // Strip accidental leading "Job Post Description:" label from AI prompts
  res = res.replace(/^(?:Suggested\s+)?Job\s+Post\s+Description:\s*/i, '');

  // 1. Standardize existing bullet symbols at line start
  res = res.replace(/^[ \t]*[•○◦⁃‣▪▫–—*][ \t]*/gm, '- ');
  // Handle circular bullet icon copied as letter 'o' (common in ChatGPT terminal/web pastes)
  res = res.replace(/^[ \t]*o[ \t]+(?=[A-Z0-9"'\`])/gm, '- ');

  // 2. Separate closing calls to action into their own paragraph
  res = res.replace(/([.?!])\s+(Please\b|To apply\b|If interested\b|Feel free\b|Looking forward\b)/gi, '$1\n\n$2');

  // 3. Separate headers embedded inline like '.  Project Requirements: '
  res = res.replace(/([.?!])\s+([A-Z][A-Za-z0-9 /&-]{2,35}:)\s*/g, '$1\n\n**$2**\n');
  // Bold headers that start a line
  res = res.replace(/^([A-Z][A-Za-z0-9 /&-]{2,35}:)\s*/gm, '**$1**\n');

  // 4. If a header like **Project Requirements:** is followed by sentences, convert each sentence to a bullet
  res = res.replace(/(\*\*[^*]+:\*\*\n)([\s\S]+?)(?=\n\n|$)/g, (match, header, body) => {
    // If the body already has bullet formatting, leave it intact
    if (body.includes('- ') || body.includes('* ')) return match;
    const sentences = body.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length > 1) {
      return header + sentences.map(s => `- ${s}`).join('\n');
    }
    return match;
  });

  return cleanUpMarkdown(res);
}

/**
 * Final cleanup to ensure proper paragraph spacing and no trailing garbage.
 */
function cleanUpMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, '\n')
    // Remove more than two consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing spaces at line ends
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/**
 * Handles rich paste on a textarea:
 * Intercepts HTML from clipboard (ChatGPT, Notion, etc.) and converts to Markdown,
 * or formats plain text if it contains bullets/headers.
 */
export function handleRichTextPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  setValue: (val: string) => void,
  maxLength: number = 2000
): boolean {
  const clipboardData = e.clipboardData;
  if (!clipboardData) return false;

  const html = clipboardData.getData('text/html');
  const plainText = clipboardData.getData('text/plain');

  let markdownToInsert = '';

  if (html && hasRichHtml(html)) {
    const converted = htmlToMarkdown(html);
    if (converted && converted.trim()) {
      markdownToInsert = converted;
    }
  }

  // Fallback to plain text if HTML was not rich or didn't yield markdown
  if (!markdownToInsert && plainText) {
    // If plain text has bullets or inline headers, auto-format it
    if (
      /[•○◦⁃‣▪▫o*]\s+[A-Za-z0-9]/.test(plainText) ||
      /(?:Project Requirements|Requirements|Deliverables|Scope):/i.test(plainText) ||
      plainText.includes('\n')
    ) {
      markdownToInsert = autoFormatDescription(plainText);
    } else {
      // Normal plain text: let default browser paste handle it
      return false;
    }
  }

  if (!markdownToInsert) return false;

  // Intercept and insert converted markdown
  e.preventDefault();

  const textarea = e.currentTarget;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;

  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);

  let combined = before + markdownToInsert + after;
  if (maxLength && combined.length > maxLength) {
    const available = Math.max(0, maxLength - before.length - after.length);
    markdownToInsert = markdownToInsert.slice(0, available);
    combined = before + markdownToInsert + after;
  }

  setValue(combined);

  // Position cursor right after the inserted text
  requestAnimationFrame(() => {
    if (textarea) {
      const newPos = start + markdownToInsert.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
      textarea.focus();
    }
  });

  return true;
}

/**
 * Strips markdown symbols (blockquotes, bold, headers, list markers)
 * to produce clean plain text for card previews and snippets.
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return "";
  return markdown
    .replace(/^>+\s*/gm, "") // remove blockquotes
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // remove bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // remove italic
    .replace(/#{1,6}\s+/g, "") // remove headers
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // remove links, keep label
    .replace(/^[ \t]*[-*+][ \t]+/gm, "") // remove list bullets
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "") // remove numbered lists
    .replace(/\s+/g, " ") // collapse multiple spaces/newlines
    .trim();
}
