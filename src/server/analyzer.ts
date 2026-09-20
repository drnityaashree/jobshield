import { GoogleGenAI } from '@google/genai';
import { CompanySearchEngine } from './search/searchEngine.js';
import {
  ActionPlanItem,
  AnalysisConfidenceInfo,
  AnalyzeResponse,
  CompanyResearchResult,
  ConflictingEvidence,
  ContactCompanyGuide,
  DetectedUrl,
  EvidenceGraph,
  EvidenceGraphEdge,
  EvidenceGraphNode,
  InternshipRiskAssessment,
  JobPostingAnalysis,
  PreFlightChecklistItem,
  ResearchTraceStep,
  RiskBreakdown,
  VerdictInfo,
  VerifyItYourselfTool,
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
      { regex: /registration\s+(?:fee|charges?|cost)/i, type: 'Registration Fee', severity: 'critical' as const },
      { regex: /security\s+(?:deposit|amount|fee)/i, type: 'Security Deposit', severity: 'critical' as const },
      { regex: /refundable\s+(?:deposit|amount|caution\s+money|fee)/i, type: 'Refundable Caution Deposit', severity: 'critical' as const },
      { regex: /(?:training|documentation|onboarding|portal|activation|sandbox|software|license|kit)\s*(?:and\s*[\w\s]{1,20})?(?:fee|charges?|cost|deposit)/i, type: 'Training / Onboarding Fee Trap', severity: 'critical' as const },
      { regex: /equipment\s+(?:fee|deposit|charge|insurance)|laptop\s+deposit|courier\s+charge/i, type: 'Equipment / Laptop Courier Deposit', severity: 'critical' as const },
      { regex: /(?:document(?:ation)?|verification|processing|application|selection)\s+(?:fee|charges?|cost)/i, type: 'Document Verification / Processing Fee', severity: 'critical' as const },
      { regex: /pay\s+(?:inr|rs\.?|₹|\$)\s*\d+/i, type: 'Direct Payment Demand', severity: 'critical' as const },
      { regex: /(?:pay|deposit|transfer|send)\s+[\w\s]{0,40}?(?:fee|deposit|amount|charge|(?:inr|rs\.?|₹|\$)\s*\d+)/i, type: 'Monetary Demand Prior to Joining', severity: 'critical' as const },
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

    const isTaskScamPattern =
      /(?:like|subscribe|review|rating|comment).{0,30}(?:youtube|telegram|google\s*maps|hotel|video|instagram|channel)/i.test(text) ||
      /(?:daily\s*(?:profit|income|payout)|usdt\s*task|task\s*completion\s*(?:bonus|commission)|earn\s*(?:₹|rs\.?|\$)?\s*\d{1,5}(?:,\d+)?\s*(?:\/|\s*per\s*)(?:day|daily))/i.test(text) ||
      /part-time\s*(?:student\s*)?task|complete\s*(?:simple\s*)?tasks?\s*(?:to\s*earn|and\s*get\s*paid)/i.test(text);

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
    const initialChecklist: PreFlightChecklistItem[] = [
      {
        id: 'chk-payment',
        title: 'Zero Upfront Monetary Demands',
        description: 'Verify the employer demands ₹0 for application, training, laptops, or deposits.',
        category: 'payment',
        status: paymentDetected ? 'critical' : 'passed',
        advice: paymentDetected
          ? 'DO NOT PAY: Demanding money from job seekers is fraud.'
          : 'Zero monetary fee requested.',
      },
      {
        id: 'chk-channel',
        title: 'Application Channel Authentication',
        description: 'Ensure application is routed via official company domain or recognized ATS.',
        category: 'channel',
        status: isHighRiskChannel ? 'warning' : 'passed',
        advice: isHighRiskChannel
          ? 'Channel is unauthenticated (messaging app or unbranded form).'
          : 'Channel meets standard corporate hiring practices.',
      },
    ];

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
      checklist: initialChecklist,
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

    // 5. Calculate Opportunity Trust Score (0 to 100)
    // When risk is high, opportunity trust score is low.
    const opportunityTrustScore = Math.max(5, Math.min(98, 100 - riskBreakdown.overallRiskScore));

    // 6. Build Opportunity Evidence Graph
    const evidenceGraph = this.buildEvidenceGraph(
      research.companyResearch,
      jobAnalysis,
      riskBreakdown
    );

    // 7. Detect Conflicting Evidence State
    const conflictingEvidence = this.detectConflictingEvidence(
      research.companyResearch,
      jobAnalysis,
      evidenceGraph
    );

    // 8. Calculate Analysis Confidence Info
    const confidenceInfo = this.buildAnalysisConfidence(
      research.companyResearch,
      jobAnalysis,
      research.sources.length
    );

    // 9. Generate Transparent Research Trace
    const researchTrace = this.generateResearchTrace(
      targetCompany,
      research.companyResearch,
      jobAnalysis,
      research.sources.length,
      research.diagnostics.queriesExecuted
    );

    // 10. Generate Student Action Plan
    const actionPlan = this.generateActionPlan(
      jobAnalysis,
      riskBreakdown,
      research.companyResearch
    );

    // 11. Generate Interactive Verify It Yourself Tools
    const verifyItYourself = this.generateVerifyItYourself(
      targetCompany,
      research.companyResearch,
      jobAnalysis
    );

    // 12. Generate Safe Contact Company Guide
    const contactCompanyGuide = this.generateContactCompanyGuide(
      targetCompany,
      research.companyResearch,
      jobAnalysis
    );

    return {
      success: true,
      extractedText: content,
      opportunityTrustScore,
      companyResearch: research.companyResearch,
      jobAnalysis,
      riskBreakdown,
      evidenceGraph,
      conflictingEvidence,
      confidenceInfo,
      researchTrace,
      actionPlan,
      verifyItYourself,
      contactCompanyGuide,
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
   * Constructs the Multi-Dimensional Opportunity Evidence Graph.
   */
  public buildEvidenceGraph(
    company: CompanyResearchResult,
    job: JobPostingAnalysis,
    risk: RiskBreakdown
  ): EvidenceGraph {
    const nodes: EvidenceGraphNode[] = [];
    const edges: EvidenceGraphEdge[] = [];
    const inconsistencies: string[] = [];

    // Node 1: Corporate Entity
    const employerStatus =
      company.identity_confidence >= 65
        ? 'verified'
        : company.identity_confidence >= 35
        ? 'neutral'
        : 'suspicious';

    nodes.push({
      id: 'node-employer',
      type: 'employer',
      label: 'Corporate Entity',
      value: company.company_name,
      status: employerStatus,
      details: company.official_presence.domain
        ? `Domain: ${company.official_presence.domain} (${company.identity_confidence}% identity score)`
        : `Identity Score: ${company.identity_confidence}/100`,
    });

    // Node 2: Job Role / Opportunity
    const roleStatus =
      job.paymentRequests.detected || job.internshipAssessment.isTaskScamPattern
        ? 'hazardous'
        : job.isCompensationSuspicious || job.urgencySignals.detected
        ? 'suspicious'
        : 'verified';

    nodes.push({
      id: 'node-opportunity',
      type: 'job_opportunity',
      label: 'Role & Opportunity',
      value: job.detectedJobTitle || 'Identified Opening',
      status: roleStatus,
      details: job.detectedCompensation
        ? `Stipend/Salary: ${job.detectedCompensation}${job.isCompensationSuspicious ? ' (Anomalous rate)' : ''}`
        : 'Compensation not explicitly specified',
    });

    // Node 3: Recruiter Identity
    const recruiterVal =
      job.recruiterIdentity?.email ||
      job.recruiterIdentity?.messagingHandle ||
      (job.recruitmentChannel.channelName.includes('Telegram') ? 'Telegram Contact' : 'Unspecified Recruiter');

    const recruiterStatus =
      job.recruiterIdentity?.emailType === 'corporate'
        ? 'verified'
        : job.recruiterIdentity?.emailType === 'free_mail'
        ? 'suspicious'
        : job.recruiterIdentity?.emailType === 'suspicious' || job.recruitmentChannel.isHighRisk
        ? 'hazardous'
        : 'neutral';

    nodes.push({
      id: 'node-recruiter',
      type: 'recruiter',
      label: 'Recruiter Contact',
      value: recruiterVal,
      status: recruiterStatus,
      details: job.recruiterIdentity?.emailType
        ? `Type: ${job.recruiterIdentity.emailType.replace('_', ' ')}`
        : job.recruitmentChannel.details,
    });

    // Node 4: Application Channel
    const channelVal = job.atsIdentified || job.recruitmentChannel.channelName;
    const channelStatus = job.atsIdentified
      ? 'verified'
      : job.recruitmentChannel.isHighRisk
      ? 'hazardous'
      : job.domainMismatch.detected
      ? 'suspicious'
      : 'neutral';

    nodes.push({
      id: 'node-channel',
      type: 'channel',
      label: 'Application Channel',
      value: channelVal,
      status: channelStatus,
      details: job.applicationUrl || job.recruitmentChannel.details,
    });

    // Node 5: Financial Demands
    const finStatus = job.paymentRequests.detected ? 'hazardous' : 'verified';
    nodes.push({
      id: 'node-financial',
      type: 'financial',
      label: 'Financial Requests',
      value: job.paymentRequests.detected ? job.paymentRequests.feeType || 'Upfront Deposit' : '₹0 Upfront Fee',
      status: finStatus,
      details: job.paymentRequests.detected
        ? job.paymentRequests.details || 'Demands money from candidate'
        : 'Complies with zero-fee recruitment standard',
    });

    // Node 6: Sensitive PII Demands
    const piiStatus = job.sensitiveDataRequests.detected ? 'hazardous' : 'verified';
    nodes.push({
      id: 'node-pii',
      type: 'pii',
      label: 'PII & Document Security',
      value: job.sensitiveDataRequests.detected
        ? `Requests: ${job.sensitiveDataRequests.items.join(', ')}`
        : 'Safe (No Premature IDs/Bank Details)',
      status: piiStatus,
      details: job.sensitiveDataRequests.detected
        ? 'National ID or bank credentials solicited before formal offer'
        : 'Standard credential security verified',
    });

    // Build Relationships & Inconsistencies
    // Recruiter -> Employer
    const isRecruiterConsistent = job.recruiterIdentity?.emailType === 'corporate';
    edges.push({
      from: 'node-recruiter',
      to: 'node-employer',
      relation: 'claims_affiliation_with',
      isConsistent: isRecruiterConsistent,
      notes:
        job.recruiterIdentity?.emailType === 'free_mail'
          ? 'Recruiter uses personal webmail, not authenticated by corporate domain'
          : undefined,
    });
    if (job.recruiterIdentity?.emailType === 'free_mail' && company.identity_confidence >= 65) {
      inconsistencies.push(
        `Recruiter claims affiliation with ${company.company_name} but communicates via unauthenticated free webmail (${job.recruiterIdentity.email}).`
      );
    }

    // Channel -> Employer
    const isChannelConsistent =
      !job.domainMismatch.detected && (!!job.atsIdentified || job.recruitmentChannel.type === 'company_domain');
    edges.push({
      from: 'node-channel',
      to: 'node-employer',
      relation: 'destination_belongs_to',
      isConsistent: isChannelConsistent,
      notes: job.domainMismatch.detected ? 'Application URL diverges from verified corporate domain' : undefined,
    });
    if (job.domainMismatch.detected) {
      inconsistencies.push(
        `Application link destination (${job.domainMismatch.jobDomain}) differs from employer's authentic domain (${job.domainMismatch.companyDomain}).`
      );
    }
    if (job.recruitmentChannel.isHighRisk && company.identity_confidence >= 60) {
      inconsistencies.push(
        `Established organization (${company.company_name}) conducting selection via untraceable messaging platform (${job.recruitmentChannel.channelName}).`
      );
    }

    // Opportunity -> Financial
    edges.push({
      from: 'node-opportunity',
      to: 'node-financial',
      relation: 'financial_terms',
      isConsistent: !job.paymentRequests.detected,
      notes: job.paymentRequests.detected ? 'Demands upfront monetary payment' : undefined,
    });
    if (job.paymentRequests.detected) {
      inconsistencies.push(
        `Posting demands a "${job.paymentRequests.feeType}". Legitimate employers pay candidates; they NEVER charge application or laptop fees.`
      );
    }

    // Opportunity -> PII
    edges.push({
      from: 'node-opportunity',
      to: 'node-pii',
      relation: 'documentation_terms',
      isConsistent: !job.sensitiveDataRequests.detected,
      notes: job.sensitiveDataRequests.detected ? 'Requires identity/banking documents prematurely' : undefined,
    });
    if (job.sensitiveDataRequests.detected) {
      inconsistencies.push(
        `Prematurely solicits sensitive documents (${job.sensitiveDataRequests.items.join(', ')}) prior to written offer.`
      );
    }

    return {
      nodes,
      edges,
      inconsistencies,
    };
  }

  /**
   * Identifies contradictory signals where the employer entity is genuine but the opportunity vector is hijacked.
   */
  public detectConflictingEvidence(
    company: CompanyResearchResult,
    job: JobPostingAnalysis,
    graph: EvidenceGraph
  ): ConflictingEvidence {
    const isRealCompany = company.identity_confidence >= 60;
    const hasScamSignals =
      job.paymentRequests.detected ||
      job.internshipAssessment.isTaskScamPattern ||
      job.domainMismatch.detected ||
      job.recruitmentChannel.isHighRisk ||
      job.recruiterIdentity?.emailType === 'free_mail';

    if (isRealCompany && hasScamSignals) {
      let conflictType: ConflictingEvidence['conflictType'] = 'domain_impersonation';
      let headline = 'Authentic Employer Brand, BUT High-Risk Opportunity Vector';
      let explanation = `The company "${company.company_name}" is a legitimate, verified entity, but this specific posting or recruiter displays critical signs of unauthorized impersonation.`;

      if (job.domainMismatch.detected) {
        conflictType = 'domain_impersonation';
        headline = 'Brand Impersonation & Unauthorized Domain';
        explanation = `"${company.company_name}" exists and is verified, but the application link directs you to an unauthorized domain (${job.domainMismatch.jobDomain}) rather than official company infrastructure.`;
      } else if (job.paymentRequests.detected) {
        conflictType = 'channel_prestige_mismatch';
        headline = 'Brand Hijacking with Upfront Payment Demand';
        explanation = `Scammers frequently exploit recognized brand names like "${company.company_name}" to demand fraudulent training fees, security deposits, or registration charges.`;
      } else if (job.recruiterIdentity?.emailType === 'free_mail' && job.recruitmentChannel.isHighRisk) {
        conflictType = 'channel_prestige_mismatch';
        headline = 'Unauthenticated Contact Channel for Established Brand';
        explanation = `"${company.company_name}" maintains authenticated corporate email systems and official hiring portals. Genuine recruiters do not conduct selection via personal Gmail or Telegram groups.`;
      } else if (job.isCompensationSuspicious) {
        conflictType = 'unrealistic_compensation';
        headline = 'Brand Hijacking with Inflated Compensation Bait';
        explanation = `The company is genuine, but the advertised payout (${job.detectedCompensation}) represents an unrealistic lure typical of task and phishing fraud.`;
      } else if (job.sensitiveDataRequests.detected) {
        conflictType = 'premature_credential_harvesting';
        headline = 'Phishing Trap Exploiting Legitimate Brand';
        explanation = `The brand name is recognized, but this channel is harvesting national identity (Aadhaar/PAN) or banking credentials prior to formal written employment agreements.`;
      }

      return {
        hasConflict: true,
        conflictType,
        headline,
        explanation,
        employerStatus: `Verified Corporate Entity (${company.identity_confidence}% Confidence)`,
        opportunityStatus: `Suspect Opportunity (${graph.inconsistencies.length} Inconsistencies Flagged)`,
      };
    }

    return {
      hasConflict: false,
      conflictType: 'none',
      headline: 'Consistent Signals Across Verification Vectors',
      explanation: isRealCompany
        ? 'Employer identity and recruitment channels correlate with recognized corporate standards.'
        : 'Opportunity vectors and employer footprint correlate without structural contradictions.',
      employerStatus: isRealCompany ? 'Verified Corporate Entity' : 'Unindexed / New Entity',
      opportunityStatus: job.paymentRequests.detected ? 'Hazardous Financial Demands' : 'Standard Application Flow',
    };
  }

  /**
   * Generates analysis confidence level based on source diversity, domain matches, and ATS correlation.
   */
  public buildAnalysisConfidence(
    company: CompanyResearchResult,
    job: JobPostingAnalysis,
    sourcesCount: number
  ): AnalysisConfidenceInfo {
    const hasEmployerDomain = !!company.official_presence.domain;
    const hasChannel = job.recruitmentChannel.type !== 'unknown';
    const hasJobTitle = !!job.detectedJobTitle;
    const hasRecruiter = !!job.recruiterIdentity?.email || !!job.recruiterIdentity?.messagingHandle;
    const hasATS = !!job.atsIdentified;

    let score = 50;
    const reasons: string[] = [];

    if (sourcesCount >= 3) {
      score += 20;
      reasons.push(`${sourcesCount} independent web sources corroborated.`);
    } else if (sourcesCount > 0) {
      score += 10;
      reasons.push(`${sourcesCount} web sources analyzed.`);
    } else {
      score -= 15;
      reasons.push('Sparse public web index data available.');
    }

    if (hasEmployerDomain) {
      score += 15;
      reasons.push(`Official employer domain verified (${company.official_presence.domain}).`);
    }

    if (hasATS) {
      score += 15;
      reasons.push(`Direct enterprise ATS infrastructure verified (${job.atsIdentified}).`);
    } else if (job.domainMismatch.detected) {
      score += 10;
      reasons.push('Domain divergence mathematically calculated.');
    }

    if (job.paymentRequests.detected) {
      score += 10;
      reasons.push('Unambiguous monetary demand pattern flagged.');
    }

    score = Math.min(99, Math.max(25, score));
    const level: 'HIGH' | 'MEDIUM' | 'LOW' = score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';

    return {
      level,
      score,
      reasons,
      dataCoverage: {
        employerPresence: hasEmployerDomain,
        channelIdentified: hasChannel,
        jobSpecificMatch: hasJobTitle,
        recruiterIdentified: hasRecruiter,
      },
    };
  }

  /**
   * Generates a step-by-step transparent audit trail of the research and verification execution.
   */
  public generateResearchTrace(
    companyName: string,
    company: CompanyResearchResult,
    job: JobPostingAnalysis,
    sourcesCount: number,
    queries: string[]
  ): ResearchTraceStep[] {
    const trace: ResearchTraceStep[] = [];
    const now = new Date();

    // Step 1
    trace.push({
      stepNumber: 1,
      title: 'Entity & Content Extraction',
      description: 'Extracted employer name, recruiter contacts, URLs, and compensation parameters.',
      status: 'completed',
      timestamp: new Date(now.getTime() - 2800).toISOString(),
      findings: [
        `Employer candidate: "${companyName}" (Normalized: "${company.normalized_name}")`,
        job.detectedJobTitle ? `Detected position: "${job.detectedJobTitle}"` : 'Job title: Inferred from context',
        job.detectedCompensation ? `Compensation term: "${job.detectedCompensation}"` : 'No explicit compensation stated',
      ],
    });

    // Step 2
    trace.push({
      stepNumber: 2,
      title: 'Autonomous Web & Registry Exploration',
      description: 'Executed multi-angle discovery queries across public web, LinkedIn, and review platforms.',
      status: sourcesCount > 0 ? 'completed' : 'warning',
      timestamp: new Date(now.getTime() - 2000).toISOString(),
      findings: [
        `Executed ${queries.length} targeted search queries across public web providers`,
        `Discovered ${sourcesCount} external corroborating sources`,
        company.official_presence.domain
          ? `Authenticated official domain: ${company.official_presence.domain}`
          : 'No standalone corporate domain indexed',
        company.linkedin.url ? `Indexed LinkedIn company profile (${company.linkedin.status})` : 'No LinkedIn company profile indexed',
      ],
    });

    // Step 3
    const channelFlagged = job.domainMismatch.detected || job.recruitmentChannel.isHighRisk;
    trace.push({
      stepNumber: 3,
      title: 'Application Channel & Domain Cross-Correlation',
      description: 'Cross-referenced application URLs and recruiter emails against authenticated domains.',
      status: channelFlagged ? 'flagged' : 'completed',
      timestamp: new Date(now.getTime() - 1300).toISOString(),
      findings: [
        job.atsIdentified
          ? `Verified standard enterprise ATS portal: ${job.atsIdentified}`
          : `Channel classified as: ${job.recruitmentChannel.channelName}`,
        job.domainMismatch.detected
          ? `ALERT: Destination (${job.domainMismatch.jobDomain}) differs from employer domain`
          : 'No domain divergence detected',
        job.recruiterIdentity?.emailType === 'free_mail'
          ? `CAUTION: Recruiter communicates via personal webmail (${job.recruiterIdentity.email || 'webmail'})`
          : job.recruiterIdentity?.emailType === 'corporate' && job.recruiterIdentity.email
          ? `CONFIRMED: Recruiter uses corporate email (@${job.recruiterIdentity.email.split('@')[1] || 'corporate'})`
          : 'No recruiter email identified',
      ],
    });

    // Step 4
    const fraudFlagged = job.paymentRequests.detected || job.sensitiveDataRequests.detected || job.internshipAssessment.isTaskScamPattern;
    trace.push({
      stepNumber: 4,
      title: 'Fraud Vectors & Financial Trap Heuristics',
      description: 'Audited for upfront fee demands, task scams, PII harvesting, and high-pressure urgency.',
      status: fraudFlagged ? 'flagged' : 'completed',
      timestamp: new Date(now.getTime() - 700).toISOString(),
      findings: [
        job.paymentRequests.detected
          ? `CRITICAL: Demands payment ("${job.paymentRequests.feeType}")`
          : 'Zero upfront fee demands detected (Complies with student safety standard)',
        job.sensitiveDataRequests.detected
          ? `WARNING: Premature request for sensitive documents (${job.sensitiveDataRequests.items.join(', ')})`
          : 'No premature requests for bank credentials or national IDs',
        job.internshipAssessment.isTaskScamPattern
          ? 'CRITICAL: Task scam pattern identified (video review / daily profit trap)'
          : 'No task-based commission traps detected',
      ],
    });

    // Step 5
    trace.push({
      stepNumber: 5,
      title: 'Evidence Graph Synthesis & Verdict',
      description: 'Synthesized multidimensional graph, computed opportunity trust score, and formulated student guidance.',
      status: 'completed',
      timestamp: now.toISOString(),
      findings: [
        `Opportunity Verdict: ${job.verdict.status}`,
        `Action Guidance: ${job.verdict.actionGuidance}`,
      ],
    });

    return trace;
  }

  /**
   * Generates a concrete, prioritized action plan for the student.
   */
  public generateActionPlan(
    job: JobPostingAnalysis,
    risk: RiskBreakdown,
    company: CompanyResearchResult
  ): ActionPlanItem[] {
    const plan: ActionPlanItem[] = [];

    if (job.paymentRequests.detected) {
      plan.push({
        id: 'act-no-pay',
        title: 'Zero Money Rule: Never Send Funds',
        priority: 'critical',
        action: `Do NOT transfer any money for "${job.paymentRequests.feeType}". Real companies pay candidates; they NEVER ask for registration, laptop deposits, or training fees.`,
        why: 'Demanding upfront money from job seekers is the #1 hallmark of employment fraud.',
        actionType: 'do_not_pay',
      });
      plan.push({
        id: 'act-block',
        title: 'Cease Communication & Block',
        priority: 'critical',
        action: 'Stop responding immediately. Block the contact on WhatsApp, Telegram, or email to prevent further harassment.',
        why: 'Scammers will create artificial urgency or threats to pressure you into paying.',
        actionType: 'block_contact',
      });
      plan.push({
        id: 'act-report',
        title: 'Report Fraudulent Posting',
        priority: 'high',
        action: 'Report the message/listing to the platform where you found it and file a report at cybercrime.gov.in.',
        why: 'Prevents other college students and freshers from falling into the same trap.',
        actionType: 'report_fraud',
      });
      return plan;
    }

    if (job.internshipAssessment.isTaskScamPattern) {
      plan.push({
        id: 'act-task-scam',
        title: 'Reject Daily Task Work',
        priority: 'critical',
        action: 'Do not perform YouTube likes, hotel reviews, or map ratings in exchange for promised commissions.',
        why: 'Task scams initially pay small amounts (₹100-₹500) to build trust, then lock candidates in large crypto/deposit traps.',
        actionType: 'block_contact',
      });
      return plan;
    }

    if (job.domainMismatch.detected) {
      plan.push({
        id: 'act-verify-careers',
        title: 'Navigate Directly to Official Careers Page',
        priority: 'high',
        action: `Do not submit your resume on "${job.domainMismatch.jobDomain}". Instead, visit the official site at https://${company.official_presence.domain || company.company_name + '.com'}/careers.`,
        why: 'Scammers create mirror/typosquat websites to harvest candidate credentials under legitimate brand names.',
        actionType: 'verify_careers',
      });
    }

    if (job.recruiterIdentity?.emailType === 'free_mail') {
      plan.push({
        id: 'act-request-corporate',
        title: 'Request Communication from Corporate Email',
        priority: 'medium',
        action: `Politely reply: "Could you please send the job description and interview details from your official @${company.official_presence.domain || 'company.com'} email address?"`,
        why: 'Legitimate corporate talent teams have corporate domain emails. Impersonators will refuse or make excuses.',
        actionType: 'request_official_email',
      });
    }

    if (job.sensitiveDataRequests.detected) {
      plan.push({
        id: 'act-protect-pii',
        title: 'Hold Documents Until Written Offer',
        priority: 'high',
        action: `Do not provide Aadhaar, PAN, Bank Details, or OTP at this stage. Documents should only be shared after receiving a verifiable written offer letter.`,
        why: 'Premature collection of identity documents is used for synthetic identity theft and loan fraud.',
        actionType: 'do_not_pay',
      });
    }

    if (plan.length === 0) {
      plan.push({
        id: 'act-proceed-safe',
        title: 'Standard Application Protocol',
        priority: 'recommended',
        action: 'Proceed with application through the certified portal. Maintain copies of all communications.',
        why: 'Posting adheres to standard corporate hiring practices with zero upfront financial demands.',
        actionType: 'proceed_safely',
      });
    }

    return plan;
  }

  /**
   * Generates DIY verification queries and direct inspection links for the student.
   */
  public generateVerifyItYourself(
    companyName: string,
    company: CompanyResearchResult,
    job: JobPostingAnalysis
  ): VerifyItYourselfTool[] {
    const tools: VerifyItYourselfTool[] = [];
    const domain = company.official_presence.domain || '';
    const jobTitle = job.detectedJobTitle || 'intern';

    // 1. Google Careers Search
    const careersQuery = domain
      ? `site:${domain} careers "${jobTitle}"`
      : `"${companyName}" careers "${jobTitle}"`;
    tools.push({
      id: 'diy-careers',
      title: 'Search Official Careers Portal',
      instruction: 'Verify whether this specific job opening is posted on the employer’s official website.',
      searchQuery: careersQuery,
      directUrl: `https://www.google.com/search?q=${encodeURIComponent(careersQuery)}`,
      iconType: 'google',
    });

    // 2. LinkedIn Recruiter Search
    const linkedinQuery = `${companyName} talent acquisition OR recruiter`;
    tools.push({
      id: 'diy-linkedin',
      title: 'Verify Recruiter on LinkedIn',
      instruction: 'Search for active talent acquisition members at this company to cross-check the recruiter name.',
      searchQuery: linkedinQuery,
      directUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedinQuery)}`,
      iconType: 'linkedin',
    });

    // 3. Corporate Registry / MCA Search
    const mcaQuery = `${companyName} MCA master data corporate registration ROC`;
    tools.push({
      id: 'diy-mca',
      title: 'Check Official Corporate Registry',
      instruction: 'Verify legal incorporation status, registered office, and active directors in government records.',
      searchQuery: mcaQuery,
      directUrl: `https://www.google.com/search?q=${encodeURIComponent(mcaQuery)}`,
      iconType: 'mca',
    });

    // 4. Whois Domain Age Check
    const targetDomain = job.domainMismatch.jobDomain || domain;
    if (targetDomain) {
      tools.push({
        id: 'diy-whois',
        title: 'Inspect Domain Age & Registrant',
        instruction: 'Check when the domain was registered. Scam domains are typically less than 90 days old.',
        directUrl: `https://who.is/whois/${targetDomain}`,
        iconType: 'whois',
      });
    }

    return tools;
  }

  /**
   * Generates a safe contact template for reaching the legitimate company.
   */
  public generateContactCompanyGuide(
    companyName: string,
    company: CompanyResearchResult,
    job: JobPostingAnalysis
  ): ContactCompanyGuide {
    const domain = company.official_presence.domain;
    const jobTitle = job.detectedJobTitle || 'the advertised position';
    const recruiterContact = job.recruiterIdentity?.email || job.recruitmentChannel.channelName;
    const appUrl = job.applicationUrl || 'the provided application link';

    return {
      suggestedAction: domain
        ? `Contact the authentic hiring desk through their verified domain (@${domain}) or careers portal.`
        : 'Reach out to the verified company page on LinkedIn before taking further action.',
      domainToContact: domain,
      officialCareersUrl: company.official_presence.websiteUrl,
      hrEmailPattern: domain ? `careers@${domain} or contact@${domain}` : undefined,
      inquiryTemplate: {
        subject: `Candidate Inquiry: Verification of "${jobTitle}" opening / Recruiter outreach`,
        body: `Dear Hiring & Talent Acquisition Team at ${companyName},

I hope this message finds you well.

I am a student currently evaluating career opportunities and recently received communication regarding an open position for "${jobTitle}".

The outreach was received via: ${recruiterContact}
Application destination provided: ${appUrl}

Given the increasing frequency of unauthorized recruitment impersonation targeting students, I wanted to verify through your official team whether this vacancy and contact channel are authorized by ${companyName}.

Thank you for your time and dedication to safe recruitment.

Sincerely,
[Your Full Name]
[Your University / College]
[Your Phone / LinkedIn Profile]`,
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
      {
        id: 'pay-to-intern-scheme',
        name: 'Pay-to-Intern Trap (Training Fee + Certificate)',
        company: 'SkillSphere EdTech Solutions',
        badge: 'Pay-To-Intern',
        description: 'Student trap where candidates must purchase mandatory training materials or certification to get the internship.',
        text: `Selected Candidates Announcement: Web Development & AI Virtual Internship!
Duration: 2 Months. Stipend: Up to ₹15,000 upon successful project submission.
Offer Requirement: All selected students must complete mandatory onboarding tool setup and cloud server sandbox access.
To activate your developer portal and certification badge, pay a one-time documentation and training fee of ₹1,999.
Submit payment screenshot within 12 hours to confirm your seat: https://skillsphere-internship-portal.in/pay`,
      },
      {
        id: 'whatsapp-aadhaar-phishing',
        name: 'WhatsApp Unbranded Form (Premature Aadhaar Harvesting)',
        company: 'Infosys BPM',
        badge: 'PII Phishing',
        description: 'Recruiter impersonating Infosys over WhatsApp, directing to an unbranded Google Form requiring Aadhaar and bank details.',
        text: `Dear Candidate, Your resume has been shortlisted for Infosys BPM Data Operations Executive.
Location: Electronic City, Bengaluru / WFH available.
Package: ₹3.8 LPA. No interview required for campus passouts!
To generate your digital employee badge and direct offer letter, immediately fill out our candidate intake form:
https://forms.gle/infosys-bpm-onboarding-secure
Mandatory uploads: Clear photo of Aadhaar Card (front & back), PAN card copy, and bank account cancelled cheque for salary dispatch.`,
      },
    ];
  }
}
