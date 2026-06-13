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

const publicManhwaPanelImagePath = (
  seriesSlug: string,
  chapterNumber: number,
  panelNumber: number
) => `/api/manhwa/${seriesSlug}/chapter/${chapterNumber}/panel/${panelNumber}`;

const withPublicPanelImagePaths = (
  seriesSlug: string,
  chapterNumber: number,
  panels: ManhwaChapter['panels']
): ManhwaChapter['panels'] =>
  panels.map((panel, index) => ({
    ...panel,
    imagePath: publicManhwaPanelImagePath(seriesSlug, chapterNumber, index + 1),
  }));

const theEclipseCrownChapterOne: ManhwaChapter = {
  chapterNumber: 1,
  excerpt:
    'On the morning of her execution, Elianor wakes three hours too early and hears her crown whisper from inside her blood.',
  panels: withPublicPanelImagePaths('the-eclipse-crown', 1, [
    {
      id: 'tec-001-001',
      alt: 'Elianor wakes in a prison cell beneath a view of the chained moon.',
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
  ]),
  publishedAt: '2026-06-06',
  readingMinutes: 8,
  seasonNumber: 1,
  slug: 'the-moon-is-chained',
  status: 'published',
  title: 'The Moon Is Chained',
  updatedAt: '2026-06-06',
};

const theEclipseCrownChapterTwo: ManhwaChapter = {
  chapterNumber: 2,
  excerpt:
    "Caelan's challenge stops the execution rhythm, but only Elianor can turn that interruption into law before the Crown in her blood chooses survival for her.",
  panels: withPublicPanelImagePaths('the-eclipse-crown', 2, [
    {
      id: 'tec-002-001',
      alt: 'Caelan stops the execution blade while Elianor lifts her head on the scaffold.',
      narration:
        "The duke's voice breaks the rhythm of death. Elianor refuses to let it become another chain.",
      dialogue: [
        'Caelan: Stop the blade. The witness hour is false.',
        'Elianor: Do not speak over me, Duke.',
      ],
      prompt:
        'Vertical panel artwork only, no rendered text or bubbles: wide execution scaffold beneath a chained moon, axe halted inches above the block, Elianor kneeling but lifting her head with bruised wrists visible, Caelan at the lower scaffold rail in black fur-lined ducal coat, imperial seating above with Varrien rigid and Maerith serene, crowd as indistinct silhouettes, strong downward moonlight and blood-red ceremonial cloth, no readable signage.',
    },
    {
      id: 'tec-002-002',
      alt: 'Elianor invokes the Moon Witness Clause as the Crown reflects in her eye.',
      narration: '',
      dialogue: [
        "Elianor: Under the chained moon, I invoke the Moon's Witness Clause.",
        'Eclipse Crown: At last, you choose a door with teeth.',
      ],
      prompt:
        "Vertical close-up artwork only, no rendered text or bubbles: Elianor's bruised mouth and ash-gray eyes in profile as she speaks, a thin blood line at her lower lip, the Eclipse Crown visible only as a dark crescent reflection in her tear-bright eye, blurred scaffold rope behind her, cold silver light, no inscriptions.",
    },
    {
      id: 'tec-002-003',
      alt: 'Orran opens the decree case while Maerith orders him to read the witness hour.',
      narration: 'Procedure answers only when someone dares to make it speak.',
      dialogue: [
        'Orran: The decree was sealed at the ninth imperial hour.',
        'Maerith: Read the witness hour as well, Scribe.',
      ],
      prompt:
        "Vertical panel artwork only, no rendered text or bubbles: Orran opens a black lacquer decree case, gloved fingers trembling over blank or obscured parchment, polished silver wax catching moonlight with a faint crown-like reflection, Maerith's veiled hand hovering near dark prayer beads, Varrien's ringed fingers tightening on a white-gold armrest in the background, no readable writing.",
    },
    {
      id: 'tec-002-004',
      alt: 'The temple bell rope snaps taut as the impossible witness hour is revealed.',
      narration:
        'The signed hour came before the ritual hour that made the execution lawful.',
      dialogue: [
        'Orran: Witness registration began at moonrise.',
        'Crowd: Before the moon had a shadow?',
        'Caelan: That is impossible in this season.',
      ],
      prompt:
        "Vertical panel artwork only, no rendered text or bubbles: the temple bell rope snaps taut, Orran recoils from the decree case, Luceren's guarded smile fades in the witness row, Caelan looks up sharply from below the platform, chained moonlight slicing across the scaffold boards, no readable documents or plaques.",
    },
    {
      id: 'tec-002-005',
      alt: 'Maerith presses a silver Purity Pin toward Elianor palm.',
      narration: '',
      dialogue: [
        'Maerith: A flaw delays the blade. It does not cleanse treason.',
        'Elianor: Then test the flaw in public.',
      ],
      prompt:
        "Vertical panel artwork only, no rendered text or bubbles: Maerith presses a slender silver Purity Pin toward Elianor's right palm, Elianor extends her hand without bowing, tiny blood bead forming, the Eclipse Crown appears only as a black-silver glint within the blood bead, crescent tattoos on Maerith's fingers shown as decorative marks without script, temple attendants blurred behind them.",
    },
    {
      id: 'tec-002-006',
      alt: 'Varrien argues from the imperial dais while Maerith answers beneath him.',
      narration:
        'The emperor can command armies. He cannot unring a witnessed bell.',
      dialogue: [
        'Varrien: The empire will not be ruled by a clerical hesitation.',
        'Maerith: Majesty, the bell answered before the crowd.',
      ],
      prompt:
        'Vertical panel artwork only, no rendered text or bubbles: Varrien seated high in white-and-gold robes, public smile frozen while his ringed hand digs into the armrest, Maerith below with calm lowered eyes, Luceren between them looking away from the decree case, crowd silhouettes staring upward, chained moonlight forming hard bars across imperial steps, no readable banners.',
    },
    {
      id: 'tec-002-007',
      alt: 'Selene signals from the east arch as Elianor remembers her mother song.',
      narration:
        "For one breath, the scaffold remembers a corridor, a mother's sleeve, and a song before politics had names.",
      dialogue: [
        'Selene: East arch. Still open.',
        'Elianor: Mother hummed there before every ceremony.',
      ],
      prompt:
        'Vertical panel artwork only, no rendered text or bubbles: emotional contrast after legal tension, Selene half-hidden by the east arch in a plain gray servant uniform, fingers touching a small broken-crescent hairpin and folded handkerchief signal, Elianor turns slightly from the scaffold with a softened expression despite blood on her palm, a brief warm lantern glow cutting through cold moonlight, no readable signs.',
    },
    {
      id: 'tec-002-008',
      alt: 'Orran announces a one bell cycle stay while Caelan blocks the imperial guard.',
      narration: 'A stay is not mercy. It is a deadline with witnesses.',
      dialogue: [
        'Orran: The sentence stands. The execution is stayed for one bell cycle.',
        'Elianor: Who holds custody?',
        'Caelan: Not the imperial guard.',
      ],
      prompt:
        "Vertical panel artwork only, no rendered text or bubbles: Orran raises one gloved hand with ritual dread, Maerith's dark beads loop like a boundary around the review dais, imperial guards hesitate at the scaffold steps, Caelan blocks one step with his shoulder without drawing a weapon, Elianor stands unsteadily with cut palm closed, no readable decree text.",
    },
    {
      id: 'tec-002-009',
      alt: 'Maerith marks temple custody as blood reflects a distant moon-sword hall.',
      narration:
        'Far beyond the capital, older laws wait in forms the empire stopped naming.',
      dialogue: [
        'Maerith: Until next moonrise, the temple reviews the polluted rite.',
        'Eclipse Crown: Old halls hear old blood.',
      ],
      prompt:
        "Vertical panel artwork only, no rendered text or bubbles: Maerith draws a chalkless ritual boundary with her beads around Elianor's feet, the blood drop on the scaffold stretches into a thin crescent shadow, inside the blood reflection appears a distant abstract silhouette of a moon-sword practice hall with curved training blades but no readable markings, Elianor notices only a flicker, subtle and not dominant.",
    },
    {
      id: 'tec-002-010',
      alt: 'Caelan and Elianor face each other on the scaffold steps without touching.',
      narration:
        'His past has already failed her. Her present has no room for borrowed chains.',
      dialogue: [
        'Caelan: In the winter I remember, no bell rang.',
        'Elianor: Then remember less loudly. I need the truth, not your grief.',
      ],
      prompt:
        'Vertical panel artwork only, no rendered text or bubbles: Caelan and Elianor face each other at different heights on the scaffold steps, his gloved hand stops short of touching her injured wrist, her cut palm held against her torn dress, winter teal shadow around him and moon-silver light around her, a faint curved-blade silhouette reflected in his dark glove buckle, no readable insignia.',
    },
    {
      id: 'tec-002-011',
      alt: 'Varrien, Maerith, and Luceren stand in separate tiers of power under the bell.',
      narration:
        'The stay divides them because each needs the same day for a different crime.',
      dialogue: [
        'Varrien: One day, Archpriestess. No more.',
        'Maerith: One day is enough for the moon to choose custody.',
        'Luceren: And enough for witnesses to remember they were seen.',
      ],
      prompt:
        'Vertical panel artwork only, no rendered text or bubbles: three-tier power composition, Varrien above in white-gold anger, Maerith centered in silver-black calm, Luceren lower and half-turned among witnesses, Orran clutching the black decree case, the temple bell looming behind them with no inscription, moon chains visible through mist.',
    },
    {
      id: 'tec-002-012',
      alt: 'Blood on the scaffold reflects the Eclipse Crown above Elianor bare brow.',
      narration:
        'Elianor searches for the lullaby her mother hummed at the east arch. The shape of it is there. The sound is gone.',
      dialogue: ['Eclipse Crown: Paid.'],
      prompt:
        "Vertical cliffhanger artwork only, no rendered text or bubbles: close view of scaffold blood spreading between floorboards, Elianor's bare or slippered feet at the edge, her right palm dripping one more bead, the blood reflection shows the black-silver Eclipse Crown hovering above her bare brow while her actual head has no crown, a faint warm memory glow dissolving into silver static, chained moon reflected in the blood, no readable text.",
    },
  ]),
  publishedAt: '2026-06-13',
  readingMinutes: 8,
  seasonNumber: 1,
  slug: 'the-blood-that-answered',
  status: 'published',
  title: 'The Blood That Answered',
  updatedAt: '2026-06-13',
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
    chapters: [theEclipseCrownChapterOne, theEclipseCrownChapterTwo],
    coverAlt:
      'Elianor Veyr stands under a chained moon with the living Eclipse Crown visible only in reflection.',
    coverImagePath: '/api/manhwa/the-eclipse-crown/poster',
    description:
      'A condemned princess wakes before her execution and discovers her living crown can devour eclipse magic, while the duke who failed to save her in another timeline returns with memories of the empire hidden lunar curse.',
    genres: [
      'Royal fantasy',
      'Regression',
      'Dark court intrigue',
      'Eclipse magic',
    ],
    lastModified: '2026-06-13',
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
    series.coverImagePath ??
    chapters
      .flatMap((chapter) => chapter.panels)
      .find((panel) => panel.imagePath)?.imagePath ??
    undefined;

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
