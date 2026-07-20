import { sendJobPubSubMessage } from '@curvenote/scms-server';

/**
 * Extension configuration for the Proofig PDF Cloud Run service (Pub/Sub target).
 * Lives entirely within the extension config — core scms-server has no Proofig knowledge.
 */
export type PdfServiceConfig = {
  /** GCP project id that owns the Pub/Sub topic. */
  projectId: string;
  /** Service-account key JSON with pubsub.publisher on the project. */
  credentialsJson: string;
  /** Pub/Sub topic name (id or full resource name). */
  topic: string;
  /** Optional local HTTP stub URL for development pushes (defaults to loopback:8088). */
  devLocalPushUrl?: string;
};

/**
 * Read the `pdfService` block from the merged checks-proofig extension config.
 * Returns undefined when not configured (dispatch should be skipped/soft-failed).
 */
export function readPdfServiceConfig(
  config: Record<string, unknown> | undefined,
): PdfServiceConfig | undefined {
  const raw = config?.pdfService;
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const projectId = typeof r.projectId === 'string' ? r.projectId.trim() : '';
  const credentialsJson = typeof r.credentialsJson === 'string' ? r.credentialsJson : '';
  const topic = typeof r.topic === 'string' ? r.topic.trim() : '';
  if (!projectId || !credentialsJson || !topic) return undefined;
  return {
    projectId,
    credentialsJson,
    topic,
    devLocalPushUrl:
      typeof r.devLocalPushUrl === 'string' && r.devLocalPushUrl.trim()
        ? r.devLocalPushUrl.trim()
        : undefined,
  };
}

/**
 * Publish a Proofig PDF render job to the Cloud Run worker via Pub/Sub.
 * Thin wrapper over the generic `sendJobPubSubMessage` helper exported by scms-server;
 * all routing (test / dev stub / production) is handled there.
 */
export async function dispatchProofigPdfService(
  attributes: Record<string, string>,
  data: Record<string, unknown>,
  pdfService: PdfServiceConfig,
): Promise<string> {
  return sendJobPubSubMessage({
    attributes,
    data,
    pubSub: {
      projectId: pdfService.projectId,
      credentialsJson: pdfService.credentialsJson,
      topicName: pdfService.topic,
    },
    devLocalPush: { url: pdfService.devLocalPushUrl ?? 'http://127.0.0.1:8088/' },
  });
}
