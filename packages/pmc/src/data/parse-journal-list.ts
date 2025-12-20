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

function parseJournalEntries(content: string): JournalEntry[] {
  const entries: JournalEntry[] = [];

  // Split by the separator line (dashes)
  const entryBlocks = content.split(/-{10,}/);

  for (const block of entryBlocks) {
    if (!block.trim()) continue;

    const lines = block.trim().split('\n');
    const entry: Partial<JournalEntry> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      switch (key) {
        case 'JrId':
          entry.id = parseInt(value, 10);
          break;
        case 'JournalTitle':
          entry.journalTitle = value;
          break;
        case 'MedAbbr':
          entry.nlmta = value;
          break;
        case 'ISSN (Print)':
          if (value) entry.pissn = value;
          break;
        case 'ISSN (Online)':
          if (value) entry.eissn = value;
          break;
        case 'IsoAbbr':
          entry.isoAbbr = value;
          break;
        case 'NlmId':
          entry.nlmId = value;
          break;
      }
    }

    // Only add entries that have required fields AND at least one ISSN
    if (entry.id && entry.journalTitle && entry.nlmta && (entry.pissn || entry.eissn)) {
      entries.push(entry as JournalEntry);
    }
  }

  return entries;
}

function main() {
  try {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    const inputFile = join(scriptDir, 'J_Entrez.txt');
    const outputFile = join(scriptDir, 'J_Entrez.json');

    console.log(`Reading file: ${inputFile}`);
    const content = readFileSync(inputFile, 'utf8');

    console.log('Parsing journal entries...');
    const entries = parseJournalEntries(content);

    console.log(`Found ${entries.length} journal entries`);

    const journalList: JournalList = {
      source: 'https://ftp.ncbi.nih.gov/pubmed/J_Entrez.txt',
      date: new Date().toISOString(),
      items: entries,
    };

    console.log(`Writing output to: ${outputFile}`);
    writeFileSync(outputFile, JSON.stringify(journalList, null, 2), 'utf8');

    console.log('Successfully parsed and converted journal list!');
    console.log(`Total entries: ${entries.length}`);
  } catch (error) {
    console.error('Error processing journal list:', error);
    process.exit(1);
  }
}

// Run the script
main();
