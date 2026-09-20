export type PresenceStatus =
  | 'VERIFIED_FOUND'
  | 'NOT_FOUND_AFTER_SEARCH'
  | 'INACCESSIBLE'
  | 'NOT_APPLICABLE';

export interface SourceEvidence {
  id: string;
  title: string;
  url: string;
  domain: string;
  sourceType: 'official_website' | 'linkedin' | 'reputation' | 'careers' | 'news' | 'scam_report' | 'search_snippet';
  snippet: string;
  matchedCompany: string;
  confidence: number; // 0 to 100
  evidencePoints: string[];
}

export interface ReputationSource {
  platform: 'AmbitionBox' | 'Glassdoor' | 'Indeed' | 'MouthShut' | 'Reddit' | 'Crunchbase' | 'Other';
  rating?: number;
  maxRating?: number;
  reviewCount?: number | string;
  url: string;
  summary: string;
  sentiment: 'positive' | 'mixed' | 'negative' | 'neutral';
  positiveThemes: string[];
  negativeThemes: string[];
}

export interface VerdictInfo {
  status: 'SAFE_TO_APPLY' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_APPLY';
  title: string;
  summary: string;
  actionGuidance: string;
  badges: { label: string; type: 'success' | 'warning' | 'danger' | 'info' }[];
}

export interface PreFlightChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'employer' | 'payment' | 'channel' | 'documents' | 'careers_page';
  status: 'passed' | 'warning' | 'critical' | 'action_required';
  advice: string;
}

export interface DetectedUrl {
  url: string;
  domain: string;
  type: 'ats' | 'official_site' | 'unbranded_form' | 'messaging' | 'suspicious' | 'other';
  isSafe: boolean;
  platformName?: string;
  warning?: string;
}

export interface InternshipRiskAssessment {
  isPayToIntern: boolean;
  isUnrealisticStipend: boolean;
  isTaskScamPattern: boolean;
  isCertificateTrap: boolean;
  notes: string[];
}

export interface JobPostingAnalysis {
  detectedJobTitle?: string;
  detectedCompensation?: string;
  isCompensationSuspicious: boolean;
  verdict: VerdictInfo;
  checklist: PreFlightChecklistItem[];
  detectedUrls: DetectedUrl[];
  internshipAssessment: InternshipRiskAssessment;
  careersPageMatch?: {
    checked: boolean;
    found: boolean;
    url?: string;
    note: string;
  };
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
    riskExplanation?: string;
  };
  recruitmentChannel: {
    type: 'official_ats' | 'company_domain' | 'public_email' | 'messaging_app' | 'suspicious_form' | 'unknown';
    channelName: string;
    details: string;
    isHighRisk: boolean;
  };
  recruiterIdentity?: {
    name?: string;
    email?: string;
    emailType: 'corporate' | 'free_mail' | 'suspicious' | 'unknown';
    phone?: string;
    messagingHandle?: string;
    profileUrl?: string;
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

export interface CompanyResearchResult {
  company_name: string;
  normalized_name: string;
  alternate_names: string[];
  company_source: 'detected' | 'override' | 'fallback';
  detection_confidence: number;
  identity_confidence: number; // 0-100
  official_presence: {
    status: PresenceStatus;
    websiteUrl?: string;
    domain?: string;
    title?: string;
    confidence: number;
    evidence: string[];
  };
  linkedin: {
    status: PresenceStatus;
    url?: string;
    title?: string;
    followers?: string;
    employees?: string;
    industry?: string;
    location?: string;
    confidence: number;
  };
  reputation: {
    status: PresenceStatus;
    sources: ReputationSource[];
    overallSentiment?: string;
  };
  newsFootprint: {
    status: PresenceStatus;
    articles: {
      title: string;
      url: string;
      date?: string;
      summary?: string;
    }[];
  };
  company_consistency: {
    status: 'consistent' | 'minor_discrepancy' | 'contradictory' | 'unverified';
    notes: string[];
  };
}

export interface RiskBreakdown {
  overallRiskScore: number; // 0-100
  riskLevel: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'VERY HIGH RISK';
  employerAuthenticityRisk: number; // 0-100
  jobPostingContentRisk: number; // 0-100
  recruitmentChannelRisk: number; // 0-100
  impersonationRisk: number; // 0-100
  rationale: string[];
  recommendations: string[];
  whyThisScore: {
    positives: { point: string; evidence: string }[];
    warnings: { point: string; evidence: string }[];
    hazards: { point: string; evidence: string }[];
  };
}

export interface AnalyzeRequest {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  company_override?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  error?: string;
  extractedText?: string;
  companyResearch: CompanyResearchResult;
  jobAnalysis: JobPostingAnalysis;
  riskBreakdown: RiskBreakdown;
  sources: SourceEvidence[];
  searchDiagnostics: {
    queriesExecuted: string[];
    provider: string;
    cached: boolean;
    timestamp: string;
  };
}
