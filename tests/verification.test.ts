import assert from 'node:assert/strict';
import { JobShieldAnalyzer } from '../src/server/analyzer.js';
import { searchResultsCache } from '../src/server/cache.js';
import {
  calculateCompanyMatchScore,
  generateCompanyVariants,
  normalizeCompanyName,
  stripLegalSuffixes,
} from '../src/server/normalizer.js';
import { generateVerificationQueries } from '../src/server/queryGenerator.js';
import { CompanySearchEngine } from '../src/server/search/searchEngine.js';

async function runTests() {
  console.log('--- Starting JobShield Verification & Engine Tests ---');

  // TEST 1: Normalization & Legal Suffix Stripping
  console.log('Test 1: Company Normalization');
  assert.equal(stripLegalSuffixes('Stripe Inc.'), 'Stripe');
  assert.equal(stripLegalSuffixes('Clearao Analytics Pvt Ltd'), 'Clearao Analytics');
  assert.equal(stripLegalSuffixes('ABC Technologies Private Limited'), 'ABC Technologies');
  assert.equal(normalizeCompanyName('Clearo.analytics'), 'Clearo analytics');

  // TEST 2: Company Variants & Typo Tolerance
  console.log('Test 2: Company Variants & Typo-tolerance');
  const clearaoVariants = generateCompanyVariants('Clearao Analytics');
  assert.ok(clearaoVariants.includes('Clearo Analytics'), 'Should contain Clearo Analytics');
  assert.ok(clearaoVariants.includes('Clearo.analytics'), 'Should contain Clearo.analytics');

  const matchScore = calculateCompanyMatchScore('Clearao Analytics', 'Clearo.analytics - LinkedIn');
  assert.ok(matchScore >= 0.8, `Match score should be high for variant, got ${matchScore}`);

  // TEST 3: Multi-query generation
  console.log('Test 3: Multi-query generation');
  const queries = generateVerificationQueries('Clearao Analytics');
  assert.ok(queries.all.length >= 4, 'Should generate at least 4 targeted queries');
  assert.ok(
    queries.all.some((q) => q.includes('LinkedIn')),
    'Must include LinkedIn discovery query'
  );
  assert.ok(
    queries.all.some((q) => q.includes('Clearo')),
    'Must include phonetic variant in queries'
  );

  // TEST 4: ATS Detection & Domain Safety
  console.log('Test 4: ATS & Scam Signal Detection');
  const analyzer = new JobShieldAnalyzer();
  const atsAnalysis = analyzer.analyzeJobSignals(
    'Apply on Greenhouse: https://boards.greenhouse.io/stripe/jobs/12345. No fee required.',
    'stripe.com'
  );
  assert.equal(atsAnalysis.atsIdentified, 'Greenhouse');
  assert.equal(atsAnalysis.recruitmentChannel.type, 'official_ats');
  assert.equal(atsAnalysis.paymentRequests.detected, false);

  // TEST 5: Critical Scam Signal (Upfront Payment Request)
  console.log('Test 5: Critical Scam Upfront Fee Detection');
  const scamAnalysis = analyzer.analyzeJobSignals(
    'Online Data Entry role. Pay a refundable security deposit of ₹5,000 to activate portal. Contact on Telegram @hr_scam',
    'unknown.com'
  );
  assert.equal(scamAnalysis.paymentRequests.detected, true);
  assert.equal(scamAnalysis.recruitmentChannel.type, 'messaging_app');
  assert.equal(scamAnalysis.paymentRequests.severity, 'critical');

  const scamRisk = analyzer.calculateRiskScore(20, scamAnalysis);
  assert.ok(scamRisk.overallRiskScore >= 75, `Upfront deposit must trigger high scam score (got ${scamRisk.overallRiskScore})`);
  assert.ok(scamRisk.riskLevel === 'HIGH RISK' || scamRisk.riskLevel === 'VERY HIGH RISK');

  // TEST 6: Domain Mismatch
  console.log('Test 6: Impersonation & Domain Mismatch');
  const mismatchAnalysis = analyzer.analyzeJobSignals(
    'Apply for Microsoft job here: http://microsoft-jobs-fasttrack.xyz/apply',
    'microsoft.com'
  );
  assert.equal(mismatchAnalysis.domainMismatch.detected, true);
  assert.ok(mismatchAnalysis.warningSignals.length > 0);

  // TEST 7: Cache Normalization & Storage
  console.log('Test 7: Cache Normalization');
  searchResultsCache.clear();
  const key1 = searchResultsCache.getNormalizedKey('Stripe Inc.');
  const key2 = searchResultsCache.getNormalizedKey('Stripe');
  assert.equal(key1, key2, 'Normalized cache keys should match for legal variations');

  // TEST 8: Live Search Engine on Clearao Analytics (The Exact Bug from the User Prompt)
  console.log('Test 8: Live Search Engine on Clearao Analytics');
  const engine = new CompanySearchEngine();
  const searchResult = await engine.researchCompany('Clearao Analytics', 'detected', 85);
  assert.ok(searchResult.sources.length > 0, 'Must find public web sources');
  assert.equal(searchResult.companyResearch.linkedin.status, 'VERIFIED_FOUND', 'LinkedIn status must be VERIFIED_FOUND');
  assert.ok(
    searchResult.companyResearch.linkedin.url?.includes('clear'),
    `LinkedIn URL should match company slug, got ${searchResult.companyResearch.linkedin.url}`
  );
  assert.ok(
    searchResult.companyResearch.identity_confidence >= 50,
    `Identity confidence should be established (>=50), got ${searchResult.companyResearch.identity_confidence}`
  );

  // TEST 9: Company Override Precedence
  console.log('Test 9: Company Override Precedence');
  const overrideRes = await analyzer.analyze(
    'We are hiring a software engineer. Contact hr@unknown.com',
    undefined,
    undefined,
    'Stripe'
  );
  assert.equal(overrideRes.companyResearch.company_name, 'Stripe');
  assert.equal(overrideRes.companyResearch.company_source, 'override');

  console.log('✅ ALL 9 TEST SUITES PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
