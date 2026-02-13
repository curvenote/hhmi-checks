import { createService } from './service.js';

export type { ProofigSubmitPayload } from './payload.js';
export { validatePayload, getPdfFile } from './payload.js';

const service = createService();

const port = process.env.PORT ?? 8080;
service.listen(port, () => {
  console.info(`task-submit-proofig: listening on port ${port}`);
});
