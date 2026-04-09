# Plan: `TEXT_INTEGRITY_SUBMIT` → checks-relay submit

## Goal

Replace the stubbed submit job with a real **HTTP POST** to checks-relay **`POST /api/v1/services/:serviceName/submit`**, so the iThenticate plugin creates a TCA submission, uploads the manuscript from a **fetchable URL**, and records the submission in the relay DB for ingest → notify forwarding.

This doc is scoped to **(1) submit only**. Webhook payload alignment, state machine, and `serviceData` evolution are **(2)** and may force follow-up tweaks here (especially `notifyUrl` and post-submit `stage` updates).

---

## Relay endpoint (authoritative)

**Path:** `POST /api/v1/services/:serviceName/submit`  
**Implementation:** `checks-relay/apps/relay/app/routes/v1/services.name/submit.ts`

### Request body shape

The handler parses JSON as a flat object, then **splits** it:

- **`credentials`** — Any object (or omitted → treated as `{}`). Stripped off and passed to the plugin as the first argument to `plugin.submit(credentials, payload)`.
- **Everything else** — Normalized into a **`PluginSubmitPayload`** (see `@checks-relay/types`): required `clientId`, `files`, `notifyUrl`, optional `metadata`, plus relay-injected `id`.

**Required fields on the payload (after split):**

| Field       | Type   | Relay validation |
|------------|--------|------------------|
| `clientId` | string | Must be truthy. Used for **idempotency** per `(clientId, serviceName)`. |
| `files`    | array  | Non-empty; each element must be an object with string **`url`** and **`filename`**; optional **`role`**. |
| `notifyUrl`| string | Must be truthy. Relay will `POST` notification envelopes here when webhooks are processed (see ingest flow). |

**Optional:**

| Field        | Default | Notes |
|-------------|---------|--------|
| `metadata`  | `{}`    | Freeform object; **validated by the plugin**. Stored on the submission row (Prisma column remains `settings` for history). |

**Relay-injected field before plugin runs:**

After creating the DB row, relay calls:

```ts
plugin.submit(credentials, pluginPayload);
```

where `pluginPayload` is `{ id, clientId, notifyUrl, files, metadata }`. The plugin receives **`id`**: the relay’s internal **submission UUID** (not the same as `clientId`).

### Responses

- **201** — New submission; plugin completed without throwing. JSON includes `status`, `message`, `result` with at least `submissionId` (relay id) and, when provided by the plugin, `externalRef` (TCA submission id). Relay persists `status`, `result`, and `externalRef` on the submission row.
- **200** — **Idempotent hit:** a submission already exists for this `clientId` + `serviceName`. Body returns existing `status` / `message` / `result` (**plugin `submit` is not called again**).
- **400** — Invalid JSON, missing `clientId` / `files` / `notifyUrl`, invalid `files` shape, or non-string `clientId` / `notifyUrl`.
- **404** — Unknown `serviceName` (plugin not registered).
- **500** — Plugin threw; submission row updated to error state; response includes `submissionId` in `result`.

### Idempotency (important for the job)

Repeating the same `clientId` for the same service **does not** create a second TCA submission. For **one check run = one intended relay submission**, prefer:

- **`clientId` = `text_integrity_run_id`** (the `checkServiceRun.id`), so retries that reuse the same idempotency key return the same relay submission instead of duplicating work.

If the product instead wants **at most one open submission per work version**, you could use `work_version_id` — but then a second “Run” on the same version would hit the existing row and would **not** re-invoke the plugin; that is usually wrong unless you delete or rotate `clientId` per run.

---

## iThenticate plugin expectations (`service-plugin-ithenticate`)

**Credentials** (`extractCredentials` in `packages/service-plugin-ithenticate/src/utils.ts`):

| Field               | Required | Notes |
|--------------------|----------|--------|
| `apiKey`           | yes      | TCA API key. |
| `apiUrl`           | yes      | TCA API base URL. |
| `integrationName`  | no       | Default `checks-relay`. |
| `integrationVersion` | no     | Default `1.0.0`. |

**Payload** (`runSubmit` in the same file):

- **`files`** — Non-empty array. Only **`files[0]`** is used today: each item must be enough for `TcaClient.fetchFile(file.url)` — at minimum **`url`** and **`filename`** (used for upload and title fallback).
- **`metadata`** — Freeform from the client; iThenticate reads TCA-oriented fields (`owner`, `title`, `submitter`, `eula`, `group`, etc.) and maps them into the TCA create-submission body. Sensible defaults exist: e.g. `owner.id` falls back to **`payload.clientId`** if omitted.
- **`clientId`** — Still present on the payload for those defaults.

