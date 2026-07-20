import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';

export type RenderReportPdfOptions = {
  /** Fully formed report URL (including access token). */
  reportUrl: string;
  /** Directory to write the PDF into. */
  outputDir: string;
  /** Output filename (defaults to report.pdf). */
  filename?: string;
  /** Milliseconds to wait for navigation network idle (default 60s). */
  navigationTimeoutMs?: number;
};

export type RenderReportPdfResult = {
  localPath: string;
  size: number;
};

const PDF_MAGIC = Buffer.from('%PDF-', 'utf-8');

/** Basic guard that the written file is actually a PDF. */
async function assertIsPdf(localPath: string): Promise<number> {
  const stat = await fs.stat(localPath);
  const fh = await fs.open(localPath, 'r');
  try {
    const header = Buffer.alloc(PDF_MAGIC.length);
    await fh.read(header, 0, PDF_MAGIC.length, 0);
    if (!header.equals(PDF_MAGIC)) {
      throw new Error('Rendered file is not a PDF (missing %PDF- magic bytes)');
    }
  } finally {
    await fh.close();
  }
  return stat.size;
}

/**
 * Open a Proofig report URL in headless Chromium, emulate print media (so the
 * Proofig print stylesheet applies, matching the browser "Save as PDF" flow),
 * and write the printed PDF to disk.
 */
export async function renderReportPdf(
  options: RenderReportPdfOptions,
): Promise<RenderReportPdfResult> {
  const { reportUrl, outputDir, filename = 'report.pdf', navigationTimeoutMs = 60_000 } = options;

  await fs.mkdir(outputDir, { recursive: true });
  const localPath = path.join(outputDir, filename);

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.goto(reportUrl, { waitUntil: 'networkidle', timeout: navigationTimeoutMs });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: localPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const size = await assertIsPdf(localPath);
  return { localPath, size };
}
