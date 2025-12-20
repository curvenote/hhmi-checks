export interface EmailValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Detects if a string is a regex pattern (enclosed in forward slashes)
 */
function isRegexPattern(str: string): boolean {
  return str.startsWith('/') && str.endsWith('/') && str.length > 2;
}

/**
 * Extracts regex pattern from /pattern/ format
 */
function extractRegexPattern(str: string): string {
  return str.slice(1, -1); // Remove leading and trailing slashes
}

/**
 * Validates that the email sender is in the allowed senders list
 */
export function validateEmailSender(
  envelope: any,
  allowedSenders: string[],
): EmailValidationResult {
  if (!envelope?.from) {
    return { isValid: false, reason: 'Missing sender information' };
  }

  // Use envelope.from for security (not headers) and normalize case
  const sender = envelope.from.toLowerCase().trim();

  const isAllowed = allowedSenders.some((allowed) => {
    if (isRegexPattern(allowed)) {
      // Extract pattern and treat as regex with case-insensitive flag
      try {
        const pattern = extractRegexPattern(allowed);
        const regex = new RegExp(pattern, 'i');
        return regex.test(sender);
      } catch (error) {
        // Invalid regex in config - log and treat as non-match for security
        console.warn(`Invalid regex pattern in sender config: ${allowed}`, error);
        return false;
      }
    } else {
      // Exact match (case-insensitive)
      return allowed.toLowerCase() === sender;
    }
  });

  if (!isAllowed) {
    return { isValid: false, reason: `Sender ${sender} not in allowed list` };
  }

  return { isValid: true };
}

/**
 * Validates that the email subject matches our expected pattern
 */
export function validateEmailSubject(headers: any): EmailValidationResult {
  if (!headers?.subject) {
    return { isValid: false, reason: 'Missing subject' };
  }

  const subject = headers.subject.toLowerCase();
  // Accept subjects that contain 'bulk submission' anywhere in the subject
  // This handles forwarding (Fwd:, Re:, etc.) and success/error variations
  const isValidSubject = subject.includes('bulk submission');

  if (!isValidSubject) {
    return {
      isValid: false,
      reason: `Subject "${headers.subject}" does not match expected pattern`,
    };
  }

  return { isValid: true };
}

/**
 * Placeholder for DKIM verification - always returns valid for now
 */
export function validateDKIM(): EmailValidationResult {
  // TODO: Implement DKIM verification in future
  return { isValid: true };
}

/**
 * Comprehensive email validation that checks all criteria
 */
export function validateEmail(payload: any, allowedSenders: string[]): EmailValidationResult {
  const { envelope, headers } = payload;

  // Check sender
  const senderValidation = validateEmailSender(envelope, allowedSenders);
  if (!senderValidation.isValid) {
    return senderValidation;
  }

  // Check subject
  const subjectValidation = validateEmailSubject(headers);
  if (!subjectValidation.isValid) {
    return subjectValidation;
  }

  // Check DKIM (placeholder)
  const dkimValidation = validateDKIM();
  if (!dkimValidation.isValid) {
    return dkimValidation;
  }

  return { isValid: true };
}
