import React from 'react';
import { LoadableIframe } from '@curvenote/scms-core';
import { processMarkdownFormatting } from './markdownTextHelpers.js';

interface ComplianceTextRendererProps {
  text: string;
  className?: string;
}

// Helper function to convert bioRxiv mentions to clickable links
function processBioRxivLinks(text: string): React.ReactNode[] {
  const bioRxivRegex = /bioRxiv/gi;
  const parts = text.split(bioRxivRegex);
  const matches = text.match(bioRxivRegex);

  if (!matches) {
    return [text];
  }

  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      result.push(parts[i]);
    }

    if (i < matches.length) {
      result.push(
        <a
          key={`biorxiv-${i}`}
          href="https://www.biorxiv.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {matches[i]}
        </a>,
      );
    }
  }

  return result;
}

// Helper function to convert HHMI Policy mentions to clickable links
function processHHMIPolicyLinks(text: string): React.ReactNode[] {
  const hhmiPolicyRegex = /HHMI'?s?\s+publication policies/gi;
  const parts = text.split(hhmiPolicyRegex);
  const matches = text.match(hhmiPolicyRegex);

  if (!matches) {
    return [text];
  }

  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      result.push(parts[i]);
    }

    if (i < matches.length) {
      result.push(
        <a
          key={`hhmi-policy-${i}`}
          href="https://www.hhmi.org/about/policies/publishing-sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {matches[i]}
        </a>,
      );
    }
  }

  return result;
}

// Helper function to convert NIH 2024 Policy mentions to clickable links
function processNIHPolicyLinks(text: string): React.ReactNode[] {
  // Match both "NIH 2024 Policy" and "2024 NIH Policy" patterns (case-insensitive)
  const nihPolicyRegex = /(?:NIH'?s?\s+2024\s+[Pp]olicy|2024\s+NIH'?s?\s+[Pp]olicy)/gi;
  const parts = text.split(nihPolicyRegex);
  const matches = text.match(nihPolicyRegex);

  if (!matches) {
    return [text];
  }

  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      result.push(parts[i]);
    }

    if (i < matches.length) {
      result.push(
        <a
          key={`nih-policy-${i}`}
          href="https://grants.nih.gov/policy-and-compliance/policy-topics/public-access/nih-public-access-policy-overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {matches[i]}
        </a>,
      );
    }
  }

  return result;
}

// Helper function to render iframe elements (specifically for Airtable embeds)
function processIframes(text: string): React.ReactNode[] {
  // Regex to match iframe tags (specifically Airtable embeds for safety)
  const iframeRegex = /(<iframe[^>]*src="https:\/\/airtable\.com\/embed\/[^"]*"[^>]*><\/iframe>)/gi;
  const parts = text.split(iframeRegex);

  if (parts.length === 1) {
    // No iframes found
    return [text];
  }

  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    // Add text before the iframe
    if (parts[i]) {
      result.push(parts[i]);
    }

    // Add the iframe if we have one
    if (i + 1 < parts.length) {
      const match = parts[i + 1];
      const srcMatch = match.match(/src="([^"]+)"/);
      const widthMatch = match.match(/width="([^"]+)"/);
      const heightMatch = match.match(/height="([^"]+)"/);

      if (srcMatch) {
        const src = srcMatch[1];

        // Additional validation: ensure src is still an Airtable embed URL
        if (!src.startsWith('https://airtable.com/embed/')) {
          console.warn('Invalid iframe src detected:', src);
          result.push(`[Invalid iframe source: ${src}]`);
        } else {
          result.push(
            <div key={`iframe-${i / 2}`} className="my-4">
              <LoadableIframe
                src={src}
                width={widthMatch ? widthMatch[1] : '100%'}
                height={heightMatch ? heightMatch[1] : '533'}
                className="border border-gray-300 rounded"
                style={{ background: 'transparent' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                allow="encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
              />
            </div>,
          );
        }
      } else {
        // If no src found, render as plain text
        result.push(match);
      }
    }
  }

  return result;
}

// Helper function to make publishing stage phrases bold
export function processPublishingStageBold(text: string): React.ReactNode[] {
  // Simple approach: create unique markers for each match, then split and rebuild
  let processedText = text;
  const matches: { text: string; id: string }[] = [];

  // Patterns to make bold: "not published", "already published", and years
  const patterns = [
    /\b(not published)\b/gi,
    /\b(already published)\b/gi,
    /\b(202[0-9])\b/gi, // Years like 2025, 2026
  ];

  // Replace each pattern with unique markers
  patterns.forEach((pattern, patternIndex) => {
    processedText = processedText.replace(pattern, (match) => {
      const id = `__BOLD_${patternIndex}_${matches.length}__`;
      matches.push({ text: match, id });
      return id;
    });
  });

  // Split by all markers and rebuild with React elements
  let result: React.ReactNode[] = [processedText];

  matches.forEach((matchInfo, index) => {
    const nextResult: React.ReactNode[] = [];

    for (const segment of result) {
      if (typeof segment === 'string' && segment.includes(matchInfo.id)) {
        const parts = segment.split(matchInfo.id);
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) {
            nextResult.push(parts[i]);
          }
          if (i < parts.length - 1) {
            nextResult.push(
              <span key={`bold-${index}`} className="font-semibold">
                {matchInfo.text}
              </span>,
            );
          }
        }
      } else {
        nextResult.push(segment);
      }
    }

    result = nextResult;
  });

  return result;
}

