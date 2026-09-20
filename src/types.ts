export type PresenceStatus =
  | 'VERIFIED_FOUND'
  | 'NOT_FOUND_AFTER_SEARCH'
  | 'INACCESSIBLE'
  | 'NOT_APPLICABLE';

export interface ReputationSource {
  platform: 'Glassdoor' | 'AmbitionBox' | 'Indeed' | 'MouthShut' | 'Crunchbase' | 'Other';
  rating?: number;
  maxRating?: number;
  reviewCount?: string;
  url?: string;
  summary?: string;
  sentiment?: 'positive' | 'mixed' | 'negative' | 'neutral';
  positiveThemes?: string[];
  negativeThemes?: string[];
}

export interface CompanyResearchResult {
  company_name: string;
  normalized_name: string;
  alternate_names: string[];
  company_source: 'detected' | 'override' | 'fallback';
  detection_confidence: number;
  identity_confidence: number; // 0 - 100
  official_presence: {
    status: PresenceStatus;
    websiteUrl?: string;
    domain?: string;
    title?: string;
    confidence: number;
    evidence?: string[];
  };
  linkedin: {
    status: PresenceStatus;
    url?: string;
    title?: string;
    followers?: string;
    employees?: string;
    industry?: string;
    confidence: number;
  };
  reputation: {
    status: PresenceStatus;
    sources: ReputationSource[];
    overallSentiment?: string;
  };
  newsFootprint?: {
    status: PresenceStatus;
    articles: {
      title: string;
      url: string;
      date?: string;
      summary?: string;
    }[];
  };
  company_consistency: {
    status: 'consistent' | 'discrepancy' | 'unverified';
    notes: string[];
  };
}

export interface JobPostingAnalysis {
  detectedJobTitle?: string;
  detectedCompensation?: string;
  isCompensationSuspicious?: boolean;
  paymentRequests: {
    detected: boolean;
    feeType?: string;
    details?: string;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
  urgencySignals: {
    detected: boolean;
    details?: string;
  };
  sensitiveDataRequests: {
    detected: boolean;
    items: string[];
  };
  recruitmentChannel: {
    type:
      | 'official_ats'
      | 'company_domain'
      | 'public_email'
      | 'messaging_app'
      | 'suspicious_form'
      | 'unknown';
    channelName: string;
    details: string;
    isHighRisk: boolean;
  };
  recruiterIdentity?: {
    name?: string;
    email?: string;
    emailType?: 'corporate' | 'free_mail' | 'suspicious' | 'unknown';
    phone?: string;
    messagingHandle?: string;
  };
  applicationUrl?: string;
  domainMismatch: {
    detected: boolean;
    jobDomain?: string;
    companyDomain?: string;
    explanation?: string;
  };
  atsIdentified?: string;
  positiveSignals: string[];
  warningSignals: string[];
  criticalFlags: string[];
}

export interface RiskBreakdown {
  overallRiskScore: number; // 0 - 100
  riskLevel: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'VERY HIGH RISK';
  employerAuthenticityRisk: number; // 0 - 100
  jobPostingContentRisk: number; // 0 - 100
  recruitmentChannelRisk: number; // 0 - 100
  impersonationRisk: number; // 0 - 100
  rationale: string[];
  recommendations: string[];
}

export interface SourceEvidence {
  id: string;
  title: string;
  url: string;
  domain: string;
  sourceType: 'official_website' | 'linkedin' | 'reputation' | 'news' | 'search_snippet';
  snippet: string;
  matchedCompany: string;
  confidence: number;
  evidencePoints?: string[];
}

export interface SearchDiagnostics {
  queriesExecuted: string[];
  provider: string;
  cached: boolean;
  timestamp: string;
}

export interface AnalyzeResponse {
  success: boolean;
  error?: string;
  extractedText?: string;
  companyResearch: CompanyResearchResult;
  jobAnalysis: JobPostingAnalysis;
  riskBreakdown: RiskBreakdown;
  sources: SourceEvidence[];
  searchDiagnostics: SearchDiagnostics;
}

export interface TestCase {
  id: string;
  name: string;
  company: string;
  badge: string;
  description: string;
  text: string;
}
