import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Building2,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { TestCase } from '../types';

interface JobInputFormProps {
  testCases: TestCase[];
  onAnalyze: (payload: {
    text: string;
    imageBase64?: string;
    imageMimeType?: string;
    companyOverride?: string;
  }) => void;
  isLoading: boolean;
  loadingStage: string;
}

export const JobInputForm: React.FC<JobInputFormProps> = ({
  testCases,
  onAnalyze,
  isLoading,
  loadingStage,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageMimeType, setImageMimeType] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');

  const [useOverride, setUseOverride] = useState(false);
  const [companyOverride, setCompanyOverride] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      const base64Data = result.split(',')[1];
      setImageBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageBase64(undefined);
    setImageMimeType(undefined);
    setImagePreview(null);
    setImageFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectTestCase = (tc: TestCase) => {
    setText(tc.text);
    setActiveTab('text');
    if (tc.id === 'clearao-analytics') {
      setUseOverride(false);
      setCompanyOverride('');
    } else {
      setCompanyOverride(tc.company);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imageBase64 && !companyOverride.trim()) {
      return;
    }

    onAnalyze({
      text: text.trim(),
      imageBase64,
      imageMimeType,
      companyOverride: useOverride && companyOverride.trim() ? companyOverride.trim() : undefined,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Test Case Quick Select Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Quick Test Cases:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {testCases.map((tc) => (
              <button
                key={tc.id}
                type="button"
                onClick={() => handleSelectTestCase(tc)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tc.id === 'clearao-analytics'
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
                title={tc.description}
              >
                {tc.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
        {/* Mode Toggle Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center space-x-2 py-2.5 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'text'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Job Text / Offer Letter</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center space-x-2 py-2.5 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'image'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Screenshot (OCR)</span>
            {imageBase64 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-1" />
            )}
          </button>
        </div>

        {/* Text Mode */}
        {activeTab === 'text' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Paste Job Description, Email, or Chat Message
            </label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste job posting content, recruiter email, WhatsApp message, or requirements here..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-mono"
            />
          </div>
        )}

        {/* Image Mode */}
        {activeTab === 'image' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Upload Screenshot of Job Offer or Hiring Chat
            </label>

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/50"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">
                  Click to select screenshot or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PNG, JPG, WebP. High-precision Gemini OCR will transcribe and extract the employer automatically.
                </p>
              </div>
            ) : (
              <div className="relative border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Job Screenshot"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {imageFileName}
                  </p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Image attached & ready for autonomous OCR analysis
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                  title="Remove image"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Employer Override & Fuzzy Resolution Controls */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Employer Identification Settings
              </span>
            </div>

            <label className="flex items-center cursor-pointer space-x-2">
              <input
                type="checkbox"
                checked={useOverride}
                onChange={(e) => setUseOverride(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs text-slate-600 font-medium">
                Manual Employer Override
              </span>
            </label>
          </div>

          {useOverride ? (
            <div className="mt-3">
              <input
                type="text"
                value={companyOverride}
                onChange={(e) => setCompanyOverride(e.target.value)}
                placeholder="e.g., Stripe, Clearao Analytics, Google, Apex Global..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                Overrides automatic OCR extraction. Multi-query search will explore phonetic and legal variations of this name.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-2">
              JobShield will automatically detect the hiring employer from the content and run fuzzy spelling, phonetic matching (e.g. Clearao &rarr; Clearo), and registry searches.
            </p>
          )}
        </div>

        {/* Action Button & Loading Progress */}
        <div>
          <button
            type="submit"
            disabled={isLoading || (!text.trim() && !imageBase64 && !companyOverride.trim())}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all ${
              isLoading
                ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-wait'
                : !text.trim() && !imageBase64 && !companyOverride.trim()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-md'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>{loadingStage || 'Verifying employer & analyzing scam signals...'}</span>
              </div>
            ) : (
              <>
                <span>Run Autonomous Employer Verification & Scam Detection</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
