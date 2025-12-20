import {
  Context,
  getConfig,
  authenticatorFactory,
  sessionStorageFactory,
} from '@curvenote/scms-server';
import { error405, httpError } from '@curvenote/scms-core';
import { authThrowOnInvalidCredentials } from '../backend/email/email.server.js';
import { processInboundEmail } from '../backend/email/email-processor.server.js';
import type { ActionFunctionArgs } from 'react-router';

export function loader() {
  throw error405();
}

/**
 * CloudMailin webhook endpoint for processing PMC inbound emails
 *
 * @param args
 * @returns
 *
 * From: https://docs.cloudmailin.com/receiving_email/http_status_codes/
 *
 * Status Code	Examples	Action Taken
 * 2xx	200 - OK, 201 - Created	Message receipt was successful.
 * 4xx	403 - Forbidden, 404 - Not Found, 422 - Unprocessable Entity	The message will be rejected and the sender will be notified of this problem.
 * 5xx	500 - Internal Server Error, 503 - Service Unavailable	The message delivery will be delayed. We will tell the mail server to try again later.
 *
 * Custom Error Messages
 * You can send a custom error message when you reject a message by making sure the content type of your response is set to text/plain. This text will
 * then be sent as part of the error message given by the server. This error message will also be stored within the Delivery Status of the message. You
 * can use this to debug any problems that might occur at your server along with your own server logs.
 */
export async function action(args: ActionFunctionArgs) {
  try {
    // Initialize context
    const [config, auth, sessionStorage] = await Promise.all([
      getConfig(),
      authenticatorFactory(),
      sessionStorageFactory(),
    ]);

    const ctx = new Context(config, auth, sessionStorage, args.request);

    // Authenticate the webhook
    authThrowOnInvalidCredentials(ctx);

    // Check if inbound email processing is enabled
    const inboundEmailConfig = ctx.$config.app.extensions?.pmc?.inboundEmail;
    if (!inboundEmailConfig?.enabled) {
      return Response.json({ ok: true, message: 'Inbound email processing is disabled' });
    }

    // Extract JSON payload from request body
    let payload: any;
    try {
      payload = await args.request.json();
    } catch (error) {
      console.error('Failed to parse JSON payload:', error);
      throw httpError(400, 'Invalid JSON payload');
    }

    // Validate required payload fields
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid payload structure');
      throw httpError(400, 'Invalid payload structure');
    }

    // Process the inbound email
    console.log('Processing inbound email...');
    const result = await processInboundEmail(ctx, payload);

    console.log('Email processing result:', {
      messageId: result.messageId,
      status: result.status,
      processedPackages: result.processedDeposits,
      errors: result.errors,
    });

    // Return appropriate HTTP status based on processing result
    switch (result.status) {
      case 'BOUNCED':
        // Return 403 for bounced emails (sender not in whitelist)
        // This will reject the message and notify the sender
        // Note: No messageId since we don't store bounced emails in database
        throw httpError(403, 'Email bounced - sender not authorized', {
          reason: 'Email bounced - sender not authorized',
        });

      case 'SUCCESS':
      case 'PARTIAL':
      case 'IGNORED':
        return Response.json(
          {
            ok: true,
            messageId: result.messageId,
          },
          { status: 200 },
        );

      case 'ERROR':
        // Return 422 for processing errors (valid email but processing failed)
        // This allows CloudMailin to retry delivery later, and we can attempt to
        // reprocess so not lose the email
        throw httpError(422, 'Email processing failed', {
          messageId: result.messageId,
          errors: result.errors,
        });

      default:
        throw httpError(500, 'Unknown processing status', {
          messageId: result.messageId,
        });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);

    // If the error is already an HTTP error (has status), re-throw as is
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }
    // Otherwise, wrap as 500
    throw httpError(500, 'Internal server error', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
