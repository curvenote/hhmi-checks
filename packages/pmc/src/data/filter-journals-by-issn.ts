import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface JournalEntry {
  id: number;
  journalTitle: string;
  nlmta: string;
  pissn?: string;
  eissn?: string;
  startDate?: string;
  endDate?: string;
  isoAbbr?: string;
  nlmId?: string;
}

interface JournalList {
  source: string;
  date: string;
  items: JournalEntry[];
}

function filterJournalsByIssn(journalList: JournalList): JournalList {
  const filteredItems = journalList.items.filter((item) => {
    // Keep items that have either P-ISSN or E-ISSN
    return item.pissn || item.eissn;
  });

  return {
    ...journalList,
    items: filteredItems,
    date: new Date().toISOString(), // Update the date to reflect the filtering
  };
}

function main() {
  try {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    const inputFile = join(scriptDir, 'J_Entrez.json');
    const outputFile = join(scriptDir, 'J_Entrez_filtered.json');

    console.log(`Reading file: ${inputFile}`);
    const content = readFileSync(inputFile, 'utf8');
    const journalList: JournalList = JSON.parse(content);

    console.log(`Original entries: ${journalList.items.length}`);

    console.log('Filtering journals by ISSN...');
    const filteredJournalList = filterJournalsByIssn(journalList);

    console.log(`Filtered entries: ${filteredJournalList.items.length}`);
    console.log(
      `Removed ${journalList.items.length - filteredJournalList.items.length} entries without ISSN`,
    );

    console.log(`Writing filtered output to: ${outputFile}`);
    writeFileSync(outputFile, JSON.stringify(filteredJournalList, null, 2), 'utf8');

    // Also update the original file
    console.log(`Updating original file: ${inputFile}`);
    writeFileSync(inputFile, JSON.stringify(filteredJournalList, null, 2), 'utf8');

    console.log('Successfully filtered journal list!');
    console.log(`Final entries: ${filteredJournalList.items.length}`);
  } catch (error) {
    console.error('Error filtering journal list:', error);
    process.exit(1);
  }
}

// Run the script
main();
