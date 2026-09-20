import { GoogleGenAI } from '@google/genai';
import { CompanySearchEngine } from './search/searchEngine.js';
import {
  AnalyzeResponse,
  DetectedUrl,
  InternshipRiskAssessment,
  JobPostingAnalysis,
  PreFlightChecklistItem,
  RiskBreakdown,
  VerdictInfo,
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
  { name: 'Keka', match: 'keka.com' },
  { name: 'Freshteam', match: 'freshteam.com' },
  { name: 'Darwinbox', match: 'darwinbox.com' },
  { name: 'Cutshort', match: 'cutshort.io' },
  { name: 'Instahyre', match: 'instahyre.com' },
  { name: 'Wellfound', match: 'wellfound.com' },
  { name: 'AngelList', match: 'angel.co' },
  { name: 'Internshala', match: 'internshala.com' },
  { name: 'Unstop', match: 'unstop.com' },
  { name: 'Naukri', match: 'naukri.com' },
  { name: 'Indeed', match: 'indeed.com' },
  { name: 'Hirist', match: 'hirist.tech' },
  { name: 'Hirist', match: 'hirist.com' },
  { name: 'RippleMatch', match: 'ripplematch.com' },
  { name: 'Handshake', match: 'joinhandshake.com' },
  { name: 'Taleo', match: 'taleo.net' },
  { name: 'SuccessFactors', match: 'successfactors.com' },
  { name: 'LinkedIn Jobs', match: 'linkedin.com/jobs' },
];

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.in',
  'hotmail.com',
  'outlook.com',
  'rediffmail.com',
  'yopmail.com',
  'protonmail.com',
  'mail.com',
  'aol.com',
  'zoho.com',
  'icloud.com',
]);

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.info', '.work', '.click', '.buzz', '.fit', '.cfd', '.quest', '.gq', '.ml', '.tk', '.ga', '.cf'];

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
                text: 'Perform high-precision OCR on this job posting or offer screenshot. Transcribe all text accurately, including employer header, recruiter contacts, links, job description, stipend/salary details, and any document/payment requests.',
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
      /(?:at|for|with|company:?|employer:?|organization:?)\s+([A-Z][A-Za-z0-9&.\s]{2,30})(?:\s+(?:is hiring|seeks|is looking|careers|pvt|ltd|inc|corp))/i,
      /(?:^|\n)\s*(?:Company|Organization|Hiring Firm):\s*([A-Z][A-Za-z0-9&.\s]{2,30})/i,
      /(?:join the team at|career at|working at)\s+([A-Z][A-Za-z0-9&.\s]{2,30})/i,
    ];

    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        detectedCompany = match[1].trim();
        confidence = 80;
        break;
      }
    }

    // If still not detected and Gemini is available, use fast entity extraction
    if (!detectedCompany && fullText.length > 20 && this.ai) {
      try {
        const extractPrompt = `Identify the hiring company name mentioned in this job posting or message.
Return ONLY a JSON object with:
{"company": "Extracted Company Name or empty string", "confidence": number between 0 and 100}

Text:
${fullText.slice(0, 1500)}`;

        const res = await this.ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: extractPrompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(res.text || '{}');
        if (parsed.company && parsed.company.trim().length > 1) {
          detectedCompany = parsed.company.trim();
          confidence = parsed.confidence || 75;
        }
      } catch {
        // Fall back gracefully
      }
    }

    return {
      extractedText: fullText,
      detectedCompany,
      confidence,
    };
  }

  /**
   * Evaluates text for scam indicators, payment requests, ATS platforms, sensitive credentials,
   * student/internship traps, and generates an explainable verdict & pre-flight checklist.
   */
  public analyzeJobSignals(
    text: string,
    officialCompanyDomain?: string
  ): JobPostingAnalysis {
    const lower = text.toLowerCase();

    // 1. Payment Requests Detection (Zero-Tolerance)
    const paymentPatterns = [
      { regex: /registration\s+fee/i, type: 'Registration Fee', severity: 'critical' as const },
      { regex: /security\s+deposit/i, type: 'Security Deposit', severity: 'critical' as const },
      { regex: /refundable\s+(?:deposit|amount|caution\s+money)/i, type: 'Refundable Caution Deposit', severity: 'critical' as const },
      { regex: /training\s+fee|pay\s+for\s+training|training\s+charges/i, type: 'Training Fee / Pay-to-Train', severity: 'critical' as const },
      { regex: /equipment\s+(?:fee|deposit|charge|insurance)|laptop\s+deposit|courier\s+charge/i, type: 'Equipment / Laptop Courier Deposit', severity: 'critical' as const },
      { regex: /document\s+verification\s+fee|processing\s+fee|application\s+fee/i, type: 'Document Verification / Processing Fee', severity: 'critical' as const },
      { regex: /pay\s+(?:inr|rs\.?|₹|\$)\s*\d+/i, type: 'Direct Payment Demand', severity: 'critical' as const },
      { regex: /send\s+(?:money|payment|crypto|usdt|upi)/i, type: 'Payment Transaction Demand', severity: 'critical' as const },
    ];

    let paymentDetected = false;
    let feeType: string | undefined;
    let paymentDetails: string | undefined;
    let paymentSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

    for (const p of paymentPatterns) {
      if (p.regex.test(text)) {
        paymentDetected = true;
        feeType = p.type;
        paymentSeverity = p.severity;
        paymentDetails = `Flagged "${p.type}". Legitimate companies NEVER request money, deposits, or kit fees from job seekers or interns.`;
        break;
      }
    }

    // 2. Student / Internship Trap Analysis
    const isPayToIntern = /pay\s+to\s+intern|paid\s+internship\s+fee|internship\s+certificate\s+charge|pay\s+for\s+certificate/i.test(text) ||
      (lower.includes('intern') && paymentDetected);

    const isTaskScamPattern = /(?:like|subscribe|review)\s+(?:youtube|telegram|google\s+maps|hotel)|daily\s+profit|usdt\s+task|earn\s+₹?\d{3,5}\s+per\s+day|task\s+completion\s+commission/i.test(text);

    const isCertificateTrap = /experience\s+letter\s+(?:fee|charges|cost)|certificate\s+only\s+internship|guaranteed\s+placement\s+after\s+unpaid/i.test(text);

    // 3. Urgency & High-Pressure Tactics
    const urgencyPatterns = [
      /immediate\s+joining\s+only/i,
      /limited\s+(?:seats|vacancies|slots)\s+available/i,
      /apply\s+within\s+(?:24|12|2|1)\s+(?:hours?|hrs?)/i,
      /direct\s+selection\s+(?:without|no)\s+interview/i,
      /spot\s+offer/i,
      /urgent\s+hiring\s+hurry/i,
    ];

    let urgencyDetected = false;
    let urgencyDetails: string | undefined;
    for (const up of urgencyPatterns) {
      const match = text.match(up);
      if (match) {
        urgencyDetected = true;
        urgencyDetails = `High-pressure urgency tactic detected ("${match[0]}"). Scammers use false urgency to bypass candidate diligence.`;
        break;
      }
    }

    // 4. Sensitive Data Requests (Identity & Banking)
    const sensitiveItems: string[] = [];
    if (/otp|one\s*time\s*password/i.test(text)) sensitiveItems.push('OTP / Authentication Code');
    if (/bank\s+account\s+details|account\s+number|ifsc|cancelled\s+cheque|upi\s+pin/i.test(text)) sensitiveItems.push('Bank Account / UPI Credentials');
    if (/aadhaar|pan\s+card|social\s+security|ssn|passport\s+copy/i.test(text)) sensitiveItems.push('National ID (Aadhaar / PAN / SSN)');
    if (/credit\s+card|debit\s+card|cvv|atm\s+pin/i.test(text)) sensitiveItems.push('Credit / Debit Card Credentials');

    const riskExplanation = sensitiveItems.length > 0
      ? `Premature collection of sensitive credentials (${sensitiveItems.join(', ')}). In legitimate corporate hiring, identity and banking documents are only requested AFTER a formal written offer letter is accepted.`
      : undefined;

    // 5. Comprehensive URL Extraction & Classification
    const allRawUrls = text.match(/https?:\/\/[^\s<>"]+/gi) || [];
    const detectedUrls: DetectedUrl[] = [];

    for (const rawUrl of allRawUrls) {
      try {
        const parsed = new URL(rawUrl);
        const domain = parsed.hostname.replace(/^www\./, '').toLowerCase();

        // Check ATS
        const matchingAts = KNOWN_ATS_DOMAINS.find((ats) => domain.includes(ats.match));
        if (matchingAts) {
          detectedUrls.push({
            url: rawUrl,
            domain,
            type: 'ats',
            isSafe: true,
            platformName: matchingAts.name,
          });
          continue;
        }

        // Check Forms
        if (domain.includes('forms.gle') || domain.includes('docs.google.com') || domain.includes('typeform.com') || domain.includes('tally.so')) {
          detectedUrls.push({
            url: rawUrl,
            domain,
            type: 'unbranded_form',
            isSafe: false,
            platformName: 'Unbranded Intake Form',
            warning: 'Unauthenticated public form. Easy for impersonators to harvest candidate resumes.',
          });
          continue;
        }

        // Check Messaging Apps
        if (domain.includes('t.me') || domain.includes('wa.me') || domain.includes('whatsapp.com')) {
          detectedUrls.push({
            url: rawUrl,
            domain,
            type: 'messaging',
            isSafe: false,
            platformName: domain.includes('t.me') ? 'Telegram' : 'WhatsApp',
            warning: 'Messaging app channel. Major vector for task scams and untraceable communications.',
          });
          continue;
        }

        // Check Suspicious TLD or Shorteners
        const isSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld));
        const isShortener = ['bit.ly', 'tinyurl.com', 'is.gd', 'cutt.ly', 'rb.gy'].includes(domain);

        if (isSuspiciousTld || isShortener) {
          detectedUrls.push({
            url: rawUrl,
            domain,
            type: 'suspicious',
            isSafe: false,
            platformName: isShortener ? 'URL Shortener' : 'Untrusted TLD Domain',
            warning: isShortener ? 'Masked destination URL.' : `Domain uses high-risk TLD (${domain}).`,
          });
          continue;
        }

        // Official Domain check
        const cleanOfficial = officialCompanyDomain?.replace(/^www\./, '').toLowerCase();
        if (cleanOfficial && (domain === cleanOfficial || domain.endsWith('.' + cleanOfficial))) {
          detectedUrls.push({
            url: rawUrl,
            domain,
            type: 'official_site',
            isSafe: true,
            platformName: 'Company Official Domain',
          });
          continue;
        }

        // Other domain
        detectedUrls.push({
          url: rawUrl,
          domain,
          type: 'other',
          isSafe: true,
        });
      } catch {
        // invalid URL skip
      }
    }

    // 6. Recruitment Channel & Email Detection
    let channelType: 'official_ats' | 'company_domain' | 'public_email' | 'messaging_app' | 'suspicious_form' | 'unknown' = 'unknown';
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

    // Check Messaging Apps & Forms if not ATS
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
      } else if (lower.includes('forms.gle') || lower.includes('docs.google.com/forms') || lower.includes('tally.so')) {
        channelType = 'suspicious_form';
        channelName = 'Unbranded Form Intake';
        channelDetails = 'Unbranded public form used to harvest candidate details without corporate authentication.';
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

    // 7. Domain Mismatch Calculation
    const applicationUrl = detectedUrls.length > 0 ? detectedUrls[0].url : undefined;
    let jobDomain: string | undefined = detectedUrls.length > 0 ? detectedUrls[0].domain : undefined;
    let domainMismatchDetected = false;
    let mismatchExplanation: string | undefined;

    if (jobDomain && officialCompanyDomain) {
      const cleanOfficial = officialCompanyDomain.replace(/^www\./, '').toLowerCase();
      const isOfficialSubdomain = jobDomain === cleanOfficial || jobDomain.endsWith('.' + cleanOfficial);
      const isKnownAts = KNOWN_ATS_DOMAINS.some((a) => jobDomain?.includes(a.match));

      if (!isOfficialSubdomain && !isKnownAts) {
        domainMismatchDetected = true;
        mismatchExplanation = `Application destination (${jobDomain}) diverges from the employer's authenticated domain (${cleanOfficial}) and recognized ATS portals.`;
      }
    }

    // 8. Compensation analysis & Stipend Sanity Check
    const salaryMatch = text.match(
      /(?:₹|rs\.?|inr|\$)\s*(\d+(?:,\d+)*(?:\s*(?:k|lakhs?|lac|per\s+month|\/mo|\/month|lpa|per\s+day|\/day))?)/i
    );
    let detectedSalary: string | undefined;
    let isSalarySuspicious = false;

    if (salaryMatch) {
      detectedSalary = salaryMatch[0];
      // Check for absurd rates for beginner / entry roles
      if (
        (lower.includes('intern') || lower.includes('data entry') || lower.includes('typing') || lower.includes('copy paste')) &&
        (lower.includes('80,000') || lower.includes('1,00,000') || lower.includes('50000/month') || lower.includes('60,000/month') || lower.includes('5,000/day') || lower.includes('3000/day'))
      ) {
        isSalarySuspicious = true;
      }
    }

    const internshipNotes: string[] = [];
    if (isPayToIntern) internshipNotes.push('Pay-to-intern or paid certificate trap detected.');
    if (isSalarySuspicious) internshipNotes.push(`Unrealistic stipend (${detectedSalary}) for an entry-level / intern role.`);
    if (isTaskScamPattern) internshipNotes.push('Task fraud indicators detected (e.g. video like / hotel review commission).');
    if (isCertificateTrap) internshipNotes.push('Offer promotes paid certificates rather than genuine career experience.');

    const internshipAssessment: InternshipRiskAssessment = {
      isPayToIntern,
      isUnrealisticStipend: isSalarySuspicious,
      isTaskScamPattern,
      isCertificateTrap,
      notes: internshipNotes,
    };

    // 9. Positive and Warning Signals Collection
    const positiveSignals: string[] = [];
    const warningSignals: string[] = [];
    const criticalFlags: string[] = [];

    if (!paymentDetected) {
      positiveSignals.push('Zero upfront monetary deposit, registration fee, or training charge requested.');
    } else {
      criticalFlags.push(paymentDetails || 'Upfront payment requested.');
    }

    if (detectedAts) {
      positiveSignals.push(`Application submitted via certified Applicant Tracking System (${detectedAts}).`);
    }

    if (emailType === 'corporate') {
      positiveSignals.push(`Recruiter communicates from an authenticated corporate email domain (@${emailDomain}).`);
    } else if (emailType === 'free_mail') {
      warningSignals.push(
        `Recruiter uses personal webmail (@${emailDomain}). Cannot independently verify corporate employment.`
      );
    }

    if (isHighRiskChannel) {
      warningSignals.push(`High-risk communication platform utilized (${channelName}).`);
    }

    if (urgencyDetected) {
      warningSignals.push(urgencyDetails || 'Artificial urgency tactics detected.');
    }

    if (sensitiveItems.length > 0) {
      criticalFlags.push(`Premature request for sensitive credentials: ${sensitiveItems.join(', ')}.`);
    }

    if (domainMismatchDetected) {
      warningSignals.push(mismatchExplanation || 'Application URL domain diverges from employer identity.');
    }

    if (isSalarySuspicious) {
      warningSignals.push(
        `Compensation (${detectedSalary}) is suspiciously inflated for the stated entry qualifications.`
      );
    }

    if (isTaskScamPattern) {
      criticalFlags.push('Task-based commission scam pattern identified (review/like task trap).');
    }

    // Extract Job Title
    const titleMatch = text.match(
      /(?:Hiring\s+for|Role|Position|Job\s+Title|Looking\s+for(?:\s+a)?):\s*([A-Za-z\s-]{3,40})/i
    );
    const detectedJobTitle = titleMatch ? titleMatch[1].trim() : undefined;

    // Construct Temporary Verdict & Checklist (Refined in calculateRiskScore)
    const initialVerdict: VerdictInfo = {
      status: paymentDetected || isTaskScamPattern ? 'DO_NOT_APPLY' : 'PROCEED_WITH_CAUTION',
      title: paymentDetected ? 'DO NOT APPLY: Immediate Financial Hazard' : 'PROCEED WITH CAUTION: Verify First',
      summary: paymentDetected
        ? 'This posting demands upfront money or deposits. Legitimate employers never charge candidates.'
        : 'Review employer credentials and careers page before submitting personal documents.',
      actionGuidance: paymentDetected
        ? 'Do not transfer any funds or share banking details. Block the sender.'
        : 'Verify the vacancy on the official company careers portal.',
      badges: [],
    };

    return {
      detectedJobTitle,
      detectedCompensation: detectedSalary,
      isCompensationSuspicious: isSalarySuspicious,
      verdict: initialVerdict,
      checklist: [],
      detectedUrls,
      internshipAssessment,
      careersPageMatch: {
        checked: true,
        found: !!detectedAts,
        url: detectedAts ? applicationUrl : undefined,
        note: detectedAts
          ? `Corroborated via ${detectedAts} ATS portal.`
          : 'Direct listing on company careers portal not yet confirmed.',
      },
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
        riskExplanation,
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
   * Transparently fuses employer authenticity with job posting risk signals into an explainable score,
   * generates evidence-backed 'Why This Score?' points, dynamic Student Checklist, and high-impact Verdict.
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
    if (jobAnalysis.internshipAssessment.isTaskScamPattern) contentRisk += 50;
    if (jobAnalysis.internshipAssessment.isPayToIntern) contentRisk += 40;
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

    // 5. Overall Risk Score (0 - 100) with Hierarchical Veto Logic
    let overall: number;

    if (jobAnalysis.paymentRequests.detected) {
      // Upfront payment is an immediate critical hazard veto
      overall = Math.max(85, Math.round(jobPostingContentRisk * 0.9 + recruitmentChannelRisk * 0.1));
    } else if (jobAnalysis.internshipAssessment.isTaskScamPattern) {
      overall = Math.max(88, Math.round(jobPostingContentRisk * 0.85 + recruitmentChannelRisk * 0.15));
    } else if (jobAnalysis.sensitiveDataRequests.detected && jobAnalysis.recruitmentChannel.isHighRisk) {
      overall = Math.max(78, Math.round(jobPostingContentRisk * 0.6 + recruitmentChannelRisk * 0.4));
    } else if (jobAnalysis.domainMismatch.detected && identityConfidence >= 70) {
      // Impersonating an established company
      overall = Math.max(72, Math.round(finalImpersonationRisk * 0.6 + channelRisk * 0.4));
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
      recommendations.push('Do NOT provide sensitive banking credentials, OTPs, or national identity cards.');
      recommendations.push('Cease communication if recruiter insists on Telegram or personal WhatsApp coordination.');
    } else if (overall >= 35) {
      recommendations.push('Independently cross-verify this specific vacancy on the company official careers portal.');
      recommendations.push('Request recruiter verification from an official corporate domain email address.');
      recommendations.push('Never pay any fees during the hiring or onboarding process.');
    } else {
      recommendations.push('Employer identity and job posting flow appear consistent with legitimate recruitment standards.');
      recommendations.push('As standard practice, verify offer documentation before disclosing financial documents for payroll.');
    }

    // 6. Build Explainable "Why This Score?" Structure
    const whyThisScore = {
      positives: [] as { point: string; evidence: string }[],
      warnings: [] as { point: string; evidence: string }[],
      hazards: [] as { point: string; evidence: string }[],
    };

    if (identityConfidence >= 70) {
      whyThisScore.positives.push({
        point: 'Verified Corporate Entity',
        evidence: `Discovered official corporate domain and validated web footprint (${identityConfidence}% confidence).`,
      });
    }

    if (!jobAnalysis.paymentRequests.detected) {
      whyThisScore.positives.push({
        point: 'Zero Payment Requested',
        evidence: 'No registration, kit fee, or caution deposit demanded in text.',
      });
    } else {
      whyThisScore.hazards.push({
        point: 'Upfront Money Demanded',
        evidence: jobAnalysis.paymentRequests.details || 'Demands payment before hiring.',
      });
    }

    if (jobAnalysis.atsIdentified) {
      whyThisScore.positives.push({
        point: 'Certified Enterprise ATS',
        evidence: `Application is routed through ${jobAnalysis.atsIdentified}.`,
      });
    }

    if (jobAnalysis.recruiterIdentity?.emailType === 'corporate') {
      whyThisScore.positives.push({
        point: 'Authenticated Company Domain',
        evidence: `Recruiter email matches corporate domain (${jobAnalysis.recruiterIdentity.email}).`,
      });
    } else if (jobAnalysis.recruiterIdentity?.emailType === 'free_mail') {
      whyThisScore.warnings.push({
        point: 'Unverified Personal Webmail',
        evidence: `Recruiter uses free webmail (${jobAnalysis.recruiterIdentity.email}). Any individual can create this address.`,
      });
    }

    if (jobAnalysis.domainMismatch.detected) {
      whyThisScore.warnings.push({
        point: 'Destination Domain Divergence',
        evidence: jobAnalysis.domainMismatch.explanation || 'Application destination differs from corporate domain.',
      });
    }

    if (jobAnalysis.recruitmentChannel.isHighRisk) {
      whyThisScore.warnings.push({
        point: 'High-Risk Hiring Channel',
        evidence: jobAnalysis.recruitmentChannel.details,
      });
    }

    if (jobAnalysis.sensitiveDataRequests.detected) {
      whyThisScore.hazards.push({
        point: 'Premature Credential Harvesting',
        evidence: `Requests: ${jobAnalysis.sensitiveDataRequests.items.join(', ')}.`,
      });
    }

    if (jobAnalysis.internshipAssessment.isTaskScamPattern) {
      whyThisScore.hazards.push({
        point: 'Task Fraud / Daily Commission Vector',
        evidence: 'Solicits video review or hotel rating tasks with promise of commissions.',
      });
    }

    // 7. Update JobAnalysis Verdict & Checklist
    let verdictStatus: 'SAFE_TO_APPLY' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_APPLY';
    let verdictTitle: string;
    let verdictSummary: string;
    let verdictAction: string;
    const badges: { label: string; type: 'success' | 'warning' | 'danger' | 'info' }[] = [];

    if (overall <= 30) {
      verdictStatus = 'SAFE_TO_APPLY';
      verdictTitle = 'SAFE TO APPLY — Verified Standard Process';
      verdictSummary = 'Employer identity is corroborated, legitimate recruitment channels are used, and no scam vectors were detected.';
      verdictAction = 'Proceed with application through the certified portal or official company website.';
      badges.push({ label: 'Verified Channel', type: 'success' });
      badges.push({ label: '₹0 Fees', type: 'success' });
    } else if (overall <= 65) {
      verdictStatus = 'PROCEED_WITH_CAUTION';
      verdictTitle = 'PROCEED WITH CAUTION — Verification Needed';
      verdictSummary = 'Employer may have a real public profile, but this specific posting or recruiter channel has unverified flags.';
      verdictAction = 'Check the company official careers page or contact the company through verified LinkedIn before sharing documents.';
      badges.push({ label: 'Unverified Recruiter', type: 'warning' });
      badges.push({ label: 'Verify On Careers Page', type: 'warning' });
    } else {
      verdictStatus = 'DO_NOT_APPLY';
      verdictTitle = 'DO NOT APPLY — High-Risk Fraud Indicators';
      verdictSummary = jobAnalysis.paymentRequests.detected
        ? 'CRITICAL HAZARD: Immediate financial trap. Real employers NEVER demand money, deposits, or training fees from students.'
        : 'Multiple high-risk fraud signals identified (untraceable channels, document phishing, or brand impersonation).';
      verdictAction = 'Do NOT send money, do NOT share Aadhaar/PAN/OTP, and cease communication immediately.';
      badges.push({ label: 'High Scam Risk', type: 'danger' });
      if (jobAnalysis.paymentRequests.detected) badges.push({ label: 'Fee Extortion', type: 'danger' });
    }

    jobAnalysis.verdict = {
      status: verdictStatus,
      title: verdictTitle,
      summary: verdictSummary,
      actionGuidance: verdictAction,
      badges,
    };

    // 8. Generate Student Pre-Flight Checklist
    const checklist: PreFlightChecklistItem[] = [
      {
        id: 'chk-fee',
        title: 'Zero Upfront Payment Guarantee',
        description: 'Verify that zero rupees are requested for registration, training, laptop deposit, or processing.',
        category: 'payment',
        status: jobAnalysis.paymentRequests.detected ? 'critical' : 'passed',
        advice: jobAnalysis.paymentRequests.detected
          ? 'STOP! This job asks for money. Real companies pay you; they NEVER ask for deposits.'
          : 'Confirmed: No payment demands detected in this posting.',
      },
      {
        id: 'chk-careers',
        title: 'Official Careers Page Cross-Check',
        description: 'Check if this specific opening exists on the official website careers portal.',
        category: 'careers_page',
        status: jobAnalysis.atsIdentified ? 'passed' : 'action_required',
        advice: jobAnalysis.atsIdentified
          ? `Verified via recognized ATS portal (${jobAnalysis.atsIdentified}).`
          : 'Search the company official website under /careers to ensure this opening is genuine.',
      },
      {
        id: 'chk-recruiter',
        title: 'Recruiter Domain & Identity Verification',
        description: 'Check whether the recruiter is using an authenticated corporate email or unverified personal webmail.',
        category: 'channel',
        status: jobAnalysis.recruiterIdentity?.emailType === 'corporate' ? 'passed' : jobAnalysis.recruiterIdentity?.emailType === 'free_mail' ? 'warning' : 'action_required',
        advice: jobAnalysis.recruiterIdentity?.emailType === 'corporate'
          ? 'Passed: Recruiter uses authenticated corporate domain.'
          : 'Caution: Recruiter uses personal webmail. Search recruiter on LinkedIn to verify employment.',
      },
      {
        id: 'chk-docs',
        title: 'Pre-Offer Document & Identity Shield',
        description: 'Ensure you have not submitted PAN, Aadhaar, Bank Details, Cancelled Cheque, or OTP.',
        category: 'documents',
        status: jobAnalysis.sensitiveDataRequests.detected ? 'critical' : 'passed',
        advice: jobAnalysis.sensitiveDataRequests.detected
          ? 'Warning: Never share PAN/Aadhaar/Bank details before receiving and verifying a formal written offer letter.'
          : 'No premature requests for bank details or national IDs detected.',
      },
      {
        id: 'chk-url',
        title: 'Application Link & Destination Safety',
        description: 'Inspect the destination domain to avoid phishing forms and masked link redirectors.',
        category: 'channel',
        status: jobAnalysis.domainMismatch.detected ? 'warning' : 'passed',
        advice: jobAnalysis.domainMismatch.detected
          ? 'Review the link carefully: Destination does not match the known employer domain.'
          : 'Application destination aligns with recognized corporate or ATS infrastructure.',
      },
    ];

    jobAnalysis.checklist = checklist;

    return {
      overallRiskScore: overall,
      riskLevel,
      employerAuthenticityRisk,
      jobPostingContentRisk,
      recruitmentChannelRisk,
      impersonationRisk: finalImpersonationRisk,
      rationale,
      recommendations,
      whyThisScore,
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

  /**
   * Predefined realistic test cases for hackathon demonstration.
   */
  public getPredefinedTestCases() {
    return [
      {
        id: 'clearao-analytics',
        name: 'Clearao Analytics (Phonetic & Webfootprint Bug Fix)',
        company: 'Clearao Analytics',
        badge: 'Phonetic Match',
        description: 'Test phonetic name resolution (Clearao -> Clearo.analytics) with verified LinkedIn and web presence.',
        text: `Company: Clearao Analytics
Role: AI Solutions Intern
Stipend: ₹25,000/month
Apply at our official portal: https://clearo.analytics/careers
Requirements: Python, Prompt Engineering, React.
Note: No application fee or security deposit is ever required from applicants.`,
      },
      {
        id: 'telegram-deposit-scam',
        name: 'Data Entry Deposit Scam (Telegram + Upfront Fee)',
        company: 'Apex Digital Solutions',
        badge: 'Critical Scam',
        description: 'Classic student trap: high stipend for simple typing, refundable laptop security deposit, contact via Telegram.',
        text: `HIRING: Online Data Entry & Form Filling Interns!
Earn ₹45,000/month working 2 hours/day from home.
Immediate selection - No technical interview required! Limited 15 seats available.
To dispatch your company-provided MacBook Air, deposit a 100% refundable security courier fee of ₹4,500.
Contact HR Manager Priya immediately on Telegram: https://t.me/apex_digital_hr_officer`,
      },
      {
        id: 'stripe-greenhouse-authentic',
        name: 'Stripe Software Engineering Intern (Authentic Enterprise)',
        company: 'Stripe',
        badge: 'Authentic ATS',
        description: 'Verified enterprise company with authentic Greenhouse ATS application link and standard requirements.',
        text: `Stripe is hiring Software Engineering Interns for Summer 2026.
Location: Bengaluru / Remote
Team: Payments Infrastructure
Apply directly via our Greenhouse careers board:
https://boards.greenhouse.io/stripe/jobs/591823902
We look for strong CS fundamentals, distributed systems passion, and collaborative problem solving.`,
      },
      {
        id: 'microsoft-impersonation',
        name: 'Microsoft Impersonation (Domain Mismatch + Webmail)',
        company: 'Microsoft',
        badge: 'Impersonation Trap',
        description: 'Scammers using Microsoft brand name but directing students to a fake domain and Gmail recruiter.',
        text: `Congratulations! Your profile has been shortlisted for Microsoft Cloud Support Specialist.
Salary: ₹8,50,000 LPA.
Please complete your onboarding verification at:
http://microsoft-careers-fasttrack.xyz/onboard/student
Send your resume and national ID copy to our HR coordinator at: microsoft.recruitment.team.apac@gmail.com
Hurry, offer expires in 24 hours.`,
      },
      {
        id: 'task-scam-youtube',
        name: 'YouTube Task Scam (Daily Commission Trap)',
        company: 'Global Media Partners',
        badge: 'Task Fraud',
        description: 'Viral part-time job scam offering daily profit for liking videos, eventually locking money in crypto deposits.',
        text: `Part-time Student Opportunity!
Work 30 minutes daily: Like and subscribe to YouTube channels and submit screenshots.
Earn ₹2,500 to ₹5,000 per day directly to your UPI ID!
No experience needed. Daily payouts guaranteed.
Join our official Telegram training group to receive task link: https://t.me/global_media_daily_tasks`,
      },
    ];
  }
}
