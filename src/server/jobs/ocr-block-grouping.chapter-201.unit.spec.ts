import { describe, expect, it } from 'vitest';

import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

import {
  coalesceOcrLineBlocks,
  coalesceOcrPageContinuations,
} from './ocr-block-grouping';

type OcrBlock = NormalizedOcrPage['blocks'][number];

type Chapter201GroupingCase = {
  blocks: OcrBlock[];
  expectedSameBubbleGroups: number[][];
  pageKey: string;
  screenshotPage: string;
};

type Chapter201CrossPageCase = {
  expectedMergedText: string;
  nextBlocks: OcrBlock[];
  nextPageKey: string;
  previousBlocks: OcrBlock[];
  previousPageKey: string;
  screenshotPage: string;
};

describe('OCR block grouping chapter 201 regressions', () => {
  it.each(getChapter201GroupingCases())(
    'keeps same-bubble fragments together for $pageKey from reader screenshot $screenshotPage',
    ({ blocks, expectedSameBubbleGroups }) => {
      const result = coalesceOcrLineBlocks(buildOcrPage(blocks));

      const missingGroups = expectedSameBubbleGroups.filter(
        (group) =>
          !result.blocks.some((mergedBlock) =>
            group.every((index) =>
              normalizeOcrText(mergedBlock.text).includes(
                normalizeOcrText(blocks[index]?.text ?? '')
              )
            )
          )
      );

      expect(missingGroups).toEqual([]);
    }
  );

  it.each(getChapter201CrossPageCases())(
    'keeps cross-page continuation together for $previousPageKey -> $nextPageKey from reader screenshot $screenshotPage',
    ({
      expectedMergedText,
      nextBlocks,
      nextPageKey,
      previousBlocks,
      previousPageKey,
    }) => {
      const result = coalesceOcrPageContinuations([
        {
          fileName: previousPageKey,
          ocrPage: buildOcrPage(previousBlocks),
        },
        {
          fileName: nextPageKey,
          ocrPage: buildOcrPage(nextBlocks),
        },
      ]);

      const allTexts = result.flatMap((page) =>
        page.ocrPage.blocks.map((item) => normalizeOcrText(item.text))
      );

      expect(allTexts).toContain(normalizeOcrText(expectedMergedText));
      expect(allTexts).not.toContain(
        normalizeOcrText(previousBlocks.at(-1)?.text ?? '')
      );
      expect(allTexts).not.toContain(
        normalizeOcrText(nextBlocks[0]?.text ?? '')
      );
    }
  );
});

