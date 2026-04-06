import { describe, expect, it } from 'vitest';
import { proofigReportUrlWithAccessToken } from './proofigReportUrl.server.js';

describe('proofigReportUrlWithAccessToken', () => {
  it('replaces token and keeps id and origin', () => {
    expect(
      proofigReportUrlWithAccessToken(
        'https://proofig.example/auto/Curvenotelogin?id=rep-1&token=old',
        'new.jwt',
      ),
    ).toBe('https://proofig.example/auto/Curvenotelogin?id=rep-1&token=new.jwt');
  });

  it('adds token when missing', () => {
    expect(
      proofigReportUrlWithAccessToken('https://proofig.example/auto/Curvenotelogin?id=rep-2', 't'),
    ).toBe('https://proofig.example/auto/Curvenotelogin?id=rep-2&token=t');
  });

  it('throws on invalid URL', () => {
    expect(() => proofigReportUrlWithAccessToken('not-a-url', 't')).toThrow(/valid absolute URL/);
  });
});
