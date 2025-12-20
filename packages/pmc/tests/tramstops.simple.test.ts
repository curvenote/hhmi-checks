// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect } from 'vitest';
import {
  generateTramline,
  decorateTramlineWithEmailProcessingOutcomes,
} from '../src/common/tramstops/tramstops.js';
import type { Workflow } from '@curvenote/scms-core';
import type {
  PMCSubmissionVersionMetadataSection,
  EmailProcessingMessage,
} from '../src/common/metadata.schema.js';
import {
  PMC_DEPOSIT_WORKFLOW,
  PMC_CRITICAL_PATH_STATES,
  PMC_MUTUALLY_EXCLUSIVE_STATES,
} from '../src/workflows.js';

describe('generateTramline - Simple Tests', () => {
  it('should return tramline with PMC critical path states', () => {
    const result = generateTramline(
      PMC_DEPOSIT_WORKFLOW,
      'PENDING',
      [],
      [...PMC_CRITICAL_PATH_STATES], // Convert readonly array to mutable
      PMC_MUTUALLY_EXCLUSIVE_STATES as unknown as Record<string, string | string[]>,
      '2025-10-02T15:21:30.538Z',
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result.tramline)).toBe(true);
    expect(result.tramline).toHaveLength(7); // PMC has 7 critical path states
    expect(result.ended).toBe(false);
    expect(result.tramline[0].status).toBe('PENDING');
    expect(result.tramline[0].title).toBe('New Deposit Uploaded');
  });

  it('should handle different current statuses', () => {
    const result1 = generateTramline(
      PMC_DEPOSIT_WORKFLOW,
      'PENDING',
      [],
      [...PMC_CRITICAL_PATH_STATES],
      PMC_MUTUALLY_EXCLUSIVE_STATES as unknown as Record<string, string | string[]>,
      '2025-10-02T15:21:30.538Z',
    );
    const result2 = generateTramline(
      PMC_DEPOSIT_WORKFLOW,
      'DEPOSITED',
      [],
      [...PMC_CRITICAL_PATH_STATES],
      PMC_MUTUALLY_EXCLUSIVE_STATES as unknown as Record<string, string | string[]>,
      '2025-10-02T15:21:30.538Z',
    );
    const result3 = generateTramline(
      PMC_DEPOSIT_WORKFLOW,
      'AVAILABLE_ON_PMC',
      [],
      [...PMC_CRITICAL_PATH_STATES],
      PMC_MUTUALLY_EXCLUSIVE_STATES as unknown as Record<string, string | string[]>,
      '2025-10-02T15:21:30.538Z',
    );

    expect(result1.tramline).toHaveLength(7);
    expect(result2.tramline).toHaveLength(7);
    expect(result3.tramline).toHaveLength(7);

    // Check completion status
    expect(result1.tramline[0].completed).toBe(true);
    expect(result2.tramline[1].completed).toBe(true);
    expect(result3.tramline[6].completed).toBe(true);
  });

  it('should handle empty workflow states', () => {
    const emptyWorkflow: Workflow = {
      version: 1,
      name: 'EMPTY',
      label: 'Empty Workflow',
      initialState: 'PENDING',
      states: {},
      transitions: [],
    };
    const result = generateTramline(
      emptyWorkflow,
      'PENDING',
      [],
      [],
      {},
      '2025-10-02T15:21:30.538Z',
    );

    expect(result.tramline).toHaveLength(0);
    expect(result.ended).toBe(false);
  });

  it('should handle unknown status', () => {
    const result = generateTramline(
      PMC_DEPOSIT_WORKFLOW,
      'UNKNOWN_STATUS',
      [],
      [...PMC_CRITICAL_PATH_STATES],
      PMC_MUTUALLY_EXCLUSIVE_STATES as unknown as Record<string, string | string[]>,
      '2025-10-02T15:21:30.538Z',
    );

    expect(result.tramline).toHaveLength(1);
    expect(result.ended).toBe(true);
    expect(result.tramline[0].status).toBe('UNKNOWN_STATUS');
    expect(result.tramline[0].title).toBe('Unknown Status: UNKNOWN_STATUS');
    expect(result.tramline[0].completed).toBe(true);
    expect(result.tramline[0].error).toBe(true);
    expect(result.tramline[0].warning).toBe(false);
  });

  it('should handle undefined status', () => {
    const result = generateTramline(
      PMC_DEPOSIT_WORKFLOW,
      undefined,
      [],
      [...PMC_CRITICAL_PATH_STATES],
      PMC_MUTUALLY_EXCLUSIVE_STATES as unknown as Record<string, string | string[]>,
      '2025-10-02T15:21:30.538Z',
    );

    expect(result.tramline).toHaveLength(7); // Should show all states as incomplete
    expect(result.ended).toBe(false);
    // All states should be incomplete
    result.tramline.forEach((stop) => {
      expect(stop.completed).toBe(false);
    });
  });

  it('should use workflow state labels as titles instead of status', () => {
    // Create a simple workflow with known labels
    const testWorkflow: Workflow = {
      version: 1,
      name: 'TEST_WORKFLOW',
      label: 'Test Workflow',
      initialState: 'START',
      states: {
        START: {
          name: 'START',
          label: 'Start Process',
          visible: true,
          published: false,
          authorOnly: false,
          inbox: true,
          tags: [],
        },
        PROCESSING: {
          name: 'PROCESSING',
          label: 'Processing Data',
          visible: true,
          published: false,
          authorOnly: false,
          inbox: true,
          tags: [],
        },
        COMPLETED: {
          name: 'COMPLETED',
          label: 'Process Complete',
          visible: true,
          published: false,
          authorOnly: false,
          inbox: false,
          tags: ['end'],
        },
      },
      transitions: [],
    };

    const result = generateTramline(
      testWorkflow,
      'PROCESSING',
      [],
      ['START', 'PROCESSING', 'COMPLETED'],
      {},
      '2025-10-02T15:21:30.538Z',
    );

    expect(result.tramline).toHaveLength(3);

    // Verify that titles use workflow state labels, not status names
    expect(result.tramline[0].title).toBe('Start Process');
    expect(result.tramline[0].status).toBe('START');

    expect(result.tramline[1].title).toBe('Processing Data');
    expect(result.tramline[1].status).toBe('PROCESSING');

    expect(result.tramline[2].title).toBe('Process Complete');
    expect(result.tramline[2].status).toBe('COMPLETED');
  });

  it('should use submissionLastModified as fallback when currentStatus has no matching activity', () => {
    const testWorkflow: Workflow = {
      version: 1,
      name: 'TEST_WORKFLOW',
      label: 'Test Workflow',
      initialState: 'START',
      states: {
        START: {
          name: 'START',
          label: 'Start Process',
          visible: true,
          published: false,
          authorOnly: false,
          inbox: true,
          tags: [],
        },
        PROCESSING: {
          name: 'PROCESSING',
          label: 'Processing Data',
          visible: true,
          published: false,
          authorOnly: false,
          inbox: true,
          tags: [],
        },
      },
      transitions: [],
    };

    // Test with no activities - should use submissionLastModified for current status
    const result = generateTramline(
      testWorkflow,
      'PROCESSING',
      [], // No activities
      ['START', 'PROCESSING'],
      {},
      '2025-10-02T15:21:30.538Z', // submissionLastModified
    );

    expect(result.tramline).toHaveLength(2);

    // First stop (START) should have no subtitle since it's not current and has no activity
    expect(result.tramline[0].subtitle).toBeUndefined();

    // Second stop (PROCESSING) should use submissionLastModified since it's current and has no activity
    expect(result.tramline[1].subtitle).toBe('2025-10-02T15:21:30.538Z');
  });
});

