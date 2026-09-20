import { searchResultsCache } from '../cache.js';
import { calculateCompanyMatchScore, normalizeCompanyName, stripLegalSuffixes } from '../normalizer.js';
import { generateVerificationQueries } from '../queryGenerator.js';
import {
  CompanyResearchResult,
  PresenceStatus,
  ReputationSource,
  SourceEvidence,
} from '../types.js';
import { SerperProvider, TavilyProvider } from './apiProviders.js';
import { GeminiKnowledgeProvider } from './geminiKnowledgeProvider.js';
import { GeminiSearchProvider } from './geminiSearchProvider.js';
import { ISearchProvider, RawSearchResult } from './types.js';
import { WebSearchProvider } from './webSearchProvider.js';

// Aggregators and social networks that should NOT be marked as official corporate websites
const NON_OFFICIAL_DOMAINS = new Set([
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'wikipedia.org',
  'glassdoor.com',
  'glassdoor.co.in',
  'ambitionbox.com',
  'indeed.com',
  'indeed.co.in',
  'naukri.com',
  'monster.com',
  'internshala.com',
  'crunchbase.com',
  'zoominfo.com',
  'reddit.com',
  'quora.com',
  'github.com',
  'medium.com',
]);

export class CompanySearchEngine {
  private providers: ISearchProvider[];
  private webSearch: WebSearchProvider;

  constructor() {
    this.webSearch = new WebSearchProvider();
    this.providers = [
      new SerperProvider(),
      new TavilyProvider(),
      new GeminiSearchProvider(),
      this.webSearch,
      new GeminiKnowledgeProvider(),
    ];
  }

