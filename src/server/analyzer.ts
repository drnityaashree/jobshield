import { GoogleGenAI } from '@google/genai';
import { CompanySearchEngine } from './search/searchEngine.js';
import {
  AnalyzeResponse,
  JobPostingAnalysis,
  RiskBreakdown,
} from './types.js';

const KNOWN_ATS_DOMAINS = [
  { name: 'Greenhouse', match: 'greenhouse.io' },
  { name: 'Lever', match: 'lever.co' },
  { name: 'Workday', match: 'myworkdayjobs.com' },
  { name: 'Ashby', match: 'ashbyhq.com' },
  { name: 'SmartRecruiters', match: 'smartrecruiters.com' },
  { name: 'iCIMS', match: 'icims.com' },
  { name: 'Jobvite', match: 'jobvite.com' },
  { name: 'BambooHR', match: 'bamboohr.com' },
  { name: 'Workable', match: 'workable.com' },
  { name: 'Zoho Recruit', match: 'zohorecruit.com' },
  { name: 'Internshala', match: 'internshala.com' },
  { name: 'Naukri', match: 'naukri.com' },
  { name: 'Indeed', match: 'indeed.com' },
  { name: 'LinkedIn Jobs', match: 'linkedin.com/jobs' },
];

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'rediffmail.com',
  'yopmail.com',
  'protonmail.com',
  'mail.com',
  'aol.com',
]);

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.info', '.work', '.click', '.buzz', '.fit', '.cfd', '.quest'];

