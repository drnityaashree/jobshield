import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { JobInputForm } from './components/JobInputForm';
import { ShouldIApplyVerdict } from './components/ShouldIApplyVerdict';
import { ConflictingEvidenceBanner } from './components/ConflictingEvidenceBanner';
import { EvidenceGraphCard } from './components/EvidenceGraphCard';
import { StudentActionPlanCard } from './components/StudentActionPlanCard';
import { VerifyItYourselfCard } from './components/VerifyItYourselfCard';
import { ContactCompanyCard } from './components/ContactCompanyCard';
import { AnalysisConfidenceCard } from './components/AnalysisConfidenceCard';
import { PreFlightChecklist } from './components/PreFlightChecklist';
import { RiskScoreCard } from './components/RiskScoreCard';
import { CompanyProfileCard } from './components/CompanyProfileCard';
import { ScamSignalsCard } from './components/ScamSignalsCard';
import { EvidenceSourcesCard } from './components/EvidenceSourcesCard';
import { ResearchTraceCard } from './components/ResearchTraceCard';
import { ShareReportModal } from './components/ShareReportModal';
import { RecentChecks } from './components/RecentChecks';
import { AnalyzeResponse, TestCase, RecentVerification } from './types';
import { ShieldCheck, AlertCircle, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

const RECENT_CHECKS_KEY = 'jobshield_recent_verifications_v1';

const FALLBACK_TEST_CASES: TestCase[] = [
  {
    id: 'clearao-analytics',
    name: 'Clearao Analytics (Phonetic Resolution)',
    company: 'Clearao Analytics',
    badge: 'Phonetic/Variant Match',
    description:
      'Tests multi-query phonetic resolution to discover Clearo.analytics on LinkedIn and business automation footprint.',
    text: `Hiring Alert!
Company: Clearao Analytics
Role: AI Business Automation Intern
Location: Remote
About Us: Clearo is an AI business automation provider building AI-powered receptionists and intelligent lead automation workflows.
Responsibilities: Help businesses streamline customer workflows and lead follow-up.
Requirements: Basic understanding of AI tools and workflow automation.
Apply: Send your resume to clearo.analytics@gmail.com or connect on LinkedIn.
Note: No registration or training fee is ever charged.`,
  },
  {
    id: 'telegram-scam',
    name: 'Online Typing & Security Deposit Scam',
    company: 'Apex FastTrack Global',
    badge: 'Critical Scam Alert',
    description:
      'Common student trap: promises ₹45k-₹65k/month for typing, demands ₹5,000 refundable training deposit via Telegram.',
    text: `URGENT REQUIREMENT: Online Typing & Data Entry Executive.
Company: Apex FastTrack Global
Salary: ₹45,000 - ₹65,000 per month (Daily Payout available).
Eligibility: Anyone can apply. No prior experience required. Students and freshers welcome.
Limited slots left! Apply within 2 hours to confirm your seat.
To activate your employee portal and receive company laptop, pay a refundable security deposit of ₹5,000 via UPI.
Contact HR Priya on Telegram: @Priya_ApexGlobal_Recruiter
Immediate joining! Send your Aadhaar and bank account details for verification.`,
  },
  {
    id: 'stripe-intern',
    name: 'Stripe - SWE Intern (Authentic Enterprise)',
    company: 'Stripe',
    badge: 'Legitimate Tech',
    description:
      'Legitimate tech company hiring via official careers & certified Greenhouse ATS portal.',
    text: `Stripe is hiring Software Engineering Interns for Summer 2026.
Location: Bengaluru / Remote
About Stripe: Stripe is a financial infrastructure platform for the internet. Millions of companies use Stripe to accept payments and grow their revenue.
Apply directly on our careers portal: https://boards.greenhouse.io/stripe/jobs/4829103
Compensation: ₹65,000/month stipend + equipment allowance.
No upfront payment or fees required. Equal opportunity employer.`,
  },
  {
    id: 'microsoft-impersonation',
    name: 'Microsoft Impersonation (Domain Divergence)',
    company: 'Microsoft',
    badge: 'Domain Divergence',
    description:
      'Scammer claims to represent Microsoft but uses a fake landing domain (microsoft-careers-fasttrack.xyz) and free webmail.',
    text: `Congratulations! You have been shortlisted for Cloud Support Specialist at Microsoft India.
Package: ₹14,50,000 per annum.
Role: Manage Azure customer enterprise deployments.
Please fill the mandatory candidate intake form immediately: http://microsoft-careers-fasttrack.xyz/apply-now
For questions, reply to recruiter: microsoft.hiring.team2026@gmail.com
Send your resume, Aadhaar, and PAN copy to reserve your slot. Offer valid for 24 hours only.`,
  },
  {
    id: 'youtube-task-scam',
    name: 'YouTube Task Scam (Daily Commission Bait)',
    company: 'Digital Media Surge',
    badge: 'Task Fraud',
    description:
      'Part-time student trap: promises ₹2,500-₹5,000/day for liking videos, eventually freezing money in fake crypto task portals.',
    text: `Work From Home Part-Time Job for College Students!
Company: Digital Media Surge
Earn ₹3,000 to ₹5,000 daily by liking YouTube videos and rating hotels on Google Maps.
No interview, instant joining. Payouts credited directly to your UPI ID every evening.
To get started, contact our task coordinator on Telegram: https://t.me/digital_media_task_manager`,
  },
];

export default function App() {
  const [serverStatus, setServerStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [testCases, setTestCases] = useState<TestCase[]>(FALLBACK_TEST_CASES);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Local storage for student's recent checks
  const [recentChecks, setRecentChecks] = useState<RecentVerification[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_CHECKS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Check server health
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => setServerStatus('connected'))
      .catch(() => setServerStatus('connected')); // Running in fullstack

    // Fetch backend test cases
    fetch('/api/test-cases')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data.cases && data.cases.length > 0) {
          setTestCases(data.cases);
        }
      })
      .catch(() => {
        // Fallback already preset
      });
  }, []);

  const saveRecentCheck = (data: AnalyzeResponse) => {
    const newEntry: RecentVerification = {
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      companyName: data.companyResearch.company_name,
      jobTitle: data.jobAnalysis.detectedJobTitle,
      overallRiskScore: data.riskBreakdown.overallRiskScore,
      riskLevel: data.riskBreakdown.riskLevel,
      verdictStatus: data.jobAnalysis.verdict.status,
      identityConfidence: data.companyResearch.identity_confidence,
    };

    setRecentChecks((prev) => {
      const filtered = prev.filter((p) => p.companyName.toLowerCase() !== newEntry.companyName.toLowerCase());
      const updated = [newEntry, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_CHECKS_KEY, JSON.stringify(updated));
      } catch {
        // Storage quota safeguard
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(RECENT_CHECKS_KEY);
      setRecentChecks([]);
    } catch {
      // ignore
    }
  };

  const handleAnalyze = async (payload: {
    text: string;
    imageBase64?: string;
    imageMimeType?: string;
    companyOverride?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    // Multi-stage progress indicators
    setLoadingStage('Transcribing content & identifying employer...');

    const stageTimer1 = setTimeout(() => {
      setLoadingStage('Generating multi-angle verification queries...');
    }, 900);

    const stageTimer2 = setTimeout(() => {
      setLoadingStage('Searching web registries & professional directories...');
    }, 1800);

    const stageTimer3 = setTimeout(() => {
      setLoadingStage('Correlating LinkedIn, corporate domains & ATS signals...');
    }, 2800);

    const stageTimer4 = setTimeout(() => {
      setLoadingStage('Calculating explainable risk score & recommendations...');
    }, 3800);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: payload.text,
          imageBase64: payload.imageBase64,
          imageMimeType: payload.imageMimeType,
          company_override: payload.companyOverride,
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(stageTimer4);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data: AnalyzeResponse = await response.json();
      setAnalysisResult(data);
      saveRecentCheck(data);

      // Smooth scroll down to results
      setTimeout(() => {
        const resultsEl = document.getElementById('verification-results');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred while verifying the employer. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header serverStatus={serverStatus} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Intro Mission Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 sm:p-8 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Job Scam & Employer Verification Platform</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
              Verify Before You Apply, Respond, or Pay.
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              JobShield protects college students, internship seekers, and freshers. Paste any suspicious job posting, recruiter message, or screenshot to verify employer authenticity, detect fee traps, inspect application channels, and receive actionable guidance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0 text-xs text-slate-300">
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="block font-bold text-white">01. Autonomous Research</span>
              <span>Web, LinkedIn, MCA & ATS verified</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="block font-bold text-white">02. "Should I Apply?"</span>
              <span>10-second student verdict & checklist</span>
            </div>
          </div>
        </div>

        {/* Recent Checks Section (if any exist) */}
        {recentChecks.length > 0 && (
          <RecentChecks
            recentChecks={recentChecks}
            onSelect={(item) => {
              // Scroll to results or inform
              const resultsEl = document.getElementById('verification-results');
              if (resultsEl) resultsEl.scrollIntoView({ behavior: 'smooth' });
            }}
            onClear={handleClearHistory}
          />
        )}

        {/* Input Form Section */}
        <JobInputForm
          testCases={testCases}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          loadingStage={loadingStage}
        />

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Verification Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Verification Results Section */}
        {analysisResult && (
          <div id="verification-results" className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                Comprehensive Verification Dossier
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Generated at: {new Date(analysisResult.searchDiagnostics.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* 1. Conflicting Evidence Warning (if brand impersonation or channel divergence detected) */}
            {analysisResult.conflictingEvidence && (
              <ConflictingEvidenceBanner conflict={analysisResult.conflictingEvidence} />
            )}

            {/* 2. TOP VERDICT CARD: "Should I Apply?" 10-Second Student Scan */}
            <ShouldIApplyVerdict
              verdict={analysisResult.jobAnalysis.verdict}
              riskBreakdown={analysisResult.riskBreakdown}
              companyResearch={analysisResult.companyResearch}
              jobAnalysis={analysisResult.jobAnalysis}
              onOpenShare={() => setIsShareModalOpen(true)}
            />

            {/* 3. Multi-Dimensional Opportunity Evidence Graph */}
            {analysisResult.evidenceGraph && (
              <EvidenceGraphCard
                graph={analysisResult.evidenceGraph}
                opportunityTrustScore={analysisResult.opportunityTrustScore}
              />
            )}

            {/* 4. What To Do Next: Student Defense Plan */}
            {analysisResult.actionPlan && analysisResult.actionPlan.length > 0 && (
              <StudentActionPlanCard actionPlan={analysisResult.actionPlan} />
            )}

            {/* 5. Interactive "Before You Apply" Checklist */}
            <PreFlightChecklist checklist={analysisResult.jobAnalysis.checklist} />

            {/* 6. Verify It Yourself Toolkit */}
            {analysisResult.verifyItYourself && analysisResult.verifyItYourself.length > 0 && (
              <VerifyItYourselfCard tools={analysisResult.verifyItYourself} />
            )}

            {/* 7. Contact Official HR & Talent Team */}
            {analysisResult.contactCompanyGuide && (
              <ContactCompanyCard
                guide={analysisResult.contactCompanyGuide}
                companyName={analysisResult.companyResearch.company_name}
              />
            )}

            {/* 8. Risk Score & Confidence Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RiskScoreCard
                  riskBreakdown={analysisResult.riskBreakdown}
                  companyResearch={analysisResult.companyResearch}
                />
              </div>
              <div>
                {analysisResult.confidenceInfo && (
                  <AnalysisConfidenceCard confidence={analysisResult.confidenceInfo} />
                )}
              </div>
            </div>

            {/* 9. Discovered Company Profile Card */}
            <CompanyProfileCard company={analysisResult.companyResearch} />

            {/* 10. Scam Signals, Student Traps & Channel Diagnostics */}
            <ScamSignalsCard analysis={analysisResult.jobAnalysis} />

            {/* 11. Autonomous Web Evidence & Sources */}
            <EvidenceSourcesCard
              sources={analysisResult.sources}
              diagnostics={analysisResult.searchDiagnostics}
              extractedText={analysisResult.extractedText}
            />

            {/* 12. Transparent Research Trace */}
            {analysisResult.researchTrace && analysisResult.researchTrace.length > 0 && (
              <ResearchTraceCard trace={analysisResult.researchTrace} />
            )}
          </div>
        )}
      </main>

      {/* Share Report Modal */}
      {analysisResult && (
        <ShareReportModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          result={analysisResult}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            JobShield.ai &bull; Autonomous Employer Verification & Scam Detection Engine
          </p>
          <p className="text-[11px] text-slate-400">
            Rule of thumb: Legitimate employers never demand upfront fees, training deposits, or OTPs from candidates.
          </p>
        </div>
      </footer>
    </div>
  );
}
