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

const routerMocks = vi.hoisted(() => {
  const restartFetcher = {
    state: 'idle' as 'idle' | 'submitting' | 'loading',
    data: undefined as { success?: boolean; error?: { message?: string } } | undefined,
    submit: vi.fn(),
  };
  const refreshFetcher = {
    state: 'idle' as 'idle' | 'submitting' | 'loading',
    data: undefined as
      | {
          success?: boolean;
          error?: { message?: string };
          recovery?: { ok: false; message: string; status: number };
        }
      | undefined,
    submit: vi.fn(),
  };
  return {
    restartFetcher,
    refreshFetcher,
    revalidate: vi.fn(),
    fetcherCalls: 0,
  };
});

vi.mock('react-router', () => ({
  useFetcher: () => {
    routerMocks.fetcherCalls += 1;
    // Odd calls = restart fetcher, even = refresh (component call order).
    return routerMocks.fetcherCalls % 2 === 1
      ? routerMocks.restartFetcher
      : routerMocks.refreshFetcher;
  },
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
    StatefulButton: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: string;
      busy?: boolean;
      overlayBusy?: boolean;
    }) => <button {...props}>{children}</button>,
    MaintenanceTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Menu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    MenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    MenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    MenuItem: ({
      children,
      onSelect,
      disabled,
    }: {
      children: React.ReactNode;
      onSelect?: (event: { preventDefault: () => void }) => void;
      disabled?: boolean;
    }) => (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect?.({ preventDefault: () => {} })}
      >
        {children}
      </button>
    ),
    toastError: vi.fn(),
    toastWarning: vi.fn(),
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
    includeRemoteRefresh: true,
  };
}

describe('TextIntegrityPdfReportStatus retry latch', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    routerMocks.fetcherCalls = 0;
    routerMocks.restartFetcher.state = 'idle';
    routerMocks.restartFetcher.data = undefined;
    routerMocks.restartFetcher.submit.mockReset();
    routerMocks.refreshFetcher.state = 'idle';
    routerMocks.refreshFetcher.data = undefined;
    routerMocks.refreshFetcher.submit.mockReset();
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
    routerMocks.fetcherCalls = 0;
    act(() => {
      root.render(<TextIntegrityPdfReportStatus {...defaultProps()} {...props} />);
    });
  }

  function text() {
    return container.textContent ?? '';
  }

  it('keeps regenerate hidden during the race before waiting state arrives, then resets after failure', () => {
    renderStatus();
    expect(text()).toContain('Regenerate PDF');
    expect(text()).toContain('Refresh');

    routerMocks.restartFetcher.data = { success: true };
    renderStatus();

    expect(routerMocks.revalidate).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Waiting for PDF Report');
    expect(text()).not.toContain('Regenerate PDF');

    renderStatus({ waitingForReport: true });
    expect(text()).toContain('Waiting for PDF Report');

    renderStatus({
      reportGenerationComplete: false,
      reportGenerationFailed: true,
      waitingForReport: false,
      similarityReportPdfInvalidated: false,
    });

    expect(text()).toContain('PDF Generation Failed');
    expect(text()).toContain('Retry PDF generation');
    expect(text()).not.toContain('Waiting for PDF Report');
  });

  it('arms and resets for invalidated regeneration once loader data reports waiting', () => {
    renderStatus();

    routerMocks.restartFetcher.data = { success: true };
    renderStatus();

    expect(text()).toContain('Waiting for PDF Report');
    expect(text()).not.toContain('Regenerate PDF');

    renderStatus({ waitingForReport: true, similarityReportPdfInvalidated: true });
    expect(text()).toContain('Waiting for PDF Report');

    renderStatus({
      waitingForReport: false,
      similarityReportPdfInvalidated: false,
      reportGenerationComplete: true,
      reportPdfAvailable: true,
    });

    expect(text()).toContain('Download PDF report');
    expect(text()).toContain('Refresh');
    expect(text()).not.toContain('Waiting for PDF Report');
  });
});
