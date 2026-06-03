import {
  ManhwaChapter,
  ManhwaReaderChapter,
  ManhwaReaderPanel,
  ManhwaReaderSeries,
  ManhwaSeries,
  ManhwaSeriesView,
  ManhwaSitemapEntry,
} from '@/features/manhwa/schema';
import {
  isManhwaChapterComplete,
  isManhwaChapterPublic,
} from '@/features/manhwa/visibility';

const theEclipseCrownChapterOne: ManhwaChapter = {
  chapterNumber: 1,
  excerpt:
    'On the morning of her execution, Elianor wakes three hours too early and hears her crown whisper from inside her blood.',
  panels: [
    {
      id: 'tec-001-001',
      alt: 'Elianor wakes in a prison cell beneath a view of the chained moon.',
      imagePath: '/api/manhwa-private/the-eclipse-crown/chapter/1/panel/1',
      narration: 'The moon was still chained when Elianor opened her eyes.',
      dialogue: [
        'Eclipse Crown: Wake, little sovereign. The blade is still three hours away.',
      ],
      prompt:
        'Tall vertical opening panel, prison ceiling dissolving into a barred view of the chained moon, Elianor Veyr lying on cold stone in torn white execution dress, bruised wrists, long black hair spread like ink, faint crown shape only reflected in one ash-gray eye, original dark royal fantasy manhwa, no readable text.',
    },
    {
      id: 'tec-001-002',
      alt: 'The Eclipse Crown appears only in the reflection of Elianor eye.',
      narration:
        'Memory returned as metal, crowd noise, and a smile from the throne.',
      dialogue: ['Elianor: I died.', 'Eclipse Crown: Briefly. Inefficiently.'],
      prompt:
        'Close-up of Elianor eye and trembling breath in cold air, silver glint in iris, black-silver thorn crown visible only in the wet reflection of her pupil, no physical crown seen by the room, prison darkness and moonlight bands.',
    },
    {
      id: 'tec-001-003',
      alt: 'Elianor pushes herself upright despite her chains.',
      narration: 'Terror asked her to kneel. Pride answered first.',
      dialogue: ['Elianor: Then I still have time.'],
      prompt:
        'Elianor pushing herself upright against stone wall, shoulders straight despite chains, torn white dress with faded silver embroidery, bruised wrists visible, moonlight crossing the floor like thin chains, no other characters.',
    },
    {
      id: 'tec-001-004',
      alt: 'An old crescent-over-sword seal sits among the execution writ marks.',
      narration:
        'Among the imperial seals was an older mark: a crescent over a sword, from a law the palace had tried to bury.',
      dialogue: [],
      prompt:
        "Insert atmosphere panel of the execution writ on the cell floor without readable text, wax seals abstract and blurred, one distinct non-readable broken crescent over a sword-shaped legal seal, Elianor's chained hand hovering near it, cold blue-gray moonlight.",
    },
    {
      id: 'tec-001-005',
      alt: 'Caelan wakes in his northern bedroom with his hand over an old heart scar.',
      narration: 'Far north of the scaffold, another death woke with her.',
      dialogue: ['Caelan: No. Not again.'],
      prompt:
        'Northern ducal bedroom before dawn, Caelan Rhovir jolting awake with bare hand pressed to old pale heart scar, thin scar crossing left eyebrow visible, winter-gray hair loose to jaw, dark teal eyes haunted, black gloves lying untouched on bedside table.',
    },
    {
      id: 'tec-001-006',
      alt: 'Caelan dresses for the execution plaza with controlled urgency.',
      narration:
        'He had arrived late once. His body remembered the cost before his mind finished screaming.',
      dialogue: [
        'Caelan: Saddle the black relay. Wake no herald who cannot lie.',
      ],
      prompt:
        'Caelan half-dressed in black high-collared ducal coat, fastening silver clasp, fur-lined cape thrown over shoulder, gloved hands now being pulled on, dawn snow outside window, urgency controlled rather than frantic.',
    },
    {
      id: 'tec-001-007',
      alt: 'The emperor, priestess, and prince prepare the public execution rite.',
      narration:
        'The rite needed fear. The emperor needed law. The prince needed distance.',
      dialogue: [
        "Maerith: Let every loyal heart witness the moon's correction.",
        'Varrien: A lawful death leaves no ghosts.',
        'Luceren: Then let it be lawful.',
      ],
      prompt:
        'Execution plaza from high angle, scaffold beneath chained moon, Maerith arranging dark glass beads and crescent-tattooed fingers, Emperor Varrien elevated in white-gold robes with ringed hands tense, Luceren in pale blue jacket smiling faintly but avoiding the blade, crowd below as indistinct witnesses.',
    },
    {
      id: 'tec-001-008',
      alt: 'Selene warns Elianor from the shadows as guards lead her to the plaza.',
      narration: 'A loyal face survived where Elianor had expected only stone.',
      dialogue: [
        'Selene: Your Highness... look left when the bell rings.',
        'Elianor: You should not be here.',
      ],
      prompt:
        'Narrow transition panel as guards lead Elianor through a shadowed corridor toward blinding plaza light, Selene partly hidden behind servants with chestnut bob and broken-crescent hairpin, quick warning glance, no readable signs.',
    },
    {
      id: 'tec-001-009',
      alt: 'Maerith offers Elianor a confession on the scaffold steps.',
      narration:
        'The priestess spoke softly because cruelty sounded cleaner that way.',
      dialogue: [
        'Maerith: Confess, child, and the crowd may remember you gently.',
        'Elianor: I will not make your fear holy.',
      ],
      prompt:
        'Medium vertical panel on scaffold steps, Maerith serene under silver-black veil offering prayer beads, Elianor upright with chained wrists and ash-gray eyes, crowd blurred behind them, moon-chain shadows falling over both women.',
    },
    {
      id: 'tec-001-010',
      alt: 'Elianor faces Emperor Varrien and refuses to kneel.',
      narration:
        'She saw the contradiction at last: a tyrant who could kill her only if the world agreed to call it justice.',
      dialogue: [
        'Varrien: Elianor Veyr, the empire offers one mercy: kneel.',
        'Elianor: The empire has mistaken kneeling for truth.',
      ],
      prompt:
        "Long scaffold panel, Elianor framed below imperial dais, Varrien's cold public smile with tense ringed fingers, Luceren watching from behind with lowered eyes, execution blade implied as shadow only, no gore.",
    },
    {
      id: 'tec-001-011',
      alt: 'The Eclipse Crown flares in the blade reflection as Elianor holds back its hunger.',
      narration:
        'The Crown opened its hunger like a second sky, and Elianor held the leash with both hands.',
      dialogue: [
        'Eclipse Crown: Let me eat.',
        'Elianor: Not all of it. Not me.',
      ],
      prompt:
        "Blade shadow crossing Elianor's throat without impact, eclipse darkness flaring around scaffold, black-silver Crown visible in the polished blade and Elianor's shadow but not on her head, Maerith's calm cracking for the first time, crowd silhouettes recoiling, elegant magical tension.",
    },
    {
      id: 'tec-001-012',
      alt: 'Caelan kneels below the scaffold and contests the verdict.',
      narration: 'The plaza forgot how to breathe.',
      dialogue: [
        'Caelan: I contest the verdict because Princess Elianor Veyr was murdered once already.',
      ],
      prompt:
        'Final cliffhanger panel, Caelan kneeling at base of scaffold beneath northern banner, black ducal coat and fur-lined cape, gloved hand over heart, eyebrow scar visible, Elianor above him stunned but upright, Varrien rigid on dais, Maerith beads frozen mid-prayer, chained moon looming overhead, no readable banners.',
    },
  ],
  publishedAt: '2026-06-02',
  readingMinutes: 8,
  seasonNumber: 1,
  slug: 'the-moon-is-chained',
  status: 'private',
  title: 'The Moon Is Chained',
  updatedAt: '2026-06-02',
};