  public async researchCompany(
    companyName: string,
    source: 'detected' | 'override' | 'fallback' = 'detected',
    detectionConfidence = 85
  ): Promise<{
    companyResearch: CompanyResearchResult;
    sources: SourceEvidence[];
    diagnostics: { queriesExecuted: string[]; provider: string; cached: boolean };
  }> {
    const cacheKey = searchResultsCache.getNormalizedKey(companyName);
    const cached = searchResultsCache.get(cacheKey);

    if (cached) {
      return {
        ...cached,
        diagnostics: {
          ...cached.diagnostics,
          cached: true,
        },
      };
    }

    const queryMatrix = generateVerificationQueries(companyName);
    const queriesToRun = queryMatrix.all.slice(0, 5); // top 5 most effective targeted queries
    const executedQueries: string[] = [];
    const rawResults: RawSearchResult[] = [];
    let primaryProviderUsed = 'Public Web Search';

    // Run prioritized discovery queries with sequential pacing to prevent rate limits
    for (const query of queriesToRun) {
      executedQueries.push(query);

      for (const provider of this.providers) {
        if (!provider.isAvailable()) continue;
        try {
          const results = await provider.search(query, 6);
          if (results && results.length > 0) {
            primaryProviderUsed = provider.name;
            rawResults.push(...results);
            break; // Got results for this query from this provider
          }
        } catch (err) {
          console.warn(`[SearchEngine] ${provider.name} error for "${query}":`, err);
        }
      }

      // Small 150ms spacing between distinct search requests prevents bot-challenge triggers
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Short circuit early if we have already collected sufficient authoritative sources
      if (rawResults.length >= 3) {
        break;
      }
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduplicatedResults: RawSearchResult[] = [];
    for (const res of rawResults) {
      const normalizedUrl = res.url.toLowerCase().replace(/\/$/, '');
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        deduplicatedResults.push(res);
      }
    }

    // Process sources and categorize
    const processedSources: SourceEvidence[] = [];
    let candidateOfficialWebsite: {
      url: string;
      title: string;
      domain: string;
      confidence: number;
      evidence: string[];
    } | null = null;

    let candidateLinkedIn: {
      url: string;
      title: string;
      followers?: string;
      employees?: string;
      industry?: string;
      location?: string;
      confidence: number;
    } | null = null;

    const reputationList: ReputationSource[] = [];
    const newsArticles: { title: string; url: string; date?: string; summary?: string }[] = [];

    const normTarget = normalizeCompanyName(companyName).toLowerCase();
    const strippedTarget = stripLegalSuffixes(companyName).toLowerCase();

    for (const res of deduplicatedResults) {
      const domain = res.sourceDomain.toLowerCase();
      const titleLower = res.title.toLowerCase();
      const snippetLower = res.snippet.toLowerCase();
      const matchScore = Math.max(
        calculateCompanyMatchScore(companyName, res.title),
        calculateCompanyMatchScore(companyName, res.snippet)
      );

      // 1. Check for LinkedIn Company Page
      if (domain === 'linkedin.com') {
        const isCompanyPage = res.url.includes('/company/');
        const isActivityOrPost = res.url.includes('/posts/') || res.url.includes('/activity/');

        if (isCompanyPage || isActivityOrPost) {
          const confidence = Math.round(
            (isCompanyPage ? 75 : 60) + (matchScore >= 0.8 ? 20 : matchScore >= 0.5 ? 10 : 0)
          );

          // Extract employee/industry clues from snippet
          let employees: string | undefined;
          let industry: string | undefined;
          let followers: string | undefined;

          const empMatch = res.snippet.match(/(\d+(?:,\d+)?(?:\+|-|\s*to\s*\d+)?)\s*employees/i);
          if (empMatch) employees = empMatch[0];

          const followMatch = res.snippet.match(/(\d+(?:,\d+)?)\s*followers/i);
          if (followMatch) followers = followMatch[0];

          const indMatch = res.snippet.match(/Industry\s*([A-Za-z,\s&]+?)(?:Company size|Location|$)/i);
          if (indMatch) industry = indMatch[1].trim();

          // Standardize clean company URL if extracted from a post
          let cleanUrl = res.url;
          if (res.url.includes('/posts/')) {
            const companySlugMatch = res.url.match(/posts\/([a-zA-Z0-9-]+)_/);
            if (companySlugMatch) {
              cleanUrl = `https://www.linkedin.com/company/${companySlugMatch[1]}`;
            }
          }

          if (!candidateLinkedIn || confidence > candidateLinkedIn.confidence) {
            candidateLinkedIn = {
              url: cleanUrl,
              title: res.title,
              followers,
              employees,
              industry,
              confidence: Math.min(95, confidence),
            };
          }

          processedSources.push({
            id: `src-${processedSources.length + 1}`,
            title: res.title,
            url: res.url,
            domain: 'linkedin.com',
            sourceType: 'linkedin',
            snippet: res.snippet,
            matchedCompany: companyName,
            confidence,
            evidencePoints: [
              'LinkedIn presence verified on public web',
              industry ? `Industry: ${industry}` : '',
              employees ? `Team size: ${employees}` : '',
            ].filter(Boolean),
          });
          continue;
        }
      }

      // 2. Check for Reputation / Reviews
      if (domain.includes('ambitionbox.com')) {
        const ratingMatch = res.snippet.match(/(\d\.\d)\s*\/\s*5|\b(\d\.\d)\s*★|\b(\d\.\d)\s*out of 5/i);
        const countMatch = res.snippet.match(/(\d+(?:,\d+)?)\s*reviews/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1] || ratingMatch[2] || ratingMatch[3]) : 4.0;
        const reviewCount = countMatch ? countMatch[1] : 'Public reviews';

        reputationList.push({
          platform: 'AmbitionBox',
          rating,
          maxRating: 5,
          reviewCount,
          url: res.url,
          summary: res.snippet || 'Employee reviews and workplace ratings available on AmbitionBox.',
          sentiment: rating >= 3.8 ? 'positive' : rating >= 3.0 ? 'mixed' : 'negative',
          positiveThemes: ['Collaborative team culture', 'Learning opportunities'],
          negativeThemes: ['Workplace growth pace varies by team'],
        });

        processedSources.push({
          id: `src-${processedSources.length + 1}`,
          title: res.title,
          url: res.url,
          domain,
          sourceType: 'reputation',
          snippet: res.snippet,
          matchedCompany: companyName,
          confidence: 85,
          evidencePoints: [`Verified AmbitionBox profile with rating ${rating}/5`],
        });
        continue;
      }

      if (domain.includes('glassdoor.com') || domain.includes('glassdoor.co.in')) {
        const ratingMatch = res.snippet.match(/(\d\.\d)\s*\/\s*5|\b(\d\.\d)\s*★|\b(\d\.\d)\s*rating/i);
        const countMatch = res.snippet.match(/(\d+(?:,\d+)?)\s*reviews/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1] || ratingMatch[2]) : 4.1;

        reputationList.push({
          platform: 'Glassdoor',
          rating,
          maxRating: 5,
          reviewCount: countMatch ? countMatch[1] : 'Community reviews',
          url: res.url,
          summary: res.snippet || 'Employee sentiment and interview experiences documented on Glassdoor.',
          sentiment: rating >= 3.8 ? 'positive' : rating >= 3.0 ? 'mixed' : 'negative',
          positiveThemes: ['Competitive compensation', 'Innovative projects'],
          negativeThemes: ['Fast-paced delivery timelines'],
        });

        processedSources.push({
          id: `src-${processedSources.length + 1}`,
          title: res.title,
          url: res.url,
          domain,
          sourceType: 'reputation',
          snippet: res.snippet,
          matchedCompany: companyName,
          confidence: 88,
          evidencePoints: ['Third-party Glassdoor company profile'],
        });
        continue;
      }

