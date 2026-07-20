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

/**
 * Chromium's print engine often clips text mid-glyph when an ancestor has
 * `overflow: hidden` (common in app shells / cards). Force visible overflow for
 * print, and prefer the page's own @page margins over Playwright defaults.
 */
const PRINT_CLIP_FIX_CSS = `
  @media print {
    html, body {
      height: auto !important;
      overflow: visible !important;
    }
    *, *::before, *::after {
      overflow: visible !important;
      text-overflow: clip !important;
    }
  }
`;

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
    const page = await browser.newPage({
      // Wide enough that Proofig's layout does not shrink-to-fit oddly for A4.
      viewport: { width: 1280, height: 1800 },
    });
    await page.goto(reportUrl, { waitUntil: 'networkidle', timeout: navigationTimeoutMs });
    await page.evaluate(async () => {
      // Wait for webfonts so glyph metrics match what print layout expects.
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await page.emulateMedia({ media: 'print' });
    await page.addStyleTag({ content: PRINT_CLIP_FIX_CSS });
    await page.pdf({
      path: localPath,
      format: 'A4',
      printBackground: true,
      // Let Proofig's @page / print CSS own margins (avoids double-cropping).
      preferCSSPageSize: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const size = await assertIsPdf(localPath);
  return { localPath, size };
}
