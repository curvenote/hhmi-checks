// eslint-disable-next-line import/no-extraneous-dependencies
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA } from '../schema.js';
import { startSimilarityPdfViaRelay } from './start-similarity-pdf-via-relay.server.js';

async function expectHttpErrorMessage(promise: Promise<unknown>, expected: string) {
  try {
    await promise;
    expect.fail('expected HTTP error response');
  } catch (err) {
    expect(err).toBeInstanceOf(Response);
    const body = (await (err as Response).json()) as { message?: string };
    expect(body.message).toContain(expected);
  }
}

describe('startSimilarityPdfViaRelay', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts PDF generation through checks-relay and returns the new pdf id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'processing',
          result: { pdf_id: 'pdf-new-1' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const pdfId = await startSimilarityPdfViaRelay(
      { relayBaseUrl: 'https://relay.example.com/', relayApiKey: 'secret' },
      'ithenticate',
      'default',
      {
        ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
        externalId: 'tca-sub-1',
      },
    );

    expect(pdfId).toBe('pdf-new-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://relay.example.com/api/v1/services/ithenticate/instances/default/check/tca-sub-1/report/pdf/start',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret',
          'Content-Type': 'application/json',
        }),
        body: '{}',
      }),
    );
  });

  it('throws when relay succeeds without returning result.pdf_id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'processing', result: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expectHttpErrorMessage(
      startSimilarityPdfViaRelay(
        { relayBaseUrl: 'https://relay.example.com', relayApiKey: 'secret' },
        'ithenticate',
        'default',
        {
          ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
          externalId: 'tca-sub-1',
        },
      ),
      'result.pdf_id',
    );
  });

  it('throws relay error messages from JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'error', message: 'TCA rejected request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expectHttpErrorMessage(
      startSimilarityPdfViaRelay(
        { relayBaseUrl: 'https://relay.example.com', relayApiKey: 'secret' },
        'ithenticate',
        'default',
        {
          ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
          externalId: 'tca-sub-1',
        },
      ),
      'TCA rejected request',
    );
  });
});
