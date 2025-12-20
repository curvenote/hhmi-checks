import React from 'react';

/**
 * Process Markdown-style formatting (**bold**, __underline__, [links](url), email addresses, HTTP/HTTPS URLs, bullet lists, and numbered lists)
 *
 * @param text
 * @returns
 */
export function processMarkdownFormatting(text: string): React.ReactNode[] {
  // First, process lists (they need special handling)
  const listProcessed = processMarkdownLists(text);

  // Then process inline formatting (bold, underline) on each segment
  const result: React.ReactNode[] = [];

  for (const segment of listProcessed) {
    if (typeof segment === 'string') {
      result.push(...processInlineFormatting(segment));
    } else {
      result.push(segment);
    }
  }

  return result;
}

/**
 * Process Markdown-style lists (- bullet, 1. numbered)
 */
function processMarkdownLists(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let currentListType: 'bullet' | 'numbered' | null = null;
  let listIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for bullet list item
    if (line.match(/^-\s+/)) {
      const content = line.replace(/^-\s+/, '');

      if (currentListType !== 'bullet') {
        // Flush previous list if different type
        if (currentList.length > 0) {
          result.push(renderList(currentList, currentListType!, listIndex++));
          currentList = [];
        }
        currentListType = 'bullet';
      }

      currentList.push(
        <li key={`bullet-${i}`} className="mb-1">
          {content}
        </li>,
      );
    }
    // Check for numbered list item
    else if (line.match(/^\d+\.\s+/)) {
      const content = line.replace(/^\d+\.\s+/, '');

      if (currentListType !== 'numbered') {
        // Flush previous list if different type
        if (currentList.length > 0) {
          result.push(renderList(currentList, currentListType!, listIndex++));
          currentList = [];
        }
        currentListType = 'numbered';
      }

      currentList.push(
        <li key={`numbered-${i}`} className="mb-1">
          {content}
        </li>,
      );
    }
    // Regular line
    else {
      // Flush current list if we have one
      if (currentList.length > 0) {
        result.push(renderList(currentList, currentListType!, listIndex++));
        currentList = [];
        currentListType = null;
      }

      if (line) {
        result.push(line);
      } else {
        result.push('\n');
      }
    }
  }

  // Flush any remaining list
  if (currentList.length > 0) {
    result.push(renderList(currentList, currentListType!, listIndex++));
  }

  return result;
}

/**
 * Render a list as either ul or ol
 */
function renderList(
  items: React.ReactNode[],
  type: 'bullet' | 'numbered',
  index: number,
): React.ReactNode {
  const ListComponent = type === 'bullet' ? 'ul' : 'ol';
  const className =
    type === 'bullet'
      ? 'my-2 ml-12 space-y-1 list-disc list-outside'
      : 'my-2 ml-12 space-y-1 list-decimal list-outside';

  return (
    <ListComponent key={`list-${type}-${index}`} className={className}>
      {items}
    </ListComponent>
  );
}

/**
 * Process inline formatting (links, emails, URLs, bold, underline)
 */
function processInlineFormatting(text: string): React.ReactNode[] {
  // First process Markdown links (highest priority)
  const processed = processMarkdownLinks(text);

  // Then process email addresses on each segment
  const emailProcessed: React.ReactNode[] = [];
  for (const segment of processed) {
    if (typeof segment === 'string') {
      emailProcessed.push(...processEmailAddresses(segment));
    } else {
      emailProcessed.push(segment);
    }
  }

  // Then process naked HTTP/HTTPS URLs on each segment
  const urlProcessed: React.ReactNode[] = [];
  for (const segment of emailProcessed) {
    if (typeof segment === 'string') {
      urlProcessed.push(...processNakedURLs(segment));
    } else {
      urlProcessed.push(segment);
    }
  }

  // Finally process bold and underline formatting on each segment
  const result: React.ReactNode[] = [];
  for (const segment of urlProcessed) {
    if (typeof segment === 'string') {
      result.push(...processBoldAndUnderline(segment));
    } else {
      result.push(segment);
    }
  }

  return result;
}

