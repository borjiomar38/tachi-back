import { ManhwaChapterView } from '@/features/manhwa/schema';

export const isManhwaChapterComplete = (chapter: ManhwaChapterView) =>
  chapter.panels.length > 0 &&
  chapter.panels.every((panel) => Boolean(panel.imagePath));

export const isManhwaChapterPublic = (chapter: ManhwaChapterView) =>
  chapter.status === 'published' && isManhwaChapterComplete(chapter);