export const manhwaSeries: ManhwaSeries[] = [
  {
    audienceNote:
      'Original Nayovi manhwa project with AI-assisted production, autonomous expert AI continuity review, and chapter manifests preserved for rights tracking.',
    characters: [
      {
        accent:
          'Moon-pale skin, black hair, ash-gray eyes, silver eclipse flare',
        ageLabel: 'Early twenties',
        canonPrompt:
          'Elianor Veyr, original Korean manhwa heroine, early twenties, tall slender fallen princess, moon-pale skin, long black hair with blue-black sheen, ash-gray eyes that turn silver only during eclipse magic, torn white execution dress with faded silver embroidery, bruised wrists, restrained sorrowful expression, never sexualized.',
        description:
          'A fallen princess who wakes before her lawful execution with the living Eclipse Crown whispering inside her blood.',
        id: 'elianor-veyr',
        name: 'Elianor Veyr',
        role: 'Fallen princess',
      },
      {
        accent: 'Winter gray, dark teal, black ducal coat, silver clasps',
        ageLabel: 'Late twenties',
        canonPrompt:
          'Caelan Rhovir, original Korean manhwa male lead, late twenties, tall broad-shouldered northern duke, winter-gray hair to jaw length, dark teal eyes, thin scar crossing left eyebrow, old pale scar over the heart from prior-timeline death, black high-collared ducal military coat, silver clasps, dark fur-lined cape.',
        description:
          'A northern duke who remembers arriving too late in another timeline and moves before the blade can fall again.',
        id: 'caelan-rhovir',
        name: 'Caelan Rhovir',
        role: 'Regressed northern duke',
      },
      {
        accent: 'Ancient silver, shadow violet, bone white',
        ageLabel: 'Ancient',
        canonPrompt:
          'The Eclipse Crown, original living magical crown, blackened silver lunar metal, crescent blade silhouette, fine chain filaments, faint dark halo, visible in reflection, shadow, polished metal, water, or blood sheen before full escalation.',
        description:
          'A living royal relic that can devour eclipse magic but always charges a cost in memory, pulse, shadow, oath, or trust.',
        id: 'eclipse-crown',
        name: 'The Eclipse Crown',
        role: 'Living relic',
      },
      {
        accent: 'White gold, tired amber, public smile, tense ringed hands',
        ageLabel: 'Late forties',
        canonPrompt:
          'Emperor Varrien Solm, refined golden-haired emperor, amber eyes with visible fatigue, white and gold imperial robes, sunburst collar, ringed hands, porcelain composure, cold public smile.',
        description:
          'The emperor needs Elianor condemned through public law because his coalition will fracture without lawful spectacle.',
        id: 'emperor-varrien-solm',
        name: 'Emperor Varrien Solm',
        role: 'Ruling emperor',
      },
      {
        accent: 'Pearl white, silver-black veil, dark glass beads',
        ageLabel: 'Ageless adult',
        canonPrompt:
          'Archpriestess Maerith, pearl-white hair under translucent silver-black veil, calm pale face, crescent tattoos on fingers, layered black and ivory temple robes, dark glass prayer beads.',
        description:
          'The keeper of the execution rite, limited by the need for lawful witnesses and public dread.',
        id: 'archpriestess-maerith',
        name: 'Archpriestess Maerith',
        role: 'Eclipse Temple priestess',
      },
      {
        accent: 'Chestnut hair, warm brown eyes, broken-crescent hairpin',
        ageLabel: 'Mid twenties',
        canonPrompt:
          'Selene Voss, petite palace maid, chestnut bob haircut, warm brown eyes, plain gray servant uniform, small silver broken-crescent hairpin, alert posture.',
        description:
          'Elianor surviving maid and covert palace informant, loyal enough to risk warning her at the scaffold.',
        id: 'selene-voss',
        name: 'Selene Voss',
        role: 'Palace informant',
      },
      {
        accent: 'Honey blond, violet-brown, pale blue court jacket',
        ageLabel: 'Mid twenties',
        canonPrompt:
          'Prince Luceren Solm, honey-blond hair, violet-brown eyes, elegant pale blue court jacket with silver trim, jeweled ceremonial sword, charming guarded smile.',
        description:
          'The imperial heir who wants Elianor silent but prefers distance from irreversible guilt.',
        id: 'prince-luceren-solm',
        name: 'Prince Luceren Solm',
        role: 'Imperial heir',
      },
      {
        accent: 'Indigo travel robes, white hair cord, moon-sword tassel',
        ageLabel: 'Thirties',
        canonPrompt:
          'Yun Seoryeon, composed moon-sword envoy, black hair tied with white cord, clear dark eyes, traveling robes under formal indigo overcoat, narrow moon-sword tassel at belt, sealed bamboo record tube.',
        description:
          'A foreign envoy from the eastern moon-sword Oath Halls who foreshadows the future pilgrimage arc.',
        id: 'envoy-yun-seoryeon',
        name: 'Yun Seoryeon',
        role: 'Moon-sword envoy',
      },
    ],
    chapters: [theEclipseCrownChapterOne],
    coverAlt:
      'Elianor Veyr stands under a chained moon with the living Eclipse Crown visible only in reflection.',
    description:
      'A condemned princess wakes before her execution and discovers her living crown can devour eclipse magic, while the duke who failed to save her in another timeline returns with memories of the empire hidden lunar curse.',
    genres: [
      'Royal fantasy',
      'Regression',
      'Dark court intrigue',
      'Eclipse magic',
    ],
    lastModified: '2026-06-02',
    seasons: [
      {
        arc: 'Elianor survives the execution, exposes the first false charge, and follows buried moon-sword law toward the origin of the chained moon.',
        chapterEnd: 30,
        chapterStart: 1,
        description:
          'A public execution reversal and court survival arc with legal witnesses, temple rites, and early moon-sword foreshadowing.',
        seasonNumber: 1,
        title: 'The Princess Before the Blade',
      },
      {
        arc: 'Caelan memories become unstable while the Crown hunger creates costs through memory, pulse, shadow, oath, and political legitimacy.',
        chapterEnd: 60,
        chapterStart: 31,
        description:
          'A duke-regression arc where saving Elianor changes the future and makes every remembered answer less reliable.',
        seasonNumber: 2,
        title: 'The Duke Who Remembered Winter',
      },
      {
        arc: 'Elianor enters the eastern moon-sword Oath Halls and discovers the first chain was forged by martial law, not palace myth.',
        chapterEnd: 90,
        chapterStart: 61,
        description:
          'A murim-inspired pilgrimage arc with original oath halls, moon-sword records, clan law, and a missing Moon-Severing Hilt.',
        seasonNumber: 3,
        title: 'The Moon-Sword Pilgrimage',
      },
      {
        arc: 'The moon chain opens around a dead royal ancestor, forcing Elianor to decide whether to free the moon, destroy the Crown, or limit the throne by law.',
        chapterEnd: 120,
        chapterStart: 91,
        description:
          'The final eclipse arc where the Crown eats the god it was made to contain and survival demands a non-mythic throne.',
        seasonNumber: 4,
        title: 'The Crown That Eats the Eclipse',
      },
    ],
    slug: 'the-eclipse-crown',
    status: 'active',
    tagline:
      'The moon is chained, the crown is hungry, and the princess who died once will not kneel twice.',
    title: 'THE ECLIPSE CROWN',
    totalPlannedChapters: 120,
  },
];

