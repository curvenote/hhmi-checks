'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { ui } from '@curvenote/scms-core';
import { TEXT_INTEGRITY_CHECKS_ACTION_PATH } from '../client.js';

type EulaStatusPayload = {
  requireEula?: boolean;
  accepted?: boolean;
  eula?: { version?: string; html?: string; url?: string };
  error?: { message?: string };
  success?: boolean;
};

export function useTextIntegrityEulaEnable(workVersionId: string) {
  const statusFetcher = useFetcher<EulaStatusPayload>();
  const acceptFetcher = useFetcher<EulaStatusPayload>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eulaPresentation, setEulaPresentation] = useState<{
    version: string;
    html?: string;
    url?: string;
  } | null>(null);
  const pendingEnableRef = useRef<(() => void) | null>(null);

  const loadStatus = useCallback(() => {
    const formData = new FormData();
    formData.append('intent', 'checks-text-integrity:eula-status');
    formData.append('workVersionId', workVersionId);
    statusFetcher.submit(formData, {
      method: 'post',
      action: TEXT_INTEGRITY_CHECKS_ACTION_PATH,
    });
  }, [statusFetcher, workVersionId]);

  const requestEnable = useCallback(
    (onEnabled: () => void) => {
      pendingEnableRef.current = onEnabled;
      loadStatus();
    },
    [loadStatus],
  );

  useEffect(() => {
    if (statusFetcher.state !== 'idle' || !statusFetcher.data || !pendingEnableRef.current) {
      return;
    }
    const data = statusFetcher.data;

    if (data.error?.message) {
      ui.toastError(data.error.message);
      pendingEnableRef.current = null;
      return;
    }
    if (!data.requireEula || data.accepted) {
      const run = pendingEnableRef.current;
      pendingEnableRef.current = null;
      run();
      return;
    }
    const version = data.eula?.version;
    if (!version) {
      ui.toastError('EULA version is unavailable. Try again later.');
      pendingEnableRef.current = null;
      return;
    }
    setEulaPresentation({
      version,
      html: data.eula?.html,
      url: data.eula?.url,
    });
    setDialogOpen(true);
  }, [statusFetcher.state, statusFetcher.data]);

  useEffect(() => {
    if (acceptFetcher.state !== 'idle' || !acceptFetcher.data) return;
    if (acceptFetcher.data.error?.message) {
      ui.toastError(acceptFetcher.data.error.message);
      return;
    }
    if (!acceptFetcher.data.success) return;
    setDialogOpen(false);
    setEulaPresentation(null);
    const run = pendingEnableRef.current;
    pendingEnableRef.current = null;
    run?.();
  }, [acceptFetcher.state, acceptFetcher.data]);

  const acceptEula = useCallback(
    (params: { version: string; language: string }) => {
      const formData = new FormData();
      formData.append('intent', 'checks-text-integrity:accept-eula');
      formData.append('workVersionId', workVersionId);
      formData.append('version', params.version);
      formData.append('language', params.language);
      acceptFetcher.submit(formData, {
        method: 'post',
        action: TEXT_INTEGRITY_CHECKS_ACTION_PATH,
      });
    },
    [acceptFetcher, workVersionId],
  );

  const cancelDialog = useCallback(() => {
    setDialogOpen(false);
    setEulaPresentation(null);
    pendingEnableRef.current = null;
  }, []);

  return {
    dialogOpen,
    setDialogOpen: (open: boolean) => {
      if (!open) cancelDialog();
      else setDialogOpen(true);
    },
    eulaPresentation,
    requestEnable,
    acceptEula,
    busy: statusFetcher.state !== 'idle' || acceptFetcher.state !== 'idle',
  };
}
