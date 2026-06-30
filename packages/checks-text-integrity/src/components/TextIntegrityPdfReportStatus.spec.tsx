// @vitest-environment jsdom
// eslint-disable-next-line import/no-extraneous-dependencies
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  TextIntegrityPdfReportStatus,
  type TextIntegrityPdfReportStatusProps,
} from './TextIntegrityPdfReportStatus.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const routerMocks = vi.hoisted(() => ({
  fetcher: {
    state: 'idle',
    data: undefined as { success?: boolean; error?: { message?: string } } | undefined,
    Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  },
  revalidate: vi.fn(),
}));

vi.mock('react-router', () => ({
  useFetcher: () => routerMocks.fetcher,
  useRevalidator: () => ({ revalidate: routerMocks.revalidate }),
}));

vi.mock('@curvenote/scms-core', () => ({
  ui: {
    Button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
      <button {...props}>{children}</button>
    ),
    MaintenanceTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    toastError: vi.fn(),
  },
  useCheckMaintenanceBlocked: () => ({ blocked: false, message: undefined }),
}));

vi.mock('./TextIntegrityEulaDialog.js', () => ({
  TextIntegrityEulaDialog: () => null,
}));

vi.mock('./useTextIntegrityEulaEnable.js', () => ({
  useTextIntegrityEulaEnable: () => ({
    dialogOpen: false,
    setDialogOpen: vi.fn(),
    eulaPresentation: undefined,
    requestEnable: (fn: () => void) => fn(),
    acceptEula: vi.fn(),
    busy: false,
  }),
}));

function defaultProps(): TextIntegrityPdfReportStatusProps {
  return {
    reportGenerationComplete: true,
    reportGenerationFailed: false,
    waitingForReport: false,
    similarityReportPdfInvalidated: true,
    reportPdfAvailable: false,
    checkRunId: 'run-1',
    workVersionId: 'wv-1',
    actionPath: '/actions',
  };
}

describe('TextIntegrityPdfReportStatus retry latch', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    routerMocks.fetcher.state = 'idle';
    routerMocks.fetcher.data = undefined;
    routerMocks.revalidate.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderStatus(props: Partial<TextIntegrityPdfReportStatusProps> = {}) {
    act(() => {
      root.render(<TextIntegrityPdfReportStatus {...defaultProps()} {...props} />);
    });
  }

  function text() {
    return container.textContent ?? '';
  }

  it('keeps regenerate hidden during the race before waiting state arrives, then resets after failure', () => {
    renderStatus();
    expect(text()).toContain('Regenerate PDF report');

    routerMocks.fetcher.data = { success: true };
    renderStatus();

    expect(routerMocks.revalidate).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Waiting for PDF report');
    expect(text()).not.toContain('Regenerate PDF report');

    renderStatus({ waitingForReport: true });
    expect(text()).toContain('Waiting for PDF report');

    renderStatus({
      reportGenerationComplete: false,
      reportGenerationFailed: true,
      waitingForReport: false,
      similarityReportPdfInvalidated: false,
    });

    expect(text()).toContain('Retry PDF generation');
    expect(text()).not.toContain('Waiting for PDF report');
  });

  it('arms and resets for invalidated regeneration once loader data reports waiting', () => {
    renderStatus();

    routerMocks.fetcher.data = { success: true };
    renderStatus();

    expect(text()).toContain('Waiting for PDF report');
    expect(text()).not.toContain('Regenerate PDF report');

    renderStatus({ waitingForReport: true, similarityReportPdfInvalidated: true });
    expect(text()).toContain('Waiting for PDF report');

    renderStatus({
      waitingForReport: false,
      similarityReportPdfInvalidated: false,
      reportGenerationComplete: true,
      reportPdfAvailable: true,
    });

    expect(text()).toContain('Download PDF report');
    expect(text()).not.toContain('Waiting for PDF report');
  });
});
