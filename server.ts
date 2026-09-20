import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { JobShieldAnalyzer } from './src/server/analyzer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const analyzer = new JobShieldAnalyzer();

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'JobShield Verification Engine',
    timestamp: new Date().toISOString(),
  });
});

// Preconfigured Realistic Test Cases for Rapid Verification
app.get('/api/test-cases', (req, res) => {
  res.json({
    cases: [
      {
        id: 'clearao-analytics',
        name: 'Clearao Analytics (The User Bug Case)',
        company: 'Clearao Analytics',
        badge: 'Phonetic/Variant Match Case',
        description:
          'Employer extracted as "Clearao Analytics" from screenshot. Tests multi-query resolution to discover Clearo.analytics on LinkedIn and business automation footprint.',
        text: `Hiring Alert!
Company: Clearao Analytics
Role: AI Business Automation Intern
Location: Remote
About Us: Clearo is an AI business automation provider building AI-powered receptionists and intelligent lead automation workflows.
Responsibilities: Help businesses streamline customer workflows and lead follow-up.
Requirements: Basic understanding of AI tools and workflow automation.
Apply: Send your resume to clearo.analytics@gmail.com or connect on LinkedIn.`,
      },
      {
        id: 'stripe-intern',
        name: 'Stripe - Software Engineering Intern',
        company: 'Stripe',
        badge: 'Legitimate Tech Employer',
        description:
          'Legitimate tech company hiring via official careers & certified Greenhouse ATS portal.',
        text: `Stripe is hiring Software Engineering Interns for Summer 2026.
Location: San Francisco, CA / Remote
About Stripe: Stripe is a financial infrastructure platform for the internet. Millions of companies—from the world's largest enterprises to the most ambitious startups—use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.
Apply directly on our careers portal: https://boards.greenhouse.io/stripe/jobs/4829103
Compensation: $55/hour + housing stipend.
No upfront payment or fees required. Equal opportunity employer.`,
      },
      {
        id: 'telegram-scam',
        name: 'Data Entry - Upfront Security Deposit Scam',
        company: 'Apex FastTrack Global',
        badge: 'Critical Scam Alert',
        description:
          'Common task/job fraud requesting ₹5,000 refundable training deposit and communicating exclusively via Telegram.',
        text: `URGENT REQUIREMENT: Online Typing & Data Entry Executive.
Company: Apex FastTrack Global
Salary: ₹45,000 - ₹65,000 per month (Daily Payout available).
Eligibility: Anyone can apply. No prior experience required. Students and housewives welcome.
Limited slots left! Apply within 2 hours to confirm your seat.
To activate your employee portal and receive company laptop, pay a refundable security deposit of ₹5,000 via UPI.
Contact HR Priya on Telegram: @Priya_ApexGlobal_Recruiter
Immediate joining! Send your Aadhaar and bank account details for verification.`,
      },
      {
        id: 'microsoft-impersonation',
        name: 'Microsoft Impersonation Scam',
        company: 'Microsoft',
        badge: 'Domain Mismatch Alert',
        description:
          'Scammer claims to represent Microsoft but uses a fake landing domain (microsoft-careers-fasttrack.xyz) and free webmail.',
        text: `Congratulations! You have been shortlisted for Cloud Support Specialist at Microsoft India.
Package: ₹14,50,000 per annum.
Role: Manage Azure customer enterprise deployments.
Please fill the mandatory candidate intake form immediately: http://microsoft-careers-fasttrack.xyz/apply-now
For questions, reply to recruiter: microsoft.hiring.team2026@gmail.com
Offer valid for 24 hours only.`,
      },
      {
        id: 'nonexistent-company',
        name: 'Fictitious Nonexistent Startup',
        company: 'Xylophone Quantum Dynamics LLC',
        badge: 'Unestablished Footprint',
        description:
          'A completely fictional company name. Verifies that JobShield accurately reports "Limited public digital footprint" rather than inventing fake profiles.',
        text: `Hiring: Quantum Protocol Architect
Employer: Xylophone Quantum Dynamics LLC
Location: Remote
Develop next-generation quantum-resistant protocols for decentralized nodes.
Apply with your portfolio to founders@xylophonequantum.fake`,
      },
    ],
  });
});

// Primary Analysis API Route
const handleAnalyze = async (req: express.Request, res: express.Response) => {
  try {
    const { text, imageBase64, imageMimeType, company_override } = req.body;

    if (!text && !imageBase64 && !company_override) {
      return res.status(400).json({
        success: false,
        error: 'Please provide job posting text, upload a screenshot, or specify an employer name.',
      });
    }

    console.log(`[JobShield] Analysis request received. Override: "${company_override || ''}", Text length: ${text?.length || 0}`);

    const result = await analyzer.analyze(
      text,
      imageBase64,
      imageMimeType,
      company_override
    );

    return res.json(result);
  } catch (err: any) {
    console.error('[JobShield] Error processing analysis:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'An unexpected error occurred during company verification.',
    });
  }
};

app.post('/api/analyze', handleAnalyze);
app.post('/analyze', handleAnalyze); // legacy / root path alias

// Start Server and mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JobShield] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
