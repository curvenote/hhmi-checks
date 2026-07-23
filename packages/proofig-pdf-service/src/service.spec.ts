import { describe, it, expect, afterEach } from 'vitest';
import { createService } from './service.js';
import {
  proofigReportStoragePath,
  validateProofigPdfPayload,
  validateRenderOnlyRequest,
} from './payload.js';
import { isRenderOnlyTestMode } from './renderOnlyTestMode.js';

describe('proofig-pdf-service', () => {
  afterEach(() => {
    delete process.env.PROOFIG_PDF_RENDER_ONLY;
  });

  it('creates a service instance with get/post handlers', () => {
    const service = createService();
    expect(service).toBeDefined();
    expect(typeof service.get).toBe('function');
    expect(typeof service.post).toBe('function');
  });

  it('detects render-only test mode from env', () => {
    expect(isRenderOnlyTestMode()).toBe(false);
    process.env.PROOFIG_PDF_RENDER_ONLY = '1';
    expect(isRenderOnlyTestMode()).toBe(true);
  });

  it('validates render-only request body', () => {
    const body = validateRenderOnlyRequest({
      reportUrl: 'https://proofig.example.com/report?token=abc',
    });
    expect(body.reportUrl).toContain('proofig.example.com');
  });

  it('builds a relative storage path under generated/', () => {
    expect(proofigReportStoragePath('run-123')).toBe('generated/run-123/proofig-report.pdf');
  });

  it('validates a well-formed payload', () => {
    const payload = validateProofigPdfPayload({
      reportUrl: 'https://proofig.example.com/report?token=abc',
      work_version_id: 'wv-1',
      check_service_run_id: 'run-1',
      cdn: 'cdn-1',
      cdn_key: 'key/1',
    });
    expect(payload.reportUrl).toContain('proofig.example.com');
  });

  it('rejects a payload missing required fields', () => {
    expect(() => validateProofigPdfPayload({ reportUrl: 'not-a-url' })).toThrow(
      /Invalid proofig-pdf payload/,
    );
  });
});
