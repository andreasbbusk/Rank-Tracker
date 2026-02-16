import {
  MockDatabase,
  MockDomain,
  MockGSCRecord,
  MockKeyword,
  MockKeywordNote,
  MockTag,
} from "../types";
import {
  buildKeywordLibrary,
  buildRange,
  gscRecordsFromKeywords,
} from "../utils/analytics";
import {
  DEFAULT_LOCATION,
  hashString,
  normalizeSiteUrl,
  slugify,
} from "../utils/normalizers";

export const SEED_VERSION = 4;

const TRACKED_KEYWORDS_PER_DOMAIN = 96;
const GSC_KEYWORDS_PER_DOMAIN = 650;
const GSC_QUERY_SUFFIXES = [
  "guide",
  "pris",
  "priser",
  "anmeldelse",
  "best i test",
  "alternativer",
  "vs",
  "sammenligning",
  "tips",
  "2026",
];
const GSC_QUERY_PREFIXES = [
  "bedste",
  "billig",
  "premium",
  "hvordan",
  "hvad er",
  "hvorfor",
];
const GSC_QUERY_LOCALS = [
  "danmark",
  "københavn",
  "aarhus",
  "odense",
  "for små virksomheder",
  "for ecommerce",
];

type KeywordBlueprint = {
  base: string[];
  modifiers: string[];
  intents: string[];
  custom?: string[];
};

const DOMAIN_BLUEPRINTS: Array<{
  id: string;
  team: string;
  url: string;
  display_name: string;
  tags: string[];
  keywords: KeywordBlueprint;
}> = [
  {
    id: "1",
    team: "1",
    url: "nordicbikes.dk",
    display_name: "Nordic Bikes",
    tags: ["SEO", "Commercial", "Blog", "Priority"],
    keywords: {
      base: [
        "elcykel tilbud",
        "gravel bike test",
        "bedste citybike",
        "cykeltasker til arbejde",
      ],
      modifiers: ["billig", "premium", "let", "bedst i test"],
      intents: ["køb", "sammenlign", "guide", "anmeldelse"],
      custom: [
        "el ladcykel bedst i test",
        "pendler cykel København",
        "mountainbike tilbud",
      ],
    },
  },
  {
    id: "2",
    team: "1",
    url: "greenathome.dk",
    display_name: "Green At Home",
    tags: ["Technical SEO", "Product", "Category", "Brand"],
    keywords: {
      base: [
        "økologisk rengøring",
        "miljøvenligt vaskemiddel",
        "rengøring uden parfume",
        "grøn husholdning",
      ],
      modifiers: ["til hjemmet", "til kontor", "for børn", "for allergikere"],
      intents: ["bedste", "køb", "guide", "test"],
      custom: ["bionedbrydelig rengøring", "naturlig kalkfjerner"],
    },
  },
  {
    id: "3",
    team: "1",
    url: "b2bgrowthlab.com",
    display_name: "B2B Growth Lab",
    tags: ["Leadgen", "Case Study", "High Intent", "Awareness"],
    keywords: {
      base: [
        "b2b seo strategy",
        "saas seo agency",
        "demand gen framework",
        "content ops for b2b",
      ],
      modifiers: ["for startups", "for scaleups", "for enterprise", "for saas"],
      intents: ["best", "template", "guide", "examples"],
      custom: ["seo bureau b2b", "pipeline marketing playbook"],
    },
  },
  {
    id: "4",
    team: "1",
    url: "aurorafinance.io",
    display_name: "Aurora Finance",
    tags: ["SaaS", "Conversion", "Comparison", "Priority"],
    keywords: {
      base: [
        "expense management software",
        "invoice automation platform",
        "cash flow forecasting tool",
      ],
      modifiers: ["for startups", "for smb", "for finance teams"],
      intents: ["best", "top", "compare", "review"],
    },
  },
  {
    id: "5",
    team: "1",
    url: "pixelnest.studio",
    display_name: "PixelNest Studio",
    tags: ["Portfolio", "Service", "Design", "Brand"],
    keywords: {
      base: [
        "web design agency copenhagen",
        "brand identity design studio",
        "ui ux design services",
      ],
      modifiers: ["danish", "scandinavian", "premium"],
      intents: ["best", "hire", "pricing", "portfolio"],
    },
  },
  {
    id: "6",
    team: "1",
    url: "harborhealth.co",
    display_name: "Harbor Health",
    tags: ["Local SEO", "Clinic", "Treatment", "Awareness"],
    keywords: {
      base: [
        "online doctor consultation",
        "same day telehealth appointment",
        "private health checkup",
      ],
      modifiers: ["near me", "in copenhagen", "for adults"],
      intents: ["best", "book", "cost", "guide"],
    },
  },
  {
    id: "7",
    team: "1",
    url: "northforge.dev",
    display_name: "Northforge Dev",
    tags: ["Developer Tools", "Docs", "Commercial", "How-to"],
    keywords: {
      base: [
        "typescript sdk generator",
        "api mocking tool",
        "ci cd pipeline templates",
      ],
      modifiers: ["open source", "for node", "for react"],
      intents: ["best", "how to", "tutorial", "examples"],
    },
  },
  {
    id: "8",
    team: "1",
    url: "skylinelogistics.ai",
    display_name: "Skyline Logistics",
    tags: ["Logistics", "Automation", "Platform", "Enterprise"],
    keywords: {
      base: [
        "fleet route optimization software",
        "warehouse automation system",
        "supply chain visibility platform",
      ],
      modifiers: ["for enterprise", "for retailers", "global"],
      intents: ["best", "platform", "pricing", "comparison"],
    },
  },
  {
    id: "9",
    team: "1",
    url: "lumenlegal.dk",
    display_name: "Lumen Legal",
    tags: ["Legal Service", "Guide", "Practice Area", "Priority"],
    keywords: {
      base: [
        "contract lawyer copenhagen",
        "employment law advice denmark",
        "startup legal services",
      ],
      modifiers: ["for startups", "for smb", "fixed fee"],
      intents: ["best", "cost", "template", "consultation"],
    },
  },
  {
    id: "10",
    team: "1",
    url: "wildorbit.travel",
    display_name: "WildOrbit Travel",
    tags: ["Destination", "Package", "Guide", "Seasonal"],
    keywords: {
      base: [
        "nordic adventure travel packages",
        "iceland road trip itinerary",
        "norway fjord cruise deals",
      ],
      modifiers: ["budget", "luxury", "all inclusive"],
      intents: ["best", "book", "deals", "guide"],
    },
  },
  {
    id: "11",
    team: "1",
    url: "solarforge.energy",
    display_name: "Solarforge Energy",
    tags: ["Renewables", "Commercial", "Industrial", "Education"],
    keywords: {
      base: [
        "commercial solar panel installation",
        "industrial battery storage solutions",
        "solar maintenance services",
      ],
      modifiers: ["for factories", "for warehouses", "in denmark"],
      intents: ["best", "cost", "calculator", "quote"],
    },
  },
];