/**
 * Process Markdown-style links [label](url)
 */
function processMarkdownLinks(text: string): React.ReactNode[] {
  // Pattern to match [label](url) syntax
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = text.split(linkPattern);

  if (parts.length === 1) {
    // No links found
    return [text];
  }

  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i += 3) {
    // Add text before the link
    if (parts[i]) {
      result.push(parts[i]);
    }

    // Add the link if we have both label and URL
    if (i + 1 < parts.length && i + 2 < parts.length) {
      const linkLabel = parts[i + 1];
      const linkUrl = parts[i + 2];

      // Ensure URL has protocol if missing
      const fullUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;

      result.push(
        <a
          key={`markdown-link-${i / 3}`}
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {linkLabel}
        </a>,
      );
    }
  }

  return result;
}

/**
 * Process email addresses and convert them to mailto links
 */
function processEmailAddresses(text: string): React.ReactNode[] {
  // Regex to match email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const parts = text.split(emailRegex);
  const matches = text.match(emailRegex);

  if (!matches) {
    return [text];
  }

  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      result.push(parts[i]);
    }

    if (i < matches.length) {
      const email = matches[i];
      result.push(
        <a
          key={`email-${i}`}
          href={`mailto:${email}`}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {email}
        </a>,
      );
    }
  }

  return result;
}

/**
 * Process naked HTTP/HTTPS URLs and convert them to clickable links
 */
function processNakedURLs(text: string): React.ReactNode[] {
  // Regex to match HTTP/HTTPS URLs - excludes trailing punctuation
  const urlRegex = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;!?])/gi;
  const parts = text.split(urlRegex);

  if (parts.length === 1) {
    // No URLs found
    return [text];
  }

  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    // Add text before the URL
    if (parts[i]) {
      result.push(parts[i]);
    }

    // Add the URL if we have one
    if (i + 1 < parts.length) {
      const url = parts[i + 1];
      result.push(
        <a
          key={`naked-url-${i / 2}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {url}
        </a>,
      );
    }
  }

  return result;
}

/**
 * Process bold and underline formatting
 */
function processBoldAndUnderline(text: string): React.ReactNode[] {
  // Pattern to match **text** (Markdown bold syntax) and __text__ (underline syntax)
  const boldPattern = /\*\*(.*?)\*\*/g;
  const underlinePattern = /__(.*?)__/g;

  // First process bold formatting
  const boldProcessed: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    // Add text before the bold match
    if (match.index > lastIndex) {
      boldProcessed.push(text.slice(lastIndex, match.index));
    }

    // Add the bold element
    boldProcessed.push(
      <span key={`bold-${match.index}`} className="font-semibold">
        {match[1]}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    boldProcessed.push(text.slice(lastIndex));
  }

  // If no bold matches found, use original text
  if (boldProcessed.length === 0) {
    boldProcessed.push(text);
  }

  // Then process underline formatting on each segment
  const result: React.ReactNode[] = [];

  for (const segment of boldProcessed) {
    if (typeof segment === 'string') {
      const underlineProcessed: React.ReactNode[] = [];
      let lastIdx = 0;
      let match2;

      // Reset regex lastIndex
      underlinePattern.lastIndex = 0;

      while ((match2 = underlinePattern.exec(segment)) !== null) {
        // Add text before the underline match
        if (match2.index > lastIdx) {
          underlineProcessed.push(segment.slice(lastIdx, match2.index));
        }

        // Add the underline element
        underlineProcessed.push(
          <span key={`underline-${match2.index}`} className="underline">
            {match2[1]}
          </span>,
        );

        lastIdx = match2.index + match2[0].length;
      }

      // Add remaining text
      if (lastIdx < segment.length) {
        underlineProcessed.push(segment.slice(lastIdx));
      }

      // If no underline matches found, use original segment
      if (underlineProcessed.length === 0) {
        underlineProcessed.push(segment);
      }

      result.push(...underlineProcessed);
    } else {
      result.push(segment);
    }
  }

  return result;
}
