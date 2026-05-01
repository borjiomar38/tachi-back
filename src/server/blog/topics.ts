export interface BlogGenerationTopic {
  angle: string;
  manhwaTitle: string;
  manhwaType: 'manhua' | 'manhwa';
  searchIntent: string;
}

export const blogGenerationTopics: BlogGenerationTopic[] = [
  {
    angle:
      'Explain why action-regression fans search for Solo Leveling-style pacing and how a translation workflow helps with fast vertical chapters.',
    manhwaTitle: 'Solo Leveling',
    manhwaType: 'manhwa',
    searchIntent: 'solo leveling manhwa translation app',
  },
  {
    angle:
      'Frame Omniscient Reader as a dense story where clean OCR matters because system windows, narration, and dialogue often overlap.',
    manhwaTitle: 'Omniscient Reader',
    manhwaType: 'manhwa',
    searchIntent: 'omniscient reader manhwa reader translation',
  },
  {
    angle:
      'Cover why Return of the Mount Hua Sect appeals to martial arts readers and how translated terminology should stay consistent.',
    manhwaTitle: 'Return of the Mount Hua Sect',
    manhwaType: 'manhwa',
    searchIntent: 'murim manhwa translation reader',
  },
  {
    angle:
      'Position The Beginning After the End for fantasy readers who want readable chapter flow across long dialogue-heavy scenes.',
    manhwaTitle: 'The Beginning After the End',
    manhwaType: 'manhwa',
    searchIntent: 'fantasy manhwa translation app',
  },
  {
    angle:
      'Use Tower of God as a case study for long-running webtoon arcs where readers need stable glossary choices and clean text detection.',
    manhwaTitle: 'Tower of God',
    manhwaType: 'manhwa',
    searchIntent: 'tower of god manhwa reader translation',
  },
  {
    angle:
      'Explain why manhua readers searching for cultivation stories need careful name, realm, and technique consistency.',
    manhwaTitle: 'Battle Through the Heavens',
    manhwaType: 'manhua',
    searchIntent: 'cultivation manhua translation reader',
  },
  {
    angle:
      'Compare modern dungeon manhwa expectations with the practical need for quick OCR and concise speech-bubble translation.',
    manhwaTitle: 'Second Life Ranker',
    manhwaType: 'manhwa',
    searchIntent: 'dungeon manhwa translation app',
  },
  {
    angle:
      'Focus on romance-fantasy manhwa where tone, honorifics, and dramatic pauses matter more than literal translation.',
    manhwaTitle: 'Who Made Me a Princess',
    manhwaType: 'manhwa',
    searchIntent: 'romance fantasy manhwa translation',
  },
];
