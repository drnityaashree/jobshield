import { generateCompanyVariants, stripLegalSuffixes } from './normalizer.js';

export interface GeneratedQueries {
  primary: string[];
  linkedin: string[];
  officialSite: string[];
  reputation: string[];
  newsAndScam: string[];
  all: string[];
}

/**
 * Builds an adaptive, multi-angle search query matrix for any company name.
 * Prevents false negatives caused by rigid quoting, typo-variations, or single-source limits.
 */
export function generateVerificationQueries(companyName: string): GeneratedQueries {
  const variants = generateCompanyVariants(companyName);
  const primaryName = variants[0] || companyName;
  const stripped = stripLegalSuffixes(companyName);

  const primaryQueries = new Set<string>();
  const linkedinQueries = new Set<string>();
  const officialQueries = new Set<string>();
  const reputationQueries = new Set<string>();
  const newsScamQueries = new Set<string>();

  // 1. Primary identification queries
  primaryQueries.add(`${primaryName} company`);
  if (stripped !== primaryName) {
    primaryQueries.add(`${stripped} organization`);
  }
  for (const v of variants.slice(0, 3)) {
    primaryQueries.add(v);
  }

  // 2. LinkedIn discovery queries
  // Natural language queries without rigid operators are prioritized across all variants
  linkedinQueries.add(`${primaryName} LinkedIn`);
  for (const v of variants) {
    if (v !== primaryName) {
      linkedinQueries.add(`${v} LinkedIn`);
    }
  }
  linkedinQueries.add(`site:linkedin.com/company ${primaryName}`);
  for (const v of variants) {
    if (v !== primaryName) {
      linkedinQueries.add(`site:linkedin.com/company ${v}`);
    }
  }

  // 3. Official website and careers portal queries
  officialQueries.add(`${primaryName} official website`);
  officialQueries.add(`${primaryName} about us contact`);
  for (const v of variants) {
    if (v !== primaryName) {
      officialQueries.add(`${v} official website`);
    }
  }

  // 4. Third-party reputation and review queries
  reputationQueries.add(`${primaryName} reviews Glassdoor AmbitionBox`);
  reputationQueries.add(`${primaryName} reviews rating`);
  for (const v of variants) {
    if (v !== primaryName) {
      reputationQueries.add(`${v} reviews`);
    }
  }

  // 5. News footprint & scam check queries
  newsScamQueries.add(`${primaryName} scam fraud complaints`);
  newsScamQueries.add(`${primaryName} news funding`);

  const primary = Array.from(primaryQueries);
  const linkedin = Array.from(linkedinQueries);
  const officialSite = Array.from(officialQueries);
  const reputation = Array.from(reputationQueries);
  const newsAndScam = Array.from(newsScamQueries);

  // Combine high-priority discovery queries
  const allSet = new Set<string>();
  // Primary variant LinkedIn first
  for (const lq of linkedin) allSet.add(lq);
  // Official sites
  for (const oq of officialSite) allSet.add(oq);
  // General identity
  for (const pq of primary) allSet.add(pq);
  // Reputation
  for (const rq of reputation) allSet.add(rq);
  for (const nq of newsAndScam) allSet.add(nq);

  const all = Array.from(allSet);

  return {
    primary,
    linkedin,
    officialSite,
    reputation,
    newsAndScam,
    all,
  };
}
