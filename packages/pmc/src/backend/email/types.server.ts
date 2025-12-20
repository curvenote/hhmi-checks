import type { Context } from '@curvenote/scms-core';

/**
 * Result of email validation
 */
export interface EmailValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Overall email processing result
 */
export interface ProcessingResult {
  messageId: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR' | 'PARTIAL' | 'IGNORED' | 'BOUNCED';
  processedDeposits: number;
  errors: string[];
  processor?: string; // Track which processor/handler was used
  parsedResult?: any; // Handler-specific parsed data (shape varies by handler type)
}

/**
 * Configuration for email type validation
 */
export interface EmailProcessorConfig {
  subjectPatterns: string[];
  enabled: boolean;
}

/**
 * Interface that all email type handlers must implement
 */
export interface InboundEmailHandler {
  /** Unique identifier for this email type */
  name: string;

  /** Description of what this email type handles */
  description: string;

  /**
   * Identifies if this handler can process the given email payload
   * @param payload The raw email payload from CloudMailin
   * @returns true if this handler can process the email
   */
  identify: (payload: any) => boolean;

  /**
   * Validates the email payload for this specific type
   * @param payload The raw email payload
   * @param config Configuration for this email type
   * @returns Validation result
   */
  validate: (payload: any, config: EmailProcessorConfig) => EmailValidationResult;

  /**
   * Processes the email including parsing and database updates
   * Each handler can implement its own parsing logic internally
   * @param ctx Application context
   * @param payload The raw email payload
   * @param messageId The message ID for database tracking
   * @returns Processing result
   */
  process: (ctx: Context, payload: any, messageId: string) => Promise<ProcessingResult>;
}

/**
 * Registry for managing email type handlers
 */
export class EmailProcessorRegistry {
  private handlers: Map<string, InboundEmailHandler> = new Map();

  /**
   * Register a new email type handler
   */
  register(handler: InboundEmailHandler): void {
    this.handlers.set(handler.name, handler);
  }

  /**
   * Identify which email processor can handle the given payload
   * @param payload The raw email payload
   * @returns The email processor identifier or null if no handler can process it
   */
  identifyProcessor(payload: any): string | null {
    for (const [name, handler] of this.handlers) {
      if (handler.identify(payload)) {
        return name;
      }
    }
    return null;
  }

  /**
   * Get a specific email processor handler
   * @param type The email processor names
   * @returns The handler or null if not found
   */
  getHandler(processorName: string): InboundEmailHandler | null {
    return this.handlers.get(processorName) || null;
  }

  /**
   * Get all registered email processor names
   * @returns Array of email processor names
   */
  getAllProcessorNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get all registered handlers
   * @returns Array of email processor handlers
   */
  getAllHandlers(): InboundEmailHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Check if a specific email processor is registered
   * @param processorName The email processor name
   * @returns true if the processor is registered
   */
  hasProcessor(processorName: string): boolean {
    return this.handlers.has(processorName);
  }

  /**
   * Get the number of registered handlers
   * @returns Number of registered handlers
   */
  size(): number {
    return this.handlers.size;
  }
}

/**
 * Global registry instance for PMC email processing
 */
export const pmcEmailProcessorRegistry = new EmailProcessorRegistry();
