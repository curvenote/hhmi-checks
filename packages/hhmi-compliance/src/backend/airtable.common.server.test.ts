// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect } from 'vitest';
import { splitAuthorsField } from './airtable.common.server.js';

describe('splitAuthorsField', () => {
  describe('First Middle Last format', () => {
    it('should split authors in "First Middle Last" format separated by commas', () => {
      const input = 'Joe M. Bloggs, Jane Blogger, Another B. Sci';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Joe M. Bloggs', 'Jane Blogger', 'Another B. Sci']);
    });

    it('should handle single author in "First Middle Last" format', () => {
      const input = 'John Doe';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['John Doe']);
    });

    it('should trim whitespace in "First Middle Last" format', () => {
      const input = '  Joe M. Bloggs  ,  Jane Blogger  ';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Joe M. Bloggs', 'Jane Blogger']);
    });
  });

  describe('Last, First Middle format', () => {
    it('should split authors in "Last, First Middle." format', () => {
      const input = 'Bloggs, J. M., Blogger, J., Sci, A. B.';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Bloggs, J. M.', 'Blogger, J.', 'Sci, A. B.']);
    });

    it('should handle single author in "Last, First Middle." format', () => {
      const input = 'Doe, J.';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Doe, J.']);
    });

    it('should add period back after splitting on ". ,"', () => {
      const input = 'Smith, A. B., Jones, C. D., Wilson, E. F.';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Smith, A. B.', 'Jones, C. D.', 'Wilson, E. F.']);
    });

    it('should handle last author already having period', () => {
      const input = 'Bloggs, J. M., Blogger, J.';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Bloggs, J. M.', 'Blogger, J.']);
    });
  });

  describe('Primary separators', () => {
    it('should split on semicolons first', () => {
      const input = 'Author One; Author Two; Author Three';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Author One', 'Author Two', 'Author Three']);
    });

    it('should split on newlines first', () => {
      const input = 'Author One\nAuthor Two\nAuthor Three';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Author One', 'Author Two', 'Author Three']);
    });

    it('should split on pipes first', () => {
      const input = 'Author One | Author Two | Author Three';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Author One', 'Author Two', 'Author Three']);
    });

    it('should handle semicolons with "Last, First" format segments', () => {
      const input = 'Bloggs, J. M., Blogger, J.; Smith, A. B., Jones, C. D.';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Bloggs, J. M.', 'Blogger, J.', 'Smith, A. B.', 'Jones, C. D.']);
    });
  });

  describe('Edge cases', () => {
    it('should return empty array for undefined input', () => {
      const result = splitAuthorsField(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = splitAuthorsField('');
      expect(result).toEqual([]);
    });

    it('should handle array input by joining with semicolons', () => {
      const input = ['Author One', 'Author Two'];
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Author One', 'Author Two']);
    });

    it('should filter empty entries', () => {
      const input = 'Author One, , Author Two';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Author One', 'Author Two']);
    });

    it('should deduplicate when unique option is true', () => {
      const input = 'Author One, Author Two, Author One';
      const result = splitAuthorsField(input, { unique: true });
      expect(result).toEqual(['Author One', 'Author Two']);
    });
  });

  describe('Real-world examples', () => {
    it('should handle complex mixed format with semicolons', () => {
      const input = 'Bloggs, J. M., Blogger, J.; Jane Smith; Wilson, A. B.';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Bloggs, J. M.', 'Blogger, J.', 'Jane Smith', 'Wilson, A. B.']);
    });

    it('should handle author list from typical citation', () => {
      const input = 'Smith, John A., Doe, Jane B., Wilson, Robert C.';
      const result = splitAuthorsField(input);
      expect(result).toEqual(['Smith, John A.', 'Doe, Jane B.', 'Wilson, Robert C.']);
    });
  });
});