export const getManhwaSeries = () => manhwaSeries;

export { isManhwaChapterComplete, isManhwaChapterPublic };

export const getPublicManhwaChapters = (series: ManhwaSeries) =>
  series.chapters.filter(isManhwaChapterPublic);

const toReaderPanel = (
  panel: ManhwaChapter['panels'][number],
  options?: { includeDraftText?: boolean }
) => {
  const readerPanel: ManhwaReaderPanel = {
    alt: panel.alt,
    id: panel.id,
  };

  if (panel.imagePath) {
    readerPanel.imagePath = panel.imagePath;
  }

  if (options?.includeDraftText) {
    readerPanel.dialogue = panel.dialogue;
    readerPanel.narration = panel.narration;
  }

  return readerPanel;
};

const toReaderChapter = (
  chapter: ManhwaChapter,
  options?: { includeDraftText?: boolean }
): ManhwaReaderChapter => ({
  chapterNumber: chapter.chapterNumber,
  excerpt: chapter.excerpt,
  panels: chapter.panels.map((panel) => toReaderPanel(panel, options)),
  publishedAt: chapter.publishedAt,
  readingMinutes: chapter.readingMinutes,
  seasonNumber: chapter.seasonNumber,
  slug: chapter.slug,
  status: chapter.status,
  title: chapter.title,
  updatedAt: chapter.updatedAt,
});

