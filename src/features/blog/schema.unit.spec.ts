import { describe, expect, it } from 'vitest';

import {
  isEditorialBlogArticleBody,
  zBlogArticleBody,
} from '@/features/blog/schema';

const legacyBody = {
  disclaimer:
    'Nayovi does not host manga, manhwa, or manhua chapters. Readers should respect official releases and rights holders.',
  downloadCallout: {
    body: 'Use the official Nayovi download path for a consistent Android reading and translation workflow with content you can legally access.',
    buttonLabel: 'Download Nayovi',
    title: 'Download Nayovi for Android',
  },
  faqs: [
    {
      answer:
        'This is the first legacy FAQ answer, retained so existing articles continue to parse and render exactly as they did before the editorial update.',
      question: 'First legacy article question?',
    },
    {
      answer:
        'This is the second legacy FAQ answer, retained so the compatibility schema accepts historical article bodies without rewriting stored records.',
      question: 'Second legacy article question?',
    },
    {
      answer:
        'This is the third legacy FAQ answer, retained only for old blog content and not injected into the new simplified article format.',
      question: 'Third legacy article question?',
    },
  ],
  introduction:
    'This legacy introduction represents an article that already exists in the database. It must keep parsing even though all newly generated articles now use a simpler versioned body.',
  readingProfile: {
    bestFor:
      'Readers who previously used the legacy article layout and expect the stored reading profile to remain available.',
    pacing:
      'A legacy pacing description that remains untouched for compatibility.',
    tone: 'A legacy tone description that remains untouched for compatibility.',
  },
  sections: [
    {
      body: 'This first legacy section keeps the original body and takeaway structure so existing database records remain readable after the new editorial schema is introduced.',
      heading: 'First legacy section',
      takeaways: ['First retained takeaway', 'Second retained takeaway'],
    },
    {
      body: 'This second legacy section confirms that older articles do not need a migration, rewrite, or FAQ removal when future articles adopt their simpler versioned structure.',
      heading: 'Second legacy section',
      takeaways: ['Third retained takeaway', 'Fourth retained takeaway'],
    },
    {
      body: 'This third legacy section completes the historical shape and verifies that compatibility is explicit rather than relying on permissive parsing or silent data loss.',
      heading: 'Third legacy section',
      takeaways: ['Fifth retained takeaway', 'Sixth retained takeaway'],
    },
  ],
};

describe('blog article body compatibility', () => {
  it('keeps parsing old article bodies without converting them', () => {
    const parsed = zBlogArticleBody.parse(legacyBody);

    expect(isEditorialBlogArticleBody(parsed)).toBe(false);
    expect(parsed.faqs).toHaveLength(3);
  });
});