// Combined function to process all content: iframes, bold formatting, URLs, emails, bioRxiv, HHMI Policy, NIH 2024 Policy
function processAllLinks(text: string): React.ReactNode[] {
  // Process iframes first (they contain HTML structure)
  let processed = processIframes(text);

  // Then process all link types and formatting on each segment
  const linkProcessors = [
    // processJournalTypeBold, // Process bold formatting first, before links
    processMarkdownFormatting, // Process Markdown-style formatting (bold, underline, lists, emails, URLs)
    processBioRxivLinks,
    processHHMIPolicyLinks,
    processNIHPolicyLinks,
  ];

  for (const processor of linkProcessors) {
    const nextProcessed: React.ReactNode[] = [];

    for (const segment of processed) {
      if (typeof segment === 'string') {
        // Process this link type on string segments
        nextProcessed.push(...processor(segment));
      } else {
        // Keep React elements as-is (already processed links/iframes)
        nextProcessed.push(segment);
      }
    }

    processed = nextProcessed;
  }

  return processed;
}

export function ComplianceTextRenderer({ text, className }: ComplianceTextRendererProps) {
  const renderFormattedText = (txt: string) => {
    // Split by double newlines to separate paragraphs
    const paragraphs = txt.replace(/\\n/g, '\n').split('\n\n');

    return paragraphs.map((paragraph, pIndex) => {
      const lines = paragraph.split('\n');

      // Check if this paragraph contains numbered list items
      const hasNumberedList = lines.some((line) => /^\d+\./.test(line.trim()));

      if (hasNumberedList) {
        const items: React.ReactNode[] = [];
        let currentText = '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (/^\d+\./.test(trimmedLine)) {
            // This is a numbered list item
            if (currentText) {
              // Add any preceding text as a paragraph
              items.push(
                <div key={`text-${items.length}`} className="mb-2 text-inherit">
                  {processAllLinks(currentText.trim())}
                </div>,
              );
              currentText = '';
            }

            // Extract the list item content (remove the number and dot)
            const itemText = trimmedLine.replace(/^\d+\.\s*/, '');
            items.push(
              <li key={`item-${items.length}`} className="mb-1">
                {processAllLinks(itemText)}
              </li>,
            );
          } else if (trimmedLine === '') {
            // Empty line - add spacing
            if (currentText) {
              items.push(
                <div key={`text-${items.length}`} className="mb-2 text-inherit">
                  {processAllLinks(currentText.trim())}
                </div>,
              );
              currentText = '';
            }
            items.push(<div key={`spacing-${items.length}`} className="mb-2" />);
          } else {
            // Regular text line
            currentText += (currentText ? ' ' : '') + trimmedLine;
          }
        }

        // Add any remaining text
        if (currentText) {
          items.push(
            <div key={`text-${items.length}`} className="mb-2 text-inherit">
              {processAllLinks(currentText.trim())}
            </div>,
          );
        }

        // Find list items and wrap them in <ol>
        const result: React.ReactNode[] = [];
        let listItems: React.ReactNode[] = [];

        for (const item of items) {
          if (React.isValidElement(item) && item.type === 'li') {
            listItems.push(item);
          } else {
            // If we have accumulated list items, render them as a list
            if (listItems.length > 0) {
              result.push(
                <ol
                  key={`list-${result.length}`}
                  className="mb-2 ml-1 space-y-1 list-decimal list-outside"
                >
                  {listItems}
                </ol>,
              );
              listItems = [];
            }
            result.push(item);
          }
        }

        // Don't forget any remaining list items
        if (listItems.length > 0) {
          result.push(
            <ol
              key={`list-${result.length}`}
              className="mb-2 ml-1 space-y-1 list-decimal list-outside"
            >
              {listItems}
            </ol>,
          );
        }

        return (
          <div key={pIndex} className="mb-2 text-inherit">
            {result}
          </div>
        );
      } else {
        // Regular paragraph without lists
        return (
          <div key={pIndex} className="mb-2 text-inherit">
            {lines.map((line, lineIndex) => {
              const trimmedLine = line.trim();
              if (trimmedLine === '') {
                return <div key={lineIndex} className="mb-2" />;
              }
              return (
                <div key={lineIndex} className="mb-1">
                  {processAllLinks(trimmedLine)}
                </div>
              );
            })}
          </div>
        );
      }
    });
  };

  return <div className={className}>{renderFormattedText(text)}</div>;
}

// Simpler alternative using CSS for basic formatting
export function SimpleComplianceTextRenderer({ text, className }: ComplianceTextRendererProps) {
  // Replace \n with <br> and format numbered lists
  const formattedText = text.split('\n').map((line, index) => {
    const trimmedLine = line.trim();

    if (/^\d+\./.test(trimmedLine)) {
      // This is a numbered list item - add some left margin
      return (
        <div key={index} className="mb-1 ml-4">
          {processAllLinks(trimmedLine)}
        </div>
      );
    } else if (trimmedLine === '') {
      // Empty line - add spacing
      return <div key={index} className="mb-2" />;
    } else {
      // Regular text
      return (
        <div key={index} className="mb-1">
          {processAllLinks(trimmedLine)}
        </div>
      );
    }
  });

  return <div className={className}>{formattedText}</div>;
}