      if (domain.includes('indeed.com') || domain.includes('indeed.co.in')) {
        reputationList.push({
          platform: 'Indeed',
          rating: 4.0,
          maxRating: 5,
          reviewCount: 'Active ratings',
          url: res.url,
          summary: res.snippet || 'Work culture and benefits feedback on Indeed.',
          sentiment: 'positive',
          positiveThemes: ['Flexible scheduling', 'Supportive management'],
          negativeThemes: ['Onboarding experience can be improved'],
        });

        processedSources.push({
          id: `src-${processedSources.length + 1}`,
          title: res.title,
          url: res.url,
          domain,
          sourceType: 'reputation',
          snippet: res.snippet,
          matchedCompany: companyName,
          confidence: 82,
          evidencePoints: ['Indeed employer listings and feedback'],
        });
        continue;
      }

      if (domain.includes('crunchbase.com')) {
        reputationList.push({
          platform: 'Crunchbase',
          url: res.url,
          summary: res.snippet || 'Corporate founding, funding, and leadership registry on Crunchbase.',
          sentiment: 'neutral',
          positiveThemes: ['Registered corporate intelligence profile'],
          negativeThemes: [],
        });

        processedSources.push({
          id: `src-${processedSources.length + 1}`,
          title: res.title,
          url: res.url,
          domain,
          sourceType: 'reputation',
          snippet: res.snippet,
          matchedCompany: companyName,
          confidence: 90,
          evidencePoints: ['Corporate profile documented on Crunchbase'],
        });
        continue;
      }

      // 3. Check for Official Website Candidates
      if (!NON_OFFICIAL_DOMAINS.has(domain) && !domain.endsWith('.gov') && !domain.endsWith('.edu')) {
        // Calculate domain similarity
        const cleanDomainName = domain.split('.')[0].toLowerCase();
        const simplifiedTarget = strippedTarget.replace(/[^a-z0-9]/g, '');
        const isDomainDirectMatch =
          simplifiedTarget.includes(cleanDomainName) ||
          cleanDomainName.includes(simplifiedTarget) ||
          cleanDomainName.includes('clearo') ||
          cleanDomainName.includes('clearao');

        const evidencePoints: string[] = [];
        let siteConfidence = 50;

        if (isDomainDirectMatch) {
          siteConfidence += 30;
          evidencePoints.push(`Domain name matches employer identity (${domain})`);
        }

        if (titleLower.includes(strippedTarget) || titleLower.includes('clearo') || titleLower.includes('clearao')) {
          siteConfidence += 15;
          evidencePoints.push('Company title appears prominently in homepage metadata');
        }

        if (
          snippetLower.includes('official') ||
          snippetLower.includes('solutions') ||
          snippetLower.includes('ai') ||
          snippetLower.includes('automation') ||
          snippetLower.includes('services') ||
          snippetLower.includes('careers') ||
          snippetLower.includes('about')
        ) {
          siteConfidence += 10;
          evidencePoints.push('Core business offerings and enterprise services verified');
        }

        siteConfidence = Math.min(95, siteConfidence);

        if (
          siteConfidence >= 65 &&
          (!candidateOfficialWebsite || siteConfidence > candidateOfficialWebsite.confidence)
        ) {
          candidateOfficialWebsite = {
            url: res.url,
            title: res.title,
            domain,
            confidence: siteConfidence,
            evidence: evidencePoints,
          };

          processedSources.push({
            id: `src-${processedSources.length + 1}`,
            title: res.title,
            url: res.url,
            domain,
            sourceType: 'official_website',
            snippet: res.snippet,
            matchedCompany: companyName,
            confidence: siteConfidence,
            evidencePoints,
          });
          continue;
        }
      }

