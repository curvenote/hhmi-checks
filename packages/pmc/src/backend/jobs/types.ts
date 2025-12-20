export interface JournalInfo {
  id: number;
  journalTitle: string;
  nlmta: string;
  pissn?: string;
  eissn?: string;
  startDate: string;
  endDate?: string;
}

export interface JournalInfoFile {
  source: string;
  date: string;
  items: JournalInfo[];
}