function getChapter201GroupingCases(): Chapter201GroupingCase[] {
  return [
    {
      pageKey: '002__002.jpg',
      screenshotPage: '3/55',
      blocks: [
        block({
          height: 91,
          symHeight: 22.171875,
          symWidth: 17.21875,
          text: '" DO  NOT  WORRY . THIS  SILVER  NEEDLE  IS NOT  SO  SIMPLE . "',
          width: 256,
          x: 75,
          y: 164,
        }),
        block({
          height: 85,
          symHeight: 24.5,
          symWidth: 18.1,
          text: '" AND  I TASTED  THE  TEA PERSONALLY',
          width: 237,
          x: 234,
          y: 338,
        }),
        block({
          height: 23,
          symHeight: 23,
          symWidth: 18.083333333333332,
          text: 'FIRST ,  SO ... "',
          width: 186,
          x: 260,
          y: 433,
        }),
        block({
          height: 72,
          symHeight: 24.5,
          symWidth: 18.333333333333332,
          text: '" THAT  IS  NOT WHAT  I  MEANT . "',
          width: 183,
          x: 451,
          y: 1169,
        }),
        block({
          height: 135,
          symHeight: 22.5,
          symWidth: 17.27777777777778,
          text: '" WEREN\'T YOU  IN  DANGER , MY  LADY ? "',
          width: 195,
          x: 105,
          y: 1797,
        }),
      ],
      expectedSameBubbleGroups: [[1, 2]],
    },
    {
      pageKey: '006__001.jpg',
      screenshotPage: '11/55',
      blocks: [
        block({
          height: 19,
          symHeight: 19,
          symWidth: 13.416666666666666,
          text: '" SURELY  NOT . "',
          width: 160,
          x: 500,
          y: 671,
        }),
        block({
          height: 119,
          symHeight: 22.5,
          symWidth: 18.928571428571427,
          text: '" HAVE  YOU FORGOTTEN ?  I KNOW  WHO  YOU ARE . "',
          width: 235,
          x: 80,
          y: 1250,
        }),
        block({
          height: 77,
          symHeight: 20,
          symWidth: 12.93939393939394,
          text: 'REMEMBER " I VERY  CLEARLY  HOW  SHIN SEUNG  AND  THE',
          width: 254,
          x: 117,
          y: 2338,
        }),
        block({
          height: 47,
          symHeight: 19.5,
          symWidth: 14.538461538461538,
          text: 'SWORD SAINT  TREATED  YOU , "',
          width: 229,
          x: 136,
          y: 2395,
        }),
      ],
      expectedSameBubbleGroups: [[2, 3]],
    },
    {
      pageKey: '006__002.jpg',
      screenshotPage: '11/55',
      blocks: [
        block({
          height: 149,
          symHeight: 22.285714285714285,
          symWidth: 16.693877551020407,
          text: '" AND  HOW THE  IRON - BLOODED DEATH  KING  AND  MY GRANDFATHER  SPOKE OF  YOU . "',
          width: 318,
          x: 258,
          y: 52,
        }),
        block({
          height: 49,
          symHeight: 20,
          symWidth: 13.933333333333334,
          text: '" I  EVEN SAW WITH  MY  OWN',
          width: 191,
          x: 133,
          y: 754,
        }),
        block({
          height: 20,
          symHeight: 20,
          symWidth: 12.4,
          text: 'EYES',
          width: 62,
          x: 303,
          y: 783,
        }),
        block({
          height: 20,
          symHeight: 20,
          symWidth: 14.571428571428571,
          text: 'HOW  YOU  BROKE',
          width: 204,
          x: 88,
          y: 812,
        }),
        block({
          height: 136,
          symHeight: 22,
          symWidth: 16.863636363636363,
          text: 'THROUGH GRANDFATHER\'S  TWELVE CRIMSON  ORCHID  LEAVES  AND HEAVENLY  FRAGRANCE NEEDLES . "',
          width: 354,
          x: 73,
          y: 812,
        }),
        block({
          height: 117,
          symHeight: 21.75,
          symWidth: 17.066666666666666,
          text: '" AND  YET  YOU STILL  THINK  THESE ARE  JUST  POLITE WORDS ? "',
          width: 268,
          x: 361,
          y: 1605,
        }),
        block({
          height: 118,
          symHeight: 21.25,
          symWidth: 17.34090909090909,
          text: '" I  ALSO  KNOW VERY  WELL  WHAT  YOU  DID ON  THE  DAY  THE  MURIM ALLIANCE  FELL . "',
          width: 377,
          x: 165,
          y: 2325,
        }),
      ],
      expectedSameBubbleGroups: [[1, 2, 3, 4]],
    },
    {
      pageKey: '009__002.jpg',
      screenshotPage: '18/55',
      blocks: [
        block({
          height: 81,
          symHeight: 20,
          symWidth: 16.41176470588235,
          text: '" LET  US  MOVE ON  TO  THE  MAIN  TOPIC . MY  PROPOSAL',
          width: 297,
          x: 70,
          y: 315,
        }),
        block({
          height: 19,
          symHeight: 19,
          symWidth: 16,
          text: 'IS  VERY',
          width: 99,
          x: 267,
          y: 377,
        }),
        block({
          height: 21,
          symHeight: 20,
          symWidth: 14.125,
          text: 'SIMPLE . "',
          width: 109,
          x: 163,
          y: 405,
        }),
        block({
          height: 95,
          symHeight: 24.466666666666665,
          symWidth: 18.64864864864865,
          text: '" IF  YOU  GIVE  ME WHAT  I  WANT ,  I  WILL  GIVE YOU  WHAT  YOU  WANT . "',
          width: 388,
          x: 259,
          y: 1305,
        }),
        block({
          height: 92,
          symHeight: 23.333333333333332,
          symWidth: 18.904761904761905,
          text: '" DO  YOU  KNOW WHAT  IT  IS  THAT  I WANT ? "',
          width: 264,
          x: 72,
          y: 2023,
        }),
      ],
      expectedSameBubbleGroups: [[0, 1, 2]],
    },
    {
      pageKey: '010__002.jpg',
      screenshotPage: '20/55',
      blocks: [
        block({
          height: 20,
          symHeight: 20,
          symWidth: 13.23076923076923,
          text: '" THAT  IS  TRUE . "',
          width: 186,
          x: 163,
          y: 34,
        }),
        block({
          height: 149,
          symHeight: 22.2,
          symWidth: 18.033333333333335,
          text: '" BUT  WHAT  ONE CAN  DO  AND  WHAT ONE  ACTUALLY  DOES ARE  VERY  DIFFERENT MATTERS . "',
          width: 310,
          x: 244,
          y: 156,
        }),
        block({
          height: 23,
          symHeight: 23,
          symWidth: 18.35,
          text: '" JUST AS',
          width: 130,
          x: 423,
          y: 1066,
        }),
        block({
          height: 22,
          symHeight: 22,
          symWidth: 18.375,
          text: 'EVERYONE',
          width: 152,
          x: 353,
          y: 1098,
        }),
        block({
          height: 150,
          symHeight: 22.8,
          symWidth: 18.535714285714285,
          text: 'KNOWS WHAT  IS  RIGHT ,  BUT VERY  FEW  ACTUALLY DO  WHAT  IS RIGHT . "',
          width: 300,
          x: 338,
          y: 1098,
        }),
        block({
          height: 149,
          symHeight: 22.8,
          symWidth: 16.8,
          text: '" IN  OTHER  WORDS , YOU  MEAN  THAT  WHILE  IT  MAY BE  POSSIBLE  IN  THEORY ,  YOU HAVE  NO  INTENTION  OF DOING  IT . "',
          width: 421,
          x: 253,
          y: 1826,
        }),
      ],
      expectedSameBubbleGroups: [[2, 3, 4]],
    },
    {
      pageKey: '011__002.jpg',
      screenshotPage: '22/55',
      blocks: [
        block({
          height: 94,
          symHeight: 24,
          symWidth: 19.416666666666668,
          text: '" A  VAGUE  SAYING , BUT  I  UNDERSTAND YOUR  MEANING . "',
          width: 303,
          x: 140,
          y: 624,
        }),
        block({
          height: 119,
          symHeight: 22.5,
          symWidth: 17.46153846153846,
          text: '" IN  SHORT , YOU  WANT  ME  TO STAND  ON  YOUR SIDE . "',
          width: 250,
          x: 316,
          y: 820,
        }),
        block({
          height: 112,
          symHeight: 21,
          symWidth: 16.928571428571427,
          text: '" I  AM  SAYING  WE SHOULD  BE  THE  SAME TREE ,  EVEN  IF  WE GROW  IN',
          width: 289,
          x: 209,
          y: 1487,
        }),
        block({
          height: 52,
          symHeight: 21,
          symWidth: 15.263157894736842,
          text: 'DIFFERENT DIRECTIONS . "',
          width: 221,
          x: 268,
          y: 1578,
        }),
      ],
      expectedSameBubbleGroups: [[2, 3]],
    },
    {
      pageKey: '012__001.jpg',
      screenshotPage: '23/55',
      blocks: [
        block({
          height: 147,
          symHeight: 22.1875,
          symWidth: 15.125,
          text: '" I  LIKE  THAT . WHILE  WE\'RE  AT  IT ,  WHY NOT  BE  INTERTWINED  LIKE YEONRIJI - TWO  TREES  GROWN TOGETHER  AS  ONE ? "',
          width: 369,
          x: 54,
          y: 359,
        }),
        block({
          height: 161,
          symHeight: 20.166666666666668,
          symWidth: 15.340909090909092,
          text: '" YOU  AS  THE PLENIPOTENTIARY  ENVOY , AND  I  AS  THE  TAEPYEONG ALLIANCE\'S  CHIEF  EXTERNAL STRATEGIST ,  TOGETHER AS  ONE . "',
          width: 355,
          x: 310,
          y: 1292,
        }),
        block({
          height: 22,
          symHeight: 22,
          symWidth: 20.166666666666668,
          text: '" DO  YOU',
          width: 129,
          x: 322,
          y: 2019,
        }),
        block({
          height: 149,
          symHeight: 21.985294117647058,
          symWidth: 18.358490566037737,
          text: 'NOT ALREADY  HAVE SOMEONE  ELSE  IN YOUR  HEART ,  MY LADY ? "',
          width: 270,
          x: 287,
          y: 2019,
        }),
        block({
          height: 67,
          symHeight: 19.666666666666668,
          symWidth: 23,
          text: '000',
          width: 24,
          x: 145,
          y: 2363,
        }),
      ],
      expectedSameBubbleGroups: [[2, 3]],
    },
    {
      pageKey: '015__002.jpg',
      screenshotPage: '30/55',
      blocks: [
        block({
          height: 98,
          symHeight: 68.25,
          symWidth: 61,
          text: 'KOREAN_SFX_1',
          width: 205,
          x: 262,
          y: 103,
        }),
        block({
          height: 81,
          symHeight: 73.5,
          symWidth: 71.5,
          text: 'KOREAN_SFX_2',
          width: 118,
          x: 543,
          y: 284,
        }),
        block({
          height: 46,
          symHeight: 19,
          symWidth: 14.125,
          text: '" IF  YOU  CONSIDER THE  POWER  STRUGGLES',
          width: 269,
          x: 270,
          y: 726,
        }),
        block({
          height: 151,
          symHeight: 18.5,
          symWidth: 14.28,
          text: 'THAT OCCURRED  WITHIN  THE  MURIM  ALLIANCE , YOU  COULD  SAY  THE  FOUNDING  OF  THE TAEPYEONG  ALLIANCE  WAS  BOUND  TO HAPPEN  SOONER  OR LATER  ANYWAY . "',
          width: 433,
          x: 220,
          y: 753,
        }),
        block({
          height: 150,
          symHeight: 21.58,
          symWidth: 17.88,
          text: '" YES ,  OF COURSE  THOUGH  IT COULD  NOT  HAVE HAPPENED  WITHOUT THE  TANG  CLAN . "',
          width: 292,
          x: 119,
          y: 1468,
        }),
        block({
          height: 169,
          symHeight: 21.25,
          symWidth: 15.04,
          text: "\" AS  YOU  SAY , WITHOUT  OUR  TANG  CLAN , WHICH  DESERVES  TO  BE  CALLED THE  ' WORLD'S  GREATEST  SECT , ' IT  WOULD  HAVE  BEEN IMPOSSIBLE . \"",
          width: 394,
          x: 242,
          y: 1723,
        }),
      ],
      expectedSameBubbleGroups: [[2, 3]],
    },
    {
      pageKey: '016__001.jpg',
      screenshotPage: '31/55',
      blocks: [
        block({
          height: 27,
          symHeight: 27,
          symWidth: 17.44,
          text: '" INDEED . "',
          width: 160,
          x: 482,
          y: 89,
        }),
        block({
          height: 171,
          symHeight: 21.11,
          symWidth: 15.26,
          text: '" BUT  WHEN  I LOOK  AT  YOUR  ACTIONS ,  MY  LADY , THE  TANG  CLAN\'S  MOVES  DURING  THE HANGZHOU  MASSACRE ,  AND  THE  FACT THAT  MOON  WANG  SOUGHT  OUT  THE POISON  IMMORTAL ... "',
          width: 449,
          x: 47,
          y: 710,
        }),
        block({
          height: 159,
          symHeight: 19.17,
          symWidth: 15.7,
          text: '" I  CANNOT  HELP BUT  WONDER  WHETHER SOME  FORM  OF  UNDERSTANDING HAD  ALREADY  BEEN  REACHED BETWEEN  MOON  WANG  AND THETANG',
          width: 408,
          x: 73,
          y: 1707,
        }),
        block({
          height: 20,
          symHeight: 20,
          symWidth: 13.67,
          text: 'CLAN . "',
          width: 77,
          x: 300,
          y: 1846,
        }),
        block({
          height: 86,
          symHeight: 21.67,
          symWidth: 16.51,
          text: '" FOR  EXAMPLE , ABOUT  ESTABLISHING THE  TAEPYEONG',
          width: 317,
          x: 266,
          y: 1995,
        }),
        block({
          height: 84,
          symHeight: 22,
          symWidth: 16.58,
          text: 'ALLIANCE AFTER  THE  MURIM  ALLIANCE , AND  SO  ON . "',
          width: 367,
          x: 255,
          y: 2059,
        }),
      ],
      expectedSameBubbleGroups: [
        [2, 3],
        [4, 5],
      ],
    },
    {
      pageKey: '016__002.jpg',
      screenshotPage: '32/55',
      blocks: [
        block({
          height: 170,
          symHeight: 21.1,
          symWidth: 15.63,
          text: '" HEHE ,  I\'M  IMPRESSED YOU  CAN  EVEN  SEE  IT  THAT WAY ,  BUT  IN  THE  END  THAT  IS STILL  A  BIASED  CONCLUSION BASED  ON  CONJECTURE  AND ASSUMPTION . "',
          width: 363,
          x: 79,
          y: 230,
        }),
        block({
          height: 91,
          symHeight: 88.75,
          symWidth: 57.25,
          text: 'TEZO',
          width: 133,
          x: 75,
          y: 599,
        }),
        block({
          height: 72,
          symHeight: 67.75,
          symWidth: 50.25,
          text: 'TEZI',
          width: 128,
          x: 483,
          y: 629,
        }),
        block({
          height: 78,
          symHeight: 20,
          symWidth: 14.56,
          text: '" AND  EVEN  IF IT  WERE  TRUE ,  WHAT DIFFERENCE',
          width: 253,
          x: 371,
          y: 1696,
        }),
        block({
          height: 49,
          symHeight: 20,
          symWidth: 16.09,
          text: 'WOULD IT  MAKE ? "',
          width: 180,
          x: 439,
          y: 1755,
        }),
        block({
          height: 23,
          symHeight: 21,
          symWidth: 14.17,
          text: '" RIGHT',
          width: 87,
          x: 332,
          y: 2458,
        }),
        block({
          height: 40,
          symHeight: 20.5,
          symWidth: 16.52,
          text: 'NOW , THE  WORLD  ALREADY',
          width: 273,
          x: 275,
          y: 2460,
        }),
      ],
      expectedSameBubbleGroups: [
        [3, 4],
        [5, 6],
      ],
    },
    {
      pageKey: '018__002.jpg',
      screenshotPage: '36/55',
      blocks: [
        block({
          height: 131,
          symHeight: 19.8,
          symWidth: 16.88,
          text: '" CAN  YOU  HANDLE HWANGCHEONDAE ,  THE GROUP  THAT  SEALED THE  NAMGOONG  CLAN\'S GATES ? "',
          width: 319,
          x: 85,
          y: 534,
        }),
        block({
          height: 125,
          symHeight: 19,
          symWidth: 15,
          text: '" CAN  YOU  DEFEAT  BLACK  SPEAR CAVALRY  AND  SHORT  BOW  CORPS , WHO  BURNED  DOWN  THE  GONGSUN CLAN  AND  DROVE  THE  BLACK  PATH SOCIETY  TO  ANNIHILATION ? "',
          width: 404,
          x: 212,
          y: 811,
        }),
        block({
          height: 21,
          symHeight: 19,
          symWidth: 14.78,
          text: 'COURSE ,  IF',
          width: 139,
          x: 398,
          y: 1759,
        }),
        block({
          height: 218,
          symHeight: 20.13,
          symWidth: 15.71,
          text: '" OF YOU  MOBILIZE  A  HUNDRED THOUSAND  IMPERIAL  TROOPS ,  IT WOULD  NOT  BE  HARD  TO  DEAL  WITH THE  DARK  HEAVEN  EMPEROR ,  THE IRON - BLOODED  DEATH  KING ,  THE THREE  GRAND  ELDERS ,  AND  EVEN MOON  WANG  HIMSELF . "',
          width: 453,
          x: 213,
          y: 1760,
        }),
      ],
      expectedSameBubbleGroups: [[2, 3]],
    },
    {
      pageKey: '020__002.jpg',
      screenshotPage: '39/55',
      blocks: [
        block({
          height: 49,
          symHeight: 20,
          symWidth: 15,
          text: '" THAT ,  I CANNOT  DO . "',
          width: 189,
          x: 430,
          y: 0,
        }),
        block({
          height: 82,
          symHeight: 20.75,
          symWidth: 15.2,
          text: '" ARE  YOU SAYING  YOU  CANNOT WAIT  EVEN',
          width: 282,
          x: 54,
          y: 63,
        }),
        block({
          height: 52,
          symHeight: 20.5,
          symWidth: 15.7,
          text: 'THREE YEARS ? "',
          width: 176,
          x: 136,
          y: 122,
        }),
        block({
          height: 72,
          symHeight: 67.75,
          symWidth: 50.25,
          text: 'Tezzo 7320',
          width: 322,
          x: 351,
          y: 424,
        }),
        block({
          height: 54,
          symHeight: 20,
          symWidth: 15.5,
          text: '" THAT  IS  NOT PATIENCE . "',
          width: 186,
          x: 353,
          y: 826,
        }),
        block({
          height: 78,
          symHeight: 22,
          symWidth: 15.8,
          text: '" THAT  WOULD BE  NOTHING  MORE THAN  RUNNING  AWAY . "',
          width: 267,
          x: 73,
          y: 1414,
        }),
        block({
          height: 34,
          symHeight: 20,
          symWidth: 13,
          text: '...... !!',
          width: 103,
          x: 508,
          y: 2291,
        }),
      ],
      expectedSameBubbleGroups: [[1, 2]],
    },
    {
      pageKey: '021__001.jpg',
      screenshotPage: '41/55',
      blocks: [
        block({
          height: 128,
          symHeight: 19.54,
          symWidth: 13.84,
          text: '" IT  WOULD  ALSO MEAN  AGREEING HARMONY  WITH  THE  WORLD  THE DIVINE  CELESTIAL  HAS  BUILT  I  WILL NEVER  DO  THAT .  NOR  WILL TO  LIVE  IN',
          width: 394,
          x: 79,
          y: 463,
        }),
        block({
          height: 18,
          symHeight: 18,
          symWidth: 13.9,
          text: 'I  EVER  STOP .',
          width: 155,
          x: 203,
          y: 600,
        }),
        block({
          height: 89,
          symHeight: 22.33,
          symWidth: 16.07,
          text: 'IF  ANYTHING , I  WOULD  SAY  THIS  INSTEAD : CHOOSE  ME . "',
          width: 357,
          x: 258,
          y: 767,
        }),
        block({
          height: 138,
          symHeight: 26.75,
          symWidth: 19.55,
          text: '" THEN  I  WILL GLADLY  JOIN  HANDS WITH  YOU  AND  THE TAEPYEONG  ALLIANCE . "',
          width: 371,
          x: 176,
          y: 2056,
        }),
      ],
      expectedSameBubbleGroups: [[0, 1]],
    },
  ];
}