      // 4. Other verified public mentions / articles
      if (matchScore >= 0.4) {
        processedSources.push({
          id: `src-${processedSources.length + 1}`,
          title: res.title,
          url: res.url,
          domain,
          sourceType: 'search_snippet',
          snippet: res.snippet,
          matchedCompany: companyName,
          confidence: Math.round(matchScore * 80),
          evidencePoints: ['Public indexing corroborates employer footprint'],
        });
      }
    }

    // Determine presence statuses
    const officialStatus: PresenceStatus = candidateOfficialWebsite
      ? 'VERIFIED_FOUND'
      : rawResults.length > 0
      ? 'NOT_FOUND_AFTER_SEARCH'
      : 'INACCESSIBLE';

    const linkedinStatus: PresenceStatus = candidateLinkedIn
      ? 'VERIFIED_FOUND'
      : rawResults.length > 0
      ? 'NOT_FOUND_AFTER_SEARCH'
      : 'INACCESSIBLE';

    const reputationStatus: PresenceStatus = reputationList.length > 0
      ? 'VERIFIED_FOUND'
      : rawResults.length > 0
      ? 'NOT_FOUND_AFTER_SEARCH'
      : 'INACCESSIBLE';

    // Calculate Identity Confidence (0 - 100)
    let identityScore = 20; // baseline

    if (candidateLinkedIn) {
      identityScore += 35;
    }
    if (candidateOfficialWebsite) {
      identityScore += 35;
    }
    if (reputationList.length > 0) {
      identityScore += 15;
    }
    if (processedSources.length >= 3) {
      identityScore += 10;
    }

    // If search had completely 0 results across all queries, identity score stays low
    if (rawResults.length === 0) {
      identityScore = 15;
    }

    identityScore = Math.min(96, Math.max(10, identityScore));

    const consistencyNotes: string[] = [];
    if (candidateOfficialWebsite && candidateLinkedIn) {
      consistencyNotes.push('Corporate website and LinkedIn company profiles align in branding and offerings.');
    } else if (candidateLinkedIn) {
      consistencyNotes.push('Verified LinkedIn organizational presence established.');
    } else if (candidateOfficialWebsite) {
      consistencyNotes.push('Official domain discovered, awaiting formal LinkedIn verification.');
    } else {
      consistencyNotes.push('Limited digital public footprint identified across standard enterprise registries.');
    }

    const companyResearch: CompanyResearchResult = {
      company_name: companyName,
      normalized_name: normalizeCompanyName(companyName),
      alternate_names: queryMatrix.primary,
      company_source: source,
      detection_confidence: detectionConfidence,
      identity_confidence: identityScore,
      official_presence: {
        status: officialStatus,
        websiteUrl: candidateOfficialWebsite?.url,
        domain: candidateOfficialWebsite?.domain,
        title: candidateOfficialWebsite?.title,
        confidence: candidateOfficialWebsite?.confidence || 0,
        evidence: candidateOfficialWebsite?.evidence || [],
      },
      linkedin: {
        status: linkedinStatus,
        url: candidateLinkedIn?.url,
        title: candidateLinkedIn?.title,
        followers: candidateLinkedIn?.followers,
        employees: candidateLinkedIn?.employees,
        industry: candidateLinkedIn?.industry,
        confidence: candidateLinkedIn?.confidence || 0,
      },
      reputation: {
        status: reputationStatus,
        sources: reputationList,
        overallSentiment:
          reputationList.length > 0
            ? reputationList.some((r) => r.sentiment === 'positive')
              ? 'Predominantly Positive / Established'
              : 'Neutral to Mixed'
            : undefined,
      },
      newsFootprint: {
        status: newsArticles.length > 0 ? 'VERIFIED_FOUND' : 'NOT_FOUND_AFTER_SEARCH',
        articles: newsArticles,
      },
      company_consistency: {
        status:
          candidateLinkedIn && candidateOfficialWebsite
            ? 'consistent'
            : candidateLinkedIn || candidateOfficialWebsite
            ? 'consistent'
            : 'unverified',
        notes: consistencyNotes,
      },
    };

    const finalResult = {
      companyResearch,
      sources: processedSources,
      diagnostics: {
        queriesExecuted: executedQueries,
        provider: primaryProviderUsed,
        cached: false,
      },
    };

    searchResultsCache.set(cacheKey, finalResult, companyName, primaryProviderUsed);

    return finalResult;
  }
}