const toReaderManhwaSeries = (
  series: ManhwaSeries,
  options?: {
    includeDraftText?: boolean;
    includePrivateChapters?: boolean;
  }
): ManhwaReaderSeries => {
  const chapters = (
    options?.includePrivateChapters
      ? series.chapters
      : getPublicManhwaChapters(series)
  ).map((chapter) => toReaderChapter(chapter, options));
  const publicCoverImagePath =
    chapters
      .flatMap((chapter) => chapter.panels)
      .find((panel) => panel.imagePath)?.imagePath ?? undefined;

  return {
    chapters,
    coverAlt: series.coverAlt,
    coverImagePath: publicCoverImagePath,
    description: series.description,
    genres: series.genres,
    lastModified: series.lastModified,
    slug: series.slug,
    status: series.status,
    tagline: series.tagline,
    title: series.title,
    totalPlannedChapters: series.totalPlannedChapters,
  };
};

export const getPublicManhwaSeries = () =>
  manhwaSeries
    .filter((series) => series.status === 'active')
    .map((series) => toReaderManhwaSeries(series))
    .filter((series) => series.chapters.length > 0);

export const getManhwaSeriesBySlug = (slug: string) =>
  manhwaSeries.find((series) => series.slug === slug);

export const getPrivateManhwaReaderSeries = () =>
  manhwaSeries
    .filter((series) => series.status === 'active')
    .map((series) =>
      toReaderManhwaSeries(series, {
        includeDraftText: true,
        includePrivateChapters: true,
      })
    );

