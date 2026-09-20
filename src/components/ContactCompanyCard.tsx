import React, { useState } from 'react';
import { Mail, Copy, Check, ExternalLink, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { ContactCompanyGuide } from '../types';

interface Props {
  guide: ContactCompanyGuide;
  companyName: string;
}

export const ContactCompanyCard: React.FC<Props> = ({ guide, companyName }) => {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  const copyText = (text: string, type: 'subject' | 'body') => {
    navigator.clipboard.writeText(text);
    if (type === 'subject') {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  return (
    <div id="contact-company-card" className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-md">
      <div className="flex flex-col justify-between gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Contact Official HR & Talent Team</h3>
            <p className="text-xs text-zinc-400">Safely authenticate this job offer directly with legitimate company personnel</p>
          </div>
        </div>

        {guide.officialCareersUrl && (
          <a
            href={guide.officialCareersUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            <span>Official Portal</span>
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </a>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs leading-relaxed text-zinc-300">{guide.suggestedAction}</p>

        {guide.hrEmailPattern && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300">Standard Corporate Mailboxes:</span>
            <code className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-zinc-300">{guide.hrEmailPattern}</code>
          </div>
        )}
      </div>

      {/* Inquiry Email Template Accordion */}
      <div className="mt-5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
        <div
          className="flex cursor-pointer items-center justify-between p-3.5 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
          onClick={() => setIsTemplateOpen(!isTemplateOpen)}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Pre-Written HR Verification Email Template</span>
          </div>
          <button type="button" className="text-zinc-500">
            {isTemplateOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {isTemplateOpen && (
          <div className="border-t border-zinc-800/80 p-4 space-y-3.5">
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-medium">Subject Line:</span>
                <button
                  onClick={() => copyText(guide.inquiryTemplate.subject, 'subject')}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  {copiedSubject ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedSubject ? 'Copied' : 'Copy Subject'}</span>
                </button>
              </div>
              <div className="mt-1 rounded-lg border border-zinc-800 bg-zinc-900/90 p-2.5 text-xs font-mono text-zinc-200">
                {guide.inquiryTemplate.subject}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-medium">Body Message:</span>
                <button
                  onClick={() => copyText(guide.inquiryTemplate.body, 'body')}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  {copiedBody ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedBody ? 'Copied' : 'Copy Body'}</span>
                </button>
              </div>
              <div className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 text-xs leading-relaxed font-mono text-zinc-300">
                {guide.inquiryTemplate.body}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
