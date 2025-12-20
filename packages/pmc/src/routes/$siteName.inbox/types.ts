import type { dbListPMCSubmissionsWithLatestNonDraftVersion } from './db.server.js';

export type ListingPromise = ReturnType<typeof dbListPMCSubmissionsWithLatestNonDraftVersion>;
export type ResolvedListing = NonNullable<Awaited<ListingPromise>>;