function buildExpandedGSCRecordsForDomain({
  domain,
  domainKeywords,
}: {
  domain: (typeof DOMAIN_BLUEPRINTS)[number];
  domainKeywords: MockKeyword[];
}): MockGSCRecord[] {
  const trackedRecords = gscRecordsFromKeywords(domainKeywords);
  const generatedLibrary = buildKeywordLibrary({
    base: domain.keywords.base,
    modifiers: domain.keywords.modifiers,
    intents: domain.keywords.intents,
  });

  const baseQueries = Array.from(
    new Set([
      ...domainKeywords.map((keyword) => keyword.title),
      ...(domain.keywords.custom || []),
      ...domain.keywords.base,
      ...generatedLibrary,
    ]),
  );

  const expandedQueries = new Set<string>(baseQueries);

  for (const query of baseQueries) {
    for (const suffix of GSC_QUERY_SUFFIXES) {
      expandedQueries.add(`${query} ${suffix}`.trim());
    }

    for (const prefix of GSC_QUERY_PREFIXES) {
      expandedQueries.add(`${prefix} ${query}`.trim());
    }

    for (const local of GSC_QUERY_LOCALS) {
      expandedQueries.add(`${query} ${local}`.trim());
    }
  }

  const syntheticRecords: MockGSCRecord[] = Array.from(expandedQueries).map(
    (query, index) => {
      const seed = hashString(`${domain.id}-${query}-${index}`);
      const impressions = 80 + (seed % 12000);
      const ctrBase = 0.0075 + (seed % 240) / 10000;
      const clicks = Math.max(1, Math.round(impressions * ctrBase));
      const position = Number((1 + (seed % 640) / 10).toFixed(1));
      const ctr = Number((clicks / impressions).toFixed(4));

      return {
        query,
        clicks,
        impressions,
        ctr,
        position,
      };
    },
  );

  const deduped = new Map<string, MockGSCRecord>();
  for (const record of [...trackedRecords, ...syntheticRecords]) {
    const existing = deduped.get(record.query.toLowerCase());
    if (!existing || record.clicks > existing.clicks) {
      deduped.set(record.query.toLowerCase(), record);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, GSC_KEYWORDS_PER_DOMAIN);
}

export function buildSeedDatabase(): MockDatabase {
  const now = new Date().toISOString();

  const domains: MockDomain[] = DOMAIN_BLUEPRINTS.map((domain) => ({
    id: domain.id,
    team: domain.team,
    url: domain.url,
    display_name: domain.display_name,
    created_at: now,
    updated_at: now,
  }));

  let nextTagId = 1;
  const tags: MockTag[] = [];

  for (const domain of DOMAIN_BLUEPRINTS) {
    for (const tagName of domain.tags) {
      tags.push({
        id: nextTagId,
        domainId: domain.id,
        name: tagName,
        created_at: now,
      });
      nextTagId += 1;
    }
  }

  let nextKeywordId = 1;
  let nextNoteId = 1;
  const keywords: MockKeyword[] = [];

  for (const domain of DOMAIN_BLUEPRINTS) {
    const generated = buildKeywordLibrary({
      base: domain.keywords.base,
      modifiers: domain.keywords.modifiers,
      intents: domain.keywords.intents,
    });

    const keywordTitles = Array.from(
      new Set([...(domain.keywords.custom || []), ...generated]),
    ).slice(0, TRACKED_KEYWORDS_PER_DOMAIN);

    const domainTagIds = tags
      .filter((tag) => tag.domainId === domain.id)
      .map((tag) => tag.id);

    keywordTitles.forEach((title, index) => {
      const seed = hashString(`${domain.id}-${title}`);
      const landing = `/${slugify(title).replace(/-/g, "/").split("/").slice(0, 2).join("/")}`;
      const normalizedLanding = landing === "/" ? "/seo" : landing;

      const baseSearchVolume = 120 + (seed % 2300);
      const basePosition = 2 + (seed % 45) / 3;

      const current = buildRange({
        seed,
        basePosition: Math.max(1, basePosition - 0.8),
        baseClicks: 5 + (seed % 12),
        baseImpressions: 55 + (seed % 160),
        landingPage: normalizedLanding,
        offsetDays: 1,
      });

      const previous = buildRange({
        seed: seed + 17,
        basePosition: Math.max(1, basePosition + 0.5),
        baseClicks: 4 + (seed % 10),
        baseImpressions: 48 + (seed % 145),
        landingPage: normalizedLanding,
        offsetDays: 31,
      });

      const notes: MockKeywordNote[] = [];
      if (index % 4 === 0) {
        notes.push({
          id: nextNoteId,
          description:
            index % 8 === 0
              ? "Siden har fået ny struktur i denne periode. Overvåg positioner tæt næste 14 dage."
              : "Meta title opdateret for bedre CTR. Evaluer igen om 2 uger.",
          created_at: now,
          updated_at: now,
        });
        nextNoteId += 1;
      }

      keywords.push({
        id: nextKeywordId,
        domainId: domain.id,
        title,
        star_keyword: index % 3 === 0,
        location: {
          ...DEFAULT_LOCATION,
          id: nextKeywordId,
        },
        tagIds: [
          domainTagIds[index % domainTagIds.length],
          domainTagIds[(index + 1) % domainTagIds.length],
        ],
        notes,
        latest_fetch: now,
        created_at: now,
        updated_at: now,
        preferred_url: undefined,
        search_volume: baseSearchVolume,
        current,
        previous,
        status: "processed",
        statusChecksRemaining: 0,
      });

      nextKeywordId += 1;
    });
  }

  const gscBySiteUrl: Record<
    string,
    ReturnType<typeof gscRecordsFromKeywords>
  > = {};
  for (const domain of domains) {
    const domainKeywords = keywords.filter(
      (keyword) => keyword.domainId === domain.id,
    );
    const blueprint = DOMAIN_BLUEPRINTS.find((item) => item.id === domain.id);
    if (!blueprint) {
      gscBySiteUrl[normalizeSiteUrl(domain.url)] =
        gscRecordsFromKeywords(domainKeywords);
      continue;
    }

    gscBySiteUrl[normalizeSiteUrl(domain.url)] =
      buildExpandedGSCRecordsForDomain({
        domain: blueprint,
        domainKeywords,
      });
  }

  return {
    meta: {
      seed_version: SEED_VERSION,
      nextDomainId: domains.length + 1,
      nextKeywordId,
      nextTagId,
      nextNoteId,
    },
    domains,
    tags,
    keywords,
    gscBySiteUrl,
  };
}
