export interface ManhwaCharacter {
  accent: string;
  ageLabel: string;
  canonPrompt: string;
  description: string;
  id: string;
  imagePath?: string;
  name: string;
  role: string;
}

export interface ManhwaPanel {
  alt: string;
  dialogue: string[];
  id: string;
  imagePath?: string;
  narration: string;
  prompt: string;
}

export interface ManhwaChapter {
  chapterNumber: number;
  excerpt: string;
  panels: ManhwaPanel[];
  publishedAt: string;
  readingMinutes: number;
  seasonNumber: number;
  slug: string;
  status: 'private' | 'published' | 'staging';
  title: string;
  updatedAt: string;
}

export interface ManhwaSeason {
  arc: string;
  chapterEnd: number;
  chapterStart: number;
  description: string;
  seasonNumber: number;
  title: string;
}

export interface ManhwaSeries {
  audienceNote: string;
  characters: ManhwaCharacter[];
  chapters: ManhwaChapter[];
  coverAlt: string;
  coverImagePath?: string;
  description: string;
  genres: string[];
  lastModified: string;
  seasons: ManhwaSeason[];
  slug: string;
  status: 'active' | 'planning';
  tagline: string;
  title: string;
  totalPlannedChapters: number;
}

export interface ManhwaReaderPanel {
  alt: string;
  dialogue?: string[];
  id: string;
  imagePath?: string;
  narration?: string;
}

export interface ManhwaReaderChapter extends Omit<ManhwaChapter, 'panels'> {
  panels: ManhwaReaderPanel[];
}

export interface ManhwaReaderSeries extends Omit<
  ManhwaSeries,
  'audienceNote' | 'characters' | 'chapters' | 'seasons'
> {
  audienceNote?: string;
  characters?: ManhwaCharacter[];
  chapters: ManhwaReaderChapter[];
  seasons?: ManhwaSeason[];
}

export type ManhwaChapterView = ManhwaChapter | ManhwaReaderChapter;

export type ManhwaPanelView = ManhwaPanel | ManhwaReaderPanel;

export type ManhwaSeriesView = ManhwaSeries | ManhwaReaderSeries;

export interface ManhwaSitemapEntry {
  lastModified: string;
  path: string;
}
