// eslint-disable-next-line import/no-extraneous-dependencies
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA } from '../schema.js';
import {
  fetchSimilarityReportPdfFromRelay,
  fetchSimilarityReportPdfFromRelayWhenReady,
} from './fetch-similarity-report-from-relay.server.js';

const serviceData = {
  ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
  externalId: 'tca-sub-1',
  reportPdfId: 'pdf-1',
};

const relay = { relayBaseUrl: 'https://relay.example.com', relayApiKey: 'secret' };

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

describe('fetchSimilarityReportPdfFromRelay', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects successful non-PDF responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('not ready', {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );

    await expectHttpErrorMessage(
      fetchSimilarityReportPdfFromRelay(relay, 'ithenticate', 'default', serviceData),
      'non-PDF',
    );
  });

  it('returns valid PDF bytes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('%PDF-1.7\nbody', {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );

    const result = await fetchSimilarityReportPdfFromRelay(
      relay,
      'ithenticate',
      'default',
      serviceData,
    );

    expect(Buffer.from(result.bytes).toString('utf8')).toContain('%PDF-1.7');
  });
});

describe('fetchSimilarityReportPdfFromRelayWhenReady', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('retries retryable fetch failures until a valid PDF is available', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'PDF is still processing' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('%PDF-1.7\nbody', {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchSimilarityReportPdfFromRelayWhenReady(
      relay,
      'ithenticate',
      'default',
      serviceData,
      { attempts: 2, delayMs: 0 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Buffer.from(result.bytes).toString('utf8')).toContain('%PDF-1.7');
  });

  it('uses relay Retry-After when retrying readiness failures', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'PDF is still processing' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('%PDF-1.7\nbody', {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchSimilarityReportPdfFromRelayWhenReady(
      relay,
      'ithenticate',
      'default',
      serviceData,
      { attempts: 2, delayMs: 10_000 },
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    const result = await promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Buffer.from(result.bytes).toString('utf8')).toContain('%PDF-1.7');
  });

  it('falls back to the configured delay for non-positive Retry-After values', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'PDF is still processing' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '0' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('%PDF-1.7\nbody', {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchSimilarityReportPdfFromRelayWhenReady(
      relay,
      'ithenticate',
      'default',
      serviceData,
      { attempts: 2, delayMs: 750 },
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(749);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    const result = await promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Buffer.from(result.bytes).toString('utf8')).toContain('%PDF-1.7');
  });
});
