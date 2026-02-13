import { PubSub } from '@google-cloud/pubsub';
import { getConfig } from '@curvenote/scms-server';

/** Message attributes for the Proofig submit Pub/Sub message. */
export type ProofigSubmitMessageAttributes = {
  handshake: string;
  jobUrl: string;
  userId: string;
} & Record<string, string>;

/** Options for publishing to the Proofig submit topic (from extension config). */
export interface PublishProofigSubmitOptions {
  /** Full Pub/Sub topic resource name (e.g. projects/PROJECT_ID/topics/proofig-submit). Required in production. */
  topic: string;
}

/**
 * Publish a message to the Proofig submit Pub/Sub topic (task-submit-proofig service).
 * Message has attributes (handshake, jobUrl, userId) and data (JSON payload with workVersion, submit_req_id, notify_url).
 * Topic must be passed via options (from extension config). Reuses checkSASecretKeyfile for credentials.
 */
export async function publishProofigSubmitMessage(
  attributes: ProofigSubmitMessageAttributes,
  data: Record<string, unknown>,
  options: PublishProofigSubmitOptions,
): Promise<string> {
  if (process.env.NODE_ENV === 'test' || process.env.APP_CONFIG_ENV === 'test') {
    return 'testPubSubId';
  }
  const { topic: topicName } = options;
  if (!topicName) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('proofigSubmitTopic not set; skipping Proofig submit publish in development');
      return 'testPubSubId';
    }
    throw new Error('proofigSubmitTopic (options.topic) is required for PROOFIG_SUBMIT job');
  }
  const dataBase64 = Buffer.from(JSON.stringify(data), 'utf-8').toString('base64');
  if (process.env.NODE_ENV === 'development') {
    console.log('publishing proofig submit message to localhost', attributes.jobUrl);
    fetch('http://127.0.0.1:8080/', {
      method: 'POST',
      body: JSON.stringify({
        message: { attributes: { ...attributes, jobUrl: attributes.jobUrl }, data: dataBase64 },
      }),
      headers: { 'content-type': 'application/json' },
    }).then(
      (res) => console.info('proofig submit response', res),
      (err) => console.error('proofig submit error', err),
    );
    return 'testPubSubId';
  }
  const projectIdMatch = topicName.match(/^projects\/([^/]+)\//);
  if (!projectIdMatch) {
    throw new Error(
      'proofigSubmitTopic must be full resource name (projects/PROJECT_ID/topics/TOPIC_NAME)',
    );
  }
  const config = await getConfig();
  const pubSubClient = new PubSub({
    projectId: projectIdMatch[1],
    credentials: JSON.parse(config.api.checkSASecretKeyfile),
  });
  const messageId = await pubSubClient
    .topic(topicName)
    .publishMessage({ data: Buffer.from(JSON.stringify(data), 'utf-8'), attributes });
  return messageId;
}
