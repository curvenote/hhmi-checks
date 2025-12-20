// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect } from 'vitest';
import {
  nihmsFilesRequestHandler,
  nihmsFilesRequestConfig,
  parseFilesRequestEmail,
} from '../src/backend/email/handlers/nihms-files-request.server.js';

describe('NIHMS Files Request Handler', () => {
  describe('Identification', () => {
    it('should identify emails with correct subject pattern from NIHMS senders', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload additional files to NIHMS' },
      };

      const result = nihmsFilesRequestHandler.identify(payload);
      expect(result).toBe(true);
    });

    it('should identify emails with "Please upload" before "to NIHMS"', () => {
      const payload = {
        envelope: { from: 'notifications@nihms.nih.gov' },
        headers: { subject: 'Please upload supplementary materials to NIHMS for review' },
      };

      const result = nihmsFilesRequestHandler.identify(payload);
      expect(result).toBe(true);
    });

    it('should not identify emails without "Please upload" before "to NIHMS"', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'To NIHMS please upload files' }, // Wrong order
      };

      const result = nihmsFilesRequestHandler.identify(payload);
      expect(result).toBe(false);
    });

    it('should identify emails with correct subject pattern regardless of sender', () => {
      const payload = {
        envelope: { from: 'other@example.com' },
        headers: { subject: 'Please upload additional files to NIHMS' },
      };

      const result = nihmsFilesRequestHandler.identify(payload);
      expect(result).toBe(true);
    });

    it('should not identify emails missing subject', () => {
      const payload = {
        envelope: { from: 'test@example.com' },
        headers: {},
      };

      const result = nihmsFilesRequestHandler.identify(payload);
      expect(result).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should reject emails with no content', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: '',
      };

      const result = nihmsFilesRequestHandler.validate(payload, nihmsFilesRequestConfig);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('no content to parse');
    });
  });

  describe('Parsing', () => {
    it('should parse email content and extract manuscript ID', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Fw: Please upload files to NIHMS' },
        plain: `
External Email: Use Caution

"This is the article title in full." (NIHMS9999999)

Dear Howard Hughes Medical Institute,

There are references to Supp. video 1 in the above-listed manuscript; however, the supplementary video was not provided.

Please note that we cannot retrieve supplementary material from sources online, as it must be uploaded at the time of the manuscript submission. Therefore, we have moved the manuscript to a state where you can upload files.

To access the manuscript record, please log in to https://www.nihms.nih.gov/ and click on the manuscript title in the Needs Your Attention filter of your manuscript list.

Thank you,

The NIHMS Team
        `,
      };

      const result = parseFilesRequestEmail(payload);

      expect(result.manuscriptId).toBe('9999999');
      expect(result.message).toContain('Please upload files to NIHMS');
      expect(result.message).toContain('There are references to Supp. video 1');
      expect(result.message).toContain('supplementary video was not provided');

      // Verify that whitespace and newlines are preserved
      const message = result.message;
      expect(message).toContain('\n\n'); // Should have paragraph breaks
      expect(message).toMatch(/\n\nThere are references/); // Should have newline before "There are references"
      expect(message).toMatch(/supplementary video was not provided\.\n\n/); // Should have newline after period
    });

    it('should clean subject line by removing Fw:/Re:/Fwd: prefixes', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Re: Fwd: Please upload files to NIHMS' },
        plain: 'Email content',
      };

      const result = parseFilesRequestEmail(payload);

      expect(result.message).toContain('Please upload files to NIHMS');
      expect(result.message).not.toContain('Re:');
      expect(result.message).not.toContain('Fwd:');
    });

    it('should handle emails without manuscript ID', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: `
Dear Howard Hughes Medical Institute,

Please upload additional files for your manuscript.

To access the manuscript record, please log in to https://www.nihms.nih.gov/

Thank you,
The NIHMS Team
        `,
      };

      const result = parseFilesRequestEmail(payload);

      expect(result.manuscriptId).toBeNull();
    });

    it('should preserve whitespace and formatting in complex email content', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: `
Dear Howard Hughes Medical Institute,

This is the first paragraph with some content.

This is the second paragraph with more detailed information.
It has multiple lines within the same paragraph.

This is the third paragraph with final instructions.

To access the manuscript record, please log in to the system.
        `,
      };

      const result = parseFilesRequestEmail(payload);
      const message = result.message;

      // Should preserve paragraph breaks
      expect(message).toMatch(
        /first paragraph with some content\.\n\nThis is the second paragraph/,
      );
      expect(message).toMatch(
        /second paragraph with more detailed information\.\nIt has multiple lines/,
      );
      expect(message).toMatch(
        /multiple lines within the same paragraph\.\n\nThis is the third paragraph/,
      );

      // Should not have excessive whitespace
      expect(message).not.toMatch(/\n{3,}/); // No 3+ consecutive newlines
      expect(message).not.toMatch(/[ \t]+\n/); // No trailing spaces before newlines
      expect(message).not.toMatch(/\n[ \t]+/); // No leading spaces after newlines
    });
  });

  describe('Configuration', () => {
    it('should have correct configuration', () => {
      expect(nihmsFilesRequestConfig.subjectPatterns).toContain('Please upload.*to NIHMS');
      expect(nihmsFilesRequestConfig.enabled).toBe(true);
    });
  });

  describe('NIHMS Manuscript ID Extraction', () => {
    // We need to test the internal function, so we'll create a test payload and use the parse method
    it('should extract manuscript ID from (NIHMS2109555) format', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: 'Some content with (NIHMS2109555) in the middle',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBe('2109555');
    });

    it('should extract manuscript ID with different numbers', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: 'Content with (NIHMS123456) manuscript ID',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBe('123456');
    });

    it('should handle case insensitive matching', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: 'Content with (nihms789012) manuscript ID',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBe('789012');
    });

    it('should return undefined when no manuscript ID is found', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: 'Content without any manuscript ID',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBeNull();
    });

    it('should handle multiple manuscript IDs and return the first one', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: 'Content with (NIHMS111111) and (NIHMS222222) manuscript IDs',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBe('111111');
    });

    it('should handle manuscript ID at the beginning of content', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: '(NIHMS999999) is at the start of the content',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBe('999999');
    });

    it('should handle manuscript ID at the end of content', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: 'Content ends with (NIHMS555555)',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBe('555555');
    });

    it('should match NIHMS pattern without parentheses', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: 'Content with NIHMS123456 (no parentheses) or (NIHMS) (no numbers)',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBe('123456');
    });

    it('should handle empty content', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: '',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.manuscriptId).toBeNull();
    });

    it('should strip HTML tags from subject', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: '<b>Please upload</b> files to <i>NIHMS</i> (NIHMS123456)' },
        plain: '',
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.cleanSubject).toBe('Please upload files to NIHMS (NIHMS123456)');
      expect(result.cleanSubject).not.toContain('<');
      expect(result.cleanSubject).not.toContain('>');
    });

    it('should strip HTML tags from message content', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS' },
        plain: `Dear Howard Hughes Medical Institute,
        
<p>This is a <strong>test message</strong> with <a href="http://example.com">HTML tags</a>.</p>
<div>NIHMS123456</div>

To access the manuscript record`,
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.message).not.toContain('<p>');
      expect(result.message).not.toContain('<strong>');
      expect(result.message).not.toContain('<a href');
      expect(result.message).not.toContain('<div>');
      expect(result.message).toContain('This is a test message with HTML tags');
    });

    it('should decode HTML entities', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Please upload files to NIHMS &quot;test&quot;' },
        plain: `Dear Howard Hughes Medical Institute,

Content with &lt;angle brackets&gt; and &amp; ampersand &nbsp; spaces.

To access the manuscript record`,
      };

      const result = parseFilesRequestEmail(payload);
      expect(result.cleanSubject).toContain('"test"');
      expect(result.message).toContain('<angle brackets>');
      expect(result.message).toContain('& ampersand');
      expect(result.message).not.toContain('&lt;');
      expect(result.message).not.toContain('&gt;');
      expect(result.message).not.toContain('&amp;');
      expect(result.message).not.toContain('&nbsp;');
    });
  });
});
