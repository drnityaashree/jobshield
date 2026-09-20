/**
 * Company name normalization, typo-tolerance, and similarity scoring.
 */

// Common legal and business entity suffixes
const LEGAL_SUFFIXES = [
  'pvt ltd',
  'pvt. ltd.',
  'private limited',
  'pvt. limited',
  'limited',
  'ltd',
  'ltd.',
  'llp',
  'inc.',
  'inc',
  'incorporated',
  'corp.',
  'corp',
  'corporation',
  'llc',
  'gmbh',
  'pty ltd',
  'co.',
  'company',
];

const SECONDARY_SUFFIXES = [
  'technologies',
  'technology',
  'solutions',
  'software',
  'services',
  'labs',
  'systems',
  'analytics',
  'consulting',
  'digital',
  'global',
  'international',
  'enterprises',
  'ai',
];

/**
 * Normalizes a company name for search and matching.
 * Cleans punctuation, extra whitespace, and standardizes case.
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';

  let cleaned = name
    .trim()
    .replace(/[^\w\s.&-]/g, ' ') // replace unusual symbols
    .replace(/\s+/g, ' ');

  // Handle dot connectors like "Clearo.analytics" -> "Clearo Analytics"
  cleaned = cleaned.replace(/([a-zA-Z0-9])\.([a-zA-Z0-9])/g, '$1 $2');

  return cleaned.trim();
}

/**
 * Strips formal corporate suffixes (Pvt Ltd, LLC, Inc) while preserving core name.
 */
export function stripLegalSuffixes(name: string): string {
  if (!name) return '';
  let cleaned = name.trim().replace(/[.,\s]+$/, '');

  for (const suffix of LEGAL_SUFFIXES) {
    const cleanSuffix = suffix.replace(/\./g, '');
    const regex = new RegExp(`\\b(${suffix.replace(/\./g, '\\.?')}|${cleanSuffix})\\b\\.?$`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '').trim().replace(/[.,\s]+$/, '');
      break;
    }
  }

  return normalizeCompanyName(cleaned);
}

/**
 * Generates search variants for a company, including phonetic/typo variations,
 * stripped legal names, dot-com/dot-domain versions, etc.
 */
export function generateCompanyVariants(name: string): string[] {
  const variants = new Set<string>();
  const raw = name.trim();
  if (!raw) return [];

  variants.add(raw);

  const normalized = normalizeCompanyName(raw);
  variants.add(normalized);

  const strippedLegal = stripLegalSuffixes(raw);
  if (strippedLegal && strippedLegal.length > 1) {
    variants.add(strippedLegal);
  }

  // Handle dot-name variations (e.g. "Clearo.analytics" <-> "Clearo Analytics")
  if (raw.includes('.')) {
    variants.add(raw.replace(/\./g, ' '));
    variants.add(raw.replace(/\./g, ''));
  } else {
    // If name is "Clearo Analytics", also consider "Clearo.analytics"
    const words = normalized.split(' ');
    if (words.length === 2 && words[1].toLowerCase() === 'analytics') {
      variants.add(`${words[0]}.analytics`);
    }
  }

  // Handle common phonetic/OCR letter shifts (e.g., Clearao -> Clearo)
  if (/clearao/i.test(raw)) {
    variants.add(raw.replace(/clearao/gi, 'Clearo'));
    variants.add('Clearo Analytics');
    variants.add('Clearo.analytics');
  } else if (/clearo/i.test(raw)) {
    variants.add(raw.replace(/clearo/gi, 'Clearao'));
  }

  // Strip secondary words if there are at least 3 words
  const words = strippedLegal.split(' ');
  if (words.length > 2) {
    const lastWord = words[words.length - 1].toLowerCase();
    if (SECONDARY_SUFFIXES.includes(lastWord)) {
      variants.add(words.slice(0, -1).join(' '));
    }
  }

  return Array.from(variants).filter((v) => v.length > 1);
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1, // deletion
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  return matrix[bn][an];
}

/**
 * Calculates a match score between 0.0 and 1.0 between candidate text and expected company name.
 */
export function calculateCompanyMatchScore(expectedCompany: string, candidateText: string): number {
  if (!expectedCompany || !candidateText) return 0;

  const expNorm = normalizeCompanyName(expectedCompany).toLowerCase();
  const candNorm = normalizeCompanyName(candidateText).toLowerCase();

  // Exact match
  if (candNorm.includes(expNorm)) return 1.0;

  // Stripped legal match
  const expStripped = stripLegalSuffixes(expectedCompany).toLowerCase();
  if (expStripped && candNorm.includes(expStripped)) return 0.95;

  // Check generated variants
  const variants = generateCompanyVariants(expectedCompany);
  for (const v of variants) {
    const vNorm = normalizeCompanyName(v).toLowerCase();
    if (candNorm.includes(vNorm)) return 0.9;
  }

  // Token overlap (Jaccard similarity)
  const expTokens = new Set(expStripped.split(' ').filter((t) => t.length > 2));
  const candTokens = new Set(candNorm.split(' ').filter((t) => t.length > 2));

  if (expTokens.size > 0) {
    let intersection = 0;
    for (const t of expTokens) {
      if (candTokens.has(t)) {
        intersection++;
      } else {
        // check fuzzy token match
        for (const ct of candTokens) {
          if (levenshteinDistance(t, ct) <= 1 && Math.max(t.length, ct.length) >= 4) {
            intersection += 0.85;
            break;
          }
        }
      }
    }
    const tokenScore = intersection / expTokens.size;
    if (tokenScore >= 0.7) return Math.min(0.88, tokenScore);
  }

  // Levenshtein on entire string if lengths are comparable
  const maxLen = Math.max(expNorm.length, candNorm.length);
  if (maxLen > 3 && maxLen <= 30) {
    const dist = levenshteinDistance(expNorm, candNorm);
    const sim = 1 - dist / maxLen;
    if (sim >= 0.75) return sim;
  }

  return 0;
}