function getChapter201CrossPageCases(): Chapter201CrossPageCase[] {
  return [
    {
      previousPageKey: '013__002.jpg',
      nextPageKey: '014__001.jpg',
      screenshotPage: '26/55',
      previousBlocks: [
        block({
          height: 108,
          symHeight: 20,
          symWidth: 15,
          text: '" AND THAT IS EXACTLY AS THE BLOOD PRINCE MOON WANG - NO , THE DIVINE CELESTIAL-',
          width: 313,
          x: 197,
          y: 2392,
        }),
      ],
      nextBlocks: [
        block({
          height: 22,
          symHeight: 20,
          symWidth: 15,
          text: 'INTENDED . "',
          width: 132,
          x: 287,
          y: 11,
        }),
      ],
      expectedMergedText:
        '" AND THAT IS EXACTLY AS THE BLOOD PRINCE MOON WANG - NO , THE DIVINE CELESTIAL- INTENDED . "',
    },
    {
      previousPageKey: '016__002.jpg',
      nextPageKey: '017__001.jpg',
      screenshotPage: '32/55',
      previousBlocks: [
        block({
          height: 42,
          symHeight: 20.5,
          symWidth: 16.52,
          text: '" RIGHT NOW , THE WORLD ALREADY',
          width: 273,
          x: 275,
          y: 2458,
        }),
      ],
      nextBlocks: [
        block({
          height: 100,
          symHeight: 20.5,
          symWidth: 16,
          text: 'BELONGS TO THE TAEPYEONG ALLIANCE AND THE HERO ALLIANCE . "',
          width: 278,
          x: 273,
          y: 16,
        }),
      ],
      expectedMergedText:
        '" RIGHT NOW , THE WORLD ALREADY BELONGS TO THE TAEPYEONG ALLIANCE AND THE HERO ALLIANCE . "',
    },
  ];
}

function buildOcrPage(blocks: OcrBlock[]): NormalizedOcrPage {
  return {
    blocks,
    imgHeight: 2500,
    imgWidth: 709,
    provider: 'google_cloud_vision',
    providerModel: 'TEXT_DETECTION',
    providerRequestId: 'chapter-201-regression',
    sourceLanguage: 'en',
    usage: {
      inputTokens: null,
      latencyMs: 0,
      outputTokens: null,
      pageCount: 1,
      providerRequestId: 'chapter-201-regression',
      requestCount: 1,
    },
  };
}

function block(
  overrides: Omit<OcrBlock, 'angle'> & { angle?: number }
): OcrBlock {
  return {
    angle: 0,
    ...overrides,
  };
}

function normalizeOcrText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}
