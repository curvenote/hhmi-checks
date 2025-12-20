import {
  fetchPreprintsCoveredByPolicy,
  fetchPreprintsNotCoveredByPolicy,
} from './airtable.preprints.server.js';
import {
  fetchPublicationsCoveredByPolicy,
  fetchPublicationsNotCoveredByPolicy,
} from './airtable.publications.server.js';

export async function fetchEverythingCoveredByPolicy(orcid: string) {
  return Promise.all([
    fetchPreprintsCoveredByPolicy(orcid),
    fetchPublicationsCoveredByPolicy(orcid),
  ]).then((AoA) => AoA.flat().sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0)));
}

export async function fetchEverythingNotCoveredByPolicy(orcid: string) {
  return Promise.all([
    fetchPreprintsNotCoveredByPolicy(orcid),
    fetchPublicationsNotCoveredByPolicy(orcid),
  ]).then((AoA) => AoA.flat().sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0)));
}