export const getPrivateManhwaReaderSeriesBySlug = (slug: string) => {
  const series = getManhwaSeriesBySlug(slug);

  if (series?.status !== 'active') {
    return undefined;
  }

  return toReaderManhwaSeries(series, {
    includeDraftText: true,
    includePrivateChapters: true,
  });
};

export const getPublicManhwaSeriesBySlug = (slug: string) => {
  const series = getManhwaSeriesBySlug(slug);

  if (series?.status !== 'active') {
    return undefined;
  }

  const publicSeries = toReaderManhwaSeries(series);

  return publicSeries.chapters.length > 0 ? publicSeries : undefined;
};

export const getManhwaChapter = (
  series: ManhwaSeriesView,
  chapterNumber: number,
  options?: { includePrivate?: boolean }
) => {
  const chapter = series.chapters.find(
    (item) => item.chapterNumber === chapterNumber
  );

  if (!chapter || options?.includePrivate || isManhwaChapterPublic(chapter)) {
    return chapter;
  }

  return undefined;
};

export const getNextManhwaChapter = (
  series: ManhwaSeriesView,
  chapterNumber: number,
  options?: { includePrivate?: boolean }
) =>
  series.chapters.find((chapter) => {
    return (
      chapter.chapterNumber === chapterNumber + 1 &&
      (options?.includePrivate || isManhwaChapterPublic(chapter))
    );
  });

export const getPreviousManhwaChapter = (
  series: ManhwaSeriesView,
  chapterNumber: number,
  options?: { includePrivate?: boolean }
) =>
  series.chapters.find((chapter) => {
    return (
      chapter.chapterNumber === chapterNumber - 1 &&
      (options?.includePrivate || isManhwaChapterPublic(chapter))
    );
  });

export const getManhwaSitemapEntries = (): ManhwaSitemapEntry[] =>
  getPublicManhwaSeries().flatMap((series) => [
    {
      lastModified: series.lastModified,
      path: `/manhwa/${series.slug}`,
    },
    ...series.chapters.map((chapter) => ({
      lastModified: chapter.updatedAt,
      path: `/manhwa/${series.slug}/chapter/${chapter.chapterNumber}`,
    })),
  ]);
