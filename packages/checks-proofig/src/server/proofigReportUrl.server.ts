/**
 * Proofig report links use a `token` query parameter (see Proofig harness / notify `report_url`).
 * Replace it with a freshly issued access token while preserving path, host, and other params (e.g. `id`).
 */
export function proofigReportUrlWithAccessToken(
  storedReportUrl: string,
  accessToken: string,
): string {
  let url: URL;
  try {
    url = new URL(storedReportUrl);
  } catch {
    throw new Error('Stored Proofig report URL is not a valid absolute URL');
  }
  url.searchParams.set('token', accessToken);
  return url.toString();
}
