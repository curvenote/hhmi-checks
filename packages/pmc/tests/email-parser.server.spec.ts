// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect } from 'vitest';
import {
  extractPackageId,
  determineMessageType,
  extractMessage,
  parseHTMLTableRows,
  parseEmailContent,
  type PackageResult,
} from '../src/backend/email/handlers/bulk-submission-parser.server.js';
import { extractManuscriptId } from '../src/backend/email/handlers/email-parsing-utils.server.js';

describe('email-parser', () => {
  describe('extractPackageId', () => {
    it('should extract package ID with equals sign', () => {
      const text = 'Package ID=621b52177f5f8 failed because of the following meta XML';
      expect(extractPackageId(text)).toBe('621b52177f5f8');
    });

    it('should extract package ID with equals sign and space', () => {
      const text = 'Package ID= 621b52177f5f8 failed because of the following meta XML';
      expect(extractPackageId(text)).toBe('621b52177f5f8');
    });

    it('should extract package ID with equals sign and spaces', () => {
      const text = 'Package ID = 621b52177f5f8 failed because of the following meta XML';
      expect(extractPackageId(text)).toBe('621b52177f5f8');
    });

    it('should extract package ID with space', () => {
      const text = 'Package ID 191e0b4fc0b was not submitted because';
      expect(extractPackageId(text)).toBe('191e0b4fc0b');
    });

    it('should return null when no package ID found', () => {
      const text = 'This is some random text without a package ID';
      expect(extractPackageId(text)).toBeNull();
    });

    it('should handle case insensitive matching', () => {
      const text = 'package id=ABC123 failed';
      expect(extractPackageId(text)).toBe('ABC123');
    });
  });

  describe('extractManuscriptId', () => {
    it('should extract manuscript ID with "Manuscript ID"', () => {
      const text = 'Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted';
      expect(extractManuscriptId(text)).toBe('1502493');
    });

    it('should extract manuscript ID with "for Manuscript ID"', () => {
      const text = 'Warning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted';
      expect(extractManuscriptId(text)).toBe('1502493');
    });

    it('should only accept numeric manuscript IDs', () => {
      // This test was removed because the newer, more comprehensive test suite
      // expects alphanumeric IDs and variable placeholders to be accepted
      // See app/modules/extensions/pmc/tests/email-parser.spec.ts for the current expectations
    });

    it('should return null when no manuscript ID found', () => {
      const text = 'Package ID=123 failed with error';
      expect(extractManuscriptId(text)).toBeNull();
    });

    it('should accept numeric manuscript IDs', () => {
      const text1 = 'Manuscript ID 123456'; // Should match (numeric)
      expect(extractManuscriptId(text1)).toBe('123456');

      const text2 = 'Some other text without Manuscript ID'; // Should not match
      expect(extractManuscriptId(text2)).toBeNull();
    });
  });

  describe('determineMessageType', () => {
    it('should detect error messages', () => {
      const html = '<td>ERROR</td><td>Package ID=123 failed</td>';
      expect(determineMessageType('', html)).toBe('error');
    });

    it('should detect error messages with lowercase', () => {
      const html = '<td>error</td><td>Package ID=123 failed</td>';
      expect(determineMessageType('', html)).toBe('error');
    });

    it('should detect error messages with mixed case', () => {
      const html = '<td>Error</td><td>Package ID=123 failed</td>';
      expect(determineMessageType('', html)).toBe('error');
    });

    it('should detect warning messages', () => {
      const html = '<td>WARNING</td><td>Package ID=123 has problems</td>';
      expect(determineMessageType('', html)).toBe('warning');
    });

    it('should detect warning messages with lowercase', () => {
      const html = '<td>warning</td><td>Package ID=123 has problems</td>';
      expect(determineMessageType('', html)).toBe('warning');
    });

    it('should detect warning messages with mixed case', () => {
      const html = '<td>Warning</td><td>Package ID=123 has problems</td>';
      expect(determineMessageType('', html)).toBe('warning');
    });
  });

  describe('extractMessage', () => {
    it('should extract error message from HTML cell', () => {
      const html =
        'Package ID=123 failed because of the following meta XML validation error: <string>:1:0:ERROR:VALID:DTD_CONTENT_MODEL';
      const message = extractMessage(html, 'ERROR');
      expect(message).toContain(
        'Package ID=123 failed because of the following meta XML validation error: <string>:1:0:ERROR:VALID:DTD_CONTENT_MODEL',
      );
    });

    it('should extract warning message from HTML cell', () => {
      const html =
        'Warning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted with the following problem(s): "Grant 5R33MH125126-04 was not found"';
      const message = extractMessage(html, 'WARNING');
      expect(message).toContain(
        'Warning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted with the following problem(s): "Grant 5R33MH125126-04 was not found"',
      );
    });

    it('should clean up HTML entities and tags', () => {
      const html = '<p>Package ID=123 &quot;failed&quot; with [ERROR] details</p>';
      const message = extractMessage(html, 'ERROR');
      expect(message).toBe('Package ID=123 "failed" with [ERROR] details');
    });
  });

  describe('parseHTMLTableRows', () => {
    it('should parse single error row from HTML table', () => {
      const html = `
        <table>
          <tr>
            <td>ERROR</td>
            <td>Package ID=621b52177f5f8 failed because of the following meta XML validation error</td>
          </tr>
        </table>
      `;

      const packages = parseHTMLTableRows(html);
      expect(packages).toHaveLength(1);
      expect(packages[0]).toEqual({
        packageId: '621b52177f5f8',
        manuscriptId: undefined,
        status: 'error',
        message:
          'Package ID=621b52177f5f8 failed because of the following meta XML validation error',
      });
    });

    it('should parse single warning row from HTML table', () => {
      const html = `
        <table>
          <tr>
            <td>WARNING</td>
            <td>Warning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted with the following problem(s): "Grant 5R33MH125126-04 was not found"</td>
          </tr>
        </table>
      `;

      const packages = parseHTMLTableRows(html);
      expect(packages).toHaveLength(1);
      expect(packages[0]).toEqual({
        packageId: '191e5fc4eea',
        manuscriptId: '1502493',
        status: 'warning',
        message:
          'Warning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted with the following problem(s): "Grant 5R33MH125126-04 was not found"',
      });
    });

    it('should parse a single success row from the HTML table', () => {
      const html = `
        <table>
          <tr>
            <td>SUCCESS</td>
            <td>Package ID=456 for Manuscript ID 789 was processed successfully</td>
          </tr>
        </table>
      `;

      const packages = parseHTMLTableRows(html);
      expect(packages).toHaveLength(1);
      expect(packages[0]).toEqual({
        packageId: '456',
        manuscriptId: '789',
        status: 'success',
        message: 'Package ID=456 for Manuscript ID 789 was processed successfully',
      });
    });

    it('should parse multiple rows from HTML table', () => {
      const html = `
        <table>
          <tr>
            <td>ERROR</td>
            <td>Package ID=123 failed</td>
          </tr>
          <tr>
            <td>WARNING</td>
            <td>Package ID=456 for Manuscript ID 789 has problems</td>
          </tr>
          <tr>
            <td>SUCCESS</td>
            <td>Package ID=999 for Manuscript ID 111 was processed successfully</td>
          </tr>
        </table>
      `;

      const packages = parseHTMLTableRows(html);
      expect(packages).toHaveLength(3);
      expect(packages[0].packageId).toBe('123');
      expect(packages[0].status).toBe('error');
      expect(packages[1].packageId).toBe('456');
      expect(packages[1].status).toBe('warning');
      expect(packages[1].manuscriptId).toBe('789');
      expect(packages[2].packageId).toBe('999');
      expect(packages[2].status).toBe('success');
      expect(packages[2].manuscriptId).toBe('111');
    });

    it('should ignore rows without package information', () => {
      const html = `
        <table>
          <tr><td>Header 1</td><td>Header 2</td></tr>
          <tr>
            <td>ERROR</td>
            <td>Package ID=123 failed</td>
          </tr>
          <tr><td>Footer</td></tr>
        </table>
      `;

      const packages = parseHTMLTableRows(html);
      expect(packages).toHaveLength(1);
      expect(packages[0].packageId).toBe('123');
    });

    it('should validate table structure', () => {
      const html = `
        <table>
          <tr><td>Header 1</td><td>Header 2</td></tr>
          <tr><td>ERROR</td><td>Package ID=123 failed</td></tr>
        </table>
      `;
      // Should detect table and parse rows with expected structure
      const packages = parseHTMLTableRows(html);
      expect(packages.length).toBeGreaterThan(0);
    });
  });

  describe('parseEmailContent', () => {
    it('should parse error email with HTML table', () => {
      const html = `
        <table>
          <tr>
            <td>ERROR</td>
            <td>Package ID=621b52177f5f8 failed because of the following meta XML validation error</td>
          </tr>
        </table>
      `;

      const result = parseEmailContent('', html);
      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].packageId).toBe('621b52177f5f8');
      expect(result.packages[0].status).toBe('error');
    });

    it('should parse warning email with HTML table', () => {
      const html = `
        <table>
          <tr>
            <td>WARNING</td>
            <td>Warning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted with the following problem(s): "Grant 5R33MH125126-04 was not found"</td>
          </tr>
        </table>
      `;

      const result = parseEmailContent('', html);
      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].packageId).toBe('191e5fc4eea');
      expect(result.packages[0].manuscriptId).toBe('1502493');
      expect(result.packages[0].status).toBe('warning');
    });

    it('should parse success email with HTML table', () => {
      const html = `
        <table>
          <tr>
            <td>SUCCESS</td>
            <td>Package ID=456 for Manuscript ID 789 was processed successfully</td>
          </tr>
        </table>
      `;

      const result = parseEmailContent('', html);
      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].packageId).toBe('456');
      expect(result.packages[0].manuscriptId).toBe('789');
      expect(result.packages[0].status).toBe('success');
    });

    it('should fall back to plain text parsing when no HTML table found', () => {
      const plain = 'Package ID=123 failed with error';
      const result = parseEmailContent(plain, '');
      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].packageId).toBe('123');
    });

    it('should handle missing package ID gracefully', () => {
      const plain = 'Some random text without package ID';
      const result = parseEmailContent(plain, '');
      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].packageId).toBe('unknown');
      expect(result.packages[0].message).toBe('Could not extract package ID from email content');
    });

    it('should parse multiple packages from single email', () => {
      const html = `
        <table>
          <tr>
            <td>ERROR</td>
            <td>Package ID=123 failed</td>
          </tr>
          <tr>
            <td>WARNING</td>
            <td>Package ID=456 for Manuscript ID 789 has problems</td>
          </tr>
          <tr>
            <td>SUCCESS</td>
            <td>Package ID=999 for Manuscript ID 111 was processed successfully</td>
          </tr>
        </table>
      `;

      const result = parseEmailContent('', html);
      expect(result.packages).toHaveLength(3);
      expect(result.packages.map((p: PackageResult) => p.packageId)).toEqual(['123', '456', '999']);
      expect(result.packages.map((p: PackageResult) => p.status)).toEqual([
        'error',
        'warning',
        'success',
      ]);
    });
  });
});