export class JobShieldAnalyzer {
  private ai: GoogleGenAI | null = null;
  private searchEngine: CompanySearchEngine;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    }
    this.searchEngine = new CompanySearchEngine();
  }

  /**
   * Extracts text and company name from an image screenshot or job text.
   */
  public async extractJobContent(
    text?: string,
    imageBase64?: string,
    imageMimeType = 'image/png'
  ): Promise<{ extractedText: string; detectedCompany?: string; confidence: number }> {
    let fullText = text?.trim() || '';

    // If image is provided, extract text using Gemini multimodal vision
    if (imageBase64 && this.ai) {
      try {
        const imagePart = {
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        };

        const response = await this.ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: {
            parts: [
              imagePart,
              {
                text: 'Perform high-precision OCR on this job posting or offer screenshot. Transcribe all text accurately, including employer header, recruiter contacts, links, job description, and salary details.',
              },
            ],
          },
        });

        const ocrText = response.text?.trim() || '';
        if (ocrText) {
          fullText = fullText ? `${fullText}\n\n[OCR Transcribed Content]:\n${ocrText}` : ocrText;
        }
      } catch (err) {
        console.warn('[JobShieldAnalyzer] Gemini OCR error:', err);
      }
    }

    // Extract employer name using rule-based heuristics + LLM
    let detectedCompany: string | undefined;
    let confidence = 70;

    // Rule-based extraction patterns
    const patterns = [
      /(?:at|for|by|with)\s+([A-Z][A-Za-z0-9\s.&'-]{2,35}?)(?:\s+is\s+hiring|\s+hiring|\s+is\s+looking|\s+Pvt|\s+Technologies|\s+Inc|\s+LLC|\s+Corporation|[,\n.])/i,
      /(?:Employer|Company|Organization|Hiring Company):\s*([A-Za-z0-9\s.&'-]{2,40})/i,
      /Welcome to\s+([A-Za-z0-9\s.&'-]{2,30})/i,
      /^([A-Z][A-Za-z0-9.&'-]+(?:\s+[A-Z][A-Za-z0-9.&'-]+){0,3})\s+(?:is hiring|hiring for)/im,
    ];

    for (const pat of patterns) {
      const m = fullText.match(pat);
      if (m && m[1]) {
        const candidate = m[1].trim();
        if (
          candidate.length > 2 &&
          !/^(Software|Frontend|Backend|Data|Intern|Engineer|Manager|Remote|Full|Part|Immediate|Looking|Apply|Job|Position)$/i.test(
            candidate
          )
        ) {
          detectedCompany = candidate;
          confidence = 85;
          break;
        }
      }
    }

    // If LLM available, verify or refine company extraction
    if (this.ai && fullText.length > 20) {
      try {
        const prompt = `Analyze this job posting and extract ONLY the hiring company or employer name.
If unclear, reply with the most likely employer or "Unknown".
Do not include extra words.
Text:
${fullText.slice(0, 1500)}`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
        });

        const extracted = response.text?.trim().replace(/^["']|["']$/g, '');
        if (extracted && extracted !== 'Unknown' && extracted.length < 50) {
          detectedCompany = extracted;
          confidence = 90;
        }
      } catch {
        // preserve regex candidate
      }
    }

    return {
      extractedText: fullText,
      detectedCompany,
      confidence,
    };
  }

  /**
   * Analyzes job posting text for scam signals, recruitment channels, and recruiter attributes.
   */
  public analyzeJobSignals(
    text: string,
    officialCompanyDomain?: string
  ): JobPostingAnalysis {
    const lower = text.toLowerCase();

    // 1. Payment Requests (Critical Risk)
    let paymentDetected = false;
    let feeType: string | undefined;
    let paymentDetails: string | undefined;
    let paymentSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

    const paymentRegexes = [
      { regex: /(registration|processing|application)\s+fee/i, type: 'Registration / Processing Fee' },
      { regex: /security\s+deposit/i, type: 'Refundable Security Deposit' },
      { regex: /(training|laptop|equipment|material)\s+(fee|cost|charge|deposit)/i, type: 'Training / Equipment Fee' },
      { regex: /pay\s+(?:rs\.?|inr|₹|\$)\s*(\d+)/i, type: 'Upfront Payment Request' },
      { regex: /(document|verification)\s+charges?/i, type: 'Document Verification Charge' },
    ];

    for (const pr of paymentRegexes) {
      const match = text.match(pr.regex);
      if (match) {
        paymentDetected = true;
        feeType = pr.type;
        paymentDetails = `Job posting requests a ${pr.type} (${match[0]}). Legitimate employers never charge candidates.`;
        paymentSeverity = 'critical';
        break;
      }
    }

    // 2. Urgency signals
    let urgencyDetected = false;
    let urgencyDetails: string | undefined;
    const urgencyPatterns = [
      /apply\s+within\s+(?:\d+\s+hours?|30\s+mins?|today)/i,
      /limited\s+(?:seats|slots|vacancies)\s+(?:left|available)/i,
      /immediate\s+(?:joining|selection|offer)/i,
      /hiring\s+urgently|urgent\s+requirement/i,
    ];

    for (const up of urgencyPatterns) {
      const match = text.match(up);
      if (match) {
        urgencyDetected = true;
        urgencyDetails = `High-pressure urgency tactic detected ("${match[0]}"). Scammers use false scarcity to rush applicants.`;
        break;
      }
    }

    // 3. Sensitive Data Requests
    const sensitiveItems: string[] = [];
    if (/otp|one\s*time\s*password/i.test(text)) sensitiveItems.push('OTP / Authentication Code');
    if (/bank\s+account\s+details|account\s+number|upi\s+id/i.test(text)) sensitiveItems.push('Bank Account / UPI Details');
    if (/aadhaar|pan\s+card|social\s+security|ssn/i.test(text)) sensitiveItems.push('National ID / Aadhaar / PAN');
    if (/credit\s+card|debit\s+card|cvv/i.test(text)) sensitiveItems.push('Credit / Debit Card credentials');

    // 4. Recruitment Channel & Email
    let channelType: 'official_ats' | 'company_domain' | 'public_email' | 'messaging_app' | 'suspicious_form' | 'unknown' =
      'unknown';
    let channelName = 'Standard portal';
    let channelDetails = 'No direct external application link identified.';
    let isHighRiskChannel = false;

    // Detect ATS
    let detectedAts: string | undefined;
    for (const ats of KNOWN_ATS_DOMAINS) {
      if (lower.includes(ats.match)) {
        detectedAts = ats.name;
        channelType = 'official_ats';
        channelName = `${ats.name} Applicant Tracking System`;
        channelDetails = `Application flows through industry-standard enterprise ATS (${ats.name}).`;
        break;
      }
    }

    // Check for Messaging Apps
    if (!detectedAts) {
      if (lower.includes('telegram') || /t\.me\/[a-zA-Z0-9_]+/i.test(text)) {
        channelType = 'messaging_app';
        channelName = 'Telegram Recruitment';
        channelDetails = 'Recruitment conducted via Telegram. This is a prevalent vector for employment fraud.';
        isHighRiskChannel = true;
      } else if (lower.includes('whatsapp') || /wa\.me\//i.test(text)) {
        channelType = 'messaging_app';
        channelName = 'WhatsApp Recruitment';
        channelDetails = 'Recruitment directed through WhatsApp rather than official company hiring portals.';
        isHighRiskChannel = true;
      } else if (lower.includes('forms.gle') || lower.includes('docs.google.com/forms')) {
        channelType = 'suspicious_form';
        channelName = 'Google Forms Intake';
        channelDetails = 'Unbranded Google Form used to harvest candidate details without corporate authentication.';
        isHighRiskChannel = true;
      }
    }

    // Check Recruiter Email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))/);
    let recruiterEmail: string | undefined;
    let emailDomain: string | undefined;
    let emailType: 'corporate' | 'free_mail' | 'suspicious' | 'unknown' = 'unknown';

    if (emailMatch) {
      recruiterEmail = emailMatch[1];
      emailDomain = emailMatch[2].toLowerCase();

      if (FREE_EMAIL_DOMAINS.has(emailDomain)) {
        emailType = 'free_mail';
        if (channelType === 'unknown') {
          channelType = 'public_email';
          channelName = `Free Webmail (${emailDomain})`;
          channelDetails = `Recruiter contacts applicants from ${emailDomain} rather than a registered corporate domain.`;
        }
      } else if (SUSPICIOUS_TLDS.some((tld) => emailDomain?.endsWith(tld))) {
        emailType = 'suspicious';
        channelType = 'company_domain';
        channelName = 'Suspicious Domain Email';
        channelDetails = `Recruiter domain uses high-risk TLD (${emailDomain}).`;
        isHighRiskChannel = true;
      } else {
        emailType = 'corporate';
        if (channelType === 'unknown') {
          channelType = 'company_domain';
          channelName = `Corporate Domain (${emailDomain})`;
          channelDetails = `Communication originates from corporate domain @${emailDomain}.`;
        }
      }
    }

    // 5. Application URL and Domain Mismatch
    const urlMatches = text.match(/https?:\/\/[^\s<>"]+/gi) || [];
    let applicationUrl: string | undefined;
    let jobDomain: string | undefined;
    let domainMismatchDetected = false;
    let mismatchExplanation: string | undefined;

    if (urlMatches.length > 0 && urlMatches[0]) {
      applicationUrl = urlMatches[0];
      try {
        jobDomain = new URL(applicationUrl).hostname.replace(/^www\./, '');
      } catch {
        jobDomain = undefined;
      }

      if (jobDomain && officialCompanyDomain) {
        const cleanOfficial = officialCompanyDomain.replace(/^www\./, '').toLowerCase();
        const isOfficialSubdomain = jobDomain.endsWith(cleanOfficial);
        const isKnownAts = KNOWN_ATS_DOMAINS.some((a) => jobDomain?.includes(a.match));

        if (!isOfficialSubdomain && !isKnownAts) {
          domainMismatchDetected = true;
          mismatchExplanation = `Application destination (${jobDomain}) does not match employer official domain (${cleanOfficial}) or known ATS portals.`;
        }
      }
    }

    // 6. Compensation analysis
    const salaryMatch = text.match(
      /(?:₹|rs\.?|inr|\$)\s*(\d+(?:,\d+)*(?:\s*(?:k|lakhs?|lac|per\s+month|\/mo|\/month|lpa))?)/i
    );
    let detectedSalary: string | undefined;
    let isSalarySuspicious = false;

    if (salaryMatch) {
      detectedSalary = salaryMatch[0];
      // Check for absurd rates for beginner / entry roles
      if (
        (lower.includes('intern') || lower.includes('data entry') || lower.includes('typing')) &&
        (lower.includes('80,000') || lower.includes('1,00,000') || lower.includes('50000/month') || lower.includes('60,000/month'))
      ) {
        isSalarySuspicious = true;
      }
    }

    // Compile positive and warning signals
    const positiveSignals: string[] = [];
    const warningSignals: string[] = [];
    const criticalFlags: string[] = [];

    if (!paymentDetected) {
      positiveSignals.push('No upfront monetary deposit or registration fee requested.');
    } else {
      criticalFlags.push(paymentDetails || 'Upfront payment requested.');
    }

    if (detectedAts) {
      positiveSignals.push(`Application processed via certified ATS (${detectedAts}).`);
    }

    if (emailType === 'corporate') {
      positiveSignals.push(`Recruiter utilizes authenticated enterprise email domain (@${emailDomain}).`);
    } else if (emailType === 'free_mail') {
      warningSignals.push(
        `Recruiter utilizes a free webmail service (@${emailDomain}). Does not independently authenticate employer affiliation.`
      );
    }

    if (isHighRiskChannel) {
      warningSignals.push(`High-risk communication platform used (${channelName}).`);
    }

    if (urgencyDetected) {
      warningSignals.push(urgencyDetails || 'Artificial urgency tactics detected.');
    }

    if (sensitiveItems.length > 0) {
      criticalFlags.push(`Premature collection of sensitive credentials: ${sensitiveItems.join(', ')}.`);
    }

    if (domainMismatchDetected) {
      warningSignals.push(mismatchExplanation || 'Application URL domain diverges from employer identity.');
    }

    if (isSalarySuspicious) {
      warningSignals.push(
        `Compensation (${detectedSalary}) is unusually elevated for the stated role qualifications.`
      );
    }

    // Extract Job Title
    const titleMatch = text.match(
      /(?:Hiring\s+for|Role|Position|Job\s+Title|Looking\s+for(?:\s+a)?):\s*([A-Za-z\s-]{3,40})/i
    );
    const detectedJobTitle = titleMatch ? titleMatch[1].trim() : undefined;

    return {
      detectedJobTitle,
      detectedCompensation: detectedSalary,
      isCompensationSuspicious: isSalarySuspicious,
      paymentRequests: {
        detected: paymentDetected,
        feeType,
        details: paymentDetails,
        severity: paymentSeverity,
      },
      urgencySignals: {
        detected: urgencyDetected,
        details: urgencyDetails,
      },
      sensitiveDataRequests: {
        detected: sensitiveItems.length > 0,
        items: sensitiveItems,
      },
      recruitmentChannel: {
        type: channelType,
        channelName,
        details: channelDetails,
        isHighRisk: isHighRiskChannel,
      },
      recruiterIdentity: recruiterEmail
        ? {
            email: recruiterEmail,
            emailType,
          }
        : undefined,
      applicationUrl,
      domainMismatch: {
        detected: domainMismatchDetected,
        jobDomain,
        companyDomain: officialCompanyDomain,
        explanation: mismatchExplanation,
      },
      atsIdentified: detectedAts,
      positiveSignals,
      warningSignals,
      criticalFlags,
    };
  }

  /**
   * Transparently fuses employer authenticity with job posting risk signals into an explainable score.
   */
  public calculateRiskScore(
    identityConfidence: number,
    jobAnalysis: JobPostingAnalysis
  ): RiskBreakdown {
    // 1. Employer Authenticity Risk (0 - 100)
    // High identity confidence -> Low authenticity risk
    const employerAuthenticityRisk = Math.max(8, Math.round(100 - identityConfidence * 0.9));

    // 2. Job Posting Content Risk (0 - 100)
    let contentRisk = 10;
    if (jobAnalysis.paymentRequests.detected) contentRisk += 70;
    if (jobAnalysis.sensitiveDataRequests.detected) contentRisk += 40;
    if (jobAnalysis.urgencySignals.detected) contentRisk += 15;
    if (jobAnalysis.isCompensationSuspicious) contentRisk += 20;
    const jobPostingContentRisk = Math.min(100, contentRisk);

    // 3. Recruitment Channel Risk (0 - 100)
    let channelRisk = 15;
    if (jobAnalysis.recruitmentChannel.isHighRisk) channelRisk += 45;
    if (jobAnalysis.recruiterIdentity?.emailType === 'free_mail') channelRisk += 25;
    if (jobAnalysis.recruiterIdentity?.emailType === 'suspicious') channelRisk += 50;
    if (jobAnalysis.atsIdentified) channelRisk = Math.max(5, channelRisk - 25);
    const recruitmentChannelRisk = Math.min(100, channelRisk);

    // 4. Impersonation / Domain Risk (0 - 100)
    let impersonationRisk = 10;
    if (jobAnalysis.domainMismatch.detected) impersonationRisk += 50;
    if (identityConfidence >= 75 && jobAnalysis.recruiterIdentity?.emailType === 'free_mail') {
      impersonationRisk += 35; // Established firm but recruiter uses personal gmail
    }
    const finalImpersonationRisk = Math.min(100, impersonationRisk);

    // 5. Overall Risk Score (0 - 100)
    let overall: number;

    // Hard rules for dangerous vectors
    if (jobAnalysis.paymentRequests.detected) {
      // Immediate scam trigger
      overall = Math.max(82, Math.round(jobPostingContentRisk * 0.9 + recruitmentChannelRisk * 0.1));
    } else if (jobAnalysis.sensitiveDataRequests.detected && jobAnalysis.recruitmentChannel.isHighRisk) {
      overall = Math.max(78, Math.round(jobPostingContentRisk * 0.6 + recruitmentChannelRisk * 0.4));
    } else {
      // Weighted fusion
      overall = Math.round(
        jobPostingContentRisk * 0.35 +
          recruitmentChannelRisk * 0.30 +
          finalImpersonationRisk * 0.20 +
          employerAuthenticityRisk * 0.15
      );
    }

    overall = Math.min(99, Math.max(5, overall));

    let riskLevel: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'VERY HIGH RISK';
    if (overall <= 30) riskLevel = 'LOW RISK';
    else if (overall <= 60) riskLevel = 'MODERATE RISK';
    else if (overall <= 80) riskLevel = 'HIGH RISK';
    else riskLevel = 'VERY HIGH RISK';

    // Rationale construction
    const rationale: string[] = [];

    if (identityConfidence >= 75) {
      rationale.push(`Strong public digital footprint corroborates employer existence (${identityConfidence}/100 identity confidence).`);
    } else if (identityConfidence >= 45) {
      rationale.push(`Moderate public employer presence identified (${identityConfidence}/100 identity confidence).`);
    } else {
      rationale.push(`Limited or unverified public corporate footprint found for the employer (${identityConfidence}/100 identity confidence).`);
    }

    if (jobAnalysis.paymentRequests.detected) {
      rationale.push('Critical warning: Posting requires upfront monetary transaction or deposit.');
    }

    if (jobAnalysis.domainMismatch.detected) {
      rationale.push('Application destination does not correlate with authenticated corporate domains.');
    }

    if (jobAnalysis.recruiterIdentity?.emailType === 'free_mail') {
      rationale.push('Recruiter uses personal webmail, which cannot independently prove corporate affiliation.');
    }

    if (jobAnalysis.atsIdentified) {
      rationale.push(`Authentic ATS portal utilized (${jobAnalysis.atsIdentified}).`);
    }

    // Actionable Recommendations
    const recommendations: string[] = [];

    if (overall >= 75) {
      recommendations.push('Do NOT send money or submit payment for registration, training, or equipment.');
      recommendations.push('Do NOT provide sensitive banking credentials, OTPs, or identity cards.');
      recommendations.push('Cease communication if recruiter insists on Telegram or personal WhatsApp coordination.');
    } else if (overall >= 35) {
      recommendations.push('Independently cross-verify this specific vacancy on the company official careers portal.');
      recommendations.push('Request recruiter verification from an official corporate domain email address.');
      recommendations.push('Never pay any fees during the hiring or onboarding process.');
    } else {
      recommendations.push('Employer identity and job posting flow appear consistent with legitimate recruitment standards.');
      recommendations.push('As standard practice, verify offer documentation before disclosing financial documents for payroll.');
    }

    return {
      overallRiskScore: overall,
      riskLevel,
      employerAuthenticityRisk,
      jobPostingContentRisk,
      recruitmentChannelRisk,
      impersonationRisk: finalImpersonationRisk,
      rationale,
      recommendations,
    };
  }

  /**
   * End-to-end orchestration pipeline.
   */
  public async analyze(
    text?: string,
    imageBase64?: string,
    imageMimeType?: string,
    companyOverride?: string
  ): Promise<AnalyzeResponse> {
    // 1. Extract content and employer
    const extracted = await this.extractJobContent(text, imageBase64, imageMimeType);
    const content = extracted.extractedText || text || '';

    let targetCompany = '';
    let companySource: 'detected' | 'override' | 'fallback' = 'detected';
    let detectionConfidence = extracted.confidence;

    if (companyOverride && companyOverride.trim().length > 0) {
      targetCompany = companyOverride.trim();
      companySource = 'override';
      detectionConfidence = 100;
    } else if (extracted.detectedCompany) {
      targetCompany = extracted.detectedCompany;
      companySource = 'detected';
    } else {
      // Fallback extraction
      targetCompany = 'Unknown Employer';
      companySource = 'fallback';
      detectionConfidence = 20;
    }

    // 2. Conduct autonomous web research on company
    const research = await this.searchEngine.researchCompany(
      targetCompany,
      companySource,
      detectionConfidence
    );

    // 3. Analyze job posting scam signals with official domain context
    const jobAnalysis = this.analyzeJobSignals(
      content,
      research.companyResearch.official_presence.domain
    );

    // 4. Calculate fused risk score
    const riskBreakdown = this.calculateRiskScore(
      research.companyResearch.identity_confidence,
      jobAnalysis
    );

    return {
      success: true,
      extractedText: content,
      companyResearch: research.companyResearch,
      jobAnalysis,
      riskBreakdown,
      sources: research.sources,
      searchDiagnostics: {
        queriesExecuted: research.diagnostics.queriesExecuted,
        provider: research.diagnostics.provider,
        cached: research.diagnostics.cached,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
