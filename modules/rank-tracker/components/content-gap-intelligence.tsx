"use client";

import { useState, useEffect, useMemo } from "react";
import { DomainWithAnalytics } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/core/components/ui/card";
import { Badge } from "@/modules/core/components/ui/badge";
import { Button } from "@/modules/core/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/modules/core/components/ui/tabs";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { runReport } from "@/modules/analytics/actions/g-search-console.actions";

interface ContentOpportunity {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  searchVolume: number;
  currentPosition?: number;
  difficulty: "low" | "medium" | "high";
  priority: "high" | "medium" | "low";
  category: "optimization" | "new_content" | "technical";
  actionSteps: string[];
  estimatedImpact: number;
}

interface ContentGapIntelligenceProps {
  domains: DomainWithAnalytics[];
  isLoading?: boolean;
}

export const ContentGapIntelligence: React.FC<ContentGapIntelligenceProps> = ({
  domains,
  isLoading = false,
}) => {
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<ContentOpportunity | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gscData, setGscData] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [expandedCategory, setExpandedCategory] =
    useState<string>("optimization");

  // Initialize domain selection
  useEffect(() => {
    if (domains && domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0].gsc_url || domains[0].url);
    }
  }, [domains, selectedDomain]);

  // Simplified content opportunity identification
  const contentOpportunities = useMemo(() => {
    if (!gscData || gscData.length === 0) return [];

    const opportunities: ContentOpportunity[] = [];

    // Process GSC data for opportunities
    gscData.forEach((query, index) => {
      const position = query.position || 0;
      const impressions = query.impressions || 0;
      const clicks = query.clicks || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      // Optimization opportunities (existing content that can be improved)
      if (position > 3 && position <= 20 && impressions > 50) {
        opportunities.push({
          id: `opt-${index}`,
          title: `Optimer "${query.query}"`,
          description: `Position ${position.toFixed(1)} med ${impressions} visninger`,
          keywords: [query.query],
          searchVolume: Math.floor(impressions * 30),
          currentPosition: Math.round(position),
          difficulty:
            position <= 10 ? "low" : position <= 15 ? "medium" : "high",
          priority:
            impressions > 200 ? "high" : impressions > 100 ? "medium" : "low",
          category: "optimization",
          actionSteps: [
            "Gennemgå eksisterende indhold for søgeordet",
            "Forbedre title tag og meta description",
            "Tilføj mere relevant indhold og dybde",
            "Optimer interne links til siden",
          ],
          estimatedImpact: Math.floor(impressions * 0.15),
        });
      }

      // Low CTR opportunities (good position but poor click-through)
      if (position <= 10 && ctr < 2 && impressions > 100) {
        opportunities.push({
          id: `ctr-${index}`,
          title: `Forbedr CTR for "${query.query}"`,
          description: `Position ${position.toFixed(1)} men kun ${ctr.toFixed(1)}% CTR`,
          keywords: [query.query],
          searchVolume: Math.floor(impressions * 30),
          currentPosition: Math.round(position),
          difficulty: "low",
          priority: "high",
          category: "optimization",
          actionSteps: [
            "Optimer title tag for bedre tiltrækning",
            "Skriv mere overbevisende meta descriptions",
            "Tilføj strukturerede data til snippets",
            "Test forskellige title variationer",
          ],
          estimatedImpact: Math.floor(impressions * 0.25),
        });
      }

      // New content opportunities (keywords we don't rank for)
      if (position > 20 && impressions > 10) {
        opportunities.push({
          id: `new-${index}`,
          title: `Opret indhold for "${query.query}"`,
          description: `Manglende indhold - position ${position.toFixed(1)}`,
          keywords: [query.query],
          searchVolume: Math.floor(impressions * 30),
          currentPosition: Math.round(position),
          difficulty: "medium",
          priority: impressions > 50 ? "medium" : "low",
          category: "new_content",
          actionSteps: [
            "Analyser konkurrenters indhold for søgeordet",
            "Opret omfattende guide eller artikel",
            "Sørg for teknisk SEO optimering",
            "Byg interne links til det nye indhold",
          ],
          estimatedImpact: Math.floor(impressions * 0.1),
        });
      }
    });

    // Sort by estimated impact and return top opportunities
    return opportunities
      .sort((a, b) => b.estimatedImpact - a.estimatedImpact)
      .slice(0, 20);
  }, [gscData]);

  // Load GSC data when domain changes
  useEffect(() => {
    const loadGSCData = async () => {
      if (!selectedDomain) return;

      setIsAnalyzing(true);
      try {
        const response = await runReport({
          site_url: selectedDomain,
          dimensions: ["query"],
          date_ranges: [
            {
              start_date: "2024-01-01",
              end_date: "2024-12-31",
            },
          ],
          search_type: "web",
          aggregation_type: "auto",
          filter_bys: [],
          limit: 1000,
          page: 1,
        });

        if (response?.records) {
          setGscData(response.records);
        }
      } catch (error) {
        console.error("Error loading GSC data:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    loadGSCData();
  }, [selectedDomain]);

  // Group opportunities by category
  const groupedOpportunities = useMemo(() => {
    const groups = {
      optimization: contentOpportunities.filter(
        (op) => op.category === "optimization",
      ),
      new_content: contentOpportunities.filter(
        (op) => op.category === "new_content",
      ),
      technical: contentOpportunities.filter(
        (op) => op.category === "technical",
      ),
    };
    return groups;
  }, [contentOpportunities]);

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "optimization":
        return "Optimer eksisterende indhold";
      case "new_content":
        return "Opret nyt indhold";
      case "technical":
        return "Tekniske forbedringer";
      default:
        return category;
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case "optimization":
        return "Forbedr rankings for eksisterende sider";
      case "new_content":
        return "Adresser content gaps med nyt indhold";
      case "technical":
        return "Tekniske SEO forbedringer";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Intelligence</CardTitle>
          <CardDescription>
            Identificer content muligheder baseret på Google Search Console data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="mr-3 h-5 w-5 animate-spin text-gray-400" />
              <span className="text-gray-600">Analyserer data...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedOpportunities).map(
                ([category, opportunities]) => (
                  <div key={category} className="rounded-lg border">
                    <button
                      onClick={() =>
                        setExpandedCategory(
                          expandedCategory === category ? "" : category,
                        )
                      }
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {getCategoryTitle(category)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {getCategoryDescription(category)} (
                          {opportunities.length} muligheder)
                        </p>
                      </div>
                      {expandedCategory === category ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {expandedCategory === category && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="space-y-3">
                          {opportunities.map((opportunity) => (
                            <div
                              key={opportunity.id}
                              className="cursor-pointer rounded-lg border bg-white p-4 hover:border-gray-300"
                              onClick={() =>
                                setSelectedOpportunity(opportunity)
                              }
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="mb-1 font-medium text-gray-900">
                                    {opportunity.title}
                                  </h4>
                                  <p className="mb-2 text-sm text-gray-600">
                                    {opportunity.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>
                                      {opportunity.searchVolume.toLocaleString()}{" "}
                                      søgninger/måned
                                    </span>
                                    <span>
                                      Estimeret impact: +
                                      {opportunity.estimatedImpact} klik/måned
                                    </span>
                                    <Badge
                                      variant={
                                        opportunity.priority === "high"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {opportunity.priority === "high"
                                        ? "Høj"
                                        : opportunity.priority === "medium"
                                          ? "Medium"
                                          : "Lav"}{" "}
                                      prioritet
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOpportunity && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedOpportunity.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {selectedOpportunity.description}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOpportunity(null)}
              >
                Luk
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Key metrics */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {selectedOpportunity.searchVolume.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Søgninger/måned</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    +{selectedOpportunity.estimatedImpact}
                  </div>
                  <div className="text-sm text-gray-600">
                    Estimeret klik/måned
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {selectedOpportunity.currentPosition || "N/A"}
                  </div>
                  <div className="text-sm text-gray-600">
                    Nuværende position
                  </div>
                </div>
              </div>

              {/* Action steps */}
              <div>
                <h4 className="mb-3 font-medium text-gray-900">
                  Anbefalede handlinger
                </h4>
                <div className="space-y-2">
                  {selectedOpportunity.actionSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                          {index + 1}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <h4 className="mb-3 font-medium text-gray-900">
                  Relaterede søgeord
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOpportunity.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
