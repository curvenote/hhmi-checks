/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pmcEmailProcessorRegistry,
  EmailProcessorRegistry,
} from '../src/backend/email/types.server.js';
import {
  bulkSubmissionHandler,
  bulkSubmissionConfig,
} from '../src/backend/email/handlers/bulk-submission.server.js';
import { initializeEmailProcessorRegistry } from '../src/backend/email/registry.server.js';

// Mock the registry initialization
vi.mock('../src/backend/email/registry.server.js', () => ({
  initializeEmailProcessorRegistry: vi.fn(),
}));

describe('Email Type Registry', () => {
  let registry: EmailProcessorRegistry;

  beforeEach(() => {
    registry = new EmailProcessorRegistry();
  });

  describe('Handler Registration', () => {
    it('should register a handler successfully', () => {
      registry.register(bulkSubmissionHandler);

      expect(registry.hasProcessor('bulk-submission-initial-email')).toBe(true);
      expect(registry.getHandler('bulk-submission-initial-email')).toBe(bulkSubmissionHandler);
    });

    it('should return null for unregistered handler', () => {
      expect(registry.getHandler('nonexistent')).toBeNull();
    });
  });

  describe('Handler Identification', () => {
    beforeEach(() => {
      registry.register(bulkSubmissionHandler);
    });

    it('should identify correct handler for email payload', () => {
      const payload = {
        headers: { subject: 'Bulk submission success' },
        envelope: { from: 'test@example.com' },
      };

      const identifiedType = registry.identifyProcessor(payload);
      expect(identifiedType).toBe('bulk-submission-initial-email');
    });

    it('should return null when no handler can process payload', () => {
      // Create a new registry without any handlers
      const emptyRegistry = new EmailProcessorRegistry();

      const payload = {
        headers: { subject: 'Unknown email type' },
        envelope: { from: 'test@example.com' },
      };

      const identifiedType = emptyRegistry.identifyProcessor(payload);
      expect(identifiedType).toBeNull();
    });
  });

  describe('Registry Management', () => {
    it('should return all registered types', () => {
      registry.register(bulkSubmissionHandler);

      const types = registry.getAllProcessorNames();
      expect(types).toContain('bulk-submission-initial-email');
      expect(types).toHaveLength(1);
    });

    it('should return all registered handlers', () => {
      registry.register(bulkSubmissionHandler);

      const handlers = registry.getAllHandlers();
      expect(handlers).toContain(bulkSubmissionHandler);
      expect(handlers).toHaveLength(1);
    });

    it('should return correct handler count', () => {
      expect(registry.size()).toBe(0);

      registry.register(bulkSubmissionHandler);
      expect(registry.size()).toBe(1);
    });

    it('should check if handler exists', () => {
      expect(registry.hasProcessor('bulk-submission-initial-email')).toBe(false);

      registry.register(bulkSubmissionHandler);
      expect(registry.hasProcessor('bulk-submission-initial-email')).toBe(true);
    });
  });
});

describe('Global PMC Email Type Registry', () => {
  it('should be available as a registry instance', () => {
    expect(pmcEmailProcessorRegistry).toBeDefined();
    expect(typeof pmcEmailProcessorRegistry.register).toBe('function');
    expect(typeof pmcEmailProcessorRegistry.identifyProcessor).toBe('function');
  });

  it('should be able to register and identify handlers', () => {
    // Register the bulk submission handler
    pmcEmailProcessorRegistry.register(bulkSubmissionHandler);

    expect(pmcEmailProcessorRegistry.hasProcessor('bulk-submission-initial-email')).toBe(true);

    const payload = {
      headers: { subject: 'Bulk submission success' },
      envelope: { from: 'test@example.com' },
    };

    const identifiedType = pmcEmailProcessorRegistry.identifyProcessor(payload);
    expect(identifiedType).toBe('bulk-submission-initial-email');
  });
});

describe('Bulk Submission Handler', () => {
  describe('Identification', () => {
    it('should identify emails with bulk submission keywords', () => {
      const payload = {
        headers: { subject: 'Bulk submission success' },
        envelope: { from: 'test@example.com' },
      };

      expect(bulkSubmissionHandler.identify(payload)).toBe(true);
    });

    it('should identify emails from NIHMS senders with keywords', () => {
      const payload = {
        headers: { subject: 'Bulk submission results' },
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
      };

      expect(bulkSubmissionHandler.identify(payload)).toBe(true);
    });

    it('should not identify emails without bulk submission criteria', () => {
      const payload = {
        headers: { subject: 'Random email' },
        envelope: { from: 'random@example.com' },
      };

      expect(bulkSubmissionHandler.identify(payload)).toBe(false);
    });

    it('should not identify emails missing required fields', () => {
      const payload = {
        headers: { subject: 'Random subject without keywords' },
        // Missing envelope.from
      };

      expect(bulkSubmissionHandler.identify(payload)).toBe(false);
    });

    it('should not identify emails missing subject', () => {
      const payload = {
        envelope: { from: 'test@example.com' },
        // Missing headers.subject
      };

      expect(bulkSubmissionHandler.identify(payload)).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate emails with valid subject', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Bulk submission success' },
      };

      const result = bulkSubmissionHandler.validate(payload, bulkSubmissionConfig);
      expect(result.isValid).toBe(true);
    });

    it('should reject emails with invalid subjects', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: { subject: 'Invalid subject' },
      };

      const result = bulkSubmissionHandler.validate(payload, bulkSubmissionConfig);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('does not match expected patterns');
    });

    it('should handle missing subject gracefully', () => {
      const payload = {
        envelope: { from: 'nihms-help@ncbi.nlm.nih.gov' },
        headers: {},
      };

      const result = bulkSubmissionHandler.validate(payload, bulkSubmissionConfig);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Missing subject');
    });
  });

  describe('Processing', () => {
    it('should have process method with correct signature', () => {
      expect(typeof bulkSubmissionHandler.process).toBe('function');
      // Process method should accept (context, payload, messageId)
      expect(bulkSubmissionHandler.process.length).toBe(3);
    });
  });
});

describe('Registry Initialization', () => {
  it('should have initializeEmailProcessorRegistry function available', () => {
    expect(typeof initializeEmailProcessorRegistry).toBe('function');
  });
});
