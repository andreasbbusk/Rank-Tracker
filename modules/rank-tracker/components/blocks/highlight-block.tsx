"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ReportMetrics } from "../../types";
import {
  fetchGSCDataForReport,
  getDomainKeywords,
} from "../../actions/report.actions";

// GSC Data Types (from actions)
type KeywordReport = {
  keyword: string;
  avg_month_search: number;
  competition: number;
  competition_index: number;
  three_month_change: number | string;
  yoy_change: number | string;
  low_top_of_page_bid: number;
  high_top_of_page_bid: number;
  monthly_search_volumes: MonthlySearchVolume[];
  query?: string;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type MonthlySearchVolume = {
  avg_searches: number;
  month: string;
};

type KeywordInsights = {
  success: boolean;
  keyword_reports?: KeywordReport[];
  errors?: string[];
  original_name?: string;
};

interface HighlightBlockProps {
  content: ReportMetrics & {
    previousPeriod?: {
      totalKeywords: number;
      avgPosition: number;
      totalClicks: number;
      totalImpressions: number;
      avgCTR: number;
      estimatedValue: number;
    };
    previousDateRange?: { from: string; to: string };
    changes?: {
      keywordsChange: number;
      positionChange: number;
      clicksChange: number;
      impressionsChange: number;
      ctrChange: number;
      valueChange: number;
    };
    estimatedValue?: number;
    topRankingKeywords?: number;
    improvementOpportunities?: number;
    domain?: string; // Domain for GSC report
    domainId?: string; // Domain ID for fetching keywords
  };
  renderActionButtons: () => React.ReactNode;
}

// Calculate summary from GSC data
function calculateGSCSummary(report: KeywordReport[]) {
  console.log("calculateGSCSummary called with:", {
    reportLength: report?.length || 0,
    sampleKeyword: report?.[0],
    fullReport: report,
  });

  if (!report || report.length === 0) {
    console.log("calculateGSCSummary: No report data available");
    return null;
  }

  const validCompetitions = report.filter((item) => item.competition >= 2);

  function determineCompetitionAverage(numbers: number[]) {
    const average = Math.floor(
      numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length,
    );

    if (average === 2) return "Lav";
    if (average === 3) return "Medium";
    if (average === 4) return "Høj";
    return "Ikke tilgængelig";
  }

  const summary = {
    totalSearchVolume: report.reduce(
      (acc, curr) => acc + curr.avg_month_search,
      0,
    ),
    avgSearchVolume: Math.round(
      report.reduce((acc, curr) => acc + curr.avg_month_search, 0) /
        report.length,
    ),
    totalKeywords: report.length,
    competitionLevel: determineCompetitionAverage(
      validCompetitions?.map((item) => item.competition),
    ),
    avgLowBid:
      report.reduce((acc, curr) => acc + curr.low_top_of_page_bid, 0) /
      report.filter((item) => item.low_top_of_page_bid !== 0).length /
      1000000,
    avgHighBid:
      report.reduce((acc, curr) => acc + curr.high_top_of_page_bid, 0) /
      report.filter((item) => item.high_top_of_page_bid !== 0).length /
      1000000,
    topKeywords: report.filter((item) => item.avg_month_search > 1000).length,
    highValueKeywords: report.filter(
      (item) =>
        item.low_top_of_page_bid > 5000000 && item.avg_month_search > 100,
    ).length,
  };

  console.log("calculateGSCSummary result:", summary);
  return summary;
}

const HighlightBlock = ({
  content: metrics,
  renderActionButtons,
}: HighlightBlockProps) => {
  const [gscData, setGscData] = useState<KeywordInsights | null>(null);
  const [isLoadingGSC, setIsLoadingGSC] = useState(false);

  useEffect(() => {
    async function fetchGSCDataFromServer() {
      if (!metrics.domain || !metrics.dateRange) return;

      setIsLoadingGSC(true);
      try {
        // Fetch keywords for the domain if domainId is available
        let keywords: string[] = [];
        if (metrics.domainId) {
          console.log("Fetching keywords for domain ID:", metrics.domainId);
          keywords = await getDomainKeywords(metrics.domainId);
          console.log("Fetched keywords:", {
            count: keywords.length,
            keywords: keywords.slice(0, 10),
          });
        }

        const gscReport = await fetchGSCDataForReport({
          domain: metrics.domain,
          keywords: keywords.length > 0 ? keywords : undefined, // Pass keywords if available
          dateRange: metrics.dateRange, // Use actual report date range
          language: 1009, // Danish
          location: 2208, // Denmark
          engine: "google",
        });

        console.log("GSC Report Response:", {
          success: gscReport?.success,
          hasKeywordReports: !!gscReport?.keyword_reports,
          keywordReportsLength: gscReport?.keyword_reports?.length || 0,
          errors: gscReport?.errors,
          fullReport: gscReport,
        });

        setGscData(gscReport);
      } catch (error) {
        console.error("Failed to fetch GSC data:", error);
      } finally {
        setIsLoadingGSC(false);
      }
    }

    fetchGSCDataFromServer();
  }, [metrics.domain, metrics.dateRange, metrics.domainId]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("da-DK").format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("da-DK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Generate actionable insights combining rank tracker data with GSC data
  const generateHighlights = () => {
    const highlights = [];
    const gscSummary = gscData?.keyword_reports
      ? calculateGSCSummary(gscData.keyword_reports)
      : null;

    console.log("Generate Highlights Debug:", {
      hasGscData: !!gscData,
      gscDataSuccess: gscData?.success,
      hasKeywordReports: !!gscData?.keyword_reports,
      keywordReportsLength: gscData?.keyword_reports?.length || 0,
      gscSummary,
      hasChanges: !!metrics.changes,
      changes: metrics.changes,
    });

    // Get period context for better recommendations
    const periodDays = metrics.dateRange
      ? Math.ceil(
          (new Date(metrics.dateRange.to).getTime() -
            new Date(metrics.dateRange.from).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 30;

    const dataQuality = {
      hasGscData: !!gscSummary,
      hasHistoricalData: !!metrics.previousPeriod,
      keywordCount: metrics.totalKeywords || 0,
      periodLength: periodDays,
    };

    // Position improvement/decline with context-aware recommendations
    if (metrics.changes?.positionChange !== 0) {
      const isImprovement = (metrics.changes?.positionChange || 0) > 0;
      const change = Math.abs(metrics.changes?.positionChange || 0);
      const changeContext =
        change > 2 ? "betydelig" : change > 1 ? "moderat" : "mindre";

      if (isImprovement) {
        const confidenceLevel =
          dataQuality.keywordCount > 50 && dataQuality.periodLength >= 28
            ? "høj"
            : dataQuality.keywordCount > 20
              ? "moderat"
              : "begrænset";

        highlights.push({
          color: "bg-primary",
          title: "Ranking forbedring observeret",
          description: `Gennemsnitsposition forbedret med ${change.toFixed(1)} pladser (${changeContext} ændring baseret på ${dataQuality.keywordCount} søgeord over ${periodDays} dage). Denne tendens indikerer mulige forbedringer i SEO-indsats, men kræver yderligere overvågning for at bekræfte om det er en varig udvikling. Datakvalitet: ${confidenceLevel} sikkerhed.`,
        });
      } else {
        const urgencyLevel =
          change > 3
            ? "høj prioritet"
            : change > 1.5
              ? "moderat prioritet"
              : "lav prioritet";

        highlights.push({
          color: "bg-primary",
          title: "Ranking tilbagegang identificeret",
          description: `Gennemsnitsposition faldt ${change.toFixed(1)} pladser (${changeContext} ændring). Dette kan skyldes algoritmeopdateringer, øget konkurrence, eller tekniske problemer. Anbefaling (${urgencyLevel}): Undersøg SERP-ændringer for top-keywords, sammenlign med konkurrentdata, og gennemgå eventuelle site-ændringer i perioden.`,
        });
      }
    }

    // High-value traffic opportunities with calculation transparency
    if (gscSummary && gscSummary.topKeywords > 0) {
      const assumedCTR = 0.02; // 2% CTR assumption
      const potentialValue =
        gscSummary.topKeywords * gscSummary.avgSearchVolume * assumedCTR * 12;

      highlights.push({
        color: "bg-primary",
        title: "Højvolumen søgeord identificeret",
        description: `${gscSummary.topKeywords} søgeord med 1.000+ månedlige søgninger fundet i din niche. Estimeret potentiel værdi: ${formatNumber(Math.round(potentialValue))} DKK/md (beregnet med 2% CTR og gennemsnitlig søgevolume). Bemærk: Dette er et teoretisk estimat - faktisk værdi afhænger af konkurrenceniveau, din nuværende ranking, og branche-specifikke faktorer.`,
      });
    }

    // Competition strategy insights with data context
    if (gscSummary) {
      const competitionLevel = gscSummary.competitionLevel;
      const sampleSize =
        gscData?.keyword_reports?.filter((item) => item.competition >= 2)
          .length || 0;

      let strategy = "";
      let confidence = "";

      if (competitionLevel === "Høj") {
        strategy =
          "Data tyder på høj konkurrence i dit keyword-segment. Dette kan betyde længere tid til ranking-forbedringer og højere omkostninger for betalt søgning. Overvej at fokusere på long-tail variations og niche-segmenter hvor konkurrencen muligvis er lavere.";
        confidence = `Baseret på ${sampleSize} søgeord med konkurrencedata`;
      } else if (competitionLevel === "Medium") {
        strategy =
          "Moderat konkurrence indikerer en balanceret mulighed. Du kan sandsynligvis opnå forbedringer med konsekvent indsats over 3-6 måneder. Kombiner SEO-optimering med selektiv brug af betalt søgning for konkurrenceprægede termer.";
        confidence = `Analyseret ud fra ${sampleSize} søgeord`;
      } else if (competitionLevel === "Lav") {
        strategy =
          "Lav konkurrence kan indikere mindre udnyttede markedsmuligheder. Dette kan betyde hurtigere ranking-gevinster, men også potentielt mindre søgevolume. Valider markedsstørrelsen før større investeringer.";
        confidence = `Data fra ${sampleSize} søgeord viser dette mønster`;
      } else {
        strategy =
          "Utilstrækkelig konkurrencedata til at danne en klar strategi. Overvej at udvide keyword-analysen eller bruge tredjepartsværktøjer for dybere konkurrentindsigt.";
        confidence = "Baseret på begrænset datagrundlag";
      }

      highlights.push({
        color: "bg-primary",
        title: `Konkurrenceanalyse: ${competitionLevel} niveau`,
        description: `${strategy} ${confidence}.`,
      });
    }

    // Traffic conversion opportunities with trend context
    if (metrics.changes?.clicksChange !== 0) {
      const isIncrease = (metrics.changes?.clicksChange || 0) > 0;
      const change = Math.abs(metrics.changes?.clicksChange || 0);
      const percentageChange = metrics.totalClicks
        ? (
            (change / (metrics.totalClicks - (isIncrease ? change : -change))) *
            100
          ).toFixed(1)
        : "N/A";

      if (isIncrease) {
        highlights.push({
          color: "bg-primary",
          title: "Trafikvækst registreret",
          description: `+${formatNumber(change)} flere klik (${percentageChange}% stigning) observeret over ${periodDays} dage. Denne vækst kan skyldes forbedrede rankings, sæsonudsving, eller øget brand awareness. For at maksimere værdien: Analyser hvilke sider/keywords driver væksten, og optimer konverteringsflow på disse landingpages.`,
        });
      } else {
        const potentialCauses = [
          "algoritmeopdateringer",
          "sæsonudsving",
          "øget konkurrence",
          "tekniske problemer",
        ];

        highlights.push({
          color: "bg-primary",
          title: "Trafiktilbagegang observeret",
          description: `${formatNumber(change)} færre klik (${percentageChange}% fald) registreret. Mulige årsager inkluderer ${potentialCauses.join(", ")}. Handlingsplan: Identificer mest påvirkede sider via Search Console, sammenlign med konkurrentdata, og undersøg tekniske ændringer eller SERP-funktioner der kan påvirke visibility.`,
        });
      }
    }

    // Business value impact with methodology explanation
    if (metrics.changes?.valueChange !== 0) {
      const isIncrease = (metrics.changes?.valueChange || 0) > 0;
      const change = Math.abs(metrics.changes?.valueChange || 0);

      if (isIncrease) {
        highlights.push({
          color: "bg-primary",
          title: "Estimeret værdiforøgelse",
          description: `+${formatNumber(change)} DKK i beregnet værdi (baseret på søgevolume og estimerede CPC-priser). Dette er en indikator for forbedret organisk synlighed på værdifulde søgeord. For at validere: Spor faktiske konverteringer og indtægter fra organisk trafik for at bekræfte den reelle forretningsimpakt.`,
        });
      } else {
        highlights.push({
          color: "bg-primary",
          title: "Potentiel værditab identificeret",
          description: `${formatNumber(change)} DKK estimeret værditab baseret på reduceret synlighed for højværdi søgeord. Dette kræver øjeblikkelig opmærksomhed for at forhindre yderligere erosion af organisk performance. Prioriter genoprettelse af rankings for keywords med størst forretningsimpakt.`,
        });
      }
    }

    // CTR optimization with benchmark context
    if (Math.abs(metrics.changes?.ctrChange || 0) > 0.1) {
      const isImprovement = (metrics.changes?.ctrChange || 0) > 0;
      const change = Math.abs(metrics.changes?.ctrChange || 0);
      const currentCTR = metrics.avgCTR || 0;
      const industryBenchmark =
        currentCTR > 3
          ? "over gennemsnit"
          : currentCTR > 2
            ? "gennemsnitlig"
            : "under gennemsnit";

      if (isImprovement) {
        highlights.push({
          color: "bg-primary",
          title: "CTR-forbedring målt",
          description: `Klikrate steg ${change.toFixed(2)}% til ${currentCTR.toFixed(2)}% (${industryBenchmark} for branchen). Dette indikerer mere attraktive search snippets eller forbedret brand recognition. Næste skridt: Identificer hvilke titler/beskrivelser der performer bedst og anvend lignende mønstre på andre sider.`,
        });
      } else {
        highlights.push({
          color: "bg-primary",
          title: "CTR-optimering nødvendig",
          description: `Klikrate faldt ${change.toFixed(2)}% til ${currentCTR.toFixed(2)}% (${industryBenchmark}). Dette kan skyldes nye SERP-funktioner, stærkere konkurrenter, eller mindre attraktive snippets. Handlingsplan: A/B test forskellige titel-formater, tilføj struktureret data, og overvåg konkurrenters meta-beskrivelser.`,
        });
      }
    }

    // PPC vs SEO strategy with context and limitations
    if (gscSummary && gscSummary.avgLowBid > 0) {
      const assumedCTR = 0.02;
      const organicValue =
        gscSummary.totalSearchVolume * assumedCTR * gscSummary.avgLowBid;

      highlights.push({
        color: "bg-primary",
        title: "Organisk vs. betalt sammenligning",
        description: `Gennemsnitlig CPC for dine søgeord: ${gscSummary.avgLowBid.toFixed(2)}-${gscSummary.avgHighBid.toFixed(2)} DKK. Hvis din nuværende organiske trafik skulle købes som annoncer, ville det koste ca. ${formatNumber(Math.round(organicValue))} DKK/md (estimat baseret på 2% CTR). Bemærk: Faktiske PPC-resultater kan variere betydeligt på grund af ad quality, landing page experience, og konkurrencedynamik.`,
      });
    }

    // Market share analysis with realistic expectations
    if (
      gscSummary &&
      gscSummary.totalSearchVolume > 0 &&
      metrics.totalClicks > 0
    ) {
      const currentMarketShare =
        (metrics.totalClicks / gscSummary.totalSearchVolume) * 100;

      // More realistic market share expectations based on current performance
      const realisticTarget = Math.min(
        currentMarketShare * 1.5, // 50% improvement seems more achievable
        currentMarketShare < 1 ? 3 : currentMarketShare < 5 ? 8 : 15,
      );
      const potential = Math.max(0, realisticTarget - currentMarketShare);

      if (potential > 0.5) {
        highlights.push({
          color: "bg-primary",
          title: "Markedsandel analyse",
          description: `${formatNumber(gscSummary.totalSearchVolume)} månedlige søgninger tilgængelige i dit segment. Nuværende organisk markedsandel: ${currentMarketShare.toFixed(1)}%. Realistisk mål: ${realisticTarget.toFixed(1)}% (${formatNumber(Math.round((gscSummary.totalSearchVolume * potential) / 100))} flere månedlige clicks). Tid til målnåelse: Sandsynligvis 6-12 måneder med konsekvent SEO-indsats.`,
        });
      }
    }

    return highlights.slice(0, 6); // Show max 6 most relevant highlights
  };

  // Safety check for metrics data
  if (!metrics || !metrics.changes) {
    return (
      <>
        {renderActionButtons()}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Anbefalinger og muligheder
            </h3>
            <p className="text-sm text-gray-600">
              Strategiske insights baseret på performance data
            </p>
          </div>
          <div className="py-8 text-center text-gray-500">
            <p className="text-sm font-medium">Baseline periode</p>
            <p className="mt-1 text-xs text-gray-400">
              Dette er den første rapport. Sammenlignende anbefalinger vil være
              tilgængelige efter næste periode.
            </p>
          </div>
        </div>
      </>
    );
  }

  const highlights = generateHighlights();

  return (
    <>
      {renderActionButtons()}

      <div className="">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Anbefalinger og muligheder
            </h3>
            <p className="text-sm text-gray-600">
              Strategiske insights baseret på performance data
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoadingGSC && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyserer markedsdata...
              </div>
            )}
            <div className="text-xs text-gray-500">
              {formatDate(metrics.dateRange.from)} -{" "}
              {formatDate(metrics.dateRange.to)}
            </div>
          </div>
        </div>

        {highlights.length > 0 ? (
          <div className="space-y-4">
            {highlights.map((highlight, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg bg-gray-50 p-4"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`h-3 w-3 rounded-full ${highlight.color} mt-1.5`}
                  ></div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {highlight.title}
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    {highlight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            {isLoadingGSC && (
              <div className="mx-auto mb-3 flex h-6 w-6 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            <p className="text-sm font-medium">
              {isLoadingGSC
                ? "Analyserer performance data"
                : "Stabil performance periode"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {isLoadingGSC
                ? "Genererer strategiske anbefalinger baseret på markedsdata"
                : "Ingen større ændringer identificeret. Fortsæt nuværende strategi og monitorer udviklingen."}
            </p>
          </div>
        )}

        {gscData?.errors && gscData.errors.length > 0 && (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary"></div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Begrænset markedsdata tilgængelig
                </p>
                <p className="mt-1 text-xs text-gray-700">
                  Anbefalingerne er baseret på historisk performance data.
                  Kontakt support for udvidet markedsanalyse.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HighlightBlock;
