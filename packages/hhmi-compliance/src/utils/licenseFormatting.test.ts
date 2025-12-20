// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect } from 'vitest';
import { formatLicenseForDisplay, isCCBY } from './licenseFormatting.js';

describe('formatLicenseForDisplay', () => {
  describe('Creative Commons licenses', () => {
    it('should format cc-by to CC BY', () => {
      expect(formatLicenseForDisplay('cc-by')).toBe('CC BY');
    });

    it('should format CC-BY to CC BY (uppercase input)', () => {
      expect(formatLicenseForDisplay('CC-BY')).toBe('CC BY');
    });

    it('should format Cc-By to CC BY (mixed case)', () => {
      expect(formatLicenseForDisplay('Cc-By')).toBe('CC BY');
    });

    it('should format cc-by-nc to CC BY-NC', () => {
      expect(formatLicenseForDisplay('cc-by-nc')).toBe('CC BY-NC');
    });

    it('should format cc-by-nd to CC BY-ND', () => {
      expect(formatLicenseForDisplay('cc-by-nd')).toBe('CC BY-ND');
    });

    it('should format cc-by-sa to CC BY-SA', () => {
      expect(formatLicenseForDisplay('cc-by-sa')).toBe('CC BY-SA');
    });

    it('should format cc-by-nc-nd to CC BY-NC-ND', () => {
      expect(formatLicenseForDisplay('cc-by-nc-nd')).toBe('CC BY-NC-ND');
    });

    it('should format cc-by-nc-sa to CC BY-NC-SA', () => {
      expect(formatLicenseForDisplay('cc-by-nc-sa')).toBe('CC BY-NC-SA');
    });

    it('should format CC-BY-NC-ND to CC BY-NC-ND (uppercase input)', () => {
      expect(formatLicenseForDisplay('CC-BY-NC-ND')).toBe('CC BY-NC-ND');
    });

    it('should format plain cc to CC', () => {
      expect(formatLicenseForDisplay('cc')).toBe('CC');
    });
  });

  describe('Non-CC licenses', () => {
    it('should uppercase non-CC licenses', () => {
      expect(formatLicenseForDisplay('mit')).toBe('MIT');
    });

    it('should uppercase and preserve format of other licenses', () => {
      expect(formatLicenseForDisplay('apache-2.0')).toBe('APACHE-2.0');
    });

    it('should handle unknown license strings', () => {
      expect(formatLicenseForDisplay('unknown license')).toBe('UNKNOWN LICENSE');
    });

    it('should preserve already uppercase non-CC licenses', () => {
      expect(formatLicenseForDisplay('BSD')).toBe('BSD');
    });
  });

  describe('Edge cases', () => {
    it('should return undefined for undefined input', () => {
      expect(formatLicenseForDisplay(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(formatLicenseForDisplay('')).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      expect(formatLicenseForDisplay('   ')).toBeUndefined();
    });

    it('should trim whitespace from input', () => {
      expect(formatLicenseForDisplay('  cc-by  ')).toBe('CC BY');
    });

    it('should trim whitespace from non-CC licenses', () => {
      expect(formatLicenseForDisplay('  mit  ')).toBe('MIT');
    });
  });
});

describe('isCCBY', () => {
  it('should return true for cc-by', () => {
    expect(isCCBY('cc-by')).toBe(true);
  });

  it('should return true for CC-BY (uppercase)', () => {
    expect(isCCBY('CC-BY')).toBe(true);
  });

  it('should return true for Cc-By (mixed case)', () => {
    expect(isCCBY('Cc-By')).toBe(true);
  });

  it('should return true for cc-by with whitespace', () => {
    expect(isCCBY('  cc-by  ')).toBe(true);
  });

  it('should return false for cc-by-nc', () => {
    expect(isCCBY('cc-by-nc')).toBe(false);
  });

  it('should return false for cc-by-nd', () => {
    expect(isCCBY('cc-by-nd')).toBe(false);
  });

  it('should return false for other licenses', () => {
    expect(isCCBY('mit')).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isCCBY(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isCCBY('')).toBe(false);
  });
});