SCMS already stores **`apiBaseUrl`** in extension config; the job should map that to relay **`credentials.apiUrl`** (naming differs between app and TCA client).

---

## Suggested JSON body produced by the job

Conceptually:

```json
{
  "credentials": {
    "apiKey": "<from Text Integrity config>",
    "apiUrl": "<from apiBaseUrl / stored credentials>"
  },
  "clientId": "<text_integrity_run_id>",
  "notifyUrl": "<absolute URL to SCMS hook>",
  "files": [
    {
      "url": "<signed or public URL to PDF or DOCX>",
      "filename": "<original filename>"
    }
  ],
  "metadata": {
    "title": "<optional human title>",
    "owner": { "id": "...", "given_name": "...", "family_name": "...", "email": "..." }
  }
}
```

**Relay HTTP headers:** Match existing SCMS → relay calls (e.g. admin configure/status): **`Authorization: Bearer <app.checks.relayApiKey>`** (exact config path as used elsewhere in this extension).

**`serviceName`:** Resolve like admin code: extension `serviceName` or `app.checks.textIntegrityServiceName`, default **`ithenticate`**.

---

## Work items for implementation

### Config and HTTP client

- Resolve **`relayBaseUrl`**, **`relayApiKey`**, **`serviceName`**, TCA **`apiKey`**, **`apiUrl`** from merged extension + app config (reuse or mirror `getTextIntegrityConfigWithOverrides` / patterns in `admin/actionHandlers.server.ts`).
- Fail fast with a clear job error if any required piece is missing.

### Manuscript URL and filename

- From **`work_version_id`**, load metadata and pick **PDF or DOCX** (same rules as `handleTextIntegrityAction`).
- Produce a **URL the relay can fetch** (signed storage URL, CDN URL, or internal URL if relay can reach it — **environment-dependent**; document the assumption).
- Set **`filename`** appropriately for TCA (and `metadata.title` if desired).

### `notifyUrl`

- Build the absolute URL for the existing route: **`…/v1/api/hooks/text-integrity/notify/:id`** with **`:id` = `text_integrity_run_id`** (confirm mount prefix for your deployment; extension attaches to `v1/hooks` as `text-integrity/notify/:id`).
- **Note:** Relay’s ingest currently forwards a **summary envelope** (`status`, `message`, `result`, …), not raw TCA `event` bodies. **Todo (2)** should either adapt the notify route to that shape or change relay’s notify payload. Until then, submit can still land; similarity completion may not update the run as intended.

### Call relay and update `checkServiceRun`

- `POST` to `{relayBaseUrl}/api/v1/services/{serviceName}/submit`.
- On **201**: read `result.externalRef` (TCA id); update `serviceData.submission_id`, set `stage` appropriately (e.g. **`submission_complete`** only after you align with TCA reality — today the plugin returns **`submitted`** after upload; TCA may still be processing until webhooks).
- On **200** (idempotent): same persistence logic using returned `result`.
- On **4xx/5xx** or network failure: set run / `serviceData` **`error`** with a useful message; rethrow or mark job failed per existing job patterns.

### Testing

- Integration: mock relay or use test relay + echo plugin first; then iThenticate plugin with mocked TCA if available.
- Unit: payload builder (credentials redaction in logs, `clientId`, file shape).

---

## Open decisions

1. **Stage after successful HTTP submit:** Plugin returns status **`submitted`**; whether `serviceData.stage` stays **`submitting`** until `SUBMISSION_COMPLETE` webhook (once notify handling is fixed) vs. immediately **`submission_complete`** is a product/consistency choice.
2. **Owner / submitter metadata:** How much to populate `metadata` from `ctx` / work version / user (requires job or payload access to actor info if desired).
3. **Multi-file:** Plugin only uploads **`files[0]`**; if both PDF and DOCX exist, define which wins (likely same as execute gate: prefer one explicitly).

---

## Reference snippets

Types (`@checks-relay/types`): **`RelaySubmitRequestBody`**, **`PluginSubmitPayload`**, **`SubmitManuscriptFile`**.

Relay validates `files` and builds `PluginSubmitPayload` before calling the plugin — see `checks-relay/apps/relay/app/routes/v1/services.name/submit.ts`.

iThenticate submit entry uses **`PluginSubmitPayload`** and `runSubmit` reads **`payload.metadata`** for TCA owner/title/EULA/etc.