describe('decorateTramlineWithEmailProcessingOutcomes - Simple Tests', () => {
  // Helper function to create a basic tramline for testing
  const createBasicTramline = () => [
    {
      title: 'New Deposit Uploaded',
      status: 'PENDING',
      completed: true,
      error: false,
      warning: false,
      subtitle: '2024-01-10T10:00:00Z',
    },
    {
      title: 'Deposited',
      status: 'DEPOSITED',
      completed: true,
      error: false,
      warning: false,
      subtitle: '2024-01-15T14:30:00Z',
    },
    {
      title: 'Deposit Confirmed by PMC',
      status: 'DEPOSIT_CONFIRMED_BY_PMC',
      completed: true,
      error: false,
      warning: false,
      subtitle: '2024-01-20T09:15:00Z',
    },
  ];

  // Helper function to create email processing metadata
  function createEmailProcessingMetadata(
    overrides: {
      messages?: EmailProcessingMessage[];
      status?: 'ok' | 'warning' | 'error';
    } = {},
  ) {
    const messages = overrides.messages || [];
    const hasErrors = messages.some((msg) => msg.type === 'error');
    const hasWarnings = messages.some((msg) => msg.type === 'warning');
    const status = overrides.status || (hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok');

    return {
      pmc: {
        emailProcessing: {
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
          lastProcessedAt: '2024-01-20T10:00:00Z',
          packageId: 'pkg-123',
          status,
          messages,
        },
      },
    } as PMCSubmissionVersionMetadataSection;
  }

  it('should return tramline unchanged when no metadata provided', () => {
    const tramline = createBasicTramline();
    const result = decorateTramlineWithEmailProcessingOutcomes(tramline);

    expect(result).toEqual(tramline);
    expect(result).not.toBe(tramline); // Should be a new array
  });

  it('should return tramline unchanged when no email processing data', () => {
    const tramline = createBasicTramline();
    const metadata: PMCSubmissionVersionMetadataSection = {
      pmc: {},
    };

    const result = decorateTramlineWithEmailProcessingOutcomes(tramline, metadata);

    expect(result).toEqual(tramline);
    expect(result).not.toBe(tramline); // Should be a new array
  });

  it('should decorate tramline with warnings when email processing has warnings', () => {
    const tramline = createBasicTramline();
    const metadata = createEmailProcessingMetadata({
      messages: [
        {
          type: 'warning',
          message: 'File size exceeds recommended limit',
          timestamp: '2024-01-20T10:00:00Z',
          fromStatus: 'DEPOSITED',
          toStatus: 'DEPOSIT_CONFIRMED_BY_PMC',
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
        },
      ],
    });

    const result = decorateTramlineWithEmailProcessingOutcomes(tramline, metadata);

    // Check that the matching stop is decorated with warning
    expect(result[2].status).toBe('DEPOSIT_CONFIRMED_BY_PMC');
    expect(result[2].warning).toBe(true);
    expect(result[2].error).toBe(false);

    // Check that other stops are unchanged
    expect(result[0].warning).toBe(false);
    expect(result[0].error).toBe(false);
    expect(result[1].warning).toBe(false);
    expect(result[1].error).toBe(false);
  });

  it('should decorate tramline with errors when email processing has errors', () => {
    const tramline = createBasicTramline();
    const metadata = createEmailProcessingMetadata({
      messages: [
        {
          type: 'error',
          message: 'PMC validation failed',
          timestamp: '2024-01-20T10:00:00Z',
          fromStatus: 'DEPOSITED',
          toStatus: 'DEPOSIT_CONFIRMED_BY_PMC',
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
        },
      ],
    });

    const result = decorateTramlineWithEmailProcessingOutcomes(tramline, metadata);

    // Check that the matching stop is decorated with error
    expect(result[2].status).toBe('DEPOSIT_CONFIRMED_BY_PMC');
    expect(result[2].error).toBe(true);
    expect(result[2].warning).toBe(false); // Should clear warning when error is present

    // Check that other stops are unchanged
    expect(result[0].warning).toBe(false);
    expect(result[0].error).toBe(false);
    expect(result[1].warning).toBe(false);
    expect(result[1].error).toBe(false);
  });

  it('should prioritize errors over warnings when both exist for same status', () => {
    const tramline = createBasicTramline();
    const metadata = createEmailProcessingMetadata({
      messages: [
        {
          type: 'warning',
          message: 'File size warning',
          timestamp: '2024-01-20T10:00:00Z',
          fromStatus: 'DEPOSITED',
          toStatus: 'DEPOSIT_CONFIRMED_BY_PMC',
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
        },
        {
          type: 'error',
          message: 'PMC validation failed',
          timestamp: '2024-01-20T10:00:00Z',
          fromStatus: 'DEPOSITED',
          toStatus: 'DEPOSIT_CONFIRMED_BY_PMC',
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
        },
      ],
    });

    const result = decorateTramlineWithEmailProcessingOutcomes(tramline, metadata);

    // Check that error takes precedence over warning
    expect(result[2].status).toBe('DEPOSIT_CONFIRMED_BY_PMC');
    expect(result[2].error).toBe(true);
    expect(result[2].warning).toBe(false); // Should be cleared due to error
  });

  it('should handle multiple warnings and errors for different statuses', () => {
    const tramline = createBasicTramline();
    const metadata = createEmailProcessingMetadata({
      messages: [
        {
          type: 'warning',
          message: 'Deposit warning',
          timestamp: '2024-01-15T10:00:00Z',
          fromStatus: 'PENDING',
          toStatus: 'DEPOSITED',
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
        },
        {
          type: 'warning',
          message: 'PMC warning',
          timestamp: '2024-01-20T10:00:00Z',
          fromStatus: 'DEPOSITED',
          toStatus: 'DEPOSIT_CONFIRMED_BY_PMC',
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
        },
        {
          type: 'error',
          message: 'Critical error',
          timestamp: '2024-01-20T10:00:00Z',
          fromStatus: 'DEPOSITED',
          toStatus: 'DEPOSIT_CONFIRMED_BY_PMC',
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
        },
      ],
    });

    const result = decorateTramlineWithEmailProcessingOutcomes(tramline, metadata);

    // First stop should have warning
    expect(result[0].status).toBe('PENDING');
    expect(result[0].warning).toBe(false); // No warning for PENDING
    expect(result[0].error).toBe(false);

    // Second stop should have warning
    expect(result[1].status).toBe('DEPOSITED');
    expect(result[1].warning).toBe(true);
    expect(result[1].error).toBe(false);

    // Third stop should have error (takes precedence over warning)
    expect(result[2].status).toBe('DEPOSIT_CONFIRMED_BY_PMC');
    expect(result[2].error).toBe(true);
    expect(result[2].warning).toBe(false);
  });

  it('should handle empty warnings and errors arrays', () => {
    const tramline = createBasicTramline();
    const metadata = createEmailProcessingMetadata({
      messages: [],
    });

    const result = decorateTramlineWithEmailProcessingOutcomes(tramline, metadata);

    // All stops should be unchanged
    expect(result).toEqual(tramline);
    result.forEach((stop) => {
      expect(stop.warning).toBe(false);
      expect(stop.error).toBe(false);
    });
  });

  it('should not modify original tramline array', () => {
    const tramline = createBasicTramline();
    const originalTramline = JSON.parse(JSON.stringify(tramline)); // Deep copy

    const metadata = createEmailProcessingMetadata({
      messages: [
        {
          type: 'warning',
          message: 'Test warning',
          timestamp: '2024-01-20T10:00:00Z',
          fromStatus: 'DEPOSITED',
          toStatus: 'DEPOSIT_CONFIRMED_BY_PMC',
          messageId: 'msg-123',
          processor: 'bulk-submission-initial-email',
        },
      ],
    });

    const result = decorateTramlineWithEmailProcessingOutcomes(tramline, metadata);

    // Original tramline should be unchanged
    expect(tramline).toEqual(originalTramline);

    // Result should be different
    expect(result).not.toEqual(originalTramline);
    expect(result[2].warning).toBe(true);
  });

  it('should preserve existing error states when only warnings are present', () => {
    // Create a tramline with a stop that's already in error state
    const tramline = createBasicTramline().map((stop) =>
      stop.status === 'PENDING' ? { ...stop, error: true, warning: false } : stop,
    );

    const metadata = createEmailProcessingMetadata({
      messages: [
        {
          type: 'warning',
          message: 'Warning for PENDING',
          timestamp: '2025-01-15T10:00:00Z',
          fromStatus: 'DRAFT',
          toStatus: 'PENDING',
          messageId: 'warn-1',
          processor: 'bulk-submission-initial-email',
        },
      ],
    });

    const result = decorateTramlineWithEmailProcessingOutcomes(tramline, metadata);

    // PENDING stop should keep its existing error state, not be downgraded to warning
    const pendingStop = result.find((stop) => stop.status === 'PENDING');
    expect(pendingStop?.error).toBe(true);
    expect(pendingStop?.warning).toBe(false);
  });
});
