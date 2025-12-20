import { type LoaderFunctionArgs } from 'react-router';
import { searchNIHJournals } from '../backend/services/nih-journal.server.js';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query || query.length < 3) {
    return { journals: [] };
  }

  try {
    const results = await searchNIHJournals(query, 20); // Limit to 20 results for performance

    // Transform results to match the ComboBox expected format
    const journals = results.map((journal) => ({
      id: journal.id,
      journalTitle: journal.journalTitle,
      pissn: journal.pissn,
      eissn: journal.eissn,
    }));

    return { journals };
  } catch (error) {
    console.error('Journal search error:', error);
    return { journals: [] };
  }
};
